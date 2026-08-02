import { Injectable, computed, signal } from '@angular/core';
import { get, onValue, ref, remove, set, update, type Unsubscribe } from 'firebase/database';
import { authReady, databaseConfigured, db } from '../../shared/firebase/firebase';
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
const CODE_ALPHABET = '0123456789';

/** So viele Spieler passen an einen Tisch (Tabelle bleibt lesbar). */
export const MAX_PLAYERS = 6;

/** Bedenkzeiten des Computers, damit man seine Züge mitverfolgen kann. */
const CPU_ROLL_MS = 900;
const CPU_HOLD_MS = 700;
const CPU_CHOOSE_MS = 900;

export const AVATARS = ['🦄', '🐙', '🦈', '🐱', '🦖', '🐬', '🦊', '🐸', '🐧', '🦁'];
export const CPU_EMOJI = '🤖';

/** Basis der Übersetzungsschlüssel – die Fehler-Signale liefern Schlüssel, keine Texte. */
const T = 'gimmicks.games.yahtzeeGame';

@Injectable({ providedIn: 'root' })
export class YahtzeeService {
  /** Aktueller Spielzustand (lokal oder aus der Realtime Database). */
  readonly game = signal<YatzyGame | null>(null);
  /** Gewählte Spielart – null bedeutet: Startbildschirm. */
  readonly mode = signal<YMode | null>(null);
  /** Spielstärke der Computer-Gegner. */
  readonly level = signal<YLevel>('medium');
  /** Übersetzungsschlüssel oder Klartext einer Fehlermeldung. */
  readonly error = signal<string | null>(null);
  readonly busy = signal(false);

  readonly playerId = this.loadPlayerId();

  private gameUnsub: Unsubscribe | null = null;
  private cpuTimer: ReturnType<typeof setTimeout> | null = null;

  // ---- Abgeleitete Signale für die Oberfläche -----------------------------
  readonly me = computed<YPlayer | null>(() => this.game()?.players[this.playerId] ?? null);

  readonly currentPlayer = computed<YPlayer | null>(() => {
    const g = this.game();
    return g ? g.players[g.currentTurn] ?? null : null;
  });

  /** Alle Spieler in Zugreihenfolge. */
  readonly players = computed<YPlayer[]>(() => {
    const g = this.game();
    return g ? g.order.map((id) => g.players[id]).filter(Boolean) : [];
  });

  /** Der Computer ist am Zug (dann sind Würfel und Tabelle gesperrt). */
  readonly thinking = computed<boolean>(() => !!this.currentPlayer()?.cpu);

  /**
   * Bin ich dran? Am selben Gerät spielen alle Menschen abwechselnd –
   * dort zählt nur, dass gerade kein Computer würfelt.
   */
  readonly isMyTurn = computed<boolean>(() => {
    const g = this.game();
    if (!g || g.status !== 'playing') return false;
    if (this.mode() === 'local') return !g.players[g.currentTurn]?.cpu;
    return g.currentTurn === this.playerId;
  });

  /** Nur der Gastgeber darf ein Online-Spiel starten. */
  readonly isHost = computed<boolean>(() => this.game()?.hostId === this.playerId);

  // ---- Spieler-Identität ---------------------------------------------------
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

  // ---- Spiel am Gerät (Menschen + Computer) --------------------------------
  /**
   * Startet ein Spiel an diesem Gerät. `seats` kommt aus dem Startbildschirm
   * und enthält Menschen wie Computer in der gewünschten Reihenfolge.
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
      // Der erste Mensch bekommt die gespeicherte Spieler-Id, damit "ich"
      // in der Tabelle hervorgehoben werden kann.
      const id = seat.cpu ? `cpu_${i}` : humanSeat++ === 0 ? this.playerId : `p_local_${i}`;
      players[id] = { id, name: seat.name.trim() || `Spieler ${i + 1}`, emoji: seat.emoji, cpu: seat.cpu };
      order.push(id);
    }

    this.game.set(this.freshGame('', order[0], players, order));
    this.maybeScheduleCpu();
  }

  // ---- Online-Spiel: erstellen / beitreten / starten ------------------------
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
      await this.withTimeout(set(ref(db, `yatzy/games/${code}`), state));
      this.subscribe(code);
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
      const snap = await this.withTimeout(get(ref(db, `yatzy/games/${code}`)));
      if (!snap.exists()) throw new Error(`${T}.errors.notFound`);

      const state = this.normalize(snap.val() as YatzyGame);
      if (!state.players[this.playerId]) {
        if (state.status !== 'waiting') throw new Error(`${T}.errors.alreadyStarted`);
        if (state.order.length >= MAX_PLAYERS) throw new Error(`${T}.errors.full`);
        await this.withTimeout(
          update(ref(db, `yatzy/games/${code}`), {
            [`players/${this.playerId}`]: {
              id: this.playerId,
              name: name.trim() || 'Spieler',
              emoji,
            },
            order: [...state.order, this.playerId],
            [`scores/${this.playerId}`]: {},
            updatedAt: Date.now(),
          }),
        );
      }
      this.subscribe(code);
    } catch (e) {
      this.mode.set(null);
      this.error.set(this.toMessage(e));
      throw e;
    } finally {
      this.busy.set(false);
    }
  }

  /** Der Gastgeber startet die Runde, sobald alle da sind. */
  async startOnlineGame(): Promise<void> {
    const g = this.game();
    if (!g || !this.isHost() || g.order.length < 2) return;
    try {
      await update(ref(db, `yatzy/games/${g.code}`), {
        status: 'playing',
        currentTurn: g.order[0],
        updatedAt: Date.now(),
      });
    } catch (e) {
      this.error.set(this.toMessage(e));
    }
  }

  // ---- Spielzug ------------------------------------------------------------
  /** Würfelt alle nicht festgehaltenen Würfel. */
  roll(): void {
    const g = this.game();
    if (!g || g.status !== 'playing' || g.rollsLeft <= 0) return;
    if (!this.mayAct(g)) return;
    this.rollFor(g);
  }

  /** Hält einen Würfel fest oder gibt ihn wieder frei. */
  toggleHold(i: number): void {
    const g = this.game();
    if (!g || g.status !== 'playing') return;
    if (!this.mayAct(g) || !g.rolledThisTurn || g.rollsLeft === 0) return;
    this.applyHolds(
      g,
      g.held.map((x, j) => (j === i ? !x : x)),
    );
  }

  /** Trägt den aktuellen Wurf in eine Kategorie ein. */
  choose(cat: Category): void {
    const g = this.game();
    if (!g || g.status !== 'playing' || !g.rolledThisTurn) return;
    if (!this.mayAct(g)) return;
    if (g.scores[g.currentTurn]?.[cat] != null) return;
    this.chooseFor(g, cat);
  }

  /** Neue Runde – wer zuletzt am wenigsten Punkte hatte, beginnt. */
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
      void update(ref(db, `yatzy/games/${g.code}`), fresh).catch((e) =>
        this.error.set(this.toMessage(e)),
      );
      return;
    }
    this.game.set({ ...g, ...fresh });
    this.maybeScheduleCpu();
  }

  /**
   * Laufendes Spiel verlassen. Online wird man dabei aus der Runde
   * ausgetragen, damit die anderen ohne einen weiterspielen können.
   */
  leaveGame(): void {
    const g = this.game();
    if (this.mode() === 'online' && g?.players[this.playerId]) {
      void this.removeSelfFromOnlineGame(g);
    }
    this.reset();
  }

  /**
   * Trägt diesen Spieler aus der Online-Runde aus: Spalte raus, ggf. der
   * Nächste ist dran, notfalls wechselt die Gastgeber-Rolle. Der letzte
   * Aussteigende räumt das Spiel ganz weg.
   */
  private async removeSelfFromOnlineGame(g: YatzyGame): Promise<void> {
    const path = `yatzy/games/${g.code}`;
    const remaining = g.order.filter((id) => id !== this.playerId);
    const myName = g.players[this.playerId]?.name ?? 'Spieler';

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

      const wasMyTurn = g.currentTurn === this.playerId;
      await update(ref(db, path), {
        players,
        scores,
        order: remaining,
        currentTurn: wasMyTurn ? this.playerAfterMe(g, remaining) : g.currentTurn,
        hostId: g.hostId === this.playerId ? remaining[0] : g.hostId,
        // War ich gerade dran, beginnt der Nächste mit frischen Würfeln.
        ...(wasMyTurn
          ? {
              dice: this.freshDice(),
              held: this.freshHeld(),
              rollsLeft: MAX_ROLLS,
              rolledThisTurn: false,
            }
          : {}),
        lastLeft: { name: myName, at: Date.now() },
        updatedAt: Date.now(),
      });
    } catch (e) {
      this.error.set(this.toMessage(e));
    }
  }

  /** Der nächste verbliebene Spieler nach mir in der ursprünglichen Reihenfolge. */
  private playerAfterMe(g: YatzyGame, remaining: string[]): string {
    const start = g.order.indexOf(this.playerId);
    for (let step = 1; step <= g.order.length; step++) {
      const candidate = g.order[(start + step) % g.order.length];
      if (remaining.includes(candidate)) return candidate;
    }
    return remaining[0];
  }

  private reset(): void {
    this.gameUnsub?.();
    this.gameUnsub = null;
    this.clearCpuTimer();
    this.error.set(null);
    this.game.set(null);
    this.mode.set(null);
  }

  // ---- Zugausführung (lokal oder online) -----------------------------------
  /** Darf an DIESEM Gerät gerade gehandelt werden? */
  private mayAct(g: YatzyGame): boolean {
    if (this.mode() === 'local') return true; // Computer-Züge laufen intern
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
      void update(ref(db, `yatzy/games/${g.code}`), {
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

  /** Schreibt eine Teiländerung – lokal ins Signal, online in die Datenbank. */
  private patch(g: YatzyGame, changes: Partial<YatzyGame>): void {
    if (this.mode() === 'online') {
      void update(ref(db, `yatzy/games/${g.code}`), changes).catch((e) =>
        this.error.set(this.toMessage(e)),
      );
      return;
    }
    this.game.set({ ...g, ...changes });
  }

  // ---- Computer-Gegner -----------------------------------------------------
  /** Ist ein Computer am Zug, macht er nach kurzer Bedenkzeit seinen nächsten Schritt. */
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

  /** Ein einzelner Schritt: würfeln, festhalten oder eintragen. */
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
      // Erst die Auswahl zeigen, im nächsten Schritt würfeln.
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

  // ---- Online-Intern -------------------------------------------------------
  private subscribe(code: string): void {
    this.gameUnsub?.();
    this.gameUnsub = onValue(
      ref(db, `yatzy/games/${code}`),
      (snap) => {
        const raw = snap.val() as YatzyGame | null;
        this.game.set(raw ? this.normalize(raw) : null);
      },
      (err) => this.error.set(this.toMessage(err)),
    );
  }

  /** Firebase liefert leere Arrays/Objekte/Nullwerte unzuverlässig – auffüllen. */
  private normalize(g: YatzyGame): YatzyGame {
    const order = g.order ?? [];
    const scores: Record<string, ScoreMap> = {};
    for (const id of order) scores[id] = g.scores?.[id] ?? {};
    return {
      ...g,
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

  // ---- Hilfsfunktionen -----------------------------------------------------
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
      const snap = await this.withTimeout(get(ref(db, `yatzy/games/${code}`)));
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

  /** Bricht früh mit klarer Meldung ab, wenn Firebase nicht eingerichtet ist. */
  private assertConfig(): void {
    if (!databaseConfigured) throw new Error(`${T}.errors.notConfigured`);
  }

  /** Verhindert ewiges Hängen, falls die Datenbank nicht antwortet. */
  private withTimeout<TResult>(p: Promise<TResult>, ms = 12000): Promise<TResult> {
    return Promise.race([
      p,
      new Promise<TResult>((_, reject) =>
        setTimeout(() => reject(new Error(`${T}.errors.timeout`)), ms),
      ),
    ]);
  }

  private toMessage(e: unknown): string {
    const raw = e instanceof Error ? e.message : String(e);
    if (raw.includes('PERMISSION_DENIED')) return `${T}.errors.permission`;
    return raw;
  }
}
