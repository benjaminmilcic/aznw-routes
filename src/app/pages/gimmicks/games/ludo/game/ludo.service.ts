import { Injectable, computed, signal } from '@angular/core';
import { get, ref, remove, set, update } from 'firebase/database';
import { authReady, databaseConfigured, db } from '../../shared/firebase/firebase';
import { ABSENT_GRACE_MS, GameChannel, withTimeout } from '../../shared/firebase/game-channel';
import { bestMove } from './ludo.ai';
import {
  applyMove,
  applyPass,
  applyRoll,
  computeMoves,
  finishIfDecided,
  freshPieces,
  isDone,
  onlySixHelps,
  seatOf,
  trackCell,
  withTurn,
} from './ludo.rules';
import {
  MAX_PLAYERS,
  MIN_PLAYERS,
  PIECES,
  SEAT_LAYOUT,
  type LudoGame,
  type LudoLevel,
  type LudoMode,
  type LudoMove,
  type LudoPlayer,
  type LudoPos,
} from './ludo.types';

const PLAYER_ID_KEY = 'ludo_player_id';
const PLAYER_NAME_KEY = 'ludo_player_name';
const PLAYER_EMOJI_KEY = 'ludo_player_emoji';
/** Last opened online game – for returning to the page. */
const ACTIVE_CODE_KEY = 'ludo_active_code';
const CODE_ALPHABET = '0123456789';

export const AVATARS = ['🦄', '🐙', '🦈', '🐱', '🦖', '🐬', '🦊', '🐸', '🐧', '🦁'];

/** Symbols of the computer opponents. */
export const CPU_EMOJI = '🤖';

export { MAX_PLAYERS, MIN_PLAYERS } from './ludo.types';

/** Base of the translation keys – the error signals deliver keys, not texts. */
const T = 'gimmicks.games.ludoGame';

/** Thinking time of the computer, so that you can follow roll and move. */
const CPU_ROLL_DELAY = 650;
const CPU_MOVE_DELAY = 750;

/**
 * "Mensch ärgere dich nicht" (Ludo) – taken over from the whiteboard app and,
 * like Yahtzee, extended to several players.
 *
 * Two game modes:
 *  - "local"  … 2–4 players on the device, any number of them computer opponents
 *  - "online" … 2–4 devices via a four-digit game code
 *
 * The online game state lives in the Realtime Database under
 * "ludo/games/<code>" – the same path the whiteboard app uses.
 */
@Injectable({ providedIn: 'root' })
export class LudoService {
  /**
   * Connection to the game node in online mode: keeps the state up to date,
   * rebuilds broken listeners and writes moves only with server confirmation.
   * In computer mode the channel stays closed – the signal then serves as
   * a completely normal local state.
   */
  private readonly channel = new GameChannel<LudoGame>({
    db,
    configured: databaseConfigured,
    authReady,
    basePath: 'ludo/games',
    activeKey: ACTIVE_CODE_KEY,
    playerId: () => this.playerId,
    normalize: (raw) => this.normalize(raw as LudoGame),
    canResume: (game) => !!game.players[this.playerId] && game.status !== 'finished',
  });

  /** Current game state (local or from the Realtime Database). */
  readonly game = this.channel.state;
  /** The connection has been gone for a while – the UI shows a notice. */
  readonly offline = this.channel.offline;
  /** A move is on its way and is taking noticeably long. */
  readonly pending = this.channel.pending;

  /** Fetch the state from the server again by hand (button in the notice bar). */
  resync(): Promise<void> {
    return this.channel.resync();
  }

  dismissError(): void {
    this.channel.dismissError();
  }

  /**
   * Back into a running online game – after a reload or when the page
   * was left in the meantime.
   */
  async resume(): Promise<boolean> {
    if (this.game()) return false;
    const ok = await this.channel.resume();
    if (ok) this.mode.set('online');
    return ok;
  }

  // ---- Absent players ------------------------------------------------------
  /** Players who are no longer connected – with seconds since they disappeared. */
  readonly absent = this.channel.awayPlayers;

  /**
   * The absent player who is currently blocking the round: it is their turn and
   * they have been gone longer than the grace period. Only then do we offer to skip –
   * nobody should be thrown out because they briefly left the room.
   */
  readonly blockingAbsent = computed<{ id: string; name: string; seconds: number } | null>(() => {
    const g = this.game();
    if (!g || g.status !== 'playing') return null;
    if (g.currentTurn === this.playerId) return null;
    const grace = ABSENT_GRACE_MS / 1000;
    return this.absent().find((p) => p.id === g.currentTurn && p.seconds >= grace) ?? null;
  });

  /**
   * Removes an absent player from the round so that it can go on.
   * Deliberately triggered by the remaining players.
   */
  async skipAbsent(playerId: string): Promise<void> {
    const g = this.game();
    if (!g || this.mode() !== 'online' || !g.players[playerId]) return;
    if (this.channel.awayMs(playerId) < ABSENT_GRACE_MS) return;
    await this.removeFromOnlineGame(g, playerId);
  }
  /** Selected game mode – null means: start screen. */
  readonly mode = signal<LudoMode | null>(null);
  /** Difficulty of the computer opponents. */
  readonly level = signal<LudoLevel>('medium');
  /** Translation key or plain text of an error message. */
  readonly error = this.channel.error;
  readonly busy = signal(false);

  readonly playerId = this.loadPlayerId();

  private cpuTimer: ReturnType<typeof setTimeout> | null = null;

  // ---- Derived signals for the UI -----------------------------------------
  /** The player on THIS device (in a local game the first human). */
  readonly me = computed<LudoPlayer | null>(() => this.game()?.players[this.playerId] ?? null);

  /** All players in turn order. */
  readonly players = computed<LudoPlayer[]>(() => {
    const g = this.game();
    if (!g) return [];
    return g.order.map((id) => g.players[id]).filter((p): p is LudoPlayer => !!p);
  });

  readonly currentPlayer = computed<LudoPlayer | null>(() => {
    const g = this.game();
    return g ? g.players[g.currentTurn] ?? null : null;
  });

  readonly isHost = computed<boolean>(() => this.game()?.hostId === this.playerId);

  /** Final standings: the players who have already finished, in order of place. */
  readonly ranking = computed<LudoPlayer[]>(() => {
    const g = this.game();
    if (!g) return [];
    return g.ranking.map((id) => g.players[id]).filter((p): p is LudoPlayer => !!p);
  });

  /** Does this player have all four pieces home? */
  done(id: string): boolean {
    const g = this.game();
    return !!g && isDone(g, id);
  }

  /** Place reached (1-based), or 0 while the player is still on their way. */
  rankOf(id: string): number {
    const g = this.game();
    if (!g) return 0;
    const i = g.ranking.indexOf(id);
    return i < 0 ? 0 : i + 1;
  }

  /** The computer is "thinking". */
  readonly thinking = computed<boolean>(
    () => this.game()?.status === 'playing' && !!this.currentPlayer()?.cpu,
  );

  /** May a roll/move be made on THIS device right now? */
  readonly canAct = computed<boolean>(() => {
    const g = this.game();
    if (!g || g.status !== 'playing') return false;
    if (this.mode() === 'local') return !g.players[g.currentTurn]?.cpu;
    return g.currentTurn === this.playerId;
  });

  /** The legal moves of the player on turn with the current die. */
  readonly legalMoves = computed<LudoMove[]>(() => {
    const g = this.game();
    if (!g || g.status !== 'playing' || g.dice === null) return [];
    return computeMoves(g, g.currentTurn, g.dice);
  });

  /** The dice have been rolled and a piece may now be moved. */
  readonly mustMove = computed<boolean>(() => this.canAct() && this.legalMoves().length > 0);

  /** Rolled, but no move possible – the number is shown, then the turn is skipped. */
  readonly noMove = computed<boolean>(() => {
    const g = this.game();
    return this.canAct() && !!g && g.dice !== null && this.legalMoves().length === 0;
  });

  /** Does confirming an unusable number lead to another roll? */
  readonly passRerolls = computed<boolean>(() => {
    const g = this.game();
    if (!g || g.dice === null) return false;
    if (g.dice === 6) return true; // a 6 always gives a new roll
    return g.rollsLeft > 1 && onlySixHelps(g, g.currentTurn);
  });

  /** May the dice be rolled now? */
  readonly canRoll = computed<boolean>(() => {
    const g = this.game();
    return this.canAct() && !!g && g.dice === null;
  });

  /** Seat (0 … 3) of a player – for color and board geometry. */
  seatOf(g: LudoGame, id: string): number {
    return seatOf(g, id);
  }

  /** Board square (0 … 39) of a piece on the track, otherwise -1. */
  trackCell(g: LudoGame, id: string, pos: LudoPos): number {
    return trackCell(g, id, pos);
  }

  // ---- Player identity -----------------------------------------------------
  get savedName(): string {
    return localStorage.getItem(PLAYER_NAME_KEY) ?? '';
  }
  get savedEmoji(): string {
    return localStorage.getItem(PLAYER_EMOJI_KEY) ?? '';
  }

  private rememberProfile(name: string, emoji: string): void {
    const trimmed = name.trim();
    if (trimmed) localStorage.setItem(PLAYER_NAME_KEY, trimmed);
    if (emoji) localStorage.setItem(PLAYER_EMOJI_KEY, emoji);
  }

  private loadPlayerId(): string {
    let id = localStorage.getItem(PLAYER_ID_KEY);
    if (!id) {
      id = 'p_' + Math.random().toString(36).slice(2, 10);
      localStorage.setItem(PLAYER_ID_KEY, id);
    }
    return id;
  }

  // ---- Game on the device (humans + computers) -----------------------------
  /**
   * Starts a game on this device. `seats` comes from the start screen
   * and contains humans and computers in the desired order.
   */
  startLocalGame(
    seats: { name: string; emoji: string; cpu: boolean }[],
    level: LudoLevel = 'medium',
  ): void {
    const first = seats.find((s) => !s.cpu);
    if (first) this.rememberProfile(first.name, first.emoji);
    this.reset();
    this.level.set(level);
    this.mode.set('local');

    const players: Record<string, LudoPlayer> = {};
    const order: string[] = [];
    let humanSeat = 0;
    for (const [i, seat] of seats.entries()) {
      // The first human gets the stored player id, so that "me"
      // can be highlighted on the board.
      const id = seat.cpu ? `cpu_${i}` : humanSeat++ === 0 ? this.playerId : `p_local_${i}`;
      players[id] = {
        id,
        name: seat.name.trim() || `Spieler ${i + 1}`,
        emoji: seat.emoji,
        cpu: seat.cpu,
      };
      order.push(id);
    }

    this.game.set(this.freshGame('', order[0], players, order));
    this.maybeScheduleCpu();
  }

  // ---- Online game: create / join / start -----------------------------------
  async createGame(name: string, emoji: string): Promise<string> {
    this.rememberProfile(name, emoji);
    this.reset();
    this.mode.set('online');
    this.busy.set(true);
    try {
      this.assertConfig();
      await authReady;
      const code = await this.uniqueCode();
      const player: LudoPlayer = { id: this.playerId, name: name.trim() || 'Spieler', emoji };
      const state: LudoGame = {
        ...this.freshGame(code, this.playerId, { [this.playerId]: player }, [this.playerId]),
        status: 'waiting',
      };
      await withTimeout(set(ref(db, `ludo/games/${code}`), state));
      this.channel.open(code);
      return code;
    } catch (e) {
      this.mode.set(null);
      this.error.set(this.toMessage(e));
      throw e;
    } finally {
      this.busy.set(false);
    }
  }

  async joinGame(rawCode: string, name: string, emoji: string): Promise<void> {
    const code = rawCode.trim();
    this.rememberProfile(name, emoji);
    this.reset();
    this.mode.set('online');
    this.busy.set(true);
    try {
      this.assertConfig();
      await authReady;
      const snap = await withTimeout(get(ref(db, `ludo/games/${code}`)));
      if (!snap.exists()) throw new Error(`${T}.errors.notFound`);

      const state = this.normalize(snap.val() as LudoGame);
      if (!state.players[this.playerId]) {
        if (state.status !== 'waiting') throw new Error(`${T}.errors.alreadyStarted`);
        if (state.order.length >= MAX_PLAYERS) throw new Error(`${T}.errors.full`);

        const order = [...state.order, this.playerId];
        await withTimeout(
          update(ref(db, `ludo/games/${code}`), {
            [`players/${this.playerId}`]: {
              id: this.playerId,
              name: name.trim() || 'Spieler',
              emoji,
            },
            [`pieces/${this.playerId}`]: freshPieces(),
            order,
            rev: (state.rev ?? 0) + 1,
            updatedAt: Date.now(),
          }),
        );
      }
      this.channel.open(code);
    } catch (e) {
      this.mode.set(null);
      this.error.set(this.toMessage(e));
      throw e;
    } finally {
      this.busy.set(false);
    }
  }

  /**
   * The host starts the round as soon as everyone is there. Only now are
   * the seats fixed – with two players you sit opposite each other, with three/four
   * the corners are assigned in turn.
   */
  async startOnlineGame(): Promise<void> {
    const g = this.game();
    if (!g || !this.isHost() || g.order.length < MIN_PLAYERS) return;
    try {
      const seats = this.assignSeats(g.order);
      const pieces: Record<string, LudoPos[]> = {};
      for (const id of g.order) pieces[id] = freshPieces();
      const started = withTurn({ ...g, seats, pieces, status: 'playing' }, g.order[0]);
      await this.channel.commit({
        seats,
        pieces,
        status: 'playing',
        currentTurn: started.currentTurn,
        dice: null,
        rollsLeft: started.rollsLeft,
        winnerId: null,
        ranking: [],
        lastAction: null,
        updatedAt: Date.now(),
      });
    } catch (e) {
      this.error.set(this.toMessage(e));
    }
  }

  // ---- Moves ---------------------------------------------------------------
  /**
   * Roll the dice. The pip count is always stored and shown – even if
   * no move is possible. The player then deliberately skips via `pass()`.
   */
  roll(): void {
    const g = this.game();
    if (!g || !this.canRoll()) return;
    const dice = 1 + Math.floor(Math.random() * 6);
    this.commit(applyRoll(g, g.currentTurn, dice));
  }

  /**
   * Confirms a pip count that cannot be used. A 6 (or another attempt with all
   * pieces in the garage) gives a new roll, otherwise it is the next player's
   * turn.
   */
  pass(): void {
    const g = this.game();
    if (!g || !this.noMove()) return;
    this.commit(applyPass(g, g.currentTurn));
  }

  /** Moves the selected piece according to the current die. */
  move(pieceIndex: number): void {
    const g = this.game();
    if (!g || !this.canAct() || g.dice === null) return;
    const chosen = this.legalMoves().find((m) => m.pieceIndex === pieceIndex);
    if (!chosen) return;
    this.commit(applyMove(g, g.currentTurn, chosen));
  }

  /** New round – this time the winner does not start. */
  playAgain(): void {
    const g = this.game();
    if (!g) return;
    this.clearCpuTimer();

    const pieces: Record<string, LudoPos[]> = {};
    for (const id of g.order) pieces[id] = freshPieces();
    const winnerIndex = g.winnerId ? g.order.indexOf(g.winnerId) : -1;
    const starter = winnerIndex >= 0 ? g.order[(winnerIndex + 1) % g.order.length] : g.order[0];

    const fresh = withTurn(
      { ...g, pieces, status: 'playing', winnerId: null, ranking: [], lastAction: null },
      starter,
    );
    this.commit({ ...fresh, updatedAt: Date.now() });
  }

  /**
   * Leave the running game. Online you are removed from the round,
   * so that the others can continue without you.
   */
  leaveGame(): void {
    const g = this.game();
    if (this.mode() === 'online' && g?.players[this.playerId]) {
      void this.removeFromOnlineGame(g, this.playerId);
    }
    this.reset();
  }

  /**
   * Removes a player from the online round: their pieces leave the
   * board, the next player may be on turn, and if needed the host role changes.
   * The last one to leave removes the game completely.
   *
   * The seats of the remaining players stay as they are – otherwise
   * their pieces would jump to other squares in the middle of the game.
   *
   * `who` is normally yourself (button "Leave game"), but can also be
   * an absent player whom the round skips (see
   * `skipAbsent`).
   */
  private async removeFromOnlineGame(g: LudoGame, who: string): Promise<void> {
    const path = `ludo/games/${g.code}`;
    const remaining = g.order.filter((id) => id !== who);
    const leftName = g.players[who]?.name ?? 'Spieler';

    try {
      if (remaining.length === 0) {
        await remove(ref(db, path));
        return;
      }

      // Pieces, seat and player data of the leaving player are dropped.
      const players: Record<string, LudoPlayer> = {};
      const pieces: Record<string, LudoPos[]> = {};
      const seats: Record<string, number> = {};
      for (const id of remaining) {
        players[id] = g.players[id];
        pieces[id] = g.pieces[id] ?? freshPieces();
        seats[id] = g.seats[id] ?? 0;
      }

      const ranking = g.ranking.filter((id) => remaining.includes(id));
      const rest: LudoGame = { ...g, players, pieces, seats, order: remaining, ranking };
      const hostId = g.hostId === who ? remaining[0] : g.hostId;

      // If only one player is still on their way, the places are thereby distributed.
      if (g.status === 'playing') {
        const decided = finishIfDecided(rest);
        if (decided.status === 'finished') {
          await update(ref(db, path), {
            players,
            pieces,
            seats,
            order: remaining,
            hostId,
            status: 'finished',
            winnerId: decided.winnerId,
            ranking: decided.ranking,
            dice: null,
            lastLeft: { name: leftName, at: Date.now() },
            rev: (g.rev ?? 0) + 1,
            updatedAt: Date.now(),
          });
          return;
        }
      }

      // If the removed player was on turn, the next one moves up – fresh die.
      const wasHisTurn = g.currentTurn === who;
      const next = wasHisTurn ? withTurn(rest, this.playerAfter(who, g.order, rest)) : rest;

      await update(ref(db, path), {
        players,
        pieces,
        seats,
        order: remaining,
        hostId,
        ranking,
        currentTurn: next.currentTurn,
        dice: next.dice,
        rollsLeft: next.rollsLeft,
        lastLeft: { name: leftName, at: Date.now() },
        rev: (g.rev ?? 0) + 1,
        updatedAt: Date.now(),
      });
    } catch (e) {
      this.error.set(this.toMessage(e));
    }
  }

  /**
   * The next player after `who` in the original order who is still
   * in the game and not yet home.
   */
  private playerAfter(who: string, fullOrder: string[], rest: LudoGame): string {
    const start = fullOrder.indexOf(who);
    for (let step = 1; step <= fullOrder.length; step++) {
      const candidate = fullOrder[(start + step) % fullOrder.length];
      if (rest.order.includes(candidate) && !isDone(rest, candidate)) return candidate;
    }
    return rest.order[0];
  }

  /**
   * The page is left (ngOnDestroy). Listeners are detached, but the game
   * code is kept: when coming back, `resume()` finds the running game
   * again. Previously, every time the page was left the online game ended.
   */
  suspend(): void {
    this.reset({ forget: false });
  }

  private reset(opts: { forget?: boolean } = {}): void {
    this.channel.close(opts);
    this.clearCpuTimer();
    this.mode.set(null);
  }

  // ---- Write state ---------------------------------------------------------
  /** Takes over a new game state – locally directly, online via Firebase. */
  private commit(next: LudoGame): void {
    if (this.mode() === 'online') {
      void this.pushOnline(next);
      return;
    }
    this.game.set(next);
    this.maybeScheduleCpu();
  }

  private async pushOnline(next: LudoGame): Promise<void> {
    try {
      await this.channel.commit({
        pieces: next.pieces,
        status: next.status,
        currentTurn: next.currentTurn,
        dice: next.dice,
        rollsLeft: next.rollsLeft,
        winnerId: next.winnerId,
        ranking: next.ranking,
        lastAction: next.lastAction,
        updatedAt: next.updatedAt,
      });
    } catch (e) {
      this.error.set(this.toMessage(e));
    }
  }

  // ---- Computer opponent ---------------------------------------------------
  /** If a computer is on turn, it rolls and moves after a short pause. */
  private maybeScheduleCpu(): void {
    const g = this.game();
    if (this.mode() !== 'local' || !g || g.status !== 'playing') return;
    if (!g.players[g.currentTurn]?.cpu) return;

    this.clearCpuTimer();
    this.cpuTimer = setTimeout(() => {
      this.cpuTimer = null;
      this.cpuRoll();
    }, CPU_ROLL_DELAY);
  }

  /** Step 1: the computer rolls – the pip count stays visible for a moment. */
  private cpuRoll(): void {
    const g = this.game();
    if (!g || g.status !== 'playing' || !g.players[g.currentTurn]?.cpu) return;
    if (g.dice !== null) return;

    const id = g.currentTurn;
    const dice = 1 + Math.floor(Math.random() * 6);
    this.game.set(applyRoll(g, id, dice));

    this.clearCpuTimer();
    this.cpuTimer = setTimeout(() => {
      this.cpuTimer = null;
      this.cpuMove();
    }, CPU_MOVE_DELAY);
  }

  /** Step 2: the computer moves – or skips if nothing works. */
  private cpuMove(): void {
    const g = this.game();
    if (!g || g.status !== 'playing' || !g.players[g.currentTurn]?.cpu || g.dice === null) return;

    const id = g.currentTurn;
    const moves = computeMoves(g, id, g.dice);
    const chosen = moves.length > 0 ? bestMove(g, id, moves, this.level()) : null;

    this.game.set(chosen ? applyMove(g, id, chosen) : applyPass(g, id));
    this.maybeScheduleCpu();
  }

  private clearCpuTimer(): void {
    if (this.cpuTimer) clearTimeout(this.cpuTimer);
    this.cpuTimer = null;
  }

  // ---- Internals -----------------------------------------------------------
  /** Fresh game state with seats, empty garages and the first turn. */
  private freshGame(
    code: string,
    hostId: string,
    players: Record<string, LudoPlayer>,
    order: string[],
  ): LudoGame {
    const pieces: Record<string, LudoPos[]> = {};
    for (const id of order) pieces[id] = freshPieces();
    const base: LudoGame = {
      code,
      status: 'playing',
      hostId,
      players,
      order,
      seats: this.assignSeats(order),
      pieces,
      currentTurn: order[0],
      dice: null,
      rollsLeft: 3,
      winnerId: null,
      ranking: [],
      lastAction: null,
      rev: 0,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    return withTurn(base, order[0]);
  }

  /** Assigns the seats (corners) to the players in turn order. */
  private assignSeats(order: string[]): Record<string, number> {
    const layout = SEAT_LAYOUT[order.length] ?? SEAT_LAYOUT[MAX_PLAYERS];
    const seats: Record<string, number> = {};
    order.forEach((id, i) => (seats[id] = layout[i] ?? i));
    return seats;
  }

  /**
   * Firebase does not store empty/partially set arrays cleanly – fill them in
   * when reading, so that the UI never accesses "undefined".
   */
  private normalize(g: LudoGame): LudoGame {
    const players = g.players ?? {};
    const order = (g.order ?? []).filter((id) => !!players[id]);
    const seats = g.seats ?? {};
    const pieces: Record<string, LudoPos[]> = {};
    for (const id of order) {
      const arr = g.pieces?.[id] ?? [];
      pieces[id] = Array.from({ length: PIECES }, (_, i) =>
        typeof arr[i] === 'number' ? arr[i] : -1,
      );
    }
    return {
      ...g,
      rev: g.rev ?? 0,
      order,
      players,
      seats,
      pieces,
      dice: g.dice ?? null,
      rollsLeft: g.rollsLeft ?? 1,
      winnerId: g.winnerId ?? null,
      // Players who left are also dropped from the ranking.
      ranking: (g.ranking ?? []).filter((id) => order.includes(id)),
      lastAction: g.lastAction ?? null,
      lastLeft: g.lastLeft ?? null,
    };
  }

  private async uniqueCode(): Promise<string> {
    for (let attempt = 0; attempt < 8; attempt++) {
      const code = this.randomCode();
      const snap = await withTimeout(get(ref(db, `ludo/games/${code}`)));
      if (!snap.exists()) return code;
    }
    return this.randomCode();
  }

  private randomCode(): string {
    let s = '';
    for (let i = 0; i < 4; i++) {
      s += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)];
    }
    return s;
  }

  private assertConfig(): void {
    if (!databaseConfigured) throw new Error(`${T}.errors.notConfigured`);
  }

  private toMessage(e: unknown): string {
    const raw = e instanceof Error ? e.message : String(e);
    if (raw.includes('PERMISSION_DENIED')) return `${T}.errors.permission`;
    return raw;
  }
}
