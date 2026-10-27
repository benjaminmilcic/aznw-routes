export type MemoStatus = 'waiting' | 'playing' | 'finished';

/** Game mode: against the computer or online against a real player. */
export type MemoMode = 'computer' | 'online';

/** Memory strength of the computer. */
export type MemoLevel = 'easy' | 'medium' | 'hard';

export interface MemoPlayer {
  id: string;
  name: string;
  avatar: string; // motif id as a colorful avatar
  score: number;
}

export interface MemoCard {
  motifId: string;
  matchedBy: string | null; // playerId who found the pair
}

export interface MemoGame {
  code: string;
  status: MemoStatus;
  hostId: string;
  pairs: number;
  board: MemoCard[];
  /** Indices of the currently face-up cards (0, 1 or 2). */
  flipped: number[];
  /** true during the short display of a failed attempt. */
  resolving: boolean;
  /** playerId whose turn it is. */
  currentTurn: string;
  /** Order of the player ids. */
  order: string[];
  players: Record<string, MemoPlayer>;
  winnerId: string | null; // playerId, 'tie' or null
  /** Running revision – prevents a delayed move from overwriting a newer
   *  state (see shared/firebase/game-channel.ts). */
  rev: number;
  createdAt: number;
  updatedAt: number;
}
