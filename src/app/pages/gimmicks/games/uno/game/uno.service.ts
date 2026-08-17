import { Injectable, computed, signal } from '@angular/core';
import { get, ref, remove, set, update } from 'firebase/database';
import { authReady, databaseConfigured, db } from '../../shared/firebase/firebase';
import { GameChannel, withTimeout } from '../../shared/firebase/game-channel';
import { bestMove } from './uno.ai';
import {
  applyDraw,
  applyPlay,
  dealNewRound,
  finishIfDecided,
  isDone,
  isPlayable,
  topCard,
} from './uno.rules';
import {
  MAX_PLAYERS,
  MIN_PLAYERS,
  type UnoCard,
  type UnoColor,
  type UnoGame,
  type UnoLevel,
  type UnoMode,
  type UnoPlayer,
} from './uno.types';

const PLAYER_ID_KEY = 'uno_player_id';
const PLAYER_NAME_KEY = 'uno_player_name';
const PLAYER_EMOJI_KEY = 'uno_player_emoji';
/** Zuletzt geöffnetes Online-Spiel – für die Rückkehr auf die Seite. */
const ACTIVE_CODE_KEY = 'uno_active_code';
const CODE_ALPHABET = '0123456789';

export const AVATARS = ['🦄', '🐙', '🦈', '🐱', '🦖', '🐬', '🦊', '🐸', '🐧', '🦁'];

/** Zeichen der Computer-Gegner. */
export const CPU_EMOJI = '🤖';

/** Basis der Übersetzungsschlüssel – die Fehler-Signale liefern Schlüssel, keine Texte. */
const T = 'gimmicks.games.unoGame';

/** Bedenkzeit des Computers, damit man den Zug mitverfolgen kann. */
const CPU_DELAY = 900;

export { MAX_PLAYERS, MIN_PLAYERS } from './uno.types';

/**
 * UNO – aus der Whiteboard-App übernommen und wie Pasch (Yahtzee) auf
 * mehrere Mitspieler erweitert.
 *
 * Zwei Spielarten:
 *  - "local"  … 2–6 Spieler am Gerät, beliebig viele davon Computer-Gegner
 *  - "online" … 2–6 Geräte über einen vierstelligen Spiel-Code
 *
 * Der Online-Spielstand liegt in der Realtime Database unter
 * "uno/games/<code>" – demselben Pfad, den auch die Whiteboard-App nutzt.
 */
@Injectable({ providedIn: 'root' })
export class UnoService {
  /** Aktueller Spielzustand (lokal oder aus der Realtime Database). */
  /**
   * Verbindung zum Spielknoten im Online-Modus: hält den Zustand aktuell, baut
   * abgebrochene Listener neu auf und schreibt Züge nur mit Server-Bestätigung.
   * Im Computer-Modus bleibt der Kanal geschlossen – das Signal dient dann als
   * ganz normaler lokaler Zustand.
   */
  private readonly channel = new GameChannel<UnoGame>({
    db,
    configured: databaseConfigured,
    authReady,
    basePath: 'uno/games',
    activeKey: ACTIVE_CODE_KEY,
    normalize: (raw) => this.normalize(raw as UnoGame),
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
  readonly mode = signal<UnoMode | null>(null);
  /** Spielstärke der Computer-Gegner. */
  readonly level = signal<UnoLevel>('medium');
  /** Übersetzungsschlüssel oder Klartext einer Fehlermeldung. */
  readonly error = this.channel.error;
  readonly busy = signal(false);

  /**
   * Am Gerät mit mehreren Menschen: erst wenn der Nächste bestätigt, werden
   * seine Karten aufgedeckt. Sonst sieht er die Hand seines Vorgängers.
   */
  readonly handHidden = signal(false);

  readonly playerId = this.loadPlayerId();

  private cpuTimer: ReturnType<typeof setTimeout> | null = null;

  // ---- Abgeleitete Signale für die Oberfläche -----------------------------
  readonly me = computed<UnoPlayer | null>(() => this.game()?.players[this.playerId] ?? null);

  /** Alle Mitspieler in Sitzreihenfolge. */
  readonly players = computed<UnoPlayer[]>(() => {
    const g = this.game();
    if (!g) return [];
    return g.order.map((id) => g.players[id]).filter((p): p is UnoPlayer => !!p);
  });

  readonly currentPlayer = computed<UnoPlayer | null>(() => {
    const g = this.game();
    return g ? g.players[g.currentTurn] ?? null : null;
  });

  readonly isHost = computed<boolean>(() => this.game()?.hostId === this.playerId);

  readonly topCard = computed<UnoCard | null>(() => {
    const g = this.game();
    return g ? topCard(g) : null;
  });

  /** Der Computer "überlegt" gerade. */
  readonly thinking = computed<boolean>(
    () => this.game()?.status === 'playing' && !!this.currentPlayer()?.cpu,
  );

  /**
   * Wessen Karten liegen gerade auf diesem Gerät offen? Online sind das immer
   * meine, am Gerät die des Menschen, der gerade dran ist.
   */
  readonly handOwner = computed<string>(() => {
    const g = this.game();
    if (!g) return this.playerId;
    if (this.mode() !== 'local') return this.playerId;
    const current = g.players[g.currentTurn];
    return current && !current.cpu ? current.id : this.lastHumanTurn();
  });

  readonly hand = computed<UnoCard[]>(() => this.game()?.hands[this.handOwner()] ?? []);

  /** Darf an DIESEM Gerät gerade gespielt werden? */
  readonly canAct = computed<boolean>(() => {
    const g = this.game();
    if (!g || g.status !== 'playing' || this.handHidden()) return false;
    if (this.mode() === 'local') return !g.players[g.currentTurn]?.cpu;
    return g.currentTurn === this.playerId;
  });

  /** Hat der Spieler am Zug überhaupt eine spielbare Karte? */
  readonly hasPlayable = computed<boolean>(() => {
    const g = this.game();
    if (!g || !this.canAct()) return false;
    const top = this.topCard();
    return (g.hands[g.currentTurn] ?? []).some((c) => isPlayable(c, top, g.currentColor));
  });

  /** Endstand: die schon fertigen Spieler in Platzreihenfolge. */
  readonly ranking = computed<UnoPlayer[]>(() => {
    const g = this.game();
    if (!g) return [];
    return g.ranking.map((id) => g.players[id]).filter((p): p is UnoPlayer => !!p);
  });

  /** Kartenzahl eines Spielers. */
  cardCount(id: string): number {
    return this.game()?.hands[id]?.length ?? 0;
  }

  /** Ist dieser Spieler seine Karten schon losgeworden? */
  done(id: string): boolean {
    const g = this.game();
    return !!g && isDone(g, id);
  }

  /** Erreichter Platz (1-basiert), oder 0 solange der Spieler noch spielt. */
  rankOf(id: string): number {
    const g = this.game();
    if (!g) return 0;
    const i = g.ranking.indexOf(id);
    return i < 0 ? 0 : i + 1;
  }

  /** Kann diese Karte gerade gelegt werden? */
  playable(card: UnoCard): boolean {
    const g = this.game();
    if (!g || !this.canAct()) return false;
    return isPlayable(card, this.topCard(), g.currentColor);
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

  /** Merkt sich, wessen Karten am Gerät zuletzt offen lagen. */
  private lastHuman = this.playerId;
  private lastHumanTurn(): string {
    return this.lastHuman;
  }

  /** Spielen am Gerät mehrere Menschen mit? Dann wird verdeckt weitergereicht. */
  private manyHumans(g: UnoGame): boolean {
    return g.order.filter((id) => !g.players[id]?.cpu).length > 1;
  }

  // ---- Spiel am Gerät (Menschen + Computer) --------------------------------
  startLocalGame(
    seats: { name: string; emoji: string; cpu: boolean }[],
    level: UnoLevel = 'medium',
  ): void {
    const first = seats.find((s) => !s.cpu);
    if (first) this.rememberProfile(first.name, first.emoji);
    this.reset();
    this.level.set(level);
    this.mode.set('local');

    const players: Record<string, UnoPlayer> = {};
    const order: string[] = [];
    let humanSeat = 0;
    for (const [i, seat] of seats.entries()) {
      // Der erste Mensch bekommt die gespeicherte Spieler-Id.
      const id = seat.cpu ? `cpu_${i}` : humanSeat++ === 0 ? this.playerId : `p_local_${i}`;
      players[id] = {
        id,
        name: seat.name.trim() || `Spieler ${i + 1}`,
        emoji: seat.emoji,
        cpu: seat.cpu,
      };
      order.push(id);
    }

    const base = this.emptyGame('', order[0], players, order);
    const dealt = dealNewRound(base, order[0]);
    this.lastHuman = order.find((id) => !players[id].cpu) ?? order[0];
    this.game.set(dealt);
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
      const player: UnoPlayer = { id: this.playerId, name: name.trim() || 'Spieler', emoji };
      const state: UnoGame = {
        ...this.emptyGame(code, this.playerId, { [this.playerId]: player }, [this.playerId]),
        status: 'waiting',
      };
      await withTimeout(set(ref(db, `uno/games/${code}`), state));
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
      const snap = await withTimeout(get(ref(db, `uno/games/${code}`)));
      if (!snap.exists()) throw new Error(`${T}.errors.notFound`);

      const state = this.normalize(snap.val() as UnoGame);
      if (!state.players[this.playerId]) {
        if (state.status !== 'waiting') throw new Error(`${T}.errors.alreadyStarted`);
        if (state.order.length >= MAX_PLAYERS) throw new Error(`${T}.errors.full`);

        await withTimeout(
          update(ref(db, `uno/games/${code}`), {
            [`players/${this.playerId}`]: {
              id: this.playerId,
              name: name.trim() || 'Spieler',
              emoji,
            },
            order: [...state.order, this.playerId],
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

  /** Der Gastgeber startet die Runde, sobald alle da sind. */
  async startOnlineGame(): Promise<void> {
    const g = this.game();
    if (!g || !this.isHost() || g.order.length < MIN_PLAYERS) return;
    try {
      const dealt = dealNewRound(g, g.order[0]);
      await this.channel.commit({
        hands: dealt.hands,
        drawPile: dealt.drawPile,
        discardPile: dealt.discardPile,
        currentColor: dealt.currentColor,
        direction: 1,
        currentTurn: dealt.currentTurn,
        status: 'playing',
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
  /** Legt eine Karte ab. Joker brauchen eine Wunschfarbe. */
  playCard(cardId: string, chosenColor?: UnoColor): boolean {
    const g = this.game();
    if (!g || !this.canAct()) return false;
    const next = applyPlay(g, g.currentTurn, cardId, chosenColor);
    if (!next) return false;
    this.commit(next);
    return true;
  }

  /** Zieht eine Karte – danach ist der Nächste dran. */
  drawCard(): void {
    const g = this.game();
    if (!g || !this.canAct()) return;
    const next = applyDraw(g, g.currentTurn);
    if (next) this.commit(next);
  }

  /** Am Gerät: der Nächste hat das Gerät übernommen und deckt seine Karten auf. */
  revealHand(): void {
    this.handHidden.set(false);
  }

  /** Neue Runde – der Gewinner fängt diesmal nicht an. */
  playAgain(): void {
    const g = this.game();
    if (!g) return;
    this.clearCpuTimer();
    const winnerIndex = g.winnerId ? g.order.indexOf(g.winnerId) : -1;
    const starter = winnerIndex >= 0 ? g.order[(winnerIndex + 1) % g.order.length] : g.order[0];
    this.commit(dealNewRound(g, starter));
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
   * Trägt diesen Spieler aus der Online-Runde aus: seine Karten wandern
   * zurück in den Nachziehstapel, ggf. ist der Nächste dran, notfalls
   * wechselt die Gastgeber-Rolle. Der letzte Aussteigende räumt das Spiel weg.
   */
  private async removeSelfFromOnlineGame(g: UnoGame): Promise<void> {
    const path = `uno/games/${g.code}`;
    const remaining = g.order.filter((id) => id !== this.playerId);
    const myName = g.players[this.playerId]?.name ?? 'Spieler';

    try {
      if (remaining.length === 0) {
        await remove(ref(db, path));
        return;
      }

      const players: Record<string, UnoPlayer> = {};
      const hands: Record<string, UnoCard[]> = {};
      for (const id of remaining) {
        players[id] = g.players[id];
        hands[id] = g.hands[id] ?? [];
      }
      // Die abgegebenen Karten kommen zurück unter den Nachziehstapel.
      const drawPile = [...(g.hands[this.playerId] ?? []), ...g.drawPile];
      const ranking = g.ranking.filter((id) => remaining.includes(id));
      const rest: UnoGame = { ...g, players, hands, drawPile, order: remaining, ranking };
      const hostId = g.hostId === this.playerId ? remaining[0] : g.hostId;

      if (g.status === 'playing') {
        const decided = finishIfDecided(rest);
        if (decided.status === 'finished') {
          await update(ref(db, path), {
            players,
            hands,
            drawPile,
            order: remaining,
            hostId,
            status: 'finished',
            winnerId: decided.winnerId,
            ranking: decided.ranking,
            lastLeft: { name: myName, at: Date.now() },
            updatedAt: Date.now(),
          });
          return;
        }
      }

      // War ich gerade dran, rückt der Nächste nach.
      const wasMyTurn = g.currentTurn === this.playerId;
      const currentTurn = wasMyTurn ? this.playerAfterMe(g.order, rest) : g.currentTurn;

      await update(ref(db, path), {
        players,
        hands,
        drawPile,
        order: remaining,
        hostId,
        ranking,
        currentTurn,
        lastLeft: { name: myName, at: Date.now() },
        updatedAt: Date.now(),
      });
    } catch (e) {
      this.error.set(this.toMessage(e));
    }
  }

  /**
   * Der nächste Spieler nach mir in der ursprünglichen Reihenfolge, der noch
   * dabei ist und noch Karten hat.
   */
  private playerAfterMe(fullOrder: string[], rest: UnoGame): string {
    const start = fullOrder.indexOf(this.playerId);
    for (let step = 1; step <= fullOrder.length; step++) {
      const candidate = fullOrder[(start + step) % fullOrder.length];
      if (rest.order.includes(candidate) && !isDone(rest, candidate)) return candidate;
    }
    return rest.order[0];
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
    this.handHidden.set(false);
    this.mode.set(null);
  }

  // ---- Zustand schreiben ---------------------------------------------------
  /** Übernimmt einen neuen Spielstand – lokal direkt, online über Firebase. */
  private commit(next: UnoGame): void {
    if (this.mode() === 'online') {
      void this.pushOnline(next);
      return;
    }

    // Am Gerät: wechselt der Zug zu einem anderen Menschen, erst verdecken.
    const current = next.players[next.currentTurn];
    if (next.status === 'playing' && current && !current.cpu) {
      if (this.manyHumans(next) && current.id !== this.lastHuman) this.handHidden.set(true);
      this.lastHuman = current.id;
    }

    this.game.set(next);
    this.maybeScheduleCpu();
  }

  private async pushOnline(next: UnoGame): Promise<void> {
    try {
      await this.channel.commit({
        hands: next.hands,
        drawPile: next.drawPile,
        discardPile: next.discardPile,
        currentColor: next.currentColor,
        direction: next.direction,
        status: next.status,
        currentTurn: next.currentTurn,
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
  /** Ist ein Computer dran, zieht oder legt er nach kurzer Bedenkzeit. */
  private maybeScheduleCpu(): void {
    const g = this.game();
    if (this.mode() !== 'local' || !g || g.status !== 'playing') return;
    if (!g.players[g.currentTurn]?.cpu) return;

    this.clearCpuTimer();
    this.cpuTimer = setTimeout(() => {
      this.cpuTimer = null;
      this.cpuStep();
    }, CPU_DELAY);
  }

  private cpuStep(): void {
    const g = this.game();
    if (!g || g.status !== 'playing' || !g.players[g.currentTurn]?.cpu) return;

    const id = g.currentTurn;
    const decision = bestMove(g, id, this.level());
    const next = decision
      ? applyPlay(g, id, decision.cardId, decision.color)
      : applyDraw(g, id);

    if (!next) return;
    this.game.set(next);
    this.maybeScheduleCpu();
  }

  private clearCpuTimer(): void {
    if (this.cpuTimer) clearTimeout(this.cpuTimer);
    this.cpuTimer = null;
  }

  // ---- Intern --------------------------------------------------------------
  /** Spielhülle ohne Karten – ausgeteilt wird erst beim Start. */
  private emptyGame(
    code: string,
    hostId: string,
    players: Record<string, UnoPlayer>,
    order: string[],
  ): UnoGame {
    const hands: Record<string, UnoCard[]> = {};
    for (const id of order) hands[id] = [];
    return {
      code,
      status: 'playing',
      hostId,
      players,
      order,
      hands,
      drawPile: [],
      discardPile: [],
      currentColor: 'r',
      direction: 1,
      currentTurn: order[0],
      winnerId: null,
      ranking: [],
      lastAction: null,
      rev: 0,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
  }

  /**
   * Firebase speichert keine leeren Arrays sauber – beim Einlesen ergänzen,
   * damit die Oberfläche niemals auf "undefined" zugreift.
   */
  private normalize(g: UnoGame): UnoGame {
    const players = g.players ?? {};
    const order = (g.order ?? []).filter((id) => !!players[id]);
    const hands: Record<string, UnoCard[]> = {};
    for (const id of order) hands[id] = (g.hands?.[id] ?? []).filter(Boolean);
    return {
      ...g,
      rev: g.rev ?? 0,
      order,
      players,
      hands,
      drawPile: (g.drawPile ?? []).filter(Boolean),
      discardPile: (g.discardPile ?? []).filter(Boolean),
      currentColor: g.currentColor ?? 'r',
      direction: g.direction === -1 ? -1 : 1,
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
      const snap = await withTimeout(get(ref(db, `uno/games/${code}`)));
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
