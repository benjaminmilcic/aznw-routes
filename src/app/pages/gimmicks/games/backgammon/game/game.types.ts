export type BgStatus = 'waiting' | 'playing' | 'finished';

// white = host, moves from high to low points (home 0–5).
// black = guest / computer, moves from low to high points (home 18–23).
export type BgColor = 'white' | 'black';

/** Game mode: against the computer or online against a real player. */
export type BgMode = 'computer' | 'online';

/** Difficulty of the computer. */
export type BgLevel = 'easy' | 'medium' | 'hard';

export interface BgPlayer {
  id: string;
  name: string;
  emoji: string;
  color: BgColor;
}

export interface BgGame {
  code: string;
  status: BgStatus;
  hostId: string;
  /**
   * Board as a flat array of length 24.
   * Value > 0  → that many white checkers on this point.
   * Value < 0  → that many black checkers (absolute value) on this point.
   * Value = 0  → point is empty.
   * Index 0 is the bottom right corner (white home), index 23 top right.
   */
  board: number[];
  /** Hit checkers that have to be entered again. */
  barWhite: number;
  barBlack: number;
  /** Checkers already borne off (goal: 15). */
  offWhite: number;
  offBlack: number;
  /** playerId whose turn it is. */
  currentTurn: string;
  /** Order of the player ids (order[0] = host = white). */
  order: string[];
  players: Record<string, BgPlayer>;
  /** The current roll (two dice) – empty as long as nothing has been rolled. */
  dice: number[];
  /** Pips not used yet (four equal values for doubles). */
  diceLeft: number[];
  /** Has the current player already rolled this turn? */
  rolled: boolean;
  winnerId: string | null;
  /** Running revision – prevents a delayed move from overwriting a newer
   *  state (see shared/firebase/game-channel.ts). */
  rev: number;
  createdAt: number;
  updatedAt: number;
}

/** A single partial move of a checker (for move generation). */
export interface BgMove {
  /** Source point 0–23 or -1 for "from the bar". */
  from: number;
  /** Target point 0–23 or -1 for "bear off". */
  to: number;
  /** Die value used. */
  die: number;
}

export interface Bar {
  white: number;
  black: number;
}
