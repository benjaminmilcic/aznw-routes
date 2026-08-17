import { Injectable, computed, signal } from '@angular/core';
import { get, ref, set } from 'firebase/database';
import { authReady, databaseConfigured, db } from '../../shared/firebase/firebase';
import { GameChannel, withTimeout } from '../../shared/firebase/game-channel';
import { pickAction } from './mill.ai';
import {
  applyMovePiece,
  applyPlace,
  applyRemove,
  canSelect as canSelectPiece,
  emptyBoard,
  emptyLocalGame,
  freshRound,
  phaseOf,
  removable,
  seatOf,
  targetsFor,
} from './mill.rules';
import { PIECES, POINTS_COUNT, type MillGame, type MillLevel, type MillMode, type MillPlayer } from './game.types';

const PLAYER_ID_KEY = 'mill_player_id';
const PLAYER_NAME_KEY = 'mill_player_name';
const PLAYER_EMOJI_KEY = 'mill_player_emoji';
/** Zuletzt geöffnetes Online-Spiel – für die Rückkehr auf die Seite. */
const ACTIVE_CODE_KEY = 'mill_active_code';
const CODE_ALPHABET = '0123456789';

/** Feste Id des Computer-Gegners. */
export const CPU_ID = 'cpu';

export const AVATARS = ['🦄', '🐙', '🦈', '🐱', '🦖', '🐬', '🦊', '🐸', '🐧', '🦁'];

/** Basis der Übersetzungsschlüssel – die Fehler-Signale liefern Schlüssel, keine Texte. */
const T = 'gimmicks.games.millGame';

@Injectable({ providedIn: 'root' })
export class MillService {
  /**
   * Verbindung zum Spielknoten im Online-Modus: hält den Zustand aktuell, baut
   * abgebrochene Listener neu auf und schreibt Züge nur mit Server-Bestätigung.
   * Im Computer-Modus bleibt der Kanal geschlossen – das Signal dient dann als
   * ganz normaler lokaler Zustand.
   */
  private readonly channel = new GameChannel<MillGame>({
    db,
    configured: databaseConfigured,
    authReady,
    basePath: 'mill/games',
    activeKey: ACTIVE_CODE_KEY,
    playerId: () => this.playerId,
    normalize: (raw) => this.normalize(raw as MillGame),
    canResume: (game) => !!game.players[this.playerId] && game.status !== 'finished',
  });

  /** Aktueller Spielzustand (lokal oder aus der Realtime Database). */
  readonly game = this.channel.state;
  /** Verbindung ist länger weg – die Oberfläche zeigt einen Hinweis. */
  readonly offline = this.channel.offline;
  /** Ein Zug ist unterwegs und dauert auffällig lange. */
  readonly pending = this.channel.pending;
  /** Mitspieler, die nicht mehr verbunden sind. */
  readonly absent = this.channel.awayPlayers;

  /** Stand von Hand neu vom Server holen (Knopf im Hinweisbalken). */
  resync(): Promise<void> {
    return this.channel.resync();
  }

  dismissError(): void {
    this.channel.dismissError();
  }

  /**
   * Zurück in eine laufende Online-Partie – nach einem Neuladen oder wenn die
   * Seite zwischenzeitlich verlassen wurde.
   */
  async resume(): Promise<boolean> {
    if (this.game()) return false;
    const ok = await this.channel.resume();
    if (ok) this.mode.set('online');
    return ok;
  }
  readonly mode = signal<MillMode | null>(null);
  readonly level = signal<MillLevel>('medium');
  readonly error = this.channel.error;
  readonly busy = signal(false);
  readonly thinking = signal(false);

  readonly playerId = this.loadPlayerId();

  private cpuTimer: ReturnType<typeof setTimeout> | null = null;

  readonly me = computed<MillPlayer | null>(() => this.game()?.players[this.playerId] ?? null);

  readonly opponent = computed<MillPlayer | null>(() => {
    const g = this.game();
    if (!g) return null;
    return Object.values(g.players).find((p) => p.id !== this.playerId) ?? null;
  });

  readonly isMyTurn = computed<boolean>(() => {
    const g = this.game();
    return !!g && g.status === 'playing' && g.currentTurn === this.playerId && !this.thinking();
  });

  readonly currentPlayer = computed<MillPlayer | null>(() => {
    const g = this.game();
    return g ? g.players[g.currentTurn] ?? null : null;
  });

  readonly mySeat = computed<number>(() => {
    const g = this.game();
    return g ? seatOf(g, this.playerId) : -1;
  });

  readonly phase = computed<'place' | 'move'>(() => {
    const g = this.game();
    if (!g) return 'place';
    return phaseOf(g);
  });

  readonly removing = computed<boolean>(() => !!this.game()?.removing && this.isMyTurn());

  readonly toPlace = computed<number[]>(() => {
    const g = this.game();
    if (!g) return [0, 0];
    return [PIECES - (g.placed[0] ?? 0), PIECES - (g.placed[1] ?? 0)];
  });

  readonly removableSet = computed<Set<number>>(() => {
    const g = this.game();
    if (!g || !this.removing()) return new Set();
    return new Set(removable(g.board, 1 - this.mySeat()));
  });

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

  startComputerGame(name: string, emoji: string, level: MillLevel): void {
    this.rememberProfile(name, emoji);
    this.reset();
    this.level.set(level);
    this.mode.set('computer');
    this.game.set(
      emptyLocalGame(
        { id: this.playerId, name: name.trim() || 'Spieler', emoji },
        { id: CPU_ID, name: 'Computer', emoji: '🤖' },
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
      const player: MillPlayer = { id: this.playerId, name: name.trim() || 'Spieler', emoji };
      const state: MillGame = {
        code,
        status: 'waiting',
        hostId: this.playerId,
        players: { [this.playerId]: player },
        order: [this.playerId],
        board: emptyBoard(),
        placed: [0, 0],
        currentTurn: this.playerId,
        removing: false,
        winnerId: null,
        lastAction: null,
        rev: 0,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      await withTimeout(set(ref(db, `mill/games/${code}`), state));
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
      const snap = await withTimeout(get(ref(db, `mill/games/${code}`)));
      if (!snap.exists()) throw new Error(`${T}.errors.notFound`);

      const state = this.normalize(snap.val() as MillGame);
      if (!state.players[this.playerId]) {
        if (Object.keys(state.players).length >= 2) throw new Error(`${T}.errors.full`);
        state.players[this.playerId] = { id: this.playerId, name: name.trim() || 'Spieler', emoji };
        state.order = [...state.order, this.playerId];
        state.status = 'playing';
        state.currentTurn = state.order[0];
        state.board = emptyBoard();
        state.placed = [0, 0];
        state.removing = false;
        state.winnerId = null;
        state.lastAction = null;
        state.rev = (state.rev ?? 0) + 1;
        state.updatedAt = Date.now();
        await withTimeout(set(ref(db, `mill/games/${code}`), state));
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

  place(index: number): void {
    const g = this.game();
    if (!g) return;
    const next = applyPlace(g, index, this.playerId);
    if (!next) return;
    this.commit(g.code, next);
  }

  move(from: number, to: number): void {
    const g = this.game();
    if (!g) return;
    const next = applyMovePiece(g, from, to, this.playerId);
    if (!next) return;
    this.commit(g.code, next);
  }

  removePiece(index: number): void {
    const g = this.game();
    if (!g) return;
    const next = applyRemove(g, index, this.playerId);
    if (!next) return;
    this.commit(g.code, next);
  }

  playAgain(): void {
    const g = this.game();
    if (!g) return;
    this.clearCpuTimer();
    const next = freshRound(g);
    this.commit(g.code, next);
  }

  leaveGame(): void {
    this.reset();
  }

  targetsFor(g: MillGame, from: number): number[] {
    return targetsFor(g, from);
  }

  canSelect(index: number): boolean {
    const g = this.game();
    if (!g || !this.isMyTurn()) return false;
    return canSelectPiece(g, this.playerId, index);
  }

  private commit(code: string, next: MillGame): void {
    if (this.mode() === 'online') {
      void this.writeOnline(code, next);
      return;
    }
    this.game.set(next);
    this.maybeScheduleComputerTurn();
  }

  private async writeOnline(code: string, next: MillGame): Promise<void> {
    try {
      await this.channel.commit({
        board: next.board,
        placed: next.placed,
        currentTurn: next.currentTurn,
        removing: next.removing,
        status: next.status,
        winnerId: next.winnerId,
        lastAction: next.lastAction,
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

      const choice = pickAction(current, CPU_ID, this.level());
      if (!choice) {
        this.thinking.set(false);
        return;
      }

      let next: MillGame | null = null;
      if (choice.kind === 'place') next = applyPlace(current, choice.index, CPU_ID);
      else if (choice.kind === 'move') next = applyMovePiece(current, choice.from, choice.to, CPU_ID);
      else next = applyRemove(current, choice.index, CPU_ID);

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

  /**
   * Die Seite wird verlassen (ngOnDestroy). Listener werden gelöst, der
   * Spiel-Code aber behalten: beim Zurückkommen findet `resume()` die laufende
   * Partie wieder. Vorher endete jedes Verlassen der Seite das Online-Spiel.
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

  private clearCpuTimer(): void {
    if (this.cpuTimer) {
      clearTimeout(this.cpuTimer);
      this.cpuTimer = null;
    }
  }

  private normalize(g: MillGame): MillGame {
    const board = Array.from({ length: POINTS_COUNT }, (_, i) =>
      typeof g.board?.[i] === 'number' ? g.board[i] : -1,
    );
    const placed = [Number(g.placed?.[0] ?? 0), Number(g.placed?.[1] ?? 0)];
    return {
      ...g,
      rev: g.rev ?? 0,
      order: g.order ?? [],
      players: g.players ?? {},
      board,
      placed,
      removing: !!g.removing,
      winnerId: g.winnerId ?? null,
      lastAction: g.lastAction ?? null,
    };
  }

  private async uniqueCode(): Promise<string> {
    for (let attempt = 0; attempt < 8; attempt++) {
      const code = this.randomCode();
      const snap = await withTimeout(get(ref(db, `mill/games/${code}`)));
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
