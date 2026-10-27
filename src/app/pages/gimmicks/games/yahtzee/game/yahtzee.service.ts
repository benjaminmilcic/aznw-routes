import { Injectable, computed, signal } from '@angular/core';
import { get, ref, remove, set, update } from 'firebase/database';
import { authReady, databaseConfigured, db } from '../../shared/firebase/firebase';
import { ABSENT_GRACE_MS, GameChannel, withTimeout } from '../../shared/firebase/game-channel';
import { chooseCategory, chooseHolds, shouldRollAgain } from './ai';
import {
  CATEGORIES,
  DICE_COUNT,
  MAX_ROLLS,
  scoreFor,
  totalsFor,
  type Category,
  type ScoreMap,
} from './scoring';
import type { YLevel, YMode, YPlayer, YatzyGame } from './yahtzee.types';

const PLAYER_ID_KEY = 'yatzy_player_id';
const PLAYER_NAME_KEY = 'yatzy_player_name';
const PLAYER_EMOJI_KEY = 'yatzy_player_emoji';
/** Last opened online game – for returning to the page. */
const ACTIVE_CODE_KEY = 'yatzy_active_code';
const CODE_ALPHABET = '0123456789';

/** This many players fit at one table (the table stays readable). */
export const MAX_PLAYERS = 6;

/** Thinking times of the computer, so that you can follow its moves. */
const CPU_ROLL_MS = 900;
const CPU_HOLD_MS = 700;
const CPU_CHOOSE_MS = 900;

export const AVATARS = ['🦄', '🐙', '🦈', '🐱', '🦖', '🐬', '🦊', '🐸', '🐧', '🦁'];
export const CPU_EMOJI = '🤖';

/** Base of the translation keys – the error signals deliver keys, not texts. */
const T = 'gimmicks.games.yahtzeeGame';

@Injectable({ providedIn: 'root' })
export class YahtzeeService {
  /**
   * Connection to the game node in online mode: keeps the state up to date,
   * rebuilds broken listeners and writes moves only with server confirmation.
   * In computer mode the channel stays closed – the signal then serves as
   * a completely normal local state.
   */
  private readonly channel = new GameChannel<YatzyGame>({
    db,
    configured: databaseConfigured,
    authReady,
    basePath: 'yatzy/games',
    activeKey: ACTIVE_CODE_KEY,
    playerId: () => this.playerId,
    normalize: (raw) => this.normalize(raw as YatzyGame),
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
  readonly mode = signal<YMode | null>(null);
  /** Difficulty of the computer opponents. */
  readonly level = signal<YLevel>('medium');
  /** Translation key or plain text of an error message. */
  readonly error = this.channel.error;
  readonly busy = signal(false);

  readonly playerId = this.loadPlayerId();

  private cpuTimer: ReturnType<typeof setTimeout> | null = null;

  // ---- Derived signals for the UI -----------------------------------------
  readonly me = computed<YPlayer | null>(() => this.game()?.players[this.playerId] ?? null);

  readonly currentPlayer = computed<YPlayer | null>(() => {
    const g = this.game();
    return g ? g.players[g.currentTurn] ?? null : null;
  });

  /** All players in turn order. */
  readonly players = computed<YPlayer[]>(() => {
    const g = this.game();
    return g ? g.order.map((id) => g.players[id]).filter(Boolean) : [];
  });

  /** The computer is on turn (dice and table are locked then). */
  readonly thinking = computed<boolean>(() => !!this.currentPlayer()?.cpu);

  /**
   * Is it my turn? On the same device all humans play in turn –
   * there it only matters that no computer is rolling right now.
   */
  readonly isMyTurn = computed<boolean>(() => {
    const g = this.game();
    if (!g || g.status !== 'playing') return false;
    if (this.mode() === 'local') return !g.players[g.currentTurn]?.cpu;
    return g.currentTurn === this.playerId;
  });

  /** Only the host may start an online game. */
  readonly isHost = computed<boolean>(() => this.game()?.hostId === this.playerId);

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
    level: YLevel = 'medium',
  ): void {
    const first = seats.find((s) => !s.cpu);
    if (first) this.rememberProfile(first.name, first.emoji);
    this.reset();
    this.level.set(level);
    this.mode.set('local');

    const players: Record<string, YPlayer> = {};
    const order: string[] = [];
    let humanSeat = 0;
    for (const [i, seat] of seats.entries()) {
      // The first human gets the stored player id, so that "me"
      // can be highlighted in the table.
      const id = seat.cpu ? `cpu_${i}` : humanSeat++ === 0 ? this.playerId : `p_local_${i}`;
      players[id] = { id, name: seat.name.trim() || `Spieler ${i + 1}`, emoji: seat.emoji, cpu: seat.cpu };
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
      const player: YPlayer = { id: this.playerId, name: name.trim() || 'Spieler', emoji };
      const state: YatzyGame = {
        ...this.freshGame(code, this.playerId, { [this.playerId]: player }, [this.playerId]),
        status: 'waiting',
      };
      await withTimeout(set(ref(db, `yatzy/games/${code}`), state));
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
      const snap = await withTimeout(get(ref(db, `yatzy/games/${code}`)));
      if (!snap.exists()) throw new Error(`${T}.errors.notFound`);

      const state = this.normalize(snap.val() as YatzyGame);
      if (!state.players[this.playerId]) {
        if (state.status !== 'waiting') throw new Error(`${T}.errors.alreadyStarted`);
        if (state.order.length >= MAX_PLAYERS) throw new Error(`${T}.errors.full`);
        await withTimeout(
          update(ref(db, `yatzy/games/${code}`), {
            [`players/${this.playerId}`]: {
              id: this.playerId,
              name: name.trim() || 'Spieler',
              emoji,
            },
            order: [...state.order, this.playerId],
            [`scores/${this.playerId}`]: {},
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
    if (!g || !this.isHost() || g.order.length < 2) return;
    try {
      await this.channel.commit({
        status: 'playing',
        currentTurn: g.order[0],
        updatedAt: Date.now(),
      });
    } catch (e) {
      this.error.set(this.toMessage(e));
    }
  }

  // ---- Move ----------------------------------------------------------------
  /** Rolls all dice that are not held. */
  roll(): void {
    const g = this.game();
    if (!g || g.status !== 'playing' || g.rollsLeft <= 0) return;
    if (!this.mayAct(g)) return;
    this.rollFor(g);
  }

  /** Holds a die or releases it again. */
  toggleHold(i: number): void {
    const g = this.game();
    if (!g || g.status !== 'playing') return;
    if (!this.mayAct(g) || !g.rolledThisTurn || g.rollsLeft === 0) return;
    this.applyHolds(
      g,
      g.held.map((x, j) => (j === i ? !x : x)),
    );
  }

  /** Fills the current roll into a category. */
  choose(cat: Category): void {
    const g = this.game();
    if (!g || g.status !== 'playing' || !g.rolledThisTurn) return;
    if (!this.mayAct(g)) return;
    if (g.scores[g.currentTurn]?.[cat] != null) return;
    this.chooseFor(g, cat);
  }

  /** New round – whoever had the fewest points last time starts. */
  playAgain(): void {
    const g = this.game();
    if (!g) return;
    this.clearCpuTimer();

    const scores: Record<string, ScoreMap> = {};
    for (const id of g.order) scores[id] = {};
    const starter = [...g.order].sort(
      (a, b) => totalsFor(g.scores[a] ?? {}).total - totalsFor(g.scores[b] ?? {}).total,
    )[0];

    const fresh = {
      status: 'playing' as const,
      currentTurn: starter,
      dice: this.freshDice(),
      held: this.freshHeld(),
      rollsLeft: MAX_ROLLS,
      rolledThisTurn: false,
      rollCount: g.rollCount,
      scores,
      winnerId: null,
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
   * Removes a player from the online round: column out, the next player
   * may be on turn, and if needed the host role changes. The last one
   * to leave removes the game completely.
   */
  private async removeFromOnlineGame(g: YatzyGame, who: string): Promise<void> {
    const path = `yatzy/games/${g.code}`;
    const remaining = g.order.filter((id) => id !== who);
    const leftName = g.players[who]?.name ?? 'Spieler';

    try {
      if (remaining.length === 0) {
        await remove(ref(db, path));
        return;
      }

      const players: Record<string, YPlayer> = {};
      const scores: Record<string, ScoreMap> = {};
      for (const id of remaining) {
        players[id] = g.players[id];
        scores[id] = g.scores[id] ?? {};
      }

      const wasHisTurn = g.currentTurn === who;
      await update(ref(db, path), {
        players,
        scores,
        order: remaining,
        currentTurn: wasHisTurn ? this.playerAfter(who, g, remaining) : g.currentTurn,
        hostId: g.hostId === who ? remaining[0] : g.hostId,
        // If it was their turn, the next player starts with fresh dice.
        ...(wasHisTurn
          ? {
              dice: this.freshDice(),
              held: this.freshHeld(),
              rollsLeft: MAX_ROLLS,
              rolledThisTurn: false,
            }
          : {}),
        lastLeft: { name: leftName, at: Date.now() },
        rev: (g.rev ?? 0) + 1,
        updatedAt: Date.now(),
      });
    } catch (e) {
      this.error.set(this.toMessage(e));
    }
  }

  /** The next remaining player after `who` in the original order. */
  private playerAfter(who: string, g: YatzyGame, remaining: string[]): string {
    const start = g.order.indexOf(who);
    for (let step = 1; step <= g.order.length; step++) {
      const candidate = g.order[(start + step) % g.order.length];
      if (remaining.includes(candidate)) return candidate;
    }
    return remaining[0];
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

  // ---- Move execution (local or online) ------------------------------------
  /** May you act on THIS device right now? */
  private mayAct(g: YatzyGame): boolean {
    if (this.mode() === 'local') return true; // Computer moves run internally
    return g.currentTurn === this.playerId;
  }

  private rollFor(g: YatzyGame): void {
    const first = !g.rolledThisTurn;
    const dice = g.dice.map((v, i) => (!first && g.held[i] ? v : this.rnd()));
    this.patch(g, {
      dice,
      held: first ? this.freshHeld() : g.held,
      rollsLeft: g.rollsLeft - 1,
      rolledThisTurn: true,
      rollCount: g.rollCount + 1,
      updatedAt: Date.now(),
    });
    this.maybeScheduleCpu();
  }

  private applyHolds(g: YatzyGame, held: boolean[]): void {
    this.patch(g, { held, updatedAt: Date.now() });
    this.maybeScheduleCpu();
  }

  private chooseFor(g: YatzyGame, cat: Category): void {
    const playerId = g.currentTurn;
    const value = scoreFor(cat, g.dice);
    const scores: Record<string, ScoreMap> = {
      ...g.scores,
      [playerId]: { ...(g.scores[playerId] ?? {}), [cat]: value },
    };
    const finished = g.order.every((id) => CATEGORIES.every((c) => scores[id]?.[c.key] != null));

    const base = {
      held: this.freshHeld(),
      rollsLeft: MAX_ROLLS,
      rolledThisTurn: false,
      updatedAt: Date.now(),
    };

    if (this.mode() === 'online') {
      void this.channel.commit({
        ...base,
        [`scores/${playerId}/${cat}`]: value,
        ...(finished
          ? { status: 'finished', winnerId: this.computeWinner(scores, g.order) }
          : { currentTurn: this.nextPlayer(g) }),
      }).catch((e) => this.error.set(this.toMessage(e)));
      return;
    }

    this.game.set({
      ...g,
      ...base,
      scores,
      ...(finished
        ? { status: 'finished' as const, winnerId: this.computeWinner(scores, g.order) }
        : { currentTurn: this.nextPlayer(g) }),
    });
    this.maybeScheduleCpu();
  }

  /** Writes a partial change – locally into the signal, online into the database. */
  private patch(g: YatzyGame, changes: Partial<YatzyGame>): void {
    if (this.mode() === 'online') {
      void this.channel.commit(changes).catch((e) =>
        this.error.set(this.toMessage(e)),
      );
      return;
    }
    this.game.set({ ...g, ...changes });
  }

  // ---- Computer opponent ---------------------------------------------------
  /** If a computer is on turn, it takes its next step after a short pause. */
  private maybeScheduleCpu(): void {
    const g = this.game();
    if (this.mode() !== 'local' || !g || g.status !== 'playing') return;
    if (!g.players[g.currentTurn]?.cpu) return;

    const scores = g.scores[g.currentTurn] ?? {};
    const delay = !g.rolledThisTurn
      ? CPU_ROLL_MS
      : g.rollsLeft > 0 && shouldRollAgain(g.dice, scores)
        ? CPU_HOLD_MS
        : CPU_CHOOSE_MS;

    this.clearCpuTimer();
    this.cpuTimer = setTimeout(() => {
      this.cpuTimer = null;
      this.cpuStep();
    }, delay);
  }

  /** A single step: roll, hold or fill in. */
  private cpuStep(): void {
    const g = this.game();
    if (!g || g.status !== 'playing' || !g.players[g.currentTurn]?.cpu) return;
    const scores = g.scores[g.currentTurn] ?? {};

    if (!g.rolledThisTurn) {
      this.rollFor(g);
      return;
    }

    if (g.rollsLeft > 0 && shouldRollAgain(g.dice, scores)) {
      const holds = chooseHolds(g.dice, scores, this.level());
      // Show the selection first, roll in the next step.
      if (holds.some((h, i) => h !== g.held[i])) {
        this.applyHolds(g, holds);
        return;
      }
      this.rollFor(g);
      return;
    }

    this.chooseFor(g, chooseCategory(g.dice, scores, this.level()));
  }

  private clearCpuTimer(): void {
    if (this.cpuTimer) clearTimeout(this.cpuTimer);
    this.cpuTimer = null;
  }

  // ---- Online internals ----------------------------------------------------
  /** Firebase delivers empty arrays/objects/null values unreliably – fill them in. */
  private normalize(g: YatzyGame): YatzyGame {
    const order = g.order ?? [];
    const scores: Record<string, ScoreMap> = {};
    for (const id of order) scores[id] = g.scores?.[id] ?? {};
    return {
      ...g,
      rev: g.rev ?? 0,
      order,
      players: g.players ?? {},
      scores,
      dice: Array.from({ length: DICE_COUNT }, (_, i) => g.dice?.[i] ?? 1),
      held: Array.from({ length: DICE_COUNT }, (_, i) => g.held?.[i] ?? false),
      rollsLeft: g.rollsLeft ?? MAX_ROLLS,
      rolledThisTurn: g.rolledThisTurn ?? false,
      rollCount: g.rollCount ?? 0,
      winnerId: g.winnerId ?? null,
      lastLeft: g.lastLeft ?? null,
    };
  }

  // ---- Helper functions ----------------------------------------------------
  private freshGame(
    code: string,
    hostId: string,
    players: Record<string, YPlayer>,
    order: string[],
  ): YatzyGame {
    const scores: Record<string, ScoreMap> = {};
    for (const id of order) scores[id] = {};
    return {
      code,
      status: 'playing',
      hostId,
      players,
      order,
      currentTurn: order[0],
      dice: this.freshDice(),
      held: this.freshHeld(),
      rollsLeft: MAX_ROLLS,
      rolledThisTurn: false,
      rollCount: 0,
      scores,
      winnerId: null,
      rev: 0,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
  }

  private computeWinner(scores: Record<string, ScoreMap>, order: string[]): string {
    const totals = order.map((id) => ({ id, total: totalsFor(scores[id] ?? {}).total }));
    const max = Math.max(...totals.map((t) => t.total));
    const winners = totals.filter((t) => t.total === max);
    return winners.length === 1 ? winners[0].id : 'tie';
  }

  private nextPlayer(g: YatzyGame): string {
    const i = g.order.indexOf(g.currentTurn);
    return g.order[(i + 1) % g.order.length];
  }

  private freshDice(): number[] {
    return Array.from({ length: DICE_COUNT }, () => 1);
  }

  private freshHeld(): boolean[] {
    return Array.from({ length: DICE_COUNT }, () => false);
  }

  private rnd(): number {
    return Math.floor(Math.random() * 6) + 1;
  }

  private async uniqueCode(): Promise<string> {
    for (let attempt = 0; attempt < 8; attempt++) {
      const code = this.randomCode();
      const snap = await withTimeout(get(ref(db, `yatzy/games/${code}`)));
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
