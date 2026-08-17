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
/** Zuletzt geöffnetes Online-Spiel – für die Rückkehr auf die Seite. */
const ACTIVE_CODE_KEY = 'c4_active_code';
const CODE_ALPHABET = '0123456789';

/** Feste Id des Computer-Gegners. */
export const CPU_ID = 'cpu';

export const AVATARS = ['🦄', '🐙', '🦈', '🐱', '🦖', '🐬', '🦊', '🐸', '🐧', '🦁'];

/** Basis der Übersetzungsschlüssel – die Fehler-Signale liefern Schlüssel, keine Texte. */
const T = 'gimmicks.games.connectFourGame';

@Injectable({ providedIn: 'root' })
export class ConnectFourService {
  readonly playerId = this.loadPlayerId();

  /**
   * Verbindung zum Spielknoten im Online-Modus: hält den Zustand aktuell, baut
   * abgebrochene Listener neu auf und schreibt Züge nur mit Server-Bestätigung.
   * Im Computer-Modus bleibt der Kanal geschlossen – `state` dient dann als
   * ganz normales lokales Signal.
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

  /** Aktueller Spielzustand (lokal oder aus der Realtime Database). */
  readonly game = this.channel.state;
  /** Übersetzungsschlüssel oder Klartext einer Fehlermeldung. */
  readonly error = this.channel.error;
  /** Verbindung ist länger weg – die Oberfläche zeigt einen Hinweis. */
  readonly offline = this.channel.offline;
  /** Ein Zug ist unterwegs und dauert auffällig lange. */
  readonly pending = this.channel.pending;
  /** Mitspieler, die nicht mehr verbunden sind. */
  readonly absent = this.channel.awayPlayers;

  /** Gewählte Spielart – null bedeutet: Startbildschirm. */
  readonly mode = signal<C4Mode | null>(null);
  /** Spielstärke des Computers. */
  readonly level = signal<C4Level>('medium');
  readonly busy = signal(false);
  /** Der Computer "überlegt" gerade (kurze Verzögerung, damit man den Zug sieht). */
  readonly thinking = signal(false);

  private cpuTimer: ReturnType<typeof setTimeout> | null = null;

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

  // ---- Abgeleitete Signale für die Oberfläche -----------------------------
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

  /** Darf an DIESEM Gerät gerade geworfen werden? */
  readonly canPlay = computed<boolean>(() => {
    const g = this.game();
    if (!g || g.status !== 'playing') return false;
    if (this.thinking()) return false;
    return g.currentTurn === this.playerId;
  });

  /** Nur im Online-Modus relevant: Warte ich auf den Mitspieler? */
  readonly waitingForOpponent = computed<boolean>(() => this.game()?.status === 'waiting');

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

  // ---- Spiel gegen den Computer -------------------------------------------
  /**
   * Spiel gegen den Computer starten. Der Mensch beginnt.
   * Der gespeicherte Name des Computers ist nur ein Rückfallwert – angezeigt
   * wird er übersetzt (siehe `displayName` im Board), damit ein Sprachwechsel
   * im laufenden Spiel greift.
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

  // ---- Online-Spiel: erstellen / beitreten ---------------------------------
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

        // freie Farbe wählen (Host ist rot → Gast ist gelb)
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
        state.currentTurn = state.order[0]; // Host beginnt
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

  // ---- Spielzug ------------------------------------------------------------
  /** Wirft einen Stein in die angegebene Spalte (0 … COLS-1). */
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

  /** Neue Runde – der Verlierer beginnt (bei Gleichstand der Host). */
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
   * Laufendes Spiel bewusst verlassen (Knopf im Spiel) – der gemerkte Code wird
   * vergessen, ein Zurückkommen führt also auf den Startbildschirm.
   */
  leaveGame(): void {
    this.reset();
  }

  /**
   * Die Seite wird verlassen (ngOnDestroy). Listener werden gelöst, der Code
   * aber behalten: beim Zurückkommen findet `resume()` die laufende Partie
   * wieder. Vorher endete jedes Verlassen der Seite das Online-Spiel.
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

  // ---- Zug-Logik -----------------------------------------------------------
  /** Wendet einen Zug auf eine Kopie des Spielstands an (null = ungültig). */
  private applyMove(g: C4Game, col: number, playerId: string): C4Game | null {
    const target = dropIndex(g.board, col);
    if (target < 0) return null; // Spalte ist voll

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
    // commit() meldet Fehler selbst über `error` – kein try/catch nötig.
    await this.channel.commit({
      board: next.board,
      lastMove: next.lastMove,
      status: next.status,
      currentTurn: next.currentTurn,
      winnerId: next.winnerId,
      winningCells: next.winningCells,
    });
  }

  /** Ist der Computer dran, zieht er nach kurzer Bedenkzeit. */
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

  // ---- Online-Intern -------------------------------------------------------
  /**
   * Firebase speichert keine leeren Arrays/Null-Werte sauber – beim Einlesen
   * ergänzen, damit die Oberfläche niemals auf "undefined" zugreift.
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

  /** Bricht früh mit klarer Meldung ab, wenn Firebase nicht eingerichtet ist. */
  private assertConfig(): void {
    if (!databaseConfigured) throw new Error(`${T}.errors.notConfigured`);
  }

  private toMessage(e: unknown): string {
    const raw = e instanceof Error ? e.message : String(e);
    if (raw.includes('PERMISSION_DENIED')) return `${T}.errors.permission`;
    return raw;
  }
}
