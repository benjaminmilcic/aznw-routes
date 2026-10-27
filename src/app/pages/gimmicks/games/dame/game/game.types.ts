export type DameStatus = 'waiting' | 'playing' | 'finished';

// white = host, moves up (row gets smaller).
// black = guest / computer, moves down (row gets larger).
export type DameColor = 'white' | 'black';

/** Game mode: against the computer or online against a real player. */
export type DameMode = 'computer' | 'online';

/** Difficulty of the computer. */
export type DameLevel = 'easy' | 'medium' | 'hard';

export interface DamePlayer {
  id: string;
  name: string;
  emoji: string;
  color: DameColor;
}

export interface DameGame {
  code: string;
  status: DameStatus;
  hostId: string;
  /**
   * Board as a flat array of length 64 (index = row*8 + column).
   * Values: '' empty, 'w' white piece, 'W' white king, 'b'/'B' black.
   */
  board: string[];
  /** playerId whose turn it is. */
  currentTurn: string;
  /** On a multiple capture: square that must continue capturing. */
  continueFrom: number | null;
  /** Order of the player ids (order[0] = host = white). */
  order: string[];
  players: Record<string, DamePlayer>;
  winnerId: string | null;
  /** Last moved piece (for highlighting) or null. */
  lastMove: { from: number; to: number } | null;
  /** Running revision – prevents a delayed move from overwriting a newer
   *  state (see shared/firebase/game-channel.ts). */
  rev: number;
  createdAt: number;
  updatedAt: number;
}

/** A single move: from → to, optionally with the captured square. */
export interface DameMove {
  from: number;
  to: number;
  captured: number | null;
}
