import { Injectable, computed, signal } from '@angular/core';
import { get, ref, remove, set, update } from 'firebase/database';
import { authReady, databaseConfigured, db } from '../../shared/firebase/firebase';
import { ABSENT_GRACE_MS, GameChannel, withTimeout } from '../../shared/firebase/game-channel';
import { bestMove } from './uno.ai';
import {
  applyDraw,
  applyPlay,
  dealNewRound,
  finishIfDecided,
  isDone,
  isPlayable,
  topCard,
} from './uno.rules';
import {
  MAX_PLAYERS,
  MIN_PLAYERS,
  type UnoCard,
  type UnoColor,
  type UnoGame,
  type UnoLevel,
  type UnoMode,
  type UnoPlayer,
} from './uno.types';

const PLAYER_ID_KEY = 'uno_player_id';
const PLAYER_NAME_KEY = 'uno_player_name';
const PLAYER_EMOJI_KEY = 'uno_player_emoji';
/** Last opened online game – for returning to the page. */
const ACTIVE_CODE_KEY = 'uno_active_code';
const CODE_ALPHABET = '0123456789';

export const AVATARS = ['🦄', '🐙', '🦈', '🐱', '🦖', '🐬', '🦊', '🐸', '🐧', '🦁'];

/** Symbols of the computer opponents. */
export const CPU_EMOJI = '🤖';

/** Base of the translation keys – the error signals deliver keys, not texts. */
const T = 'gimmicks.games.unoGame';

/** Thinking time of the computer, so that you can follow the move. */
const CPU_DELAY = 900;

export { MAX_PLAYERS, MIN_PLAYERS } from './uno.types';

/**
 * UNO – taken over from the whiteboard app and, like Yahtzee, extended to
 * several players.
 *
 * Two game modes:
 *  - "local"  … 2–6 players on the device, any number of them computer opponents
 *  - "online" … 2–6 devices via a four-digit game code
 *
 * The online game state lives in the Realtime Database under
 * "uno/games/<code>" – the same path the whiteboard app uses.
 */
@Injectable({ providedIn: 'root' })
export class UnoService {
  /**
   * Connection to the game node in online mode: keeps the state up to date,
   * rebuilds broken listeners and writes moves only with server confirmation.
   * In computer mode the channel stays closed – the signal then serves as
   * a completely normal local state.
   */
  private readonly channel = new GameChannel<UnoGame>({
    db,
    configured: databaseConfigured,
    authReady,
    basePath: 'uno/games',
    activeKey: ACTIVE_CODE_KEY,
    playerId: () => this.playerId,
    normalize: (raw) => this.normalize(raw as UnoGame),
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
  readonly mode = signal<UnoMode | null>(null);
  /** Difficulty of the computer opponents. */
  readonly level = signal<UnoLevel>('medium');
  /** Translation key or plain text of an error message. */
  readonly error = this.channel.error;
  readonly busy = signal(false);

  /**
   * On the device with several humans: only when the next player confirms are
   * their cards revealed. Otherwise they would see the hand of the previous player.
   */
  readonly handHidden = signal(false);

  readonly playerId = this.loadPlayerId();

  private cpuTimer: ReturnType<typeof setTimeout> | null = null;

  // ---- Derived signals for the UI -----------------------------------------
  readonly me = computed<UnoPlayer | null>(() => this.game()?.players[this.playerId] ?? null);

  /** All players in seating order. */
  readonly players = computed<UnoPlayer[]>(() => {
    const g = this.game();
    if (!g) return [];
    return g.order.map((id) => g.players[id]).filter((p): p is UnoPlayer => !!p);
  });

  readonly currentPlayer = computed<UnoPlayer | null>(() => {
    const g = this.game();
    return g ? g.players[g.currentTurn] ?? null : null;
  });

  readonly isHost = computed<boolean>(() => this.game()?.hostId === this.playerId);

  readonly topCard = computed<UnoCard | null>(() => {
    const g = this.game();
    return g ? topCard(g) : null;
  });

  /** The computer is "thinking". */
  readonly thinking = computed<boolean>(
    () => this.game()?.status === 'playing' && !!this.currentPlayer()?.cpu,
  );

  /**
   * Whose cards are currently face up on this device? Online they are always
   * mine, on the device those of the human whose turn it is.
   */
  readonly handOwner = computed<string>(() => {
    const g = this.game();
    if (!g) return this.playerId;
    if (this.mode() !== 'local') return this.playerId;
    const current = g.players[g.currentTurn];
    return current && !current.cpu ? current.id : this.lastHumanTurn();
  });

  readonly hand = computed<UnoCard[]>(() => this.game()?.hands[this.handOwner()] ?? []);

  /** May you play on THIS device right now? */
  readonly canAct = computed<boolean>(() => {
    const g = this.game();
    if (!g || g.status !== 'playing' || this.handHidden()) return false;
    if (this.mode() === 'local') return !g.players[g.currentTurn]?.cpu;
    return g.currentTurn === this.playerId;
  });

  /** Does the player on turn have any playable card at all? */
  readonly hasPlayable = computed<boolean>(() => {
    const g = this.game();
    if (!g || !this.canAct()) return false;
    const top = this.topCard();
    return (g.hands[g.currentTurn] ?? []).some((c) => isPlayable(c, top, g.currentColor));
  });

  /** Final standings: the players who have already finished, in order of place. */
  readonly ranking = computed<UnoPlayer[]>(() => {
    const g = this.game();
    if (!g) return [];
    return g.ranking.map((id) => g.players[id]).filter((p): p is UnoPlayer => !!p);
  });

  /** Number of cards of a player. */
  cardCount(id: string): number {
    return this.game()?.hands[id]?.length ?? 0;
  }

  /** Has this player already got rid of their cards? */
  done(id: string): boolean {
    const g = this.game();
    return !!g && isDone(g, id);
  }

  /** Place reached (1-based), or 0 while the player is still playing. */
  rankOf(id: string): number {
    const g = this.game();
    if (!g) return 0;
    const i = g.ranking.indexOf(id);
    return i < 0 ? 0 : i + 1;
  }

  /** Can this card be played right now? */
  playable(card: UnoCard): boolean {
    const g = this.game();
    if (!g || !this.canAct()) return false;
    return isPlayable(card, this.topCard(), g.currentColor);
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

  /** Remembers whose cards were last face up on the device. */
  private lastHuman = this.playerId;
  private lastHumanTurn(): string {
    return this.lastHuman;
  }

  /** Are several humans playing on the device? Then the device is handed over face down. */
  private manyHumans(g: UnoGame): boolean {
    return g.order.filter((id) => !g.players[id]?.cpu).length > 1;
  }

  // ---- Game on the device (humans + computers) -----------------------------
  startLocalGame(
    seats: { name: string; emoji: string; cpu: boolean }[],
    level: UnoLevel = 'medium',
  ): void {
    const first = seats.find((s) => !s.cpu);
    if (first) this.rememberProfile(first.name, first.emoji);
    this.reset();
    this.level.set(level);
    this.mode.set('local');

    const players: Record<string, UnoPlayer> = {};
    const order: string[] = [];
    let humanSeat = 0;
    for (const [i, seat] of seats.entries()) {
      // The first human gets the stored player id.
      const id = seat.cpu ? `cpu_${i}` : humanSeat++ === 0 ? this.playerId : `p_local_${i}`;
      players[id] = {
        id,
        name: seat.name.trim() || `Spieler ${i + 1}`,
        emoji: seat.emoji,
        cpu: seat.cpu,
      };
      order.push(id);
    }

    const base = this.emptyGame('', order[0], players, order);
    const dealt = dealNewRound(base, order[0]);
    this.lastHuman = order.find((id) => !players[id].cpu) ?? order[0];
    this.game.set(dealt);
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
      const player: UnoPlayer = { id: this.playerId, name: name.trim() || 'Spieler', emoji };
      const state: UnoGame = {
        ...this.emptyGame(code, this.playerId, { [this.playerId]: player }, [this.playerId]),
        status: 'waiting',
      };
      await withTimeout(set(ref(db, `uno/games/${code}`), state));
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
      const snap = await withTimeout(get(ref(db, `uno/games/${code}`)));
      if (!snap.exists()) throw new Error(`${T}.errors.notFound`);

      const state = this.normalize(snap.val() as UnoGame);
      if (!state.players[this.playerId]) {
        if (state.status !== 'waiting') throw new Error(`${T}.errors.alreadyStarted`);
        if (state.order.length >= MAX_PLAYERS) throw new Error(`${T}.errors.full`);

        await withTimeout(
          update(ref(db, `uno/games/${code}`), {
            [`players/${this.playerId}`]: {
              id: this.playerId,
              name: name.trim() || 'Spieler',
              emoji,
            },
            order: [...state.order, this.playerId],
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

  /** The host starts the round as soon as everyone is there. */
  async startOnlineGame(): Promise<void> {
    const g = this.game();
    if (!g || !this.isHost() || g.order.length < MIN_PLAYERS) return;
    try {
      const dealt = dealNewRound(g, g.order[0]);
      await this.channel.commit({
        hands: dealt.hands,
        drawPile: dealt.drawPile,
        discardPile: dealt.discardPile,
        currentColor: dealt.currentColor,
        direction: 1,
        currentTurn: dealt.currentTurn,
        status: 'playing',
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
  /** Plays a card. Wild cards need a desired color. */
  playCard(cardId: string, chosenColor?: UnoColor): boolean {
    const g = this.game();
    if (!g || !this.canAct()) return false;
    const next = applyPlay(g, g.currentTurn, cardId, chosenColor);
    if (!next) return false;
    this.commit(next);
    return true;
  }

  /** Draws a card – afterwards it is the next player's turn. */
  drawCard(): void {
    const g = this.game();
    if (!g || !this.canAct()) return;
    const next = applyDraw(g, g.currentTurn);
    if (next) this.commit(next);
  }

  /** On the device: the next player has taken over the device and reveals their cards. */
  revealHand(): void {
    this.handHidden.set(false);
  }

  /** New round – this time the winner does not start. */
  playAgain(): void {
    const g = this.game();
    if (!g) return;
    this.clearCpuTimer();
    const winnerIndex = g.winnerId ? g.order.indexOf(g.winnerId) : -1;
    const starter = winnerIndex >= 0 ? g.order[(winnerIndex + 1) % g.order.length] : g.order[0];
    this.commit(dealNewRound(g, starter));
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
   * Removes a player from the online round: their cards go
   * back into the draw pile, the next player may be on turn, and if needed
   * the host role changes. The last one to leave removes the game.
   */
  private async removeFromOnlineGame(g: UnoGame, who: string): Promise<void> {
    const path = `uno/games/${g.code}`;
    const remaining = g.order.filter((id) => id !== who);
    const leftName = g.players[who]?.name ?? 'Spieler';

    try {
      if (remaining.length === 0) {
        await remove(ref(db, path));
        return;
      }

      const players: Record<string, UnoPlayer> = {};
      const hands: Record<string, UnoCard[]> = {};
      for (const id of remaining) {
        players[id] = g.players[id];
        hands[id] = g.hands[id] ?? [];
      }
      // The cards handed in go back under the draw pile.
      const drawPile = [...(g.hands[who] ?? []), ...g.drawPile];
      const ranking = g.ranking.filter((id) => remaining.includes(id));
      const rest: UnoGame = { ...g, players, hands, drawPile, order: remaining, ranking };
      const hostId = g.hostId === who ? remaining[0] : g.hostId;

      if (g.status === 'playing') {
        const decided = finishIfDecided(rest);
        if (decided.status === 'finished') {
          await update(ref(db, path), {
            players,
            hands,
            drawPile,
            order: remaining,
            hostId,
            status: 'finished',
            winnerId: decided.winnerId,
            ranking: decided.ranking,
            lastLeft: { name: leftName, at: Date.now() },
            rev: (g.rev ?? 0) + 1,
            updatedAt: Date.now(),
          });
          return;
        }
      }

      // If the removed player was on turn, the next one moves up.
      const wasHisTurn = g.currentTurn === who;
      const currentTurn = wasHisTurn ? this.playerAfter(who, g.order, rest) : g.currentTurn;

      await update(ref(db, path), {
        players,
        hands,
        drawPile,
        order: remaining,
        hostId,
        ranking,
        currentTurn,
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
   * in the game and still has cards.
   */
  private playerAfter(who: string, fullOrder: string[], rest: UnoGame): string {
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
    this.handHidden.set(false);
    this.mode.set(null);
  }

  // ---- Write state ---------------------------------------------------------
  /** Takes over a new game state – locally directly, online via Firebase. */
  private commit(next: UnoGame): void {
    if (this.mode() === 'online') {
      void this.pushOnline(next);
      return;
    }

    // On the device: if the turn passes to another human, cover first.
    const current = next.players[next.currentTurn];
    if (next.status === 'playing' && current && !current.cpu) {
      if (this.manyHumans(next) && current.id !== this.lastHuman) this.handHidden.set(true);
      this.lastHuman = current.id;
    }

    this.game.set(next);
    this.maybeScheduleCpu();
  }

  private async pushOnline(next: UnoGame): Promise<void> {
    try {
      await this.channel.commit({
        hands: next.hands,
        drawPile: next.drawPile,
        discardPile: next.discardPile,
        currentColor: next.currentColor,
        direction: next.direction,
        status: next.status,
        currentTurn: next.currentTurn,
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
  /** If a computer is on turn, it draws or plays after a short pause. */
  private maybeScheduleCpu(): void {
    const g = this.game();
    if (this.mode() !== 'local' || !g || g.status !== 'playing') return;
    if (!g.players[g.currentTurn]?.cpu) return;

    this.clearCpuTimer();
    this.cpuTimer = setTimeout(() => {
      this.cpuTimer = null;
      this.cpuStep();
    }, CPU_DELAY);
  }

  private cpuStep(): void {
    const g = this.game();
    if (!g || g.status !== 'playing' || !g.players[g.currentTurn]?.cpu) return;

    const id = g.currentTurn;
    const decision = bestMove(g, id, this.level());
    const next = decision
      ? applyPlay(g, id, decision.cardId, decision.color)
      : applyDraw(g, id);

    if (!next) return;
    this.game.set(next);
    this.maybeScheduleCpu();
  }

  private clearCpuTimer(): void {
    if (this.cpuTimer) clearTimeout(this.cpuTimer);
    this.cpuTimer = null;
  }

  // ---- Internals -----------------------------------------------------------
  /** Game shell without cards – dealing only happens at the start. */
  private emptyGame(
    code: string,
    hostId: string,
    players: Record<string, UnoPlayer>,
    order: string[],
  ): UnoGame {
    const hands: Record<string, UnoCard[]> = {};
    for (const id of order) hands[id] = [];
    return {
      code,
      status: 'playing',
      hostId,
      players,
      order,
      hands,
      drawPile: [],
      discardPile: [],
      currentColor: 'r',
      direction: 1,
      currentTurn: order[0],
      winnerId: null,
      ranking: [],
      lastAction: null,
      rev: 0,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
  }

  /**
   * Firebase does not store empty arrays cleanly – fill them in when reading,
   * so that the UI never accesses "undefined".
   */
  private normalize(g: UnoGame): UnoGame {
    const players = g.players ?? {};
    const order = (g.order ?? []).filter((id) => !!players[id]);
    const hands: Record<string, UnoCard[]> = {};
    for (const id of order) hands[id] = (g.hands?.[id] ?? []).filter(Boolean);
    return {
      ...g,
      rev: g.rev ?? 0,
      order,
      players,
      hands,
      drawPile: (g.drawPile ?? []).filter(Boolean),
      discardPile: (g.discardPile ?? []).filter(Boolean),
      currentColor: g.currentColor ?? 'r',
      direction: g.direction === -1 ? -1 : 1,
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
      const snap = await withTimeout(get(ref(db, `uno/games/${code}`)));
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
