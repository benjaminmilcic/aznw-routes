export type UnoStatus = 'waiting' | 'playing' | 'finished';

/** Game mode: on the device (with computer opponents) or online via a game code. */
export type UnoMode = 'local' | 'online';

/** Difficulty of the computer opponents. */
export type UnoLevel = 'easy' | 'medium' | 'hard';

/** Playable card colors + 'w' for wild. */
export type UnoColor = 'r' | 'y' | 'g' | 'b';
export type UnoCardColor = UnoColor | 'w';

/**
 * Card value:
 *  - '0' … '9'  number cards
 *  - 'skip'     skip (the next player misses their turn)
 *  - 'rev'      reverse (with two active players like skip)
 *  - 'd2'       draw two (the next player draws 2 and misses their turn)
 *  - 'wild'     wild color choice
 *  - 'd4'       wild draw four (the next player draws 4 and misses their turn)
 */
export type UnoValue =
  | '0' | '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9'
  | 'skip' | 'rev' | 'd2' | 'wild' | 'd4';

export interface UnoCard {
  /** Id unique within a game (cards occur twice). */
  id: string;
  color: UnoCardColor;
  value: UnoValue;
}

export interface UnoPlayer {
  id: string;
  name: string;
  emoji: string;
  /** true = played by the computer (only in "local" mode). */
  cpu?: boolean;
}

/** Describes the last move so that the others see what happened. */
export interface UnoAction {
  /** Who made the move. */
  by: string;
  /** 'play' = card played, 'draw' = card drawn. */
  type: 'play' | 'draw';
  /** Played card (only for type === 'play'). */
  card?: UnoCard;
  /** How many cards the next player had to draw (d2/d4). */
  forced?: number;
  at: number;
}

export interface UnoGame {
  code: string;
  status: UnoStatus;
  hostId: string;
  players: Record<string, UnoPlayer>;
  /** Seating order of the player ids. */
  order: string[];
  /** Hand cards per player. */
  hands: Record<string, UnoCard[]>;
  /** Face-down draw pile (top card = last element). */
  drawPile: UnoCard[];
  /** Face-up discard pile (top card = last element). */
  discardPile: UnoCard[];
  /** Currently required color (resolves wild cards). */
  currentColor: UnoColor;
  /** Direction of play: 1 = in order, -1 = backwards (after a "reverse"). */
  direction: 1 | -1;
  /** playerId whose turn it is. */
  currentTurn: string;
  winnerId: string | null;
  /**
   * Player ids in the order in which they got rid of their cards –
   * ranking[0] is the winner. Whoever is listed here is skipped.
   */
  ranking: string[];
  /** Last move (for the short notice overlay), or null. */
  lastAction: UnoAction | null;
  /** Player who left last – the others get a notice about it. */
  lastLeft?: { name: string; at: number } | null;
  /** Running revision – prevents a delayed move from overwriting a newer
   *  state (see shared/firebase/game-channel.ts). */
  rev: number;
  createdAt: number;
  updatedAt: number;
}

/** Cards in the hand at the start of the game. */
export const START_HAND = 7;

/** UNO plays well with two to six players. */
export const MAX_PLAYERS = 6;
export const MIN_PLAYERS = 2;

export const COLORS: UnoColor[] = ['r', 'y', 'g', 'b'];
