export type MillStatus = 'waiting' | 'playing' | 'finished';

/** Game mode: against the computer or online against a real player. */
export type MillMode = 'computer' | 'online';

/** Difficulty of the computer. */
export type MillLevel = 'easy' | 'medium' | 'hard';

export interface MillPlayer {
  id: string;
  name: string;
  emoji: string;
}

/** Points are numbered 0..23 (three nested squares). */
export const POINTS_COUNT = 24;
/** Pieces per player. */
export const PIECES = 9;

export interface MillGame {
  code: string;
  status: MillStatus;
  hostId: string;
  players: Record<string, MillPlayer>;
  /** Order of the player ids (order[0] = seat 0, order[1] = seat 1). */
  order: string[];
  /** 24 points: -1 empty, otherwise the seat (0 or 1) of the piece. */
  board: number[];
  /** How many pieces each seat has already placed (placing phase). */
  placed: number[];
  /** playerId whose turn it is. */
  currentTurn: string;
  /** true: the current player has a mill and must remove a piece. */
  removing: boolean;
  winnerId: string | null;
  lastAction: MillAction | null;
  /** Running revision – prevents a delayed move from overwriting a newer
   *  state (see shared/firebase/game-channel.ts). */
  rev: number;
  createdAt: number;
  updatedAt: number;
}

/** Describes the last move for a short overlay for the opponent. */
export interface MillAction {
  by: string;
  type: 'place' | 'move' | 'remove';
  /** Affected point. */
  at_field: number;
  /** true if a mill was closed in the process. */
  mill?: boolean;
  at: number;
}

/** Neighbors per point (for possible moves in the moving phase). */
export const ADJACENCY: number[][] = [
  [1, 9], // 0
  [0, 2, 4], // 1
  [1, 14], // 2
  [4, 10], // 3
  [3, 5, 1, 7], // 4
  [4, 13], // 5
  [7, 11], // 6
  [6, 8, 4], // 7
  [7, 12], // 8
  [0, 10, 21], // 9
  [9, 11, 3, 18], // 10
  [10, 6, 15], // 11
  [8, 13, 17], // 12
  [12, 14, 5, 20], // 13
  [2, 13, 23], // 14
  [11, 16], // 15
  [15, 17, 19], // 16
  [16, 12], // 17
  [10, 19], // 18
  [18, 20, 16, 22], // 19
  [13, 19], // 20
  [9, 22], // 21
  [21, 23, 19], // 22
  [14, 22], // 23
];

/** All 16 mills (rows of three). */
export const MILLS: number[][] = [
  // horizontal
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
  [9, 10, 11],
  [12, 13, 14],
  [15, 16, 17],
  [18, 19, 20],
  [21, 22, 23],
  // vertical
  [0, 9, 21],
  [3, 10, 18],
  [6, 11, 15],
  [1, 4, 7],
  [16, 19, 22],
  [8, 12, 17],
  [5, 13, 20],
  [2, 14, 23],
];
