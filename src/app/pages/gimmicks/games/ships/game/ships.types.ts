// =============================================================
//  "Battleship" – data types and game constants.
// =============================================================
// Taken over from the whiteboard app and extended by the computer
// opponent. The online mode lives in the Realtime Database under
// "ships/games/<code>" – just like "Connect Four".
// =============================================================

/** Edge length of the board (8 x 8 cells). */
export const GRID_SIZE = 8;

/**
 * Hit = shoot again? More fun for children.
 * Set to `false` for classic rules (the turn changes after every shot).
 */
export const EXTRA_TURN_ON_HIT = true;

/** Fixed id of the computer opponent. */
export const CPU_ID = 'cpu';

export type ShipsMode = 'computer' | 'online';
export type ShipsLevel = 'easy' | 'medium' | 'hard';
export type ShipsStatus = 'waiting' | 'setup' | 'battle' | 'finished';
export type ShotResult = 'hit' | 'miss';

export interface ShipSpec {
  id: string;
  /** Translation key of the name, e.g. "…shipsGame.ships.battleship". */
  nameKey: string;
  emoji: string;
  size: number;
}

/** The fleet everyone has to place. */
export const FLEET: ShipSpec[] = [
  { id: 'b', nameKey: 'battleship', emoji: '🚢', size: 4 },
  { id: 'c1', nameKey: 'cruiser', emoji: '⛴️', size: 3 },
  { id: 'c2', nameKey: 'cruiser', emoji: '⛴️', size: 3 },
  { id: 'd1', nameKey: 'boat', emoji: '⛵', size: 2 },
  { id: 'd2', nameKey: 'boat', emoji: '⛵', size: 2 },
  { id: 'd3', nameKey: 'boat', emoji: '⛵', size: 2 },
];

/** A placed ship. `cells` are keys in the format "x,y". */
export interface PlacedShip {
  specId: string;
  size: number;
  cells: string[];
}

export interface ShipsPlayer {
  /**
   * Only set by this app (the whiteboard app does not know the field).
   * Used to recognize the computer opponent.
   */
  id?: string;
  name: string;
  emoji: string;
  /** The fleet is placed and submitted. */
  ready: boolean;
}

/**
 * Complete game state.
 *
 * IMPORTANT: The field names match exactly the document that the
 * whiteboard app stores in Firestore ("games/<code>"). That way
 * an online game can be played across devices between both apps.
 * In computer mode the same object only lives in the browser's memory.
 */
export interface ShipsGame {
  code: string;
  status: ShipsStatus;
  hostId: string;
  /** Second person – in computer mode the fixed id of the computer. */
  guestId: string | null;
  players: Record<string, ShipsPlayer>;
  /** uid -> placed fleet */
  fleets: Record<string, PlacedShip[]>;
  /** uid -> { "x,y": "hit" | "miss" } = the shots THIS person has fired */
  shots: Record<string, Record<string, ShotResult>>;
  /** uid of the person whose turn it is */
  turn: string | null;
  winner: string | null;
  createdAt: number;
}

/** How a single cell is drawn. */
export interface CellView {
  state: 'water' | 'ship' | 'hit' | 'miss' | 'sunk';
}

export type Orientation = 'h' | 'v';
