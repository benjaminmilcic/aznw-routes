import { Injectable, computed, signal } from '@angular/core';
import { get, ref, set } from 'firebase/database';
import { authReady, databaseConfigured, db } from '../../shared/firebase/firebase';
import { GameChannel, withTimeout } from '../../shared/firebase/game-channel';
import { pickMove } from './schach.ai';
import { applyMove, emptyLocalGame, freshRound, kingSquare, legalMoves, startBoard } from './schach.rules';
import type { ChessColor, ChessGame, ChessLevel, ChessMode, ChessPlayer } from './game.types';

const PLAYER_ID_KEY = 'schach_player_id';
const PLAYER_NAME_KEY = 'schach_player_name';
const PLAYER_EMOJI_KEY = 'schach_player_emoji';
/** Last opened online game – for returning to the page. */
const ACTIVE_CODE_KEY = 'schach_active_code';
const CODE_ALPHABET = '0123456789';

/** Fixed id of the computer opponent. */
export const CPU_ID = 'cpu';

export const AVATARS = ['🦄', '🐙', '🦈', '🐱', '🦖', '🐬', '🦊', '🐸', '🐧', '🦁'];

/** Base of the translation keys – the error signals deliver keys, not texts. */
const T = 'gimmicks.games.chessGame';

@Injectable({ providedIn: 'root' })
export class SchachService {
  /**
   * Connection to the game node in online mode: keeps the state up to date,
   * rebuilds broken listeners and writes moves only with server confirmation.
   * In computer mode the channel stays closed – the signal then serves as
   * a completely normal local state.
   */
  private readonly channel = new GameChannel<ChessGame>({
    db,
    configured: databaseConfigured,
    authReady,
    basePath: 'schach/games',
    activeKey: ACTIVE_CODE_KEY,
    playerId: () => this.playerId,
    normalize: (raw) => this.normalize(raw as ChessGame),
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
  readonly mode = signal<ChessMode | null>(null);
  readonly level = signal<ChessLevel>('medium');
  readonly error = this.channel.error;
  readonly busy = signal(false);
  readonly thinking = signal(false);

  readonly playerId = this.loadPlayerId();

  private cpuTimer: ReturnType<typeof setTimeout> | null = null;

  readonly me = computed<ChessPlayer | null>(() => this.game()?.players[this.playerId] ?? null);

  readonly opponent = computed<ChessPlayer | null>(() => {
    const g = this.game();
    if (!g) return null;
    return Object.values(g.players).find((p) => p.id !== this.playerId) ?? null;
  });

  readonly isMyTurn = computed<boolean>(() => {
    const g = this.game();
    return !!g && g.status === 'playing' && g.currentTurn === this.playerId && !this.thinking();
  });

  readonly currentPlayer = computed<ChessPlayer | null>(() => {
    const g = this.game();
    return g ? g.players[g.currentTurn] ?? null : null;
  });

  readonly myColor = computed<ChessColor | null>(() => this.me()?.color ?? null);

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

  /**
   * Start a game against the computer. The human (white) starts.
   * The stored name of the computer is only a fallback value – it is shown
   * translated (see `displayName` in the board).
   */
  startComputerGame(name: string, emoji: string, level: ChessLevel): void {
    this.rememberProfile(name, emoji);
    this.reset();
    this.level.set(level);
    this.mode.set('computer');
    this.game.set(
      emptyLocalGame(
        { id: this.playerId, name: name.trim() || 'Spieler', emoji, color: 'white' },
        { id: CPU_ID, name: 'Computer', emoji: '🤖', color: 'black' },
      ),
    );
  }

  async createGame(name: string, emoji: string): Promise<string> {
    this.rememberProfile(name, emoji);
    this.reset();
    this.mode.set('online');
    this.busy.set(true);
    try {
      this.assertConfig();
      await authReady;
      const code = await this.uniqueCode();
      const player: ChessPlayer = {
        id: this.playerId,
        name: name.trim() || 'Spieler',
        emoji,
        color: 'white',
      };
      const state: ChessGame = {
        code,
        status: 'waiting',
        hostId: this.playerId,
        board: startBoard(),
        currentTurn: this.playerId,
        order: [this.playerId],
        players: { [this.playerId]: player },
        castling: 'KQkq',
        enPassant: null,
        check: false,
        winnerId: null,
        lastMove: null,
        rev: 0,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      await withTimeout(set(ref(db, `schach/games/${code}`), state));
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
      const snap = await withTimeout(get(ref(db, `schach/games/${code}`)));
      if (!snap.exists()) throw new Error(`${T}.errors.notFound`);

      const state = this.normalize(snap.val() as ChessGame);
      if (!state.players[this.playerId]) {
        if (Object.keys(state.players).length >= 2) throw new Error(`${T}.errors.full`);
        const taken = Object.values(state.players).map((p) => p.color);
        const color: ChessColor = taken.includes('white') ? 'black' : 'white';
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
        await withTimeout(set(ref(db, `schach/games/${code}`), state));
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

  move(from: number, to: number): void {
    const g = this.game();
    if (!g || g.status !== 'playing' || g.currentTurn !== this.playerId) return;
    const next = applyMove(g, from, to, this.playerId);
    if (!next) return;

    if (this.mode() === 'online') {
      void this.writeOnline(g.code, next);
      return;
    }
    this.game.set(next);
    this.maybeScheduleComputerTurn();
  }

  playAgain(): void {
    const g = this.game();
    if (!g) return;
    this.clearCpuTimer();
    const fresh = freshRound(g);
    if (this.mode() === 'online') {
      void this.channel.commit(fresh).catch((e) =>
        this.error.set(this.toMessage(e)),
      );
      return;
    }
    this.game.set({ ...g, ...fresh });
  }

  leaveGame(): void {
    this.reset();
  }

  legalSources(): number[] {
    const g = this.game();
    if (!g || !this.isMyTurn()) return [];
    const color = this.myColor();
    if (!color) return [];
    const set = new Set<number>();
    for (const m of legalMoves(g.board, color, g.castling, g.enPassant)) set.add(m.from);
    return [...set];
  }

  targetsFrom(from: number): number[] {
    const g = this.game();
    if (!g) return [];
    const color = this.myColor();
    if (!color) return [];
    return legalMoves(g.board, color, g.castling, g.enPassant)
      .filter((m) => m.from === from)
      .map((m) => m.to);
  }

  kingOf(color: ChessColor): number {
    const g = this.game();
    if (!g) return -1;
    return kingSquare(g.board, color);
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

  private async writeOnline(code: string, next: ChessGame): Promise<void> {
    try {
      await this.channel.commit({
        board: next.board,
        castling: next.castling,
        enPassant: next.enPassant,
        lastMove: next.lastMove,
        check: next.check,
        status: next.status,
        currentTurn: next.currentTurn,
        winnerId: next.winnerId,
        updatedAt: next.updatedAt,
      });
    } catch (e) {
      this.error.set(this.toMessage(e));
    }
  }

  private maybeScheduleComputerTurn(): void {
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
      const mv = pickMove(current, CPU_ID, this.level());
      if (!mv) {
        this.thinking.set(false);
        return;
      }
      const next = applyMove(current, mv.from, mv.to, CPU_ID);
      this.thinking.set(false);
      if (next) this.game.set(next);
    }, 280);
  }

  private clearCpuTimer(): void {
    if (this.cpuTimer) {
      clearTimeout(this.cpuTimer);
      this.cpuTimer = null;
    }
  }

  private normalize(g: ChessGame): ChessGame {
    return {
      ...g,
      rev: g.rev ?? 0,
      order: g.order ?? [],
      players: g.players ?? {},
      board: Array.from({ length: 64 }, (_, i) => g.board?.[i] ?? ''),
      castling: g.castling ?? '-',
      enPassant: g.enPassant ?? null,
      check: g.check ?? false,
      winnerId: g.winnerId ?? null,
      lastMove: g.lastMove ?? null,
    };
  }

  private async uniqueCode(): Promise<string> {
    for (let attempt = 0; attempt < 8; attempt++) {
      const code = this.randomCode();
      const snap = await withTimeout(get(ref(db, `schach/games/${code}`)));
      if (!snap.exists()) return code;
    }
    return this.randomCode();
  }

  private randomCode(): string {
    let s = '';
    for (let i = 0; i < 4; i++) s += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)];
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
