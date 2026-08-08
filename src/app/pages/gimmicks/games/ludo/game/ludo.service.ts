import { Injectable, computed, signal } from '@angular/core';
import { get, onValue, ref, remove, set, update, type Unsubscribe } from 'firebase/database';
import { authReady, databaseConfigured, db } from '../../shared/firebase/firebase';
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
const CODE_ALPHABET = '0123456789';

export const AVATARS = ['🦄', '🐙', '🦈', '🐱', '🦖', '🐬', '🦊', '🐸', '🐧', '🦁'];

/** Zeichen der Computer-Gegner. */
export const CPU_EMOJI = '🤖';

export { MAX_PLAYERS, MIN_PLAYERS } from './ludo.types';

/** Basis der Übersetzungsschlüssel – die Fehler-Signale liefern Schlüssel, keine Texte. */
const T = 'gimmicks.games.ludoGame';

/** Bedenkzeit des Computers, damit man Wurf und Zug mitverfolgen kann. */
const CPU_ROLL_DELAY = 650;
const CPU_MOVE_DELAY = 750;

/**
 * "Mensch ärgere dich nicht" – aus der Whiteboard-App übernommen und wie
 * Pasch (Yahtzee) auf mehrere Mitspieler erweitert.
 *
 * Zwei Spielarten:
 *  - "local"  … 2–4 Spieler am Gerät, beliebig viele davon Computer-Gegner
 *  - "online" … 2–4 Geräte über einen vierstelligen Spiel-Code
 *
 * Der Online-Spielstand liegt in der Realtime Database unter
 * "ludo/games/<code>" – demselben Pfad, den auch die Whiteboard-App nutzt.
 */
@Injectable({ providedIn: 'root' })
export class LudoService {
  /** Aktueller Spielzustand (lokal oder aus der Realtime Database). */
  readonly game = signal<LudoGame | null>(null);
  /** Gewählte Spielart – null bedeutet: Startbildschirm. */
  readonly mode = signal<LudoMode | null>(null);
  /** Spielstärke der Computer-Gegner. */
  readonly level = signal<LudoLevel>('medium');
  /** Übersetzungsschlüssel oder Klartext einer Fehlermeldung. */
  readonly error = signal<string | null>(null);
  readonly busy = signal(false);

  readonly playerId = this.loadPlayerId();

  private gameUnsub: Unsubscribe | null = null;
  private cpuTimer: ReturnType<typeof setTimeout> | null = null;

  // ---- Abgeleitete Signale für die Oberfläche -----------------------------
  /** Der Spieler an DIESEM Gerät (im lokalen Spiel der erste Mensch). */
  readonly me = computed<LudoPlayer | null>(() => this.game()?.players[this.playerId] ?? null);

  /** Alle Mitspieler in Zugreihenfolge. */
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

  /** Endstand: die schon fertigen Spieler in Platzreihenfolge. */
  readonly ranking = computed<LudoPlayer[]>(() => {
    const g = this.game();
    if (!g) return [];
    return g.ranking.map((id) => g.players[id]).filter((p): p is LudoPlayer => !!p);
  });

  /** Hat dieser Spieler alle vier Figuren im Ziel? */
  done(id: string): boolean {
    const g = this.game();
    return !!g && isDone(g, id);
  }

  /** Erreichter Platz (1-basiert), oder 0 solange der Spieler noch unterwegs ist. */
  rankOf(id: string): number {
    const g = this.game();
    if (!g) return 0;
    const i = g.ranking.indexOf(id);
    return i < 0 ? 0 : i + 1;
  }

  /** Der Computer "überlegt" gerade. */
  readonly thinking = computed<boolean>(
    () => this.game()?.status === 'playing' && !!this.currentPlayer()?.cpu,
  );

  /** Darf an DIESEM Gerät gerade gewürfelt/gezogen werden? */
  readonly canAct = computed<boolean>(() => {
    const g = this.game();
    if (!g || g.status !== 'playing') return false;
    if (this.mode() === 'local') return !g.players[g.currentTurn]?.cpu;
    return g.currentTurn === this.playerId;
  });

  /** Die mit dem aktuellen Würfel legalen Züge des Spielers am Zug. */
  readonly legalMoves = computed<LudoMove[]>(() => {
    const g = this.game();
    if (!g || g.status !== 'playing' || g.dice === null) return [];
    return computeMoves(g, g.currentTurn, g.dice);
  });

  /** Es wurde schon gewürfelt und es darf jetzt eine Figur gezogen werden. */
  readonly mustMove = computed<boolean>(() => this.canAct() && this.legalMoves().length > 0);

  /** Gewürfelt, aber kein Zug möglich – die Zahl wird angezeigt, dann ausgesetzt. */
  readonly noMove = computed<boolean>(() => {
    const g = this.game();
    return this.canAct() && !!g && g.dice !== null && this.legalMoves().length === 0;
  });

  /** Führt das Bestätigen einer nicht setzbaren Zahl zu einem erneuten Wurf? */
  readonly passRerolls = computed<boolean>(() => {
    const g = this.game();
    if (!g || g.dice === null) return false;
    if (g.dice === 6) return true; // eine 6 bringt immer einen neuen Wurf
    return g.rollsLeft > 1 && onlySixHelps(g, g.currentTurn);
  });

  /** Darf jetzt gewürfelt werden? */
  readonly canRoll = computed<boolean>(() => {
    const g = this.game();
    return this.canAct() && !!g && g.dice === null;
  });

  /** Sitzplatz (0 … 3) eines Spielers – für Farbe und Brettgeometrie. */
  seatOf(g: LudoGame, id: string): number {
    return seatOf(g, id);
  }

  /** Brettfeld (0 … 39) einer Figur auf der Laufbahn, sonst -1. */
  trackCell(g: LudoGame, id: string, pos: LudoPos): number {
    return trackCell(g, id, pos);
  }

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
      // Der erste Mensch bekommt die gespeicherte Spieler-Id, damit "ich"
      // auf dem Brett hervorgehoben werden kann.
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
      const player: LudoPlayer = { id: this.playerId, name: name.trim() || 'Spieler', emoji };
      const state: LudoGame = {
        ...this.freshGame(code, this.playerId, { [this.playerId]: player }, [this.playerId]),
        status: 'waiting',
      };
      await this.withTimeout(set(ref(db, `ludo/games/${code}`), state));
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
      const snap = await this.withTimeout(get(ref(db, `ludo/games/${code}`)));
      if (!snap.exists()) throw new Error(`${T}.errors.notFound`);

      const state = this.normalize(snap.val() as LudoGame);
      if (!state.players[this.playerId]) {
        if (state.status !== 'waiting') throw new Error(`${T}.errors.alreadyStarted`);
        if (state.order.length >= MAX_PLAYERS) throw new Error(`${T}.errors.full`);

        const order = [...state.order, this.playerId];
        await this.withTimeout(
          update(ref(db, `ludo/games/${code}`), {
            [`players/${this.playerId}`]: {
              id: this.playerId,
              name: name.trim() || 'Spieler',
              emoji,
            },
            [`pieces/${this.playerId}`]: freshPieces(),
            order,
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

  /**
   * Der Gastgeber startet die Runde, sobald alle da sind. Erst jetzt stehen
   * die Sitzplätze fest – zu zweit sitzt man sich gegenüber, zu dritt/viert
   * werden die Ecken der Reihe nach vergeben.
   */
  async startOnlineGame(): Promise<void> {
    const g = this.game();
    if (!g || !this.isHost() || g.order.length < MIN_PLAYERS) return;
    try {
      const seats = this.assignSeats(g.order);
      const pieces: Record<string, LudoPos[]> = {};
      for (const id of g.order) pieces[id] = freshPieces();
      const started = withTurn({ ...g, seats, pieces, status: 'playing' }, g.order[0]);
      await update(ref(db, `ludo/games/${g.code}`), {
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

  // ---- Spielzüge -----------------------------------------------------------
  /**
   * Würfeln. Die Augenzahl wird immer gespeichert und angezeigt – auch wenn
   * kein Zug möglich ist. Dann setzt der Spieler über `pass()` bewusst aus.
   */
  roll(): void {
    const g = this.game();
    if (!g || !this.canRoll()) return;
    const dice = 1 + Math.floor(Math.random() * 6);
    this.commit(applyRoll(g, g.currentTurn, dice));
  }

  /**
   * Bestätigt eine nicht setzbare Augenzahl. Eine 6 (oder ein weiterer Versuch
   * mit allen Figuren in der Garage) bringt einen neuen Wurf, sonst ist der
   * nächste Spieler dran.
   */
  pass(): void {
    const g = this.game();
    if (!g || !this.noMove()) return;
    this.commit(applyPass(g, g.currentTurn));
  }

  /** Bewegt die gewählte Figur gemäß dem aktuellen Würfel. */
  move(pieceIndex: number): void {
    const g = this.game();
    if (!g || !this.canAct() || g.dice === null) return;
    const chosen = this.legalMoves().find((m) => m.pieceIndex === pieceIndex);
    if (!chosen) return;
    this.commit(applyMove(g, g.currentTurn, chosen));
  }

  /** Neue Runde – der Gewinner fängt diesmal nicht an. */
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
   * Trägt diesen Spieler aus der Online-Runde aus: seine Figuren kommen vom
   * Brett, ggf. ist der Nächste dran, notfalls wechselt die Gastgeber-Rolle.
   * Der letzte Aussteigende räumt das Spiel ganz weg.
   *
   * Die Sitzplätze der Verbleibenden bleiben, wie sie sind – sonst würden
   * ihre Figuren mitten im Spiel auf andere Felder springen.
   */
  private async removeSelfFromOnlineGame(g: LudoGame): Promise<void> {
    const path = `ludo/games/${g.code}`;
    const remaining = g.order.filter((id) => id !== this.playerId);
    const myName = g.players[this.playerId]?.name ?? 'Spieler';

    try {
      if (remaining.length === 0) {
        await remove(ref(db, path));
        return;
      }

      // Figuren, Sitzplatz und Spielerdaten des Aussteigers fallen weg.
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
      const hostId = g.hostId === this.playerId ? remaining[0] : g.hostId;

      // Bleibt nur noch einer unterwegs, sind die Plätze damit verteilt.
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
            lastLeft: { name: myName, at: Date.now() },
            updatedAt: Date.now(),
          });
          return;
        }
      }

      // War ich gerade dran, rückt der Nächste nach – mit frischem Würfel.
      const wasMyTurn = g.currentTurn === this.playerId;
      const next = wasMyTurn ? withTurn(rest, this.playerAfterMe(g.order, rest)) : rest;

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
        lastLeft: { name: myName, at: Date.now() },
        updatedAt: Date.now(),
      });
    } catch (e) {
      this.error.set(this.toMessage(e));
    }
  }

  /**
   * Der nächste Spieler nach mir in der ursprünglichen Reihenfolge, der noch
   * dabei und noch nicht im Ziel ist.
   */
  private playerAfterMe(fullOrder: string[], rest: LudoGame): string {
    const start = fullOrder.indexOf(this.playerId);
    for (let step = 1; step <= fullOrder.length; step++) {
      const candidate = fullOrder[(start + step) % fullOrder.length];
      if (rest.order.includes(candidate) && !isDone(rest, candidate)) return candidate;
    }
    return rest.order[0];
  }

  private reset(): void {
    this.gameUnsub?.();
    this.gameUnsub = null;
    this.clearCpuTimer();
    this.error.set(null);
    this.game.set(null);
    this.mode.set(null);
  }

  // ---- Zustand schreiben ---------------------------------------------------
  /** Übernimmt einen neuen Spielstand – lokal direkt, online über Firebase. */
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
      await update(ref(db, `ludo/games/${next.code}`), {
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

  // ---- Computer-Gegner -----------------------------------------------------
  /** Ist ein Computer dran, würfelt und zieht er nach kurzer Bedenkzeit. */
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

  /** Schritt 1: der Computer würfelt – die Augenzahl bleibt kurz stehen. */
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

  /** Schritt 2: der Computer zieht – oder setzt aus, wenn nichts geht. */
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

  // ---- Intern --------------------------------------------------------------
  /** Frischer Spielstand mit Sitzplätzen, leeren Garagen und erstem Zug. */
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
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    return withTurn(base, order[0]);
  }

  /** Verteilt die Sitzplätze (Ecken) auf die Spieler in Zugreihenfolge. */
  private assignSeats(order: string[]): Record<string, number> {
    const layout = SEAT_LAYOUT[order.length] ?? SEAT_LAYOUT[MAX_PLAYERS];
    const seats: Record<string, number> = {};
    order.forEach((id, i) => (seats[id] = layout[i] ?? i));
    return seats;
  }

  private subscribe(code: string): void {
    this.gameUnsub?.();
    const gameRef = ref(db, `ludo/games/${code}`);
    this.gameUnsub = onValue(
      gameRef,
      (snap) => {
        const raw = snap.val() as LudoGame | null;
        this.game.set(raw ? this.normalize(raw) : null);
      },
      (err) => this.error.set(this.toMessage(err)),
    );
  }

  /**
   * Firebase speichert keine leeren/teils gesetzten Arrays sauber – beim
   * Einlesen auffüllen, damit die Oberfläche nie auf "undefined" zugreift.
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
      order,
      players,
      seats,
      pieces,
      dice: g.dice ?? null,
      rollsLeft: g.rollsLeft ?? 1,
      winnerId: g.winnerId ?? null,
      // Ausgestiegene Mitspieler fallen auch aus der Rangliste.
      ranking: (g.ranking ?? []).filter((id) => order.includes(id)),
      lastAction: g.lastAction ?? null,
      lastLeft: g.lastLeft ?? null,
    };
  }

  private async uniqueCode(): Promise<string> {
    for (let attempt = 0; attempt < 8; attempt++) {
      const code = this.randomCode();
      const snap = await this.withTimeout(get(ref(db, `ludo/games/${code}`)));
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

  private withTimeout<R>(p: Promise<R>, ms = 12000): Promise<R> {
    return Promise.race([
      p,
      new Promise<R>((_, reject) => setTimeout(() => reject(new Error(`${T}.errors.timeout`)), ms)),
    ]);
  }

  private toMessage(e: unknown): string {
    const raw = e instanceof Error ? e.message : String(e);
    if (raw.includes('PERMISSION_DENIED')) return `${T}.errors.permission`;
    return raw;
  }
}
