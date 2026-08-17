export type MemoStatus = 'waiting' | 'playing' | 'finished';

/** Spielart: gegen den Computer oder online gegen einen echten Mitspieler. */
export type MemoMode = 'computer' | 'online';

/** Gedächtnis-Stärke des Computers. */
export type MemoLevel = 'easy' | 'medium' | 'hard';

export interface MemoPlayer {
  id: string;
  name: string;
  avatar: string; // motif-id als bunter Avatar
  score: number;
}

export interface MemoCard {
  motifId: string;
  matchedBy: string | null; // playerId, der das Paar gefunden hat
}

export interface MemoGame {
  code: string;
  status: MemoStatus;
  hostId: string;
  pairs: number;
  board: MemoCard[];
  /** Indizes der aktuell offenen Karten (0, 1 oder 2). */
  flipped: number[];
  /** true während der kurzen Anzeige eines Fehlversuchs. */
  resolving: boolean;
  /** playerId, der gerade dran ist. */
  currentTurn: string;
  /** Reihenfolge der Spieler-Ids. */
  order: string[];
  players: Record<string, MemoPlayer>;
  winnerId: string | null; // playerId, 'tie' oder null
  /** Fortlaufende Revision – verhindert, dass ein verspäteter Zug einen neueren
   *  Stand überschreibt (siehe shared/firebase/game-channel.ts). */
  rev: number;
  createdAt: number;
  updatedAt: number;
}
