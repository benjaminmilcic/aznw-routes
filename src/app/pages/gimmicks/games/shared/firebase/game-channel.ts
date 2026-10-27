// =============================================================
//  Robust game synchronization via the Realtime Database.
// =============================================================
// All online games (Connect Four, Uno, Ludo, Checkers, Chess, Backgammon, Mill,
// Yahtzee, Memo quiz) rely on the same mechanism: an onValue listener on
// the game node + writes for the moves.
//
// This class bundles that and fixes the cases in which a game silently
// got stuck – both sides were waiting for the other's move:
//
//  1. NO PHANTOM MOVE. Firebase applies writes locally right away
//     ("latency compensation") – so your own move looked done even
//     if it never left the device. That's why we write with
//     `applyLocally: false`: the move only appears with server confirmation.
//  2. NO OVERWRITING BY OLD MOVES. Every move runs as a transaction
//     and only applies if the server is still at the revision (`rev`) from
//     which the move was computed.
//  3. REBUILD LISTENERS. Firebase NEVER reattaches a cancelled listener
//     by itself (e.g. if the auth token could not be renewed).
//     Without our own intervention such a client stays blind for good.
//  4. SYNC ON RETURN. Phones cut the connection as soon as the
//     screen turns off or the network changes.
//  5. VISIBILITY. Connection status and errors end up in signals (see
//     shared/sync-status) and additionally as console.warn.
//
// IMPORTANT: This project shares the Firebase project AND data paths with the
// whiteboard app ("connect4/games" etc.) – a game can run across devices
// between both apps. The `rev` field and these transactions are implemented
// identically there; both sides must match, otherwise the protection
// from point 2 does not apply.
// =============================================================
import { computed, signal } from '@angular/core';
import {
  get,
  onDisconnect,
  onValue,
  ref,
  remove,
  runTransaction,
  serverTimestamp,
  set,
  type Database,
  type Unsubscribe,
} from 'firebase/database';

/** Time limit for a move – after that it counts as not saved. */
const WRITE_TIMEOUT = 10_000;
/** Time limit for a single read. */
const READ_TIMEOUT = 10_000;
/** Wait time before the first rebuild of a cancelled listener. */
const RETRY_MIN = 1_000;
/** Upper limit of the wait time between two attempts. */
const RETRY_MAX = 30_000;
/** The notice is only shown after this long without a connection. */
const OFFLINE_GRACE = 2_500;
/** "Sending move" is only shown after this time. */
const PENDING_HINT_AFTER = 800;
/** Merge several syncs in quick succession (focus + visibility). */
const RESYNC_THROTTLE = 1_500;
/** A remembered game older than this is no longer resumed. */
const RESUME_MAX_AGE = 12 * 60 * 60 * 1000;
/** Interval for the absence display (local only, no database access). */
const TICK_MS = 1_000;

/**
 * Only after this time may an absent player be skipped.
 *
 * Deliberately generous: nobody should be thrown out of the round because they
 * briefly left the room or the phone switched networks for a moment.
 */
export const ABSENT_GRACE_MS = 60_000;

/**
 * Translation keys of the sync messages.
 *
 * As everywhere in the games here, the signals deliver KEYS, not texts –
 * the UI translates with `| translate`.
 */
export const SYNC_KEYS = {
  offline: 'gimmicks.games.sync.offline',
  sending: 'gimmicks.games.sync.sending',
  notSaved: 'gimmicks.games.sync.notSaved',
  changed: 'gimmicks.games.sync.changed',
  lost: 'gimmicks.games.sync.lost',
  timeout: 'gimmicks.games.sync.timeout',
} as const;

/** Prevents hanging forever if the database does not respond. */
export function withTimeout<T>(
  p: Promise<T>,
  ms = 12_000,
  message: string = SYNC_KEYS.timeout,
): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | null = null;
  const guard = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(message)), ms);
  });
  return Promise.race([p, guard]).finally(() => {
    if (timer) clearTimeout(timer);
  }) as Promise<T>;
}

/** The minimum a game state must bring along for this channel. */
export interface SyncedGame {
  code: string;
  /** Running revision – protects against being overwritten by old moves. */
  rev?: number;
  updatedAt?: number;
  /** For the absence display – every game here has a player list. */
  players?: Record<string, { name?: string }>;
}

/** A player who is currently not connected. */
export interface AwayPlayer {
  id: string;
  name: string;
  /** Seconds since they disappeared. */
  seconds: number;
}

/**
 * Is this device currently connected to the database?
 *
 * `at` is a SERVER time (serverTimestamp). Never compare it directly with Date.now()
 * – a phone's clock can be off. For that there is
 * `awayMs()`, which takes the offset from `.info/serverTimeOffset` into account.
 */
export interface PlayerPresence {
  online: boolean;
  at: number;
}

export interface GameChannelOptions<T extends SyncedGame> {
  /** Database of the named Firebase app (shared/firebase/firebase.ts). */
  db: Database;
  /** false if no valid databaseURL is configured. */
  configured: boolean;
  /** Anonymous sign-in – awaited before every access. */
  authReady: Promise<void>;
  /** Path to the games, e.g. 'connect4/games'. */
  basePath: string;
  /**
   * Own player id – for the presence entry.
   *
   * Deliberately a function: in some services the channel is created BEFORE the
   * playerId field, a direct value would still be undefined there.
   */
  playerId: () => string;
  /** localStorage key for the last opened game. */
  activeKey: string;
  /** Fill in raw data – the normalize() of the respective game. */
  normalize: (raw: any) => T;
  /** May this game be resumed after a reload? */
  canResume: (game: T) => boolean;
  /** Optional: runs after every new state (e.g. writing the leaderboard). */
  onState?: (game: T | null) => void;
}

export class GameChannel<T extends SyncedGame> {
  /** Current game state (null = no game open). */
  readonly state = signal<T | null>(null);
  /** Translation key of a sync message, or null. */
  readonly error = signal<string | null>(null);
  /** Connection to the database is up (from `.info/connected`). */
  readonly online = signal(true);
  /** Connection has been gone longer than OFFLINE_GRACE – only then show the notice. */
  readonly offline = signal(false);
  /** A move is on its way and is taking noticeably long. */
  readonly pending = signal(false);
  /**
   * Which of the players are currently connected. Lives in the game node itself
   * (`<code>/presence/<playerId>`), so it comes with every snapshot – no
   * second listener and no change to the database rules needed.
   */
  readonly presence = signal<Record<string, PlayerPresence>>({});
  /** Ticks every second while a game is open – drives the absence display. */
  readonly tick = signal(0);

  private code: string | null = null;
  private dataUnsub: Unsubscribe | null = null;
  private connUnsub: Unsubscribe | null = null;
  private reattachTimer: ReturnType<typeof setTimeout> | null = null;
  private offlineTimer: ReturnType<typeof setTimeout> | null = null;
  private pendingTimer: ReturnType<typeof setTimeout> | null = null;
  private tickTimer: ReturnType<typeof setInterval> | null = null;
  private offsetUnsub: Unsubscribe | null = null;
  /** Offset between the local clock and the server clock in milliseconds. */
  private serverOffset = 0;
  private retryDelay = RETRY_MIN;
  private lastResync = 0;
  /** true while a move is waiting for the server's confirmation. */
  private writing = false;
  /** true while we are recovering from a connection problem. */
  private recovering = false;
  private wakeupsBound = false;

  constructor(private readonly opts: GameChannelOptions<T>) {}

  // ---- Open / close --------------------------------------------------------
  /** Attach to a game and keep it in sync permanently. */
  open(code: string): void {
    if (!this.opts.configured) return;
    this.code = code;
    this.remember(code);
    this.error.set(null);
    this.recovering = false;
    this.retryDelay = RETRY_MIN;
    // The listener delivers the state right away – the sync that the
    // connection monitoring would trigger on the first `connected` would be
    // redundant. That's why the lock is set right away.
    this.lastResync = Date.now();
    this.watchConnection();
    this.bindWakeups();
    this.startTicking();
    this.attach();
  }

  /**
   * Detach the listeners and clear the state.
   *
   * `forget: false` keeps the remembered game code – meant for
   * leaving the page (ngOnDestroy), so that `resume()` finds its way back into the
   * running game when coming back. When the player deliberately ends the game
   * the code is forgotten (default).
   */
  close(opts: { forget?: boolean } = {}): void {
    const code = this.code;
    const forget = opts.forget !== false;
    this.code = null;
    if (forget) this.forget();

    // Let the other players know before the listeners go away: when ending
    // deliberately the entry disappears, when merely pausing it stays as
    // "not connected" – so that the others can see the difference.
    if (code) void this.writePresence(code, forget ? 'gone' : 'away');

    this.clearTimers();
    this.dataUnsub?.();
    this.dataUnsub = null;
    this.connUnsub?.();
    this.connUnsub = null;
    this.offsetUnsub?.();
    this.offsetUnsub = null;
    this.unbindWakeups();
    this.recovering = false;
    this.state.set(null);
    this.error.set(null);
    this.pending.set(false);
    this.offline.set(false);
    this.presence.set({});
  }

  // ---- Presence -----------------------------------------------------------
  /**
   * How long has this player not been connected? 0 = connected or
   * unknown (e.g. an older game without presence entries).
   *
   * Reads `tick`, so it updates itself every second.
   */
  awayMs(playerId: string): number {
    this.tick();
    const p = this.presence()[playerId];
    if (!p || p.online !== false || !p.at) return 0;
    return Math.max(0, Date.now() + this.serverOffset - p.at);
  }

  /** Has this player been gone longer than `graceMs`? */
  isAway(playerId: string, graceMs: number): boolean {
    return this.awayMs(playerId) > graceMs;
  }

  /**
   * All players (except yourself) who are currently not connected.
   * Updates every second. Always empty in a local game, because the channel
   * is closed then and there are no presence entries.
   */
  readonly awayPlayers = computed<AwayPlayer[]>(() => {
    const players = this.state()?.players;
    if (!players) return [];
    const me = this.opts.playerId();
    const out: AwayPlayer[] = [];
    for (const [id, p] of Object.entries(players)) {
      if (id === me) continue;
      const seconds = Math.floor(this.awayMs(id) / 1000);
      if (seconds > 0) out.push({ id, name: p?.name ?? '', seconds });
    }
    return out;
  });

  private presenceRef(code: string, playerId = this.opts.playerId()) {
    return ref(this.opts.db, `${this.opts.basePath}/${code}/presence/${playerId}`);
  }

  /**
   * Reports this device as connected and registers with the server what should
   * happen when the connection dies.
   *
   * `onDisconnect` is the only way that also covers closing the tab, crashes,
   * airplane mode and an empty battery: the database performs the write
   * SERVER-SIDE. Must be registered again after every reconnect.
   */
  private async announcePresence(code: string): Promise<void> {
    try {
      const p = this.presenceRef(code);
      await onDisconnect(p).set({ online: false, at: serverTimestamp() });
      await set(p, { online: true, at: serverTimestamp() });
    } catch (e) {
      console.warn('[sync] Präsenz konnte nicht gemeldet werden:', e);
    }
  }

  private async writePresence(code: string, how: 'away' | 'gone'): Promise<void> {
    try {
      const p = this.presenceRef(code);
      if (how === 'gone') await remove(p);
      else await set(p, { online: false, at: serverTimestamp() });
    } catch (e) {
      console.warn('[sync] Präsenz konnte nicht geschrieben werden:', e);
    }
  }

  private startTicking(): void {
    if (this.tickTimer) return;
    this.tickTimer = setInterval(() => this.tick.update((n) => n + 1), TICK_MS);
  }

  /** Dismiss the notice. */
  dismissError(): void {
    this.error.set(null);
  }

  /**
   * Back into the running game – after a reload or when the page
   * was left in the meantime. Returns true if a resumable
   * game was found and opened.
   */
  async resume(): Promise<boolean> {
    if (!this.opts.configured || this.state()) return false;
    const code = this.recall();
    if (!code) return false;
    try {
      await this.opts.authReady;
      const snap = await withTimeout(get(this.gameRef(code)), READ_TIMEOUT);
      const raw = snap.val();
      const game = raw ? this.opts.normalize(raw) : null;
      const fresh = !!game && Date.now() - (game.updatedAt ?? 0) < RESUME_MAX_AGE;
      if (!game || !fresh || !this.opts.canResume(game)) {
        this.forget();
        return false;
      }
      this.state.set(game);
      this.opts.onState?.(game);
      this.open(code);
      return true;
    } catch (e) {
      console.warn('[sync] Fortsetzen fehlgeschlagen:', e);
      return false;
    }
  }

  // ---- Write --------------------------------------------------------------
  /**
   * Writes a move. The patch contains the fields to change at the top
   * level of the game node – just like before with `update()`.
   *
   * It is only applied if the server is still at the revision from which
   * the move was computed. Returns false if the move did not get through; the
   * UI then shows the reason.
   */
  async commit(patch: Record<string, unknown>): Promise<boolean> {
    const current = this.state();
    const code = this.code;
    if (!this.opts.configured || !code || !current) return false;

    // Double tap: the first move is still on its way and the UI has
    // not moved yet (applyLocally: false). The second call would be computed
    // on the same state and discarded anyway – so abort right
    // here, silently and without an error message.
    if (this.writing) return false;
    this.writing = true;
    const expected = current.rev ?? 0;

    this.markPending(true);
    try {
      await this.opts.authReady;
      const result = await withTimeout(
        runTransaction(
          this.gameRef(code),
          (raw: any) => {
            if (!raw) return undefined; // Game no longer exists → abort
            if ((raw.rev ?? 0) !== expected) return undefined; // outdated → discard
            return { ...raw, ...patch, rev: expected + 1, updatedAt: Date.now() };
          },
          // Crucial: without server confirmation your own move must NOT
          // be shown. Otherwise the player sees it performed, while
          // the opponent never receives anything – and both wait for each other.
          { applyLocally: false },
        ),
        WRITE_TIMEOUT,
        SYNC_KEYS.timeout,
      );

      if (!result.committed) {
        console.warn('[sync] Zug verworfen – der Stand war nicht mehr aktuell.');
        this.error.set(SYNC_KEYS.changed);
        void this.forceResync();
        return false;
      }
      this.error.set(null);
      return true;
    } catch (e) {
      console.warn('[sync] Zug konnte nicht gespeichert werden:', e);
      this.error.set(SYNC_KEYS.notSaved);
      void this.forceResync();
      return false;
    } finally {
      this.writing = false;
      this.markPending(false);
    }
  }

  // ---- Read / sync --------------------------------------------------------
  /** Fetches the state from the server and sets up the listener fresh. */
  async resync(): Promise<void> {
    if (!this.opts.configured || !this.code) return;
    const now = Date.now();
    if (now - this.lastResync < RESYNC_THROTTLE) return;
    this.lastResync = now;

    const code = this.code;
    try {
      await this.opts.authReady;
      const snap = await withTimeout(get(this.gameRef(code)), READ_TIMEOUT);
      if (this.code !== code) return; // left in the meantime
      this.apply(snap.val());
    } catch (e) {
      console.warn('[sync] Abgleich fehlgeschlagen:', e);
    }
    // Set up the listener again in any case: a listener that went silent
    // would never deliver data again by itself.
    if (this.code === code) this.attach();
  }

  /** Sync without throttling – after a failed move. */
  private forceResync(): Promise<void> {
    this.lastResync = 0;
    return this.resync();
  }

  // ---- Internals ----------------------------------------------------------
  private gameRef(code: string) {
    return ref(this.opts.db, `${this.opts.basePath}/${code}`);
  }

  /** Take over raw data: fill in, publish, trigger the follow-up. */
  private apply(raw: unknown): void {
    // The presence hangs in the game node and comes with every snapshot.
    // It is read BEFORE normalize(), which does not know it.
    const presence = (raw as { presence?: Record<string, PlayerPresence> } | null)?.presence;
    this.presence.set(presence ?? {});
    const game = raw ? this.opts.normalize(raw) : null;
    this.state.set(game);
    this.opts.onState?.(game);
    this.recovered();
  }

  private attach(): void {
    const code = this.code;
    if (!code) return;
    if (this.reattachTimer) {
      clearTimeout(this.reattachTimer);
      this.reattachTimer = null;
    }
    this.dataUnsub?.();
    this.dataUnsub = onValue(
      this.gameRef(code),
      (snap) => {
        this.retryDelay = RETRY_MIN;
        this.apply(snap.val());
      },
      (err) => {
        // Firebase cancels the listener (e.g. PERMISSION_DENIED if the
        // auth token could not be renewed) and NEVER reattaches it.
        console.warn('[sync] Listener abgebrochen – Neuaufbau folgt:', err);
        this.dataUnsub = null;
        this.recovering = true;
        this.error.set(SYNC_KEYS.lost);
        this.scheduleReattach();
      },
    );
  }

  private scheduleReattach(): void {
    if (this.reattachTimer || !this.code) return;
    const delay = this.retryDelay;
    this.retryDelay = Math.min(delay * 2, RETRY_MAX);
    this.reattachTimer = setTimeout(() => {
      this.reattachTimer = null;
      this.attach();
    }, delay);
  }

  /** After a connection problem: remove the notice again. */
  private recovered(): void {
    if (!this.recovering) return;
    this.recovering = false;
    this.error.set(null);
  }

  private watchConnection(): void {
    if (!this.offsetUnsub) {
      // Presence timestamps come from the server; the device's clock can be
      // off. Without this offset "gone since when" would simply be wrong.
      this.offsetUnsub = onValue(ref(this.opts.db, '.info/serverTimeOffset'), (snap) => {
        const v = snap.val();
        if (typeof v === 'number') this.serverOffset = v;
      });
    }
    if (this.connUnsub) return;
    this.connUnsub = onValue(ref(this.opts.db, '.info/connected'), (snap) => {
      const up = snap.val() === true;
      this.online.set(up);
      if (this.offlineTimer) {
        clearTimeout(this.offlineTimer);
        this.offlineTimer = null;
      }
      if (up) {
        this.offline.set(false);
        // onDisconnect must be registered again after EVERY reconnect.
        const code = this.code;
        if (code) void this.announcePresence(code);
        // Catch up on changes missed during the disconnect.
        void this.resync();
      } else {
        // Don't show short dropouts – the SDK usually reconnects by itself.
        this.offlineTimer = setTimeout(() => this.offline.set(true), OFFLINE_GRACE);
      }
    });
  }

  private readonly onWake = (): void => {
    if (document.visibilityState === 'hidden') return;
    void this.resync();
  };

  private bindWakeups(): void {
    if (this.wakeupsBound) return;
    this.wakeupsBound = true;
    document.addEventListener('visibilitychange', this.onWake);
    window.addEventListener('online', this.onWake);
    window.addEventListener('focus', this.onWake);
  }

  private unbindWakeups(): void {
    if (!this.wakeupsBound) return;
    this.wakeupsBound = false;
    document.removeEventListener('visibilitychange', this.onWake);
    window.removeEventListener('online', this.onWake);
    window.removeEventListener('focus', this.onWake);
  }

  private markPending(on: boolean): void {
    if (this.pendingTimer) {
      clearTimeout(this.pendingTimer);
      this.pendingTimer = null;
    }
    if (!on) {
      this.pending.set(false);
      return;
    }
    this.pendingTimer = setTimeout(() => this.pending.set(true), PENDING_HINT_AFTER);
  }

  private clearTimers(): void {
    for (const t of [this.reattachTimer, this.offlineTimer, this.pendingTimer]) {
      if (t) clearTimeout(t);
    }
    this.reattachTimer = null;
    this.offlineTimer = null;
    this.pendingTimer = null;
    if (this.tickTimer) clearInterval(this.tickTimer);
    this.tickTimer = null;
  }

  private remember(code: string): void {
    try {
      localStorage.setItem(this.opts.activeKey, code);
    } catch {
      /* private mode or similar – resuming is simply not possible then */
    }
  }

  private recall(): string | null {
    try {
      return localStorage.getItem(this.opts.activeKey);
    } catch {
      return null;
    }
  }

  private forget(): void {
    try {
      localStorage.removeItem(this.opts.activeKey);
    } catch {
      /* ignore */
    }
  }
}
