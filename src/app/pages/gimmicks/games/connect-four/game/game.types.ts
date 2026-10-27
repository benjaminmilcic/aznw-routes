export type C4Status = 'waiting' | 'playing' | 'finished';

export type C4Color = 'red' | 'yellow';

/** Game mode: against the computer or online against a real player. */
export type C4Mode = 'computer' | 'online';

/** Difficulty of the computer. */
export type C4Level = 'easy' | 'medium' | 'hard';

export interface C4Player {
  id: string;
  name: string;
  emoji: string;
  color: C4Color; // Seat color: host/player 1 = red, guest/player 2 = yellow
}

export interface C4Game {
  code: string;
  status: C4Status;
  hostId: string;
  cols: number; // 7
  rows: number; // 6
  /** Board as a flat array (length cols*rows). Value: playerId or '' (empty).
   *  Index = row * cols + col, row 0 is at the TOP. */
  board: string[];
  /** playerId whose turn it is. */
  currentTurn: string;
  /** Order of the player ids. */
  order: string[];
  players: Record<string, C4Player>;
  winnerId: string | null; // playerId, 'tie' or null
  /** Indices of the four winning cells (for highlighting) or null. */
  winningCells: number[] | null;
  /** Index of the last dropped disc (for highlighting) or null. */
  lastMove: number | null;
  /** Running revision – prevents a delayed move from overwriting a newer
   *  state (see shared/firebase/game-channel.ts). */
  rev: number;
  createdAt: number;
  updatedAt: number;
}
