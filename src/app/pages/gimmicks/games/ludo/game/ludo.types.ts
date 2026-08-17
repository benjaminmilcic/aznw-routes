export type LudoStatus = 'waiting' | 'playing' | 'finished';

/** Spielart: am Gerät (mit Computer-Gegnern) oder online über einen Spiel-Code. */
export type LudoMode = 'local' | 'online';

/** Spielstärke der Computer-Gegner. */
export type LudoLevel = 'easy' | 'medium' | 'hard';

export interface LudoPlayer {
  id: string;
  name: string;
  emoji: string;
  /** true = wird vom Computer gespielt (nur im Modus "local"). */
  cpu?: boolean;
}

/**
 * Position einer Figur, kodiert als eine Zahl:
 *  - -1        in der „Garage" (Startfeld-Hof), noch nicht im Spiel
 *  - 0 … 39    auf der gemeinsamen Laufbahn, als *relativer* Fortschritt
 *              ab dem eigenen Startfeld (Brettfeld = (startIndex + pos) % 40)
 *  - 40 … 43   im eigenen Zielhaus (pos - 40 = Zielfeld 0 … 3)
 *
 * Eine Figur ist „fertig", sobald pos >= 40.
 */
export type LudoPos = number;

export const HOME: LudoPos = -1;
export const GOAL_BASE = 40; // pos 40..43 = Zielfelder 0..3
export const TRACK_LEN = 40; // Felder auf der gemeinsamen Laufbahn
export const GOAL_LEN = 4; // Zielfelder pro Spieler
export const PIECES = 4; // Figuren pro Spieler

/** Mehr als vier Ecken hat das Brett nicht. */
export const MAX_PLAYERS = 4;
export const MIN_PLAYERS = 2;

/** Startfeld-Index auf der Laufbahn je Sitzplatz (0 = links, dann im Uhrzeigersinn). */
export const SEAT_START: number[] = [0, 10, 20, 30];

/**
 * Welche Sitzplätze bei welcher Spielerzahl benutzt werden. Zu zweit sitzt
 * man sich gegenüber (Sitz 0 und 2), damit der Weg für beide gleich lang wirkt.
 */
export const SEAT_LAYOUT: Record<number, number[]> = {
  2: [0, 2],
  3: [0, 1, 2],
  4: [0, 1, 2, 3],
};

/** Beschreibt den letzten Zug für eine kurze Einblendung bei den Mitspielern. */
export interface LudoAction {
  /** Wer gewürfelt/gezogen hat. */
  by: string;
  /** Gewürfelte Augenzahl. */
  dice: number;
  /** true, wenn dieser Wurf eine gegnerische Figur geschlagen hat. */
  captured?: boolean;
  at: number;
}

export interface LudoGame {
  code: string;
  status: LudoStatus;
  hostId: string;
  players: Record<string, LudoPlayer>;
  /** Zugreihenfolge der Spieler-Ids (nach Sitzplatz sortiert). */
  order: string[];
  /** Sitzplatz (0 … 3) je Spieler – bestimmt Farbe, Start, Garage und Ziel. */
  seats: Record<string, number>;
  /** Figur-Positionen je Spieler (immer 4 Einträge). */
  pieces: Record<string, LudoPos[]>;
  /** playerId, der gerade dran ist. */
  currentTurn: string;
  /** Zuletzt gewürfelte Augenzahl; null = es muss erst gewürfelt werden. */
  dice: number | null;
  /** Wie viele Würfe der aktuelle Spieler in dieser Phase noch hat. */
  rollsLeft: number;
  winnerId: string | null;
  /**
   * Spieler-Ids in der Reihenfolge, in der sie alle vier Figuren ins Ziel
   * gebracht haben – ranking[0] ist der Sieger, ranking[1] der Zweite …
   * Wer drinsteht, wird beim Weiterspielen übersprungen.
   */
  ranking: string[];
  lastAction: LudoAction | null;
  /** Zuletzt ausgestiegener Mitspieler – die anderen bekommen dazu einen Hinweis. */
  lastLeft?: { name: string; at: number } | null;
  /** Fortlaufende Revision – verhindert, dass ein verspäteter Zug einen neueren
   *  Stand überschreibt (siehe shared/firebase/game-channel.ts). */
  rev: number;
  createdAt: number;
  updatedAt: number;
}

/** Ein möglicher Zug: Figur `pieceIndex` landet auf `to`. */
export interface LudoMove {
  pieceIndex: number;
  to: LudoPos;
  /** true, wenn dabei eine gegnerische Figur geschlagen wird. */
  captures: boolean;
}
