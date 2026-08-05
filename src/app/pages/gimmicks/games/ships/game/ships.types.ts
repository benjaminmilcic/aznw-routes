// =============================================================
//  "Schiffe versenken" – Datentypen und Spielkonstanten.
// =============================================================
// Aus der Whiteboard-App übernommen und um den Computer-Gegner
// erweitert. Der Online-Modus liegt in der Realtime Database unter
// "ships/games/<code>" – genau wie bei "4 Gewinnt".
// =============================================================

/** Kantenlänge des Spielfelds (8 x 8 Felder). */
export const GRID_SIZE = 8;

/**
 * Treffer = nochmal schießen? Macht Kindern mehr Spaß.
 * Auf `false` setzen für klassische Regeln (nach jedem Schuss wechselt der Zug).
 */
export const EXTRA_TURN_ON_HIT = true;

/** Feste Id des Computer-Gegners. */
export const CPU_ID = 'cpu';

export type ShipsMode = 'computer' | 'online';
export type ShipsLevel = 'easy' | 'medium' | 'hard';
export type ShipsStatus = 'waiting' | 'setup' | 'battle' | 'finished';
export type ShotResult = 'hit' | 'miss';

export interface ShipSpec {
  id: string;
  /** Übersetzungsschlüssel des Namens, z. B. "…shipsGame.ships.battleship". */
  nameKey: string;
  emoji: string;
  size: number;
}

/** Die Flotte, die jede:r platzieren muss. */
export const FLEET: ShipSpec[] = [
  { id: 'b', nameKey: 'battleship', emoji: '🚢', size: 4 },
  { id: 'c1', nameKey: 'cruiser', emoji: '⛴️', size: 3 },
  { id: 'c2', nameKey: 'cruiser', emoji: '⛴️', size: 3 },
  { id: 'd1', nameKey: 'boat', emoji: '⛵', size: 2 },
  { id: 'd2', nameKey: 'boat', emoji: '⛵', size: 2 },
  { id: 'd3', nameKey: 'boat', emoji: '⛵', size: 2 },
];

/** Ein platziertes Schiff. `cells` sind Schlüssel im Format "x,y". */
export interface PlacedShip {
  specId: string;
  size: number;
  cells: string[];
}

export interface ShipsPlayer {
  /**
   * Nur von dieser App gesetzt (die Whiteboard-App kennt das Feld nicht).
   * Dient dazu, den Computer-Gegner zu erkennen.
   */
  id?: string;
  name: string;
  emoji: string;
  /** Flotte steht und ist abgeschickt. */
  ready: boolean;
}

/**
 * Kompletter Spielstand.
 *
 * WICHTIG: Die Feldnamen entsprechen exakt dem Dokument, das die
 * Whiteboard-App in Firestore ablegt ("games/<code>"). Dadurch lässt sich
 * eine Online-Partie geräteübergreifend zwischen beiden Apps spielen.
 * Im Computer-Modus liegt dasselbe Objekt nur im Speicher des Browsers.
 */
export interface ShipsGame {
  code: string;
  status: ShipsStatus;
  hostId: string;
  /** Zweite Person – im Computer-Modus die feste Id des Computers. */
  guestId: string | null;
  players: Record<string, ShipsPlayer>;
  /** uid -> platzierte Flotte */
  fleets: Record<string, PlacedShip[]>;
  /** uid -> { "x,y": "hit" | "miss" } = die Schüsse, die DIESE Person abgegeben hat */
  shots: Record<string, Record<string, ShotResult>>;
  /** uid der Person, die gerade dran ist */
  turn: string | null;
  winner: string | null;
  createdAt: number;
}

/** Wie ein einzelnes Feld gezeichnet wird. */
export interface CellView {
  state: 'water' | 'ship' | 'hit' | 'miss' | 'sunk';
}

export type Orientation = 'h' | 'v';
