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

/** Base of the translation keys – the error signals deliver keys, not texts. */
const T = 'gimmicks.games.shipsGame';

export const AVATARS = ['🦄', '🐙', '🦈', '🐱', '🦖', '🐬', '🦊', '🐸', '🐧', '🦁'];

/**
 * "Battleship" – taken over from the whiteboard app and extended by a
 * computer opponent.
 *
 * Against the computer everything runs locally in the browser. Online the
 * game state lives in Firestore under "games/<code>" – in the same format as in
 * the whiteboard app, so that a game can also be played between both
 * apps.
 */
@Injectable({ providedIn: 'root' })
export class ShipsService {
  /** Current game state (local or from Firestore). */
  readonly game = signal<ShipsGame | null>(null);
  /** Selected game mode – null means: start screen. */
  readonly mode = signal<ShipsMode | null>(null);
  /** Difficulty of the computer. */
  readonly level = signal<ShipsLevel>('medium');
  /** Translation key or plain text of an error message. */
  readonly error = signal<string | null>(null);
  readonly busy = signal(false);
  /** The computer is "thinking" (short delay so that you can see the move). */
  readonly thinking = signal(false);

  readonly playerId = this.loadPlayerId();

  /** Child-friendly confirmation dialog instead of window.confirm. */
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

  // ---- Derived signals for the UI -----------------------------------------
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

  // ---- Player profile (remembered in localStorage) ------------------------
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
   * Starts a game against the computer. Its fleet is placed immediately (randomly),
   * the human places their own and starts afterwards.
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
    // The computer's displayed name is translated (see components),
    // this value is only the fallback.
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

  // ---- Online game: create / join -----------------------------------------
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

          // Already part of the game? Then just reconnect.
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

  // ---- Submit fleet --------------------------------------------------------
  /** Submit the placed ships. When both are done, the battle begins. */
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

    // Against the computer: its fleet is already placed, it starts right away.
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

  // ---- Shooting ------------------------------------------------------------
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
   * Applies a shot (modifies the given object) and returns it
   * – or `null` if the shot was not allowed.
   */
  private applyShot(g: ShipsGame, shooterId: string, x: number, y: number): ShipsGame | null {
    if (g.status !== 'battle' || g.turn !== shooterId) return null;

    const targetId = shooterId === g.hostId ? g.guestId : g.hostId;
    if (!targetId) return null;

    const key = cellKey(x, y);
    const shots = { ...(g.shots[shooterId] ?? {}) };
    if (shots[key]) return null; // this cell has already been shot at

    const targetFleet = g.fleets[targetId] ?? [];
    const isHit = targetFleet.some((ship) => ship.cells.includes(key));
    shots[key] = isHit ? 'hit' : 'miss';
    g.shots = { ...g.shots, [shooterId]: shots };

    if (fleetDestroyed(targetFleet, shots)) {
      g.status = 'finished';
      g.winner = shooterId;
      g.turn = null;
    } else if (isHit && EXTRA_TURN_ON_HIT) {
      g.turn = shooterId; // hit -> again
    } else {
      g.turn = targetId;
    }
    return g;
  }

  // ---- Computer's turn -----------------------------------------------------
  /** If it is the computer's turn, it shoots after a short pause. */
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
      // After a hit the computer may shoot again.
      this.maybeScheduleComputerShot();
    }, 750);
  }

  private clearCpuTimer(): void {
    if (this.cpuTimer) {
      clearTimeout(this.cpuTimer);
      this.cpuTimer = null;
    }
  }

  // ---- Play again / leave --------------------------------------------------
  /** New round with the same players – the fleets are placed again. */
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

  /** Leave the running game and go back to the start screen. */
  leaveGame(): void {
    this.reset();
  }

  /** Asks before aborting (instead of window.confirm). */
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

  // ---- Online internals ----------------------------------------------------
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

  /** Reads, changes and writes the game state in one go. */
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

  /** Fill in missing fields so that the UI never hits "undefined". */
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

  /** Shallow copy for the local move calculation. */
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

  /** Aborts early with a clear message if Firebase is not set up. */
  private assertConfig(): void {
    if (!firestoreConfigured) throw new Error(`${T}.errors.notConfigured`);
  }

  /** Prevents hanging forever if the database does not respond. */
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
