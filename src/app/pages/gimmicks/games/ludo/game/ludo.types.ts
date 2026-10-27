export type LudoStatus = 'waiting' | 'playing' | 'finished';

/** Game mode: on the device (with computer opponents) or online via a game code. */
export type LudoMode = 'local' | 'online';

/** Difficulty of the computer opponents. */
export type LudoLevel = 'easy' | 'medium' | 'hard';

export interface LudoPlayer {
  id: string;
  name: string;
  emoji: string;
  /** true = played by the computer (only in "local" mode). */
  cpu?: boolean;
}

/**
 * Position of a piece, encoded as a number:
 *  - -1        in the "garage" (start yard), not in play yet
 *  - 0 … 39    on the shared track, as *relative* progress
 *              from the own start square (board square = (startIndex + pos) % 40)
 *  - 40 … 43   in the own home column (pos - 40 = goal square 0 … 3)
 *
 * A piece is "finished" as soon as pos >= 40.
 */
export type LudoPos = number;

export const HOME: LudoPos = -1;
export const GOAL_BASE = 40; // pos 40..43 = goal squares 0..3
export const TRACK_LEN = 40; // Squares on the shared track
export const GOAL_LEN = 4; // Goal squares per player
export const PIECES = 4; // Pieces per player

/** The board has no more than four corners. */
export const MAX_PLAYERS = 4;
export const MIN_PLAYERS = 2;

/** Start square index on the track per seat (0 = left, then clockwise). */
export const SEAT_START: number[] = [0, 10, 20, 30];

/**
 * Which seats are used for which number of players. With two players you sit
 * opposite each other (seats 0 and 2), so that the way seems equally long for both.
 */
export const SEAT_LAYOUT: Record<number, number[]> = {
  2: [0, 2],
  3: [0, 1, 2],
  4: [0, 1, 2, 3],
};

/** Describes the last move for a short overlay for the other players. */
export interface LudoAction {
  /** Who rolled/moved. */
  by: string;
  /** Rolled pip count. */
  dice: number;
  /** true if this roll captured an opposing piece. */
  captured?: boolean;
  at: number;
}

export interface LudoGame {
  code: string;
  status: LudoStatus;
  hostId: string;
  players: Record<string, LudoPlayer>;
  /** Turn order of the player ids (sorted by seat). */
  order: string[];
  /** Seat (0 … 3) per player – determines color, start, garage and goal. */
  seats: Record<string, number>;
  /** Piece positions per player (always 4 entries). */
  pieces: Record<string, LudoPos[]>;
  /** playerId whose turn it is. */
  currentTurn: string;
  /** Last rolled pip count; null = the dice must be rolled first. */
  dice: number | null;
  /** How many rolls the current player still has in this phase. */
  rollsLeft: number;
  winnerId: string | null;
  /**
   * Player ids in the order in which they brought all four pieces home –
   * ranking[0] is the winner, ranking[1] the second …
   * Whoever is listed here is skipped when play continues.
   */
  ranking: string[];
  lastAction: LudoAction | null;
  /** Player who left last – the others get a notice about it. */
  lastLeft?: { name: string; at: number } | null;
  /** Running revision – prevents a delayed move from overwriting a newer
   *  state (see shared/firebase/game-channel.ts). */
  rev: number;
  createdAt: number;
  updatedAt: number;
}

/** A possible move: piece `pieceIndex` lands on `to`. */
export interface LudoMove {
  pieceIndex: number;
  to: LudoPos;
  /** true if an opposing piece is captured in the process. */
  captures: boolean;
}
