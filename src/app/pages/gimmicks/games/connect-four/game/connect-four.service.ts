import { Injectable, computed, signal } from '@angular/core';
import { get, ref, set } from 'firebase/database';
import { authReady, databaseConfigured, db } from '../../shared/firebase/firebase';
import { GameChannel, withTimeout } from '../../shared/firebase/game-channel';
import { bestMove } from './ai';
import { COLS, ROWS, dropIndex, emptyBoard, findWin, isBoardFull } from './board.utils';
import type { C4Color, C4Game, C4Level, C4Mode, C4Player } from './game.types';

const PLAYER_ID_KEY = 'c4_player_id';
const PLAYER_NAME_KEY = 'c4_player_name';
const PLAYER_EMOJI_KEY = 'c4_player_emoji';
/** Last opened online game – for returning to the page. */
const ACTIVE_CODE_KEY = 'c4_active_code';
const CODE_ALPHABET = '0123456789';

/** Fixed id of the computer opponent. */
export const CPU_ID = 'cpu';

export const AVATARS = ['🦄', '🐙', '🦈', '🐱', '🦖', '🐬', '🦊', '🐸', '🐧', '🦁'];

/** Base of the translation keys – the error signals deliver keys, not texts. */
const T = 'gimmicks.games.connectFourGame';

@Injectable({ providedIn: 'root' })
export class ConnectFourService {
  readonly playerId = this.loadPlayerId();

  /**
   * Connection to the game node in online mode: keeps the state up to date,
   * rebuilds broken listeners and writes moves only with server confirmation.
   * In computer mode the channel stays closed – `state` then serves as a
   * completely normal local signal.
   */
  private readonly channel = new GameChannel<C4Game>({
    db,
    configured: databaseConfigured,
    authReady,
    basePath: 'connect4/games',
    activeKey: ACTIVE_CODE_KEY,
    playerId: () => this.playerId,
    normalize: (raw) => this.normalize(raw as C4Game),
    canResume: (g) => !!g.players[this.playerId] && g.status !== 'finished',
  });

  /** Current game state (local or from the Realtime Database). */
  readonly game = this.channel.state;
  /** Translation key or plain text of an error message. */
  readonly error = this.channel.error;
  /** The connection has been gone for a while – the UI shows a notice. */
  readonly offline = this.channel.offline;
  /** A move is on its way and is taking noticeably long. */
  readonly pending = this.channel.pending;
  /** Players who are no longer connected. */
  readonly absent = this.channel.awayPlayers;

  /** Selected game mode – null means: start screen. */
  readonly mode = signal<C4Mode | null>(null);
  /** Difficulty of the computer. */
  readonly level = signal<C4Level>('medium');
  readonly busy = signal(false);
  /** The computer is "thinking" (short delay so that you can see the move). */
  readonly thinking = signal(false);

  private cpuTimer: ReturnType<typeof setTimeout> | null = null;

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

  // ---- Derived signals for the UI -----------------------------------------
  readonly me = computed<C4Player | null>(() => this.game()?.players[this.playerId] ?? null);

  readonly opponent = computed<C4Player | null>(() => {
    const g = this.game();
    if (!g) return null;
    return Object.values(g.players).find((p) => p.id !== this.playerId) ?? null;
  });

  readonly currentPlayer = computed<C4Player | null>(() => {
    const g = this.game();
    return g ? g.players[g.currentTurn] ?? null : null;
  });

  /** May a disc be dropped on THIS device right now? */
  readonly canPlay = computed<boolean>(() => {
    const g = this.game();
    if (!g || g.status !== 'playing') return false;
    if (this.thinking()) return false;
    return g.currentTurn === this.playerId;
  });

  /** Only relevant in online mode: am I waiting for the other player? */
  readonly waitingForOpponent = computed<boolean>(() => this.game()?.status === 'waiting');

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
   * Start a game against the computer. The human starts.
   * The stored name of the computer is only a fallback value – it is shown
   * translated (see `displayName` in the board), so that a language change
   * applies in the running game.
   */
  startComputerGame(name: string, emoji: string, level: C4Level): void {
    this.rememberProfile(name, emoji);
    this.reset();
    this.level.set(level);
    this.mode.set('computer');
    this.game.set(
      this.newLocalGame(
        { id: this.playerId, name: name.trim() || 'Spieler', emoji, color: 'red' },
        { id: CPU_ID, name: 'Computer', emoji: '🤖', color: 'yellow' },
      ),
    );
  }

  private newLocalGame(host: C4Player, guest: C4Player): C4Game {
    return {
      code: '',
      status: 'playing',
      hostId: host.id,
      cols: COLS,
      rows: ROWS,
      board: emptyBoard(),
      currentTurn: host.id,
      order: [host.id, guest.id],
      players: { [host.id]: host, [guest.id]: guest },
      winnerId: null,
      winningCells: null,
      lastMove: null,
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
      const player: C4Player = {
        id: this.playerId,
        name: name.trim() || 'Spieler',
        emoji,
        color: 'red',
      };
      const state: C4Game = {
        code,
        status: 'waiting',
        hostId: this.playerId,
        cols: COLS,
        rows: ROWS,
        board: emptyBoard(),
        currentTurn: this.playerId,
        order: [this.playerId],
        players: { [this.playerId]: player },
        winnerId: null,
        winningCells: null,
        lastMove: null,
        rev: 0,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      await withTimeout(set(ref(db, `connect4/games/${code}`), state));
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
      const snap = await withTimeout(get(ref(db, `connect4/games/${code}`)));
      if (!snap.exists()) throw new Error(`${T}.errors.notFound`);

      const state = this.normalize(snap.val() as C4Game);
      if (!state.players[this.playerId]) {
        if (Object.keys(state.players).length >= 2) throw new Error(`${T}.errors.full`);

        // pick a free color (host is red → guest is yellow)
        const taken = Object.values(state.players).map((p) => p.color);
        const color: C4Color = taken.includes('red') ? 'yellow' : 'red';
        state.players[this.playerId] = {
          id: this.playerId,
          name: name.trim() || 'Spieler',
          emoji,
          color,
        };
        state.order = [...state.order, this.playerId];
        state.status = 'playing';
        state.currentTurn = state.order[0]; // Host starts
        state.rev = (state.rev ?? 0) + 1;
        state.updatedAt = Date.now();
        await withTimeout(set(ref(db, `connect4/games/${code}`), state));
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

  // ---- Move ----------------------------------------------------------------
  /** Drops a disc into the given column (0 … COLS-1). */
  drop(col: number): void {
    const g = this.game();
    if (!g || g.status !== 'playing' || !this.canPlay()) return;

    if (g.currentTurn !== this.playerId) return;

    if (this.mode() === 'online') {
      void this.dropOnline(g, col, this.playerId);
      return;
    }

    const next = this.applyMove(g, col, this.playerId);
    if (!next) return;
    this.game.set(next);
    this.maybeScheduleComputerMove();
  }

  /** New round – the loser starts (the host in case of a draw). */
  playAgain(): void {
    const g = this.game();
    if (!g) return;
    this.clearCpuTimer();
    const starter =
      g.winnerId && g.winnerId !== 'tie'
        ? g.order.find((id) => id !== g.winnerId) ?? g.order[0]
        : g.order[0];

    const fresh = {
      board: emptyBoard(),
      status: 'playing' as const,
      currentTurn: starter,
      winnerId: null,
      winningCells: null,
      lastMove: null,
      updatedAt: Date.now(),
    };

    if (this.mode() === 'online') {
      void this.channel.commit(fresh);
      return;
    }
    this.game.set({ ...g, ...fresh });
    this.maybeScheduleComputerMove();
  }

  /**
   * Deliberately leave the running game (button in the game) – the remembered code is
   * forgotten, so coming back leads to the start screen.
   */
  leaveGame(): void {
    this.reset();
  }

  /**
   * The page is left (ngOnDestroy). Listeners are detached, but the code
   * is kept: when coming back, `resume()` finds the running game
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

  // ---- Move logic ----------------------------------------------------------
  /** Applies a move to a copy of the game state (null = invalid). */
  private applyMove(g: C4Game, col: number, playerId: string): C4Game | null {
    const target = dropIndex(g.board, col);
    if (target < 0) return null; // Column is full

    const board = [...g.board];
    board[target] = playerId;
    const winningCells = findWin(board, target, playerId);
    const full = isBoardFull(board);

    return {
      ...g,
      board,
      lastMove: target,
      updatedAt: Date.now(),
      ...(winningCells
        ? { status: 'finished' as const, winnerId: playerId, winningCells }
        : full
          ? { status: 'finished' as const, winnerId: 'tie', winningCells: null }
          : { currentTurn: this.nextPlayer(g) }),
    };
  }

  private async dropOnline(g: C4Game, col: number, playerId: string): Promise<void> {
    const next = this.applyMove(g, col, playerId);
    if (!next) return;
    // commit() reports errors itself via `error` – no try/catch needed.
    await this.channel.commit({
      board: next.board,
      lastMove: next.lastMove,
      status: next.status,
      currentTurn: next.currentTurn,
      winnerId: next.winnerId,
      winningCells: next.winningCells,
    });
  }

  /** If it is the computer's turn, it moves after a short pause. */
  private maybeScheduleComputerMove(): void {
    const g = this.game();
    if (this.mode() !== 'computer' || !g || g.status !== 'playing') return;
    if (g.currentTurn !== CPU_ID) return;

    this.thinking.set(true);
    this.clearCpuTimer();
    this.cpuTimer = setTimeout(() => {
      this.cpuTimer = null;
      const current = this.game();
      if (!current || current.status !== 'playing' || current.currentTurn !== CPU_ID) {
        this.thinking.set(false);
        return;
      }
      const col = bestMove([...current.board], CPU_ID, this.playerId, this.level());
      this.thinking.set(false);
      if (col < 0) return;
      const next = this.applyMove(current, col, CPU_ID);
      if (next) this.game.set(next);
    }, 550);
  }

  private clearCpuTimer(): void {
    if (this.cpuTimer) {
      clearTimeout(this.cpuTimer);
      this.cpuTimer = null;
    }
  }

  private nextPlayer(g: C4Game): string {
    const i = g.order.indexOf(g.currentTurn);
    return g.order[(i + 1) % g.order.length];
  }

  // ---- Online internals ----------------------------------------------------
  /**
   * Firebase does not store empty arrays/null values cleanly – fill them in
   * when reading, so that the UI never accesses "undefined".
   */
  private normalize(g: C4Game): C4Game {
    const cols = g.cols || COLS;
    const rows = g.rows || ROWS;
    return {
      ...g,
      cols,
      rows,
      order: g.order ?? [],
      players: g.players ?? {},
      winnerId: g.winnerId ?? null,
      winningCells: g.winningCells ?? null,
      lastMove: g.lastMove ?? null,
      rev: g.rev ?? 0,
      board: Array.from({ length: rows * cols }, (_, i) => (g.board?.[i] ?? '') as string),
    };
  }

  private async uniqueCode(): Promise<string> {
    for (let attempt = 0; attempt < 8; attempt++) {
      const code = this.randomCode();
      const snap = await withTimeout(get(ref(db, `connect4/games/${code}`)));
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

  /** Aborts early with a clear message if Firebase is not set up. */
  private assertConfig(): void {
    if (!databaseConfigured) throw new Error(`${T}.errors.notConfigured`);
  }

  private toMessage(e: unknown): string {
    const raw = e instanceof Error ? e.message : String(e);
    if (raw.includes('PERMISSION_DENIED')) return `${T}.errors.permission`;
    return raw;
  }
}
