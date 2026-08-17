import { Injectable, computed, signal } from '@angular/core';
import { get, ref, set } from 'firebase/database';
import { authReady, databaseConfigured, db } from '../../shared/firebase/firebase';
import { GameChannel, withTimeout } from '../../shared/firebase/game-channel';
import { CARD_MOTIFS } from '../data/card-motifs';
import type { MemoCard, MemoGame, MemoLevel, MemoMode, MemoPlayer } from './memo.types';

const PLAYER_ID_KEY = 'memo_player_id';
const PLAYER_NAME_KEY = 'memo_player_name';
const PLAYER_AVATAR_KEY = 'memo_player_avatar';
/** Zuletzt geöffnetes Online-Spiel – für die Rückkehr auf die Seite. */
const ACTIVE_CODE_KEY = 'memo_active_code';
const CODE_ALPHABET = '0123456789';

/** Wie lange ein Fehlversuch offen liegen bleibt. */
const MISMATCH_MS = 1300;
/** Bedenkzeit des Computers vor jeder aufgedeckten Karte. */
const CPU_DELAY_MS = 850;

/** Feste Id des Computer-Gegners. */
export const CPU_ID = 'cpu';

/** Wie zuverlässig sich der Computer eine gesehene Karte merkt. */
const RECALL: Record<MemoLevel, number> = {
  easy: 0.35,
  medium: 0.7,
  hard: 1,
};

/** Basis der Übersetzungsschlüssel – die Fehler-Signale liefern Schlüssel, keine Texte. */
const T = 'gimmicks.games.memoQuizGame';

@Injectable({ providedIn: 'root' })
export class MemoQuizService {
  /**
   * Verbindung zum Spielknoten im Online-Modus: hält den Zustand aktuell, baut
   * abgebrochene Listener neu auf und schreibt Züge nur mit Server-Bestätigung.
   * Im Computer-Modus bleibt der Kanal geschlossen – das Signal dient dann als
   * ganz normaler lokaler Zustand.
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
  /** Gewählte Spielart – null bedeutet: Startbildschirm. */
  readonly mode = signal<MemoMode | null>(null);
  /** Gedächtnis-Stärke des Computers. */
  readonly level = signal<MemoLevel>('medium');
  /** Übersetzungsschlüssel oder Klartext einer Fehlermeldung. */
  readonly error = this.channel.error;
  readonly busy = signal(false);

  readonly playerId = this.loadPlayerId();

  private mismatchTimer: ReturnType<typeof setTimeout> | null = null;
  private cpuTimer: ReturnType<typeof setTimeout> | null = null;

  /** Was der Computer von den bereits gesehenen Karten behalten hat. */
  private readonly cpuMemory = new Map<number, string>();

  // ---- Abgeleitete Signale für die Oberfläche -----------------------------
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

  /** Der Computer überlegt gerade (dann sind die Karten gesperrt). */
  readonly thinking = computed<boolean>(() => {
    const g = this.game();
    return this.mode() === 'computer' && !!g && g.status === 'playing' && g.currentTurn === CPU_ID;
  });

  /** Darf an DIESEM Gerät gerade eine Karte umgedreht werden? */
  readonly canFlip = computed<boolean>(() => {
    const g = this.game();
    if (!g || g.status !== 'playing') return false;
    if (g.resolving || (g.flipped?.length ?? 0) >= 2) return false;
    return g.currentTurn === this.playerId;
  });

  // ---- Spieler-Identität ---------------------------------------------------
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

  // ---- Spiel gegen den Computer -------------------------------------------
  /**
   * Spiel gegen den Computer starten. Der Mensch beginnt.
   * Der gespeicherte Name des Computers ist nur ein Rückfallwert – angezeigt
   * wird er übersetzt, damit ein Sprachwechsel im laufenden Spiel greift.
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

  // ---- Online-Spiel: erstellen / beitreten ---------------------------------
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
        state.currentTurn = state.order[0]; // Host beginnt
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

  // ---- Spielzug ------------------------------------------------------------
  /** Deckt die Karte an dieser Position auf. */
  flip(index: number): void {
    if (!this.canFlip()) return;
    if (this.mode() === 'online') {
      void this.flipOnline(index);
      return;
    }
    this.flipLocal(index, this.playerId);
  }

  /** Neue Runde – der Verlierer beginnt (bei Gleichstand der Host). */
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

  /** Laufendes Spiel verlassen und zurück zum Startbildschirm. */
  leaveGame(): void {
    this.reset();
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

  // ---- Zug-Logik (Computer-Spiel, komplett lokal) --------------------------
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
      // Paar gefunden: Punkt für den Spieler, er darf weitermachen.
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

    // Kein Paar: beide Karten kurz zeigen, dann umdrehen – der andere ist dran.
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

  // ---- Computer-Gegner -----------------------------------------------------
  /** Der Computer merkt sich eine aufgedeckte Karte – je nach Stärke zuverlässig. */
  private rememberCard(index: number, motifId: string): void {
    if (this.mode() !== 'computer') return;
    if (Math.random() < RECALL[this.level()]) this.cpuMemory.set(index, motifId);
  }

  /** Ist der Computer dran, deckt er nach kurzer Bedenkzeit die nächste Karte auf. */
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

  /** Erste Karte: bekanntes Paar spielen, sonst eine unbekannte Karte aufdecken. */
  private cpuFirstPick(g: MemoGame): number | null {
    const open = this.openIndices(g);
    if (open.length === 0) return null;

    // Kennt der Computer bereits zwei gleiche Karten?
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

    // Sonst lieber etwas Neues aufdecken – das bringt Wissen für später.
    const unknown = open.filter((i) => !this.cpuMemory.has(i));
    const pool = unknown.length > 0 ? unknown : open;
    return pool[Math.floor(Math.random() * pool.length)];
  }

  /** Zweite Karte: passende bekannte Karte, sonst eine unbekannte. */
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

  /** Alle noch nicht gefundenen und nicht offenen Karten. */
  private openIndices(g: MemoGame): number[] {
    const out: number[] = [];
    g.board.forEach((c, i) => {
      if (!c.matchedBy && !g.flipped.includes(i)) out.push(i);
    });
    return out;
  }

  // ---- Zug-Logik (Online) --------------------------------------------------
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

      // Kein Paar: kurz zeigen, dann ist der Mitspieler dran.
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
   * Dreht die beiden nicht passenden Karten zurück und gibt ab.
   *
   * Dieser Schreibvorgang kommt zeitversetzt – geht er verloren, bliebe das
   * Spiel für BEIDE mit `resolving: true` stehen (niemand darf dann tippen).
   * Deshalb wird er einmal wiederholt, bevor der Hinweisbalken übernimmt.
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
   * Firebase speichert keine leeren Arrays/Null-Werte sauber – beim Einlesen
   * ergänzen, damit die Oberfläche niemals auf "undefined" zugreift.
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

  // ---- Hilfsfunktionen -----------------------------------------------------
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
