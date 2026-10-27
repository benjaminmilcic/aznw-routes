import { Injectable, computed, signal } from '@angular/core';
import { get, ref, set } from 'firebase/database';
import { authReady, databaseConfigured, db } from '../../shared/firebase/firebase';
import { GameChannel, withTimeout } from '../../shared/firebase/game-channel';
import { pickMove } from './backgammon.ai';
import {
  anyMove,
  applyMove,
  applyPass,
  applyRoll,
  freshRound,
  legalSources,
  startBoard,
  targetsFrom,
} from './backgammon.rules';
import type { BgColor, BgGame, BgLevel, BgMode, BgMove, BgPlayer } from './game.types';

const PLAYER_ID_KEY = 'bg_player_id';
const PLAYER_NAME_KEY = 'bg_player_name';
const PLAYER_EMOJI_KEY = 'bg_player_emoji';
/** Last opened online game – for returning to the page. */
const ACTIVE_CODE_KEY = 'bg_active_code';
const CODE_ALPHABET = '0123456789';

/** Fixed id of the computer opponent. */
export const CPU_ID = 'cpu';

export const AVATARS = ['🦄', '🐙', '🦈', '🐱', '🦖', '🐬', '🦊', '🐸', '🐧', '🦁'];

/** Base of the translation keys – the error signals deliver keys, not texts. */
const T = 'gimmicks.games.backgammonGame';

@Injectable({ providedIn: 'root' })
export class BackgammonService {
  /**
   * Connection to the game node in online mode: keeps the state up to date,
   * rebuilds broken listeners and writes moves only with server confirmation.
   * In computer mode the channel stays closed – the signal then serves as
   * a completely normal local state.
   */
  private readonly channel = new GameChannel<BgGame>({
    db,
    configured: databaseConfigured,
    authReady,
    basePath: 'backgammon/games',
    activeKey: ACTIVE_CODE_KEY,
    playerId: () => this.playerId,
    normalize: (raw) => this.normalize(raw as BgGame),
    canResume: (game) => !!game.players[this.playerId] && game.status !== 'finished',
  });

  /** Current game state (local or from the Realtime Database). */
  readonly game = this.channel.state;
  /** The connection has been gone for a while – the UI shows a notice. */
  readonly offline = this.channel.offline;
  /** A move is on its way and is taking noticeably long. */
  readonly pending = this.channel.pending;
  /** Players who are no longer connected. */
  readonly absent = this.channel.awayPlayers;

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
  /** Selected game mode – null means: start screen. */
  readonly mode = signal<BgMode | null>(null);
  /** Difficulty of the computer. */
  readonly level = signal<BgLevel>('medium');
  /** Translation key or plain text of an error message. */
  readonly error = this.channel.error;
  readonly busy = signal(false);
  /** The computer is "thinking" (short delay so that you can see the move). */
  readonly thinking = signal(false);

  readonly playerId = this.loadPlayerId();

  private cpuTimer: ReturnType<typeof setTimeout> | null = null;

  // ---- Derived signals for the UI -----------------------------------------
  readonly me = computed<BgPlayer | null>(() => this.game()?.players[this.playerId] ?? null);

  readonly opponent = computed<BgPlayer | null>(() => {
    const g = this.game();
    if (!g) return null;
    return Object.values(g.players).find((p) => p.id !== this.playerId) ?? null;
  });

  readonly isMyTurn = computed<boolean>(() => {
    const g = this.game();
    return !!g && g.status === 'playing' && g.currentTurn === this.playerId && !this.thinking();
  });

  readonly currentPlayer = computed<BgPlayer | null>(() => {
    const g = this.game();
    return g ? g.players[g.currentTurn] ?? null : null;
  });

  /** Color of the player on THIS device. */
  readonly myColor = computed<BgColor | null>(() => this.me()?.color ?? null);

  /** Is rolling the dice allowed right now? */
  readonly canRoll = computed<boolean>(() => {
    const g = this.game();
    return this.isMyTurn() && !!g && !g.rolled;
  });

  /** Rolled, but no move possible → the turn must be passed on. */
  readonly noMoves = computed<boolean>(() => {
    const g = this.game();
    if (!g || !this.isMyTurn() || !g.rolled || g.diceLeft.length === 0) return false;
    const color = this.myColor();
    if (!color) return false;
    return !anyMove(g.board, { white: g.barWhite, black: g.barBlack }, color, g.diceLeft);
  });

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

  // ---- Game against the computer ------------------------------------------
  /**
   * Start a game against the computer. The human (white) starts.
   * The stored name of the computer is only a fallback value – it is shown
   * translated (see `displayName` in the board), so that a language change
   * applies in the running game.
   */
  startComputerGame(name: string, emoji: string, level: BgLevel): void {
    this.rememberProfile(name, emoji);
    this.reset();
    this.level.set(level);
    this.mode.set('computer');
    this.game.set(
      this.newLocalGame(
        { id: this.playerId, name: name.trim() || 'Spieler', emoji, color: 'white' },
        { id: CPU_ID, name: 'Computer', emoji: '🤖', color: 'black' },
      ),
    );
  }

  private newLocalGame(host: BgPlayer, guest: BgPlayer): BgGame {
    return {
      code: '',
      status: 'playing',
      hostId: host.id,
      board: startBoard(),
      barWhite: 0,
      barBlack: 0,
      offWhite: 0,
      offBlack: 0,
      currentTurn: host.id,
      order: [host.id, guest.id],
      players: { [host.id]: host, [guest.id]: guest },
      dice: [],
      diceLeft: [],
      rolled: false,
      winnerId: null,
      rev: 0,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
  }

  // ---- Online game: create / join ------------------------------------------
  async createGame(name: string, emoji: string): Promise<string> {
    this.rememberProfile(name, emoji);
    this.reset();
    this.mode.set('online');
    this.busy.set(true);
    try {
      this.assertConfig();
      await authReady;
      const code = await this.uniqueCode();
      const player: BgPlayer = {
        id: this.playerId,
        name: name.trim() || 'Spieler',
        emoji,
        color: 'white',
      };
      const state: BgGame = {
        code,
        status: 'waiting',
        hostId: this.playerId,
        board: startBoard(),
        barWhite: 0,
        barBlack: 0,
        offWhite: 0,
        offBlack: 0,
        currentTurn: this.playerId,
        order: [this.playerId],
        players: { [this.playerId]: player },
        dice: [],
        diceLeft: [],
        rolled: false,
        winnerId: null,
        rev: 0,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      await withTimeout(set(ref(db, `backgammon/games/${code}`), state));
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
      const snap = await withTimeout(get(ref(db, `backgammon/games/${code}`)));
      if (!snap.exists()) throw new Error(`${T}.errors.notFound`);

      const state = this.normalize(snap.val() as BgGame);
      if (!state.players[this.playerId]) {
        if (Object.keys(state.players).length >= 2) throw new Error(`${T}.errors.full`);

        const taken = Object.values(state.players).map((p) => p.color);
        const color: BgColor = taken.includes('white') ? 'black' : 'white';
        state.players[this.playerId] = {
          id: this.playerId,
          name: name.trim() || 'Spieler',
          emoji,
          color,
        };
        state.order = [...state.order, this.playerId];
        state.status = 'playing';
        state.currentTurn = state.order[0];
        state.rev = (state.rev ?? 0) + 1;
        state.updatedAt = Date.now();
        await withTimeout(set(ref(db, `backgammon/games/${code}`), state));
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

  // ---- Moves ---------------------------------------------------------------
  /** Rolls the dice (only the player whose turn it is and who has not rolled yet). */
  roll(): void {
    const g = this.game();
    if (!g || g.status !== 'playing' || g.currentTurn !== this.playerId || g.rolled) return;

    if (this.mode() === 'online') {
      void this.rollOnline(g);
      return;
    }

    this.game.set(applyRoll(g));
  }

  /**
   * Performs a single checker move.
   * @param from Source point 0–23, or -1 for "from the bar".
   * @param to   Target point 0–23, or -1 for "bear off".
   * @param die  The die value used for it.
   */
  move(from: number, to: number, die: number): void {
    const g = this.game();
    if (!g || g.status !== 'playing' || g.currentTurn !== this.playerId) return;

    if (this.mode() === 'online') {
      void this.moveOnline(g, from, to, die);
      return;
    }

    const next = applyMove(g, from, to, die, this.playerId);
    if (!next) return;
    this.game.set(next);
    this.maybeScheduleComputerTurn();
  }

  /** Passes the turn on if no move is possible. */
  passTurn(): void {
    const g = this.game();
    if (!g || g.status !== 'playing' || g.currentTurn !== this.playerId) return;

    if (this.mode() === 'online') {
      void this.channel.commit({
        dice: [],
        diceLeft: [],
        rolled: false,
        currentTurn: g.order[(g.order.indexOf(g.currentTurn) + 1) % g.order.length],
        updatedAt: Date.now(),
      }).catch((e) => this.error.set(this.toMessage(e)));
      return;
    }

    this.game.set(applyPass(g));
    this.maybeScheduleComputerTurn();
  }

  /** New round – the loser of the last round starts. */
  playAgain(): void {
    const g = this.game();
    if (!g) return;
    this.clearCpuTimer();
    const starter =
      g.winnerId && g.order.includes(g.winnerId)
        ? g.order.find((id) => id !== g.winnerId) ?? g.order[0]
        : g.order[0];
    const fresh = freshRound(starter);

    if (this.mode() === 'online') {
      void this.channel.commit(fresh).catch((e) =>
        this.error.set(this.toMessage(e)),
      );
      return;
    }
    this.game.set({ ...g, ...fresh });
    this.maybeScheduleComputerTurn();
  }

  /** Leave the running game and go back to the start screen. */
  leaveGame(): void {
    this.reset();
  }

  // ---- Helpers for the UI -------------------------------------------------
  legalSources(): number[] {
    const g = this.game();
    if (!g) return [];
    return legalSources(g, this.playerId);
  }

  targetsFrom(from: number): BgMove[] {
    const g = this.game();
    if (!g) return [];
    return targetsFrom(g, this.playerId, from);
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
    this.thinking.set(false);
    this.mode.set(null);
  }

  private async rollOnline(g: BgGame): Promise<void> {
    const rolled = applyRoll(g);
    try {
      await this.channel.commit({
        dice: rolled.dice,
        diceLeft: rolled.diceLeft,
        rolled: true,
        updatedAt: rolled.updatedAt,
      });
    } catch (e) {
      this.error.set(this.toMessage(e));
    }
  }

  private async moveOnline(g: BgGame, from: number, to: number, die: number): Promise<void> {
    const next = applyMove(g, from, to, die, this.playerId);
    if (!next) return;
    try {
      await this.channel.commit({
        board: next.board,
        barWhite: next.barWhite,
        barBlack: next.barBlack,
        offWhite: next.offWhite,
        offBlack: next.offBlack,
        dice: next.dice,
        diceLeft: next.diceLeft,
        rolled: next.rolled,
        status: next.status,
        currentTurn: next.currentTurn,
        winnerId: next.winnerId,
        updatedAt: next.updatedAt,
      });
    } catch (e) {
      this.error.set(this.toMessage(e));
    }
  }

  /** If it is the computer's turn, it rolls/moves after a short pause. */
  private maybeScheduleComputerTurn(): void {
    const g = this.game();
    if (this.mode() !== 'computer' || !g || g.status !== 'playing') return;
    if (g.currentTurn !== CPU_ID) return;

    this.thinking.set(true);
    this.clearCpuTimer();

    if (!g.rolled) {
      this.cpuTimer = setTimeout(() => {
        this.cpuTimer = null;
        const current = this.game();
        if (!current || current.status !== 'playing' || current.currentTurn !== CPU_ID) {
          this.thinking.set(false);
          return;
        }
        this.game.set(applyRoll(current));
        this.maybeScheduleComputerTurn();
      }, 500);
      return;
    }

    this.cpuTimer = setTimeout(() => {
      this.cpuTimer = null;
      const current = this.game();
      if (!current || current.status !== 'playing' || current.currentTurn !== CPU_ID) {
        this.thinking.set(false);
        return;
      }

      const color = current.players[CPU_ID]?.color;
      const canMove =
        !!color &&
        current.diceLeft.length > 0 &&
        anyMove(
          current.board,
          { white: current.barWhite, black: current.barBlack },
          color,
          current.diceLeft,
        );

      if (!canMove) {
        this.thinking.set(false);
        this.game.set(applyPass(current));
        return;
      }

      const mv = pickMove(current, CPU_ID, this.level());
      if (!mv) {
        this.thinking.set(false);
        this.game.set(applyPass(current));
        return;
      }

      const next = applyMove(current, mv.from, mv.to, mv.die, CPU_ID);
      if (!next) {
        this.thinking.set(false);
        return;
      }
      this.game.set(next);
      if (next.status === 'playing' && next.currentTurn === CPU_ID) {
        this.maybeScheduleComputerTurn();
      } else {
        this.thinking.set(false);
      }
    }, 550);
  }

  private clearCpuTimer(): void {
    if (this.cpuTimer) {
      clearTimeout(this.cpuTimer);
      this.cpuTimer = null;
    }
  }

  // ---- Online internals ----------------------------------------------------
  /**
   * Firebase does not store empty arrays/null values cleanly – fill them in
   * when reading, so that the UI never accesses "undefined".
   */
  private normalize(g: BgGame): BgGame {
    return {
      ...g,
      rev: g.rev ?? 0,
      order: g.order ?? [],
      players: g.players ?? {},
      board: Array.from({ length: 24 }, (_, i) => g.board?.[i] ?? 0),
      barWhite: g.barWhite ?? 0,
      barBlack: g.barBlack ?? 0,
      offWhite: g.offWhite ?? 0,
      offBlack: g.offBlack ?? 0,
      dice: g.dice ?? [],
      diceLeft: g.diceLeft ?? [],
      rolled: g.rolled ?? false,
      winnerId: g.winnerId ?? null,
    };
  }

  private async uniqueCode(): Promise<string> {
    for (let attempt = 0; attempt < 8; attempt++) {
      const code = this.randomCode();
      const snap = await withTimeout(get(ref(db, `backgammon/games/${code}`)));
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
