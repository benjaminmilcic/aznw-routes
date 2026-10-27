export type ChessStatus = 'waiting' | 'playing' | 'finished';

// white = host, pieces at the bottom; black = guest / computer, pieces at the top.
export type ChessColor = 'white' | 'black';

/** Game mode: against the computer or online against a real player. */
export type ChessMode = 'computer' | 'online';

/** Difficulty of the computer. */
export type ChessLevel = 'easy' | 'medium' | 'hard';

export interface ChessPlayer {
  id: string;
  name: string;
  emoji: string;
  color: ChessColor;
}

export interface ChessGame {
  code: string;
  status: ChessStatus;
  hostId: string;
  /**
   * Board as a flat array of length 64 (index = row*8 + column, row 0 at the top).
   * Pieces in FEN notation: white UPPERCASE (KQRBNP), black lowercase (kqrbnp), '' empty.
   */
  board: string[];
  currentTurn: string;
  order: string[];
  players: Record<string, ChessPlayer>;
  /** Castling rights as a subset of "KQkq", "-" if none. */
  castling: string;
  /** Square that can be captured en passant, or null. */
  enPassant: number | null;
  /** Is the player whose turn it is in check? */
  check: boolean;
  /** playerId of the winner, 'draw' for a stalemate, or null. */
  winnerId: string | null;
  lastMove: { from: number; to: number } | null;
  /** Running revision – prevents a delayed move from overwriting a newer
   *  state (see shared/firebase/game-channel.ts). */
  rev: number;
  createdAt: number;
  updatedAt: number;
}

export interface ChessMove {
  from: number;
  to: number;
  /** Pawn promotion (automatically to a queen). */
  promo?: boolean;
  /** Capture en passant. */
  enPassant?: boolean;
  /** Castling: 'K' short, 'Q' long. */
  castle?: 'K' | 'Q';
}

/** Compact position for the move search (without player metadata). */
export interface ChessPos {
  board: string[];
  turn: ChessColor;
  castling: string;
  enPassant: number | null;
}
