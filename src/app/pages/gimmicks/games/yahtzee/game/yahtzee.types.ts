import type { ScoreMap } from './scoring';

export type YStatus = 'waiting' | 'playing' | 'finished';

/** Game mode: on the device (with computer opponents) or online via a game code. */
export type YMode = 'local' | 'online';

/** Difficulty of the computer opponents. */
export type YLevel = 'easy' | 'medium' | 'hard';

export interface YPlayer {
  id: string;
  name: string;
  emoji: string;
  /** true = played by the computer (only in "local" mode). */
  cpu?: boolean;
}

export interface YatzyGame {
  code: string;
  status: YStatus;
  hostId: string;
  players: Record<string, YPlayer>;
  /** Order of the player ids (host first). */
  order: string[];
  /** playerId who is currently rolling/choosing. */
  currentTurn: string;
  /** Shared dice (all devices see the same roll). */
  dice: number[];
  /** Which dice are held. */
  held: boolean[];
  /** Rolls left in this turn (0 … 3). */
  rollsLeft: number;
  /** Has the dice been rolled at least once in this turn? */
  rolledThisTurn: boolean;
  /**
   * Counts up with every roll. The dice component starts its rolling
   * animation on it – even if the same pip count comes up again.
   */
  rollCount: number;
  /** Score table per player: only filled-in categories are set. */
  scores: Record<string, ScoreMap>;
  winnerId: string | null; // playerId, 'tie' or null
  /** Player who left last – the others get a notice about it. */
  lastLeft?: { name: string; at: number } | null;
  /** Running revision – prevents a delayed move from overwriting a newer
   *  state (see shared/firebase/game-channel.ts). */
  rev: number;
  createdAt: number;
  updatedAt: number;
}
