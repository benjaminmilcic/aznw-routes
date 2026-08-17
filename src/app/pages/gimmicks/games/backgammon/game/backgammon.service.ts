import { Injectable, computed, signal } from '@angular/core';
import { get, ref, set } from 'firebase/database';
import { authReady, databaseConfigured, db } from '../../shared/firebase/firebase';
import { GameChannel, withTimeout } from '../../shared/firebase/game-channel';
import { pickMove } from './backgammon.ai';
import {
  anyMove,
  applyMove,
  applyPass,
  applyRoll,
  freshRound,
  legalSources,
  startBoard,
  targetsFrom,
} from './backgammon.rules';
import type { BgColor, BgGame, BgLevel, BgMode, BgMove, BgPlayer } from './game.types';

const PLAYER_ID_KEY = 'bg_player_id';
const PLAYER_NAME_KEY = 'bg_player_name';
const PLAYER_EMOJI_KEY = 'bg_player_emoji';
/** Zuletzt geöffnetes Online-Spiel – für die Rückkehr auf die Seite. */
const ACTIVE_CODE_KEY = 'bg_active_code';
const CODE_ALPHABET = '0123456789';

/** Feste Id des Computer-Gegners. */
export const CPU_ID = 'cpu';

export const AVATARS = ['🦄', '🐙', '🦈', '🐱', '🦖', '🐬', '🦊', '🐸', '🐧', '🦁'];

/** Basis der Übersetzungsschlüssel – die Fehler-Signale liefern Schlüssel, keine Texte. */
const T = 'gimmicks.games.backgammonGame';

@Injectable({ providedIn: 'root' })
export class BackgammonService {
  /** Aktueller Spielzustand (lokal oder aus der Realtime Database). */
  /**
   * Verbindung zum Spielknoten im Online-Modus: hält den Zustand aktuell, baut
   * abgebrochene Listener neu auf und schreibt Züge nur mit Server-Bestätigung.
   * Im Computer-Modus bleibt der Kanal geschlossen – das Signal dient dann als
   * ganz normaler lokaler Zustand.
   */
  private readonly channel = new GameChannel<BgGame>({
    db,
    configured: databaseConfigured,
    authReady,
    basePath: 'backgammon/games',
    activeKey: ACTIVE_CODE_KEY,
    normalize: (raw) => this.normalize(raw as BgGame),
    canResume: (game) => !!game.players[this.playerId] && game.status !== 'finished',
  });

  /** Aktueller Spielzustand (lokal oder aus der Realtime Database). */
  readonly game = this.channel.state;
  /** Verbindung ist länger weg – die Oberfläche zeigt einen Hinweis. */
  readonly offline = this.channel.offline;
  /** Ein Zug ist unterwegs und dauert auffällig lange. */
  readonly pending = this.channel.pending;

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
  readonly mode = signal<BgMode | null>(null);
  /** Spielstärke des Computers. */
  readonly level = signal<BgLevel>('medium');
  /** Übersetzungsschlüssel oder Klartext einer Fehlermeldung. */
  readonly error = this.channel.error;
  readonly busy = signal(false);
  /** Der Computer "überlegt" gerade (kurze Verzögerung, damit man den Zug sieht). */
  readonly thinking = signal(false);

  readonly playerId = this.loadPlayerId();

  private cpuTimer: ReturnType<typeof setTimeout> | null = null;

  // ---- Abgeleitete Signale für die Oberfläche -----------------------------
  readonly me = computed<BgPlayer | null>(() => this.game()?.players[this.playerId] ?? null);

  readonly opponent = computed<BgPlayer | null>(() => {
    const g = this.game();
    if (!g) return null;
    return Object.values(g.players).find((p) => p.id !== this.playerId) ?? null;
  });

  readonly isMyTurn = computed<boolean>(() => {
    const g = this.game();
    return !!g && g.status === 'playing' && g.currentTurn === this.playerId && !this.thinking();
  });

  readonly currentPlayer = computed<BgPlayer | null>(() => {
    const g = this.game();
    return g ? g.players[g.currentTurn] ?? null : null;
  });

  /** Farbe des Spielers an DIESEM Gerät. */
  readonly myColor = computed<BgColor | null>(() => this.me()?.color ?? null);

  /** Darf gerade gewürfelt werden? */
  readonly canRoll = computed<boolean>(() => {
    const g = this.game();
    return this.isMyTurn() && !!g && !g.rolled;
  });

  /** Gewürfelt, aber kein Zug möglich → Zug muss weitergegeben werden. */
  readonly noMoves = computed<boolean>(() => {
    const g = this.game();
    if (!g || !this.isMyTurn() || !g.rolled || g.diceLeft.length === 0) return false;
    const color = this.myColor();
    if (!color) return false;
    return !anyMove(g.board, { white: g.barWhite, black: g.barBlack }, color, g.diceLeft);
  });

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
   * Spiel gegen den Computer starten. Der Mensch (weiß) beginnt.
   * Der gespeicherte Name des Computers ist nur ein Rückfallwert – angezeigt
   * wird er übersetzt (siehe `displayName` im Board), damit ein Sprachwechsel
   * im laufenden Spiel greift.
   */
  startComputerGame(name: string, emoji: string, level: BgLevel): void {
    this.rememberProfile(name, emoji);
    this.reset();
    this.level.set(level);
    this.mode.set('computer');
    this.game.set(
      this.newLocalGame(
        { id: this.playerId, name: name.trim() || 'Spieler', emoji, color: 'white' },
        { id: CPU_ID, name: 'Computer', emoji: '🤖', color: 'black' },
      ),
    );
  }

  private newLocalGame(host: BgPlayer, guest: BgPlayer): BgGame {
    return {
      code: '',
      status: 'playing',
      hostId: host.id,
      board: startBoard(),
      barWhite: 0,
      barBlack: 0,
      offWhite: 0,
      offBlack: 0,
      currentTurn: host.id,
      order: [host.id, guest.id],
      players: { [host.id]: host, [guest.id]: guest },
      dice: [],
      diceLeft: [],
      rolled: false,
      winnerId: null,
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
      const player: BgPlayer = {
        id: this.playerId,
        name: name.trim() || 'Spieler',
        emoji,
        color: 'white',
      };
      const state: BgGame = {
        code,
        status: 'waiting',
        hostId: this.playerId,
        board: startBoard(),
        barWhite: 0,
        barBlack: 0,
        offWhite: 0,
        offBlack: 0,
        currentTurn: this.playerId,
        order: [this.playerId],
        players: { [this.playerId]: player },
        dice: [],
        diceLeft: [],
        rolled: false,
        winnerId: null,
        rev: 0,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      await withTimeout(set(ref(db, `backgammon/games/${code}`), state));
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
      const snap = await withTimeout(get(ref(db, `backgammon/games/${code}`)));
      if (!snap.exists()) throw new Error(`${T}.errors.notFound`);

      const state = this.normalize(snap.val() as BgGame);
      if (!state.players[this.playerId]) {
        if (Object.keys(state.players).length >= 2) throw new Error(`${T}.errors.full`);

        const taken = Object.values(state.players).map((p) => p.color);
        const color: BgColor = taken.includes('white') ? 'black' : 'white';
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
        await withTimeout(set(ref(db, `backgammon/games/${code}`), state));
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

  // ---- Spielzüge -----------------------------------------------------------
  /** Würfelt (nur der Spieler, der dran ist und noch nicht gewürfelt hat). */
  roll(): void {
    const g = this.game();
    if (!g || g.status !== 'playing' || g.currentTurn !== this.playerId || g.rolled) return;

    if (this.mode() === 'online') {
      void this.rollOnline(g);
      return;
    }

    this.game.set(applyRoll(g));
  }

  /**
   * Führt einen einzelnen Stein-Zug aus.
   * @param from Quellpunkt 0–23, oder -1 für „von der Bar".
   * @param to   Zielpunkt 0–23, oder -1 für „herausspielen".
   * @param die  Der dafür verwendete Würfelwert.
   */
  move(from: number, to: number, die: number): void {
    const g = this.game();
    if (!g || g.status !== 'playing' || g.currentTurn !== this.playerId) return;

    if (this.mode() === 'online') {
      void this.moveOnline(g, from, to, die);
      return;
    }

    const next = applyMove(g, from, to, die, this.playerId);
    if (!next) return;
    this.game.set(next);
    this.maybeScheduleComputerTurn();
  }

  /** Gibt den Zug weiter, wenn kein Zug möglich ist. */
  passTurn(): void {
    const g = this.game();
    if (!g || g.status !== 'playing' || g.currentTurn !== this.playerId) return;

    if (this.mode() === 'online') {
      void this.channel.commit({
        dice: [],
        diceLeft: [],
        rolled: false,
        currentTurn: g.order[(g.order.indexOf(g.currentTurn) + 1) % g.order.length],
        updatedAt: Date.now(),
      }).catch((e) => this.error.set(this.toMessage(e)));
      return;
    }

    this.game.set(applyPass(g));
    this.maybeScheduleComputerTurn();
  }

  /** Neue Runde – der Verlierer der letzten Runde beginnt. */
  playAgain(): void {
    const g = this.game();
    if (!g) return;
    this.clearCpuTimer();
    const starter =
      g.winnerId && g.order.includes(g.winnerId)
        ? g.order.find((id) => id !== g.winnerId) ?? g.order[0]
        : g.order[0];
    const fresh = freshRound(starter);

    if (this.mode() === 'online') {
      void this.channel.commit(fresh).catch((e) =>
        this.error.set(this.toMessage(e)),
      );
      return;
    }
    this.game.set({ ...g, ...fresh });
    this.maybeScheduleComputerTurn();
  }

  /** Laufendes Spiel verlassen und zurück zum Startbildschirm. */
  leaveGame(): void {
    this.reset();
  }

  // ---- Hilfen für die Oberfläche ------------------------------------------
  legalSources(): number[] {
    const g = this.game();
    if (!g) return [];
    return legalSources(g, this.playerId);
  }

  targetsFrom(from: number): BgMove[] {
    const g = this.game();
    if (!g) return [];
    return targetsFrom(g, this.playerId, from);
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

  private async rollOnline(g: BgGame): Promise<void> {
    const rolled = applyRoll(g);
    try {
      await this.channel.commit({
        dice: rolled.dice,
        diceLeft: rolled.diceLeft,
        rolled: true,
        updatedAt: rolled.updatedAt,
      });
    } catch (e) {
      this.error.set(this.toMessage(e));
    }
  }

  private async moveOnline(g: BgGame, from: number, to: number, die: number): Promise<void> {
    const next = applyMove(g, from, to, die, this.playerId);
    if (!next) return;
    try {
      await this.channel.commit({
        board: next.board,
        barWhite: next.barWhite,
        barBlack: next.barBlack,
        offWhite: next.offWhite,
        offBlack: next.offBlack,
        dice: next.dice,
        diceLeft: next.diceLeft,
        rolled: next.rolled,
        status: next.status,
        currentTurn: next.currentTurn,
        winnerId: next.winnerId,
        updatedAt: next.updatedAt,
      });
    } catch (e) {
      this.error.set(this.toMessage(e));
    }
  }

  /** Ist der Computer dran, würfelt/zieht er nach kurzer Bedenkzeit. */
  private maybeScheduleComputerTurn(): void {
    const g = this.game();
    if (this.mode() !== 'computer' || !g || g.status !== 'playing') return;
    if (g.currentTurn !== CPU_ID) return;

    this.thinking.set(true);
    this.clearCpuTimer();

    if (!g.rolled) {
      this.cpuTimer = setTimeout(() => {
        this.cpuTimer = null;
        const current = this.game();
        if (!current || current.status !== 'playing' || current.currentTurn !== CPU_ID) {
          this.thinking.set(false);
          return;
        }
        this.game.set(applyRoll(current));
        this.maybeScheduleComputerTurn();
      }, 500);
      return;
    }

    this.cpuTimer = setTimeout(() => {
      this.cpuTimer = null;
      const current = this.game();
      if (!current || current.status !== 'playing' || current.currentTurn !== CPU_ID) {
        this.thinking.set(false);
        return;
      }

      const color = current.players[CPU_ID]?.color;
      const canMove =
        !!color &&
        current.diceLeft.length > 0 &&
        anyMove(
          current.board,
          { white: current.barWhite, black: current.barBlack },
          color,
          current.diceLeft,
        );

      if (!canMove) {
        this.thinking.set(false);
        this.game.set(applyPass(current));
        return;
      }

      const mv = pickMove(current, CPU_ID, this.level());
      if (!mv) {
        this.thinking.set(false);
        this.game.set(applyPass(current));
        return;
      }

      const next = applyMove(current, mv.from, mv.to, mv.die, CPU_ID);
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

  private clearCpuTimer(): void {
    if (this.cpuTimer) {
      clearTimeout(this.cpuTimer);
      this.cpuTimer = null;
    }
  }

  // ---- Online-Intern -------------------------------------------------------
  /**
   * Firebase speichert keine leeren Arrays/Null-Werte sauber – beim Einlesen
   * ergänzen, damit die Oberfläche niemals auf "undefined" zugreift.
   */
  private normalize(g: BgGame): BgGame {
    return {
      ...g,
      rev: g.rev ?? 0,
      order: g.order ?? [],
      players: g.players ?? {},
      board: Array.from({ length: 24 }, (_, i) => g.board?.[i] ?? 0),
      barWhite: g.barWhite ?? 0,
      barBlack: g.barBlack ?? 0,
      offWhite: g.offWhite ?? 0,
      offBlack: g.offBlack ?? 0,
      dice: g.dice ?? [],
      diceLeft: g.diceLeft ?? [],
      rolled: g.rolled ?? false,
      winnerId: g.winnerId ?? null,
    };
  }

  private async uniqueCode(): Promise<string> {
    for (let attempt = 0; attempt < 8; attempt++) {
      const code = this.randomCode();
      const snap = await withTimeout(get(ref(db, `backgammon/games/${code}`)));
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
