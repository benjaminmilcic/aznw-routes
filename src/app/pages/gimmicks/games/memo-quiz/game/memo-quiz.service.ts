import { Injectable, computed, signal } from '@angular/core';
import { get, ref, set } from 'firebase/database';
import { authReady, databaseConfigured, db } from '../../shared/firebase/firebase';
import { GameChannel, withTimeout } from '../../shared/firebase/game-channel';
import { CARD_MOTIFS } from '../data/card-motifs';
import type { MemoCard, MemoGame, MemoLevel, MemoMode, MemoPlayer } from './memo.types';

const PLAYER_ID_KEY = 'memo_player_id';
const PLAYER_NAME_KEY = 'memo_player_name';
const PLAYER_AVATAR_KEY = 'memo_player_avatar';
/** Last opened online game – for returning to the page. */
const ACTIVE_CODE_KEY = 'memo_active_code';
const CODE_ALPHABET = '0123456789';

/** How long a failed attempt stays face up. */
const MISMATCH_MS = 1300;
/** Thinking time of the computer before each revealed card. */
const CPU_DELAY_MS = 850;

/** Fixed id of the computer opponent. */
export const CPU_ID = 'cpu';

/** How reliably the computer remembers a card it has seen. */
const RECALL: Record<MemoLevel, number> = {
  easy: 0.35,
  medium: 0.7,
  hard: 1,
};

/** Base of the translation keys – the error signals deliver keys, not texts. */
const T = 'gimmicks.games.memoQuizGame';

@Injectable({ providedIn: 'root' })
export class MemoQuizService {
  /**
   * Connection to the game node in online mode: keeps the state up to date,
   * rebuilds broken listeners and writes moves only with server confirmation.
   * In computer mode the channel stays closed – the signal then serves as
   * a completely normal local state.
   */
  private readonly channel = new GameChannel<MemoGame>({
    db,
    configured: databaseConfigured,
    authReady,
    basePath: 'memory/games',
    activeKey: ACTIVE_CODE_KEY,
    playerId: () => this.playerId,
    normalize: (raw) => this.normalize(raw as MemoGame),
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
  readonly mode = signal<MemoMode | null>(null);
  /** Memory strength of the computer. */
  readonly level = signal<MemoLevel>('medium');
  /** Translation key or plain text of an error message. */
  readonly error = this.channel.error;
  readonly busy = signal(false);

  readonly playerId = this.loadPlayerId();

  private mismatchTimer: ReturnType<typeof setTimeout> | null = null;
  private cpuTimer: ReturnType<typeof setTimeout> | null = null;

  /** What the computer has kept from the cards already seen. */
  private readonly cpuMemory = new Map<number, string>();

  // ---- Derived signals for the UI -----------------------------------------
  readonly me = computed<MemoPlayer | null>(() => this.game()?.players[this.playerId] ?? null);

  readonly opponent = computed<MemoPlayer | null>(() => {
    const g = this.game();
    if (!g) return null;
    return Object.values(g.players).find((p) => p.id !== this.playerId) ?? null;
  });

  readonly currentPlayer = computed<MemoPlayer | null>(() => {
    const g = this.game();
    return g ? g.players[g.currentTurn] ?? null : null;
  });

  /** The computer is thinking (the cards are locked then). */
  readonly thinking = computed<boolean>(() => {
    const g = this.game();
    return this.mode() === 'computer' && !!g && g.status === 'playing' && g.currentTurn === CPU_ID;
  });

  /** May a card be turned over on THIS device right now? */
  readonly canFlip = computed<boolean>(() => {
    const g = this.game();
    if (!g || g.status !== 'playing') return false;
    if (g.resolving || (g.flipped?.length ?? 0) >= 2) return false;
    return g.currentTurn === this.playerId;
  });

  // ---- Player identity -----------------------------------------------------
  get savedName(): string {
    return localStorage.getItem(PLAYER_NAME_KEY) ?? '';
  }

  get savedAvatar(): string {
    return localStorage.getItem(PLAYER_AVATAR_KEY) ?? CARD_MOTIFS[0].id;
  }

  private rememberProfile(name: string, avatar: string): void {
    const trimmed = name.trim();
    if (trimmed) localStorage.setItem(PLAYER_NAME_KEY, trimmed);
    if (avatar) localStorage.setItem(PLAYER_AVATAR_KEY, avatar);
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
   * translated, so that a language change applies in the running game.
   */
  startComputerGame(name: string, avatar: string, pairs: number, level: MemoLevel): void {
    this.rememberProfile(name, avatar);
    this.reset();
    this.level.set(level);
    this.mode.set('computer');
    this.game.set({
      code: '',
      status: 'playing',
      hostId: this.playerId,
      pairs,
      board: this.buildBoard(pairs),
      flipped: [],
      resolving: false,
      currentTurn: this.playerId,
      order: [this.playerId, CPU_ID],
      players: {
        [this.playerId]: { id: this.playerId, name: name.trim() || 'Spieler', avatar, score: 0 },
        [CPU_ID]: { id: CPU_ID, name: 'Computer', avatar: 'robot', score: 0 },
      },
      winnerId: null,
      rev: 0,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
  }

  // ---- Online game: create / join ------------------------------------------
  async createGame(name: string, avatar: string, pairs: number): Promise<string> {
    this.rememberProfile(name, avatar);
    this.reset();
    this.mode.set('online');
    this.busy.set(true);
    try {
      this.assertConfig();
      await authReady;
      const code = await this.uniqueCode();
      const state: MemoGame = {
        code,
        status: 'waiting',
        hostId: this.playerId,
        pairs,
        board: this.buildBoard(pairs),
        flipped: [],
        resolving: false,
        currentTurn: this.playerId,
        order: [this.playerId],
        players: {
          [this.playerId]: { id: this.playerId, name: name.trim() || 'Spieler', avatar, score: 0 },
        },
        winnerId: null,
        rev: 0,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      await withTimeout(set(ref(db, `memory/games/${code}`), state));
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

  async joinGame(rawCode: string, name: string, avatar: string): Promise<void> {
    const code = rawCode.trim();
    this.rememberProfile(name, avatar);
    this.reset();
    this.mode.set('online');
    this.busy.set(true);
    try {
      this.assertConfig();
      await authReady;
      const snap = await withTimeout(get(ref(db, `memory/games/${code}`)));
      if (!snap.exists()) throw new Error(`${T}.errors.notFound`);

      const state = this.normalize(snap.val() as MemoGame);
      if (!state.players[this.playerId]) {
        if (Object.keys(state.players).length >= 2) throw new Error(`${T}.errors.full`);
        state.players[this.playerId] = {
          id: this.playerId,
          name: name.trim() || 'Spieler',
          avatar,
          score: 0,
        };
        state.order = [...state.order, this.playerId];
        state.status = 'playing';
        state.currentTurn = state.order[0]; // Host starts
        state.rev = (state.rev ?? 0) + 1;
        state.updatedAt = Date.now();
        await withTimeout(set(ref(db, `memory/games/${code}`), state));
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
  /** Reveals the card at this position. */
  flip(index: number): void {
    if (!this.canFlip()) return;
    if (this.mode() === 'online') {
      void this.flipOnline(index);
      return;
    }
    this.flipLocal(index, this.playerId);
  }

  /** New round – the loser starts (the host in case of a draw). */
  playAgain(): void {
    const g = this.game();
    if (!g) return;
    this.clearTimers();
    this.cpuMemory.clear();

    const players: Record<string, MemoPlayer> = {};
    for (const [id, p] of Object.entries(g.players)) players[id] = { ...p, score: 0 };
    const starter =
      g.winnerId && g.winnerId !== 'tie'
        ? g.order.find((id) => id !== g.winnerId) ?? g.order[0]
        : g.order[0];

    const fresh = {
      board: this.buildBoard(g.pairs),
      flipped: [],
      resolving: false,
      status: 'playing' as const,
      currentTurn: starter,
      winnerId: null,
      players,
      updatedAt: Date.now(),
    };

    if (this.mode() === 'online') {
      void this.channel.commit(fresh).catch((e) =>
        this.error.set(this.toMessage(e)),
      );
      return;
    }
    this.game.set({ ...g, ...fresh });
    this.maybeScheduleCpu();
  }

  /** Leave the running game and go back to the start screen. */
  leaveGame(): void {
    this.reset();
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
    this.clearTimers();
    this.cpuMemory.clear();
    this.mode.set(null);
  }

  private clearTimers(): void {
    if (this.mismatchTimer) clearTimeout(this.mismatchTimer);
    if (this.cpuTimer) clearTimeout(this.cpuTimer);
    this.mismatchTimer = null;
    this.cpuTimer = null;
  }

  // ---- Move logic (computer game, completely local) ------------------------
  private flipLocal(index: number, playerId: string): void {
    const g = this.game();
    if (!g || g.status !== 'playing' || g.resolving) return;
    if (g.currentTurn !== playerId) return;
    if (g.flipped.length >= 2 || g.flipped.includes(index)) return;
    if (g.board[index].matchedBy) return;

    this.rememberCard(index, g.board[index].motifId);
    const flipped = [...g.flipped, index];

    if (flipped.length < 2) {
      this.game.set({ ...g, flipped, updatedAt: Date.now() });
      this.maybeScheduleCpu();
      return;
    }

    const [a, b] = flipped;
    if (g.board[a].motifId === g.board[b].motifId) {
      // Pair found: point for the player, they may continue.
      const board = g.board.map((c, i) => (i === a || i === b ? { ...c, matchedBy: playerId } : c));
      const players = { ...g.players };
      players[playerId] = { ...players[playerId], score: players[playerId].score + 1 };
      const finished = board.every((c) => c.matchedBy);
      this.cpuMemory.delete(a);
      this.cpuMemory.delete(b);

      this.game.set({
        ...g,
        board,
        players,
        flipped: [],
        resolving: false,
        updatedAt: Date.now(),
        ...(finished ? { status: 'finished' as const, winnerId: this.computeWinner(players) } : {}),
      });
      this.maybeScheduleCpu();
      return;
    }

    // No pair: show both cards briefly, then turn them over – it is the other player's turn.
    this.game.set({ ...g, flipped, resolving: true, updatedAt: Date.now() });
    const next = this.nextPlayer(g);
    this.mismatchTimer = setTimeout(() => {
      this.mismatchTimer = null;
      const current = this.game();
      if (!current) return;
      this.game.set({
        ...current,
        flipped: [],
        resolving: false,
        currentTurn: next,
        updatedAt: Date.now(),
      });
      this.maybeScheduleCpu();
    }, MISMATCH_MS);
  }

  // ---- Computer opponent ---------------------------------------------------
  /** The computer remembers a revealed card – reliably depending on its strength. */
  private rememberCard(index: number, motifId: string): void {
    if (this.mode() !== 'computer') return;
    if (Math.random() < RECALL[this.level()]) this.cpuMemory.set(index, motifId);
  }

  /** If it is the computer's turn, it reveals the next card after a short pause. */
  private maybeScheduleCpu(): void {
    const g = this.game();
    if (this.mode() !== 'computer' || !g || g.status !== 'playing' || g.resolving) return;
    if (g.currentTurn !== CPU_ID || g.flipped.length >= 2) return;

    if (this.cpuTimer) clearTimeout(this.cpuTimer);
    this.cpuTimer = setTimeout(() => {
      this.cpuTimer = null;
      const current = this.game();
      if (!current || current.status !== 'playing' || current.currentTurn !== CPU_ID) return;
      const index =
        current.flipped.length === 0 ? this.cpuFirstPick(current) : this.cpuSecondPick(current);
      if (index === null) return;
      this.flipLocal(index, CPU_ID);
    }, CPU_DELAY_MS);
  }

  /** First card: play a known pair, otherwise reveal an unknown card. */
  private cpuFirstPick(g: MemoGame): number | null {
    const open = this.openIndices(g);
    if (open.length === 0) return null;

    // Does the computer already know two matching cards?
    const byMotif = new Map<string, number[]>();
    for (const i of open) {
      const motif = this.cpuMemory.get(i);
      if (!motif) continue;
      const list = byMotif.get(motif) ?? [];
      list.push(i);
      byMotif.set(motif, list);
    }
    for (const list of byMotif.values()) {
      if (list.length >= 2) return list[0];
    }

    // Otherwise rather reveal something new – that gives knowledge for later.
    const unknown = open.filter((i) => !this.cpuMemory.has(i));
    const pool = unknown.length > 0 ? unknown : open;
    return pool[Math.floor(Math.random() * pool.length)];
  }

  /** Second card: matching known card, otherwise an unknown one. */
  private cpuSecondPick(g: MemoGame): number | null {
    const first = g.flipped[0];
    const motif = g.board[first].motifId;
    const open = this.openIndices(g).filter((i) => i !== first);
    if (open.length === 0) return null;

    const known = open.find((i) => this.cpuMemory.get(i) === motif);
    if (known !== undefined) return known;

    const unknown = open.filter((i) => !this.cpuMemory.has(i));
    const pool = unknown.length > 0 ? unknown : open;
    return pool[Math.floor(Math.random() * pool.length)];
  }

  /** All cards that have not been found yet and are not face up. */
  private openIndices(g: MemoGame): number[] {
    const out: number[] = [];
    g.board.forEach((c, i) => {
      if (!c.matchedBy && !g.flipped.includes(i)) out.push(i);
    });
    return out;
  }

  // ---- Move logic (online) -------------------------------------------------
  private async flipOnline(index: number): Promise<void> {
    const g = this.game();
    if (!g) return;
    const flipped = [...g.flipped, index];

    try {
      if (flipped.length < 2) {
        await this.channel.commit({ flipped, updatedAt: Date.now() });
        return;
      }

      const [a, b] = flipped;
      if (g.board[a].motifId === g.board[b].motifId) {
        const board: MemoCard[] = g.board.map((c, i) =>
          i === a || i === b ? { ...c, matchedBy: this.playerId } : c,
        );
        const players = { ...g.players };
        players[this.playerId] = {
          ...players[this.playerId],
          score: players[this.playerId].score + 1,
        };
        const finished = board.every((c) => c.matchedBy);
        await this.channel.commit({
          board,
          players,
          flipped: [],
          resolving: false,
          updatedAt: Date.now(),
          ...(finished
            ? { status: 'finished', winnerId: this.computeWinner(players) }
            : {}),
        });
        return;
      }

      // No pair: show briefly, then it is the other player's turn.
      await this.channel.commit({ flipped, resolving: true, updatedAt: Date.now() });
      const next = this.nextPlayer(g);
      this.mismatchTimer = setTimeout(() => {
        this.mismatchTimer = null;
        void this.unflipOnline(next);
      }, MISMATCH_MS);
    } catch (e) {
      this.error.set(this.toMessage(e));
    }
  }

  /**
   * Turns the two non-matching cards back over and passes the turn.
   *
   * This write happens with a delay – if it gets lost, the game would be
   * stuck for BOTH with `resolving: true` (nobody may tap then).
   * That's why it is repeated once before the notice bar takes over.
   */
  private async unflipOnline(next: string, retry = true): Promise<void> {
    const ok = await this.channel.commit({
      flipped: [],
      resolving: false,
      currentTurn: next,
    });
    if (!ok && retry) {
      this.mismatchTimer = setTimeout(() => {
        this.mismatchTimer = null;
        void this.unflipOnline(next, false);
      }, MISMATCH_MS);
    }
  }

  /**
   * Firebase does not store empty arrays/null values cleanly – fill them in
   * when reading, so that the UI never accesses "undefined".
   */
  private normalize(g: MemoGame): MemoGame {
    return {
      ...g,
      rev: g.rev ?? 0,
      flipped: g.flipped ?? [],
      order: g.order ?? [],
      players: g.players ?? {},
      winnerId: g.winnerId ?? null,
      resolving: g.resolving ?? false,
      board: (g.board ?? []).map((c) => ({ motifId: c.motifId, matchedBy: c.matchedBy ?? null })),
    };
  }

  // ---- Helper functions ----------------------------------------------------
  private computeWinner(players: Record<string, MemoPlayer>): string {
    const list = Object.values(players);
    const top = Math.max(...list.map((p) => p.score));
    const leaders = list.filter((p) => p.score === top);
    return leaders.length === 1 ? leaders[0].id : 'tie';
  }

  private nextPlayer(g: MemoGame): string {
    const i = g.order.indexOf(g.currentTurn);
    return g.order[(i + 1) % g.order.length];
  }

  private buildBoard(pairs: number): MemoCard[] {
    const motifs = this.shuffle(CARD_MOTIFS).slice(0, pairs);
    const cards: MemoCard[] = [];
    for (const m of motifs) {
      cards.push({ motifId: m.id, matchedBy: null });
      cards.push({ motifId: m.id, matchedBy: null });
    }
    return this.shuffle(cards);
  }

  private shuffle<TItem>(arr: readonly TItem[]): TItem[] {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  private async uniqueCode(): Promise<string> {
    for (let attempt = 0; attempt < 8; attempt++) {
      const code = this.randomCode();
      const snap = await withTimeout(get(ref(db, `memory/games/${code}`)));
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
