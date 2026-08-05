import { Injectable, computed, signal } from '@angular/core';
import {
  doc,
  getDoc,
  onSnapshot,
  runTransaction,
  setDoc,
  type Unsubscribe,
} from 'firebase/firestore';
import { authReady, firestoreConfigured, firestoreDb } from '../../shared/firebase/firebase';
import { cellKey, fleetDestroyed, randomFleet, remainingSizes, sunkCells } from './board.utils';
import { bestShot } from './ships.ai';
import {
  CPU_ID,
  EXTRA_TURN_ON_HIT,
  type PlacedShip,
  type ShipsGame,
  type ShipsLevel,
  type ShipsMode,
  type ShipsPlayer,
  type ShotResult,
} from './ships.types';

const PLAYER_ID_KEY = 'ships_player_id';
const PLAYER_NAME_KEY = 'ships_player_name';
const PLAYER_EMOJI_KEY = 'ships_player_emoji';
const CODE_ALPHABET = '0123456789';

/** Basis der Übersetzungsschlüssel – die Fehler-Signale liefern Schlüssel, keine Texte. */
const T = 'gimmicks.games.shipsGame';

export const AVATARS = ['🦄', '🐙', '🦈', '🐱', '🦖', '🐬', '🦊', '🐸', '🐧', '🦁'];

/**
 * "Schiffe versenken" – aus der Whiteboard-App übernommen und um einen
 * Computer-Gegner erweitert.
 *
 * Gegen den Computer läuft alles lokal im Browser. Online liegt der
 * Spielstand in Firestore unter "games/<code>" – im selben Format wie in
 * der Whiteboard-App, sodass eine Partie auch zwischen beiden Apps
 * gespielt werden kann.
 */
@Injectable({ providedIn: 'root' })
export class ShipsService {
  /** Aktueller Spielstand (lokal oder aus Firestore). */
  readonly game = signal<ShipsGame | null>(null);
  /** Gewählte Spielart – null bedeutet: Startbildschirm. */
  readonly mode = signal<ShipsMode | null>(null);
  /** Spielstärke des Computers. */
  readonly level = signal<ShipsLevel>('medium');
  /** Übersetzungsschlüssel oder Klartext einer Fehlermeldung. */
  readonly error = signal<string | null>(null);
  readonly busy = signal(false);
  /** Der Computer "überlegt" gerade (kurze Verzögerung, damit man den Zug sieht). */
  readonly thinking = signal(false);

  readonly playerId = this.loadPlayerId();

  /** Kindgerechter Bestätigungs-Dialog statt window.confirm. */
  readonly confirmDialog = signal<{
    emoji: string;
    titleKey: string;
    messageKey: string;
    yesKey: string;
    noKey: string;
    onYes: () => void;
  } | null>(null);

  private gameUnsub: Unsubscribe | null = null;
  private cpuTimer: ReturnType<typeof setTimeout> | null = null;

  // ---- Abgeleitete Signale für die Oberfläche -----------------------------
  readonly me = computed<ShipsPlayer | null>(() => this.game()?.players[this.playerId] ?? null);

  readonly opponentId = computed<string | null>(() => {
    const g = this.game();
    if (!g) return null;
    return this.playerId === g.hostId ? g.guestId : g.hostId;
  });

  readonly opponent = computed<ShipsPlayer | null>(() => {
    const g = this.game();
    const id = this.opponentId();
    return g && id ? g.players[id] ?? null : null;
  });

  readonly isMyTurn = computed<boolean>(() => {
    const g = this.game();
    return !!g && g.status === 'battle' && g.turn === this.playerId && !this.thinking();
  });

  readonly amWinner = computed<boolean>(() => this.game()?.winner === this.playerId);

  // ---- Spieler-Profil (gemerkt im localStorage) ---------------------------
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

  // ---- Spiel gegen den Computer -------------------------------------------
  /**
   * Startet ein Spiel gegen den Computer. Seine Flotte steht sofort (zufällig),
   * der Mensch platziert seine eigene und beginnt danach.
   */
  startComputerGame(name: string, emoji: string, level: ShipsLevel): void {
    this.rememberProfile(name, emoji);
    this.reset();
    this.level.set(level);
    this.mode.set('computer');

    const human: ShipsPlayer = {
      id: this.playerId,
      name: name.trim() || 'Kapitän',
      emoji,
      ready: false,
    };
    // Der angezeigte Name des Computers wird übersetzt (siehe Komponenten),
    // dieser Wert ist nur der Rückfallwert.
    const cpu: ShipsPlayer = { id: CPU_ID, name: 'Computer', emoji: '🤖', ready: true };

    this.game.set({
      code: '',
      status: 'setup',
      hostId: this.playerId,
      guestId: CPU_ID,
      players: { [this.playerId]: human, [CPU_ID]: cpu },
      fleets: { [CPU_ID]: randomFleet() },
      shots: {},
      turn: null,
      winner: null,
      createdAt: Date.now(),
    });
  }

  // ---- Online-Spiel: erstellen / beitreten --------------------------------
  async createGame(name: string, emoji: string): Promise<string> {
    this.rememberProfile(name, emoji);
    this.reset();
    this.mode.set('online');
    this.busy.set(true);
    try {
      this.assertConfig();
      await authReady;
      const code = await this.uniqueCode();
      const player: ShipsPlayer = {
        id: this.playerId,
        name: name.trim() || 'Kapitän',
        emoji,
        ready: false,
      };
      const state: ShipsGame = {
        code,
        status: 'waiting',
        hostId: this.playerId,
        guestId: null,
        players: { [this.playerId]: player },
        fleets: {},
        shots: {},
        turn: null,
        winner: null,
        createdAt: Date.now(),
      };
      await this.withTimeout(setDoc(this.ref(code), state));
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
      const snap = await this.withTimeout(getDoc(this.ref(code)));
      if (!snap.exists()) throw new Error(`${T}.errors.notFound`);

      const player: ShipsPlayer = {
        id: this.playerId,
        name: name.trim() || 'Kapitän',
        emoji,
        ready: false,
      };

      let full = false;
      await this.withTimeout(
        runTransaction(firestoreDb, async (tx) => {
          const current = await tx.get(this.ref(code));
          if (!current.exists()) throw new Error(`${T}.errors.notFound`);
          const g = this.normalize(current.data() as ShipsGame);

          // Schon Teil des Spiels? Dann nur wieder verbinden.
          if (g.players[this.playerId]) return;
          if (g.guestId || g.status !== 'waiting') {
            full = true;
            return;
          }
          tx.update(this.ref(code), {
            guestId: this.playerId,
            status: 'setup',
            [`players.${this.playerId}`]: player,
          });
        }),
      );
      if (full) throw new Error(`${T}.errors.full`);
      this.subscribe(code);
    } catch (e) {
      this.mode.set(null);
      this.error.set(this.toMessage(e));
      throw e;
    } finally {
      this.busy.set(false);
    }
  }

  // ---- Flotte abschicken ---------------------------------------------------
  /** Platzierte Schiffe abgeben. Sind beide fertig, beginnt der Kampf. */
  submitFleet(ships: PlacedShip[]): void {
    const g = this.game();
    if (!g || g.status !== 'setup') return;

    if (this.mode() === 'online') {
      void this.transact(g.code, (state) => {
        state.fleets[this.playerId] = ships;
        state.players[this.playerId] = { ...state.players[this.playerId], ready: true };
        const bothReady =
          !!state.guestId &&
          !!state.players[state.hostId]?.ready &&
          !!state.players[state.guestId]?.ready;
        if (bothReady) {
          state.status = 'battle';
          state.turn = state.hostId;
        }
        return state;
      });
      return;
    }

    // Gegen den Computer: Seine Flotte steht schon, es geht sofort los.
    this.game.set({
      ...g,
      status: 'battle',
      fleets: { ...g.fleets, [this.playerId]: ships },
      players: {
        ...g.players,
        [this.playerId]: { ...g.players[this.playerId], ready: true },
      },
      turn: this.playerId,
    });
  }

  // ---- Schießen ------------------------------------------------------------
  shoot(x: number, y: number): void {
    const g = this.game();
    if (!g || g.status !== 'battle' || g.turn !== this.playerId || this.thinking()) return;

    if (this.mode() === 'online') {
      void this.transact(g.code, (state) => this.applyShot(state, this.playerId, x, y) ?? state);
      return;
    }

    const next = this.applyShot(this.clone(g), this.playerId, x, y);
    if (!next) return;
    this.game.set(next);
    this.maybeScheduleComputerShot();
  }

  /**
   * Wendet einen Schuss an (verändert das übergebene Objekt) und gibt es
   * zurück – oder `null`, wenn der Schuss nicht erlaubt war.
   */
  private applyShot(g: ShipsGame, shooterId: string, x: number, y: number): ShipsGame | null {
    if (g.status !== 'battle' || g.turn !== shooterId) return null;

    const targetId = shooterId === g.hostId ? g.guestId : g.hostId;
    if (!targetId) return null;

    const key = cellKey(x, y);
    const shots = { ...(g.shots[shooterId] ?? {}) };
    if (shots[key]) return null; // dieses Feld wurde schon beschossen

    const targetFleet = g.fleets[targetId] ?? [];
    const isHit = targetFleet.some((ship) => ship.cells.includes(key));
    shots[key] = isHit ? 'hit' : 'miss';
    g.shots = { ...g.shots, [shooterId]: shots };

    if (fleetDestroyed(targetFleet, shots)) {
      g.status = 'finished';
      g.winner = shooterId;
      g.turn = null;
    } else if (isHit && EXTRA_TURN_ON_HIT) {
      g.turn = shooterId; // Treffer -> nochmal
    } else {
      g.turn = targetId;
    }
    return g;
  }

  // ---- Zug des Computers ---------------------------------------------------
  /** Ist der Computer dran, schießt er nach kurzer Bedenkzeit. */
  private maybeScheduleComputerShot(): void {
    const g = this.game();
    if (this.mode() !== 'computer' || !g || g.status !== 'battle' || g.turn !== CPU_ID) {
      this.thinking.set(false);
      return;
    }

    this.thinking.set(true);
    this.clearCpuTimer();
    this.cpuTimer = setTimeout(() => {
      this.cpuTimer = null;
      const current = this.game();
      if (!current || current.status !== 'battle' || current.turn !== CPU_ID) {
        this.thinking.set(false);
        return;
      }

      const humanFleet = current.fleets[this.playerId] ?? [];
      const shots = current.shots[CPU_ID] ?? {};
      const target = bestShot(
        shots,
        sunkCells(humanFleet, shots),
        remainingSizes(humanFleet, shots),
        this.level(),
      );
      if (!target) {
        this.thinking.set(false);
        return;
      }

      const next = this.applyShot(this.clone(current), CPU_ID, target.x, target.y);
      this.thinking.set(false);
      if (!next) return;
      this.game.set(next);
      // Nach einem Treffer darf der Computer nochmal.
      this.maybeScheduleComputerShot();
    }, 750);
  }

  private clearCpuTimer(): void {
    if (this.cpuTimer) {
      clearTimeout(this.cpuTimer);
      this.cpuTimer = null;
    }
  }

  // ---- Nochmal spielen / verlassen -----------------------------------------
  /** Neue Runde mit denselben Mitspielern – die Flotten werden neu gelegt. */
  playAgain(): void {
    const g = this.game();
    if (!g) return;
    this.clearCpuTimer();
    this.thinking.set(false);

    if (this.mode() === 'online') {
      void this.transact(g.code, (state) => {
        for (const id of Object.keys(state.players)) {
          state.players[id] = { ...state.players[id], ready: false };
        }
        state.status = 'setup';
        state.fleets = {};
        state.shots = {};
        state.turn = null;
        state.winner = null;
        return state;
      });
      return;
    }

    this.game.set({
      ...g,
      status: 'setup',
      players: {
        ...g.players,
        [this.playerId]: { ...g.players[this.playerId], ready: false },
      },
      fleets: { [CPU_ID]: randomFleet() },
      shots: {},
      turn: null,
      winner: null,
    });
  }

  /** Laufendes Spiel verlassen und zurück zum Startbildschirm. */
  leaveGame(): void {
    this.reset();
  }

  /** Fragt vor dem Abbrechen nach (statt window.confirm). */
  askLeave(): void {
    this.confirmDialog.set({
      emoji: '🚪',
      titleKey: `${T}.confirm.leaveTitle`,
      messageKey: `${T}.confirm.leaveMessage`,
      yesKey: `${T}.confirm.leaveYes`,
      noKey: `${T}.confirm.leaveNo`,
      onYes: () => this.leaveGame(),
    });
  }

  confirmYes(): void {
    const dialog = this.confirmDialog();
    this.confirmDialog.set(null);
    dialog?.onYes();
  }

  confirmNo(): void {
    this.confirmDialog.set(null);
  }

  private reset(): void {
    this.gameUnsub?.();
    this.gameUnsub = null;
    this.clearCpuTimer();
    this.thinking.set(false);
    this.error.set(null);
    this.confirmDialog.set(null);
    this.game.set(null);
    this.mode.set(null);
  }

  // ---- Online-Intern -------------------------------------------------------
  private ref(code: string) {
    return doc(firestoreDb, 'games', code);
  }

  private subscribe(code: string): void {
    this.gameUnsub?.();
    this.gameUnsub = onSnapshot(
      this.ref(code),
      (snap) => {
        this.game.set(snap.exists() ? this.normalize(snap.data() as ShipsGame) : null);
      },
      (err) => this.error.set(this.toMessage(err)),
    );
  }

  /** Liest, verändert und schreibt den Spielstand in einem Rutsch. */
  private async transact(
    code: string,
    change: (state: ShipsGame) => ShipsGame,
  ): Promise<void> {
    try {
      await this.withTimeout(
        runTransaction(firestoreDb, async (tx) => {
          const snap = await tx.get(this.ref(code));
          if (!snap.exists()) return;
          tx.set(this.ref(code), change(this.normalize(snap.data() as ShipsGame)));
        }),
      );
    } catch (e) {
      this.error.set(this.toMessage(e));
    }
  }

  /** Fehlende Felder ergänzen, damit die Oberfläche nie auf "undefined" trifft. */
  private normalize(g: ShipsGame): ShipsGame {
    const fleets: Record<string, PlacedShip[]> = {};
    for (const [id, ships] of Object.entries(g.fleets ?? {})) {
      fleets[id] = (ships ?? []).map((s) => ({ ...s, cells: s.cells ?? [] }));
    }
    const shots: Record<string, Record<string, ShotResult>> = {};
    for (const [id, list] of Object.entries(g.shots ?? {})) {
      shots[id] = list ?? {};
    }
    return {
      ...g,
      guestId: g.guestId ?? null,
      players: g.players ?? {},
      fleets,
      shots,
      turn: g.turn ?? null,
      winner: g.winner ?? null,
    };
  }

  /** Flache Kopie für die lokale Zug-Berechnung. */
  private clone(g: ShipsGame): ShipsGame {
    return {
      ...g,
      players: { ...g.players },
      fleets: { ...g.fleets },
      shots: { ...g.shots },
    };
  }

  private async uniqueCode(): Promise<string> {
    for (let attempt = 0; attempt < 8; attempt++) {
      const code = this.randomCode();
      const snap = await this.withTimeout(getDoc(this.ref(code)));
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
    if (!firestoreConfigured) throw new Error(`${T}.errors.notConfigured`);
  }

  /** Verhindert ewiges Hängen, falls die Datenbank nicht antwortet. */
  private withTimeout<R>(p: Promise<R>, ms = 12000): Promise<R> {
    return Promise.race([
      p,
      new Promise<R>((_, reject) =>
        setTimeout(() => reject(new Error(`${T}.errors.timeout`)), ms),
      ),
    ]);
  }

  private toMessage(e: unknown): string {
    const raw = e instanceof Error ? e.message : String(e);
    if (raw.includes('permission-denied') || raw.includes('PERMISSION_DENIED')) {
      return `${T}.errors.permission`;
    }
    return raw;
  }
}
