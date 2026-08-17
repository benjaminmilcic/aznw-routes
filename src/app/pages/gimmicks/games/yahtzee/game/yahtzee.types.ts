import type { ScoreMap } from './scoring';

export type YStatus = 'waiting' | 'playing' | 'finished';

/** Spielart: am Gerät (mit Computer-Gegnern) oder online über einen Spiel-Code. */
export type YMode = 'local' | 'online';

/** Spielstärke der Computer-Gegner. */
export type YLevel = 'easy' | 'medium' | 'hard';

export interface YPlayer {
  id: string;
  name: string;
  emoji: string;
  /** true = wird vom Computer gespielt (nur im Modus "local"). */
  cpu?: boolean;
}

export interface YatzyGame {
  code: string;
  status: YStatus;
  hostId: string;
  players: Record<string, YPlayer>;
  /** Reihenfolge der Spieler-Ids (Host zuerst). */
  order: string[];
  /** playerId, der gerade würfelt/wählt. */
  currentTurn: string;
  /** Gemeinsame Würfel (alle Geräte sehen denselben Wurf). */
  dice: number[];
  /** Welche Würfel sind festgehalten. */
  held: boolean[];
  /** Verbleibende Würfe in diesem Zug (0 … 3). */
  rollsLeft: number;
  /** Wurde in diesem Zug schon mindestens einmal gewürfelt? */
  rolledThisTurn: boolean;
  /**
   * Zählt jeden Wurf hoch. Die Würfel-Komponente startet daran ihre
   * Rollanimation – auch dann, wenn dieselbe Augenzahl noch einmal fällt.
   */
  rollCount: number;
  /** Wertungstabelle je Spieler: nur eingetragene Kategorien sind gesetzt. */
  scores: Record<string, ScoreMap>;
  winnerId: string | null; // playerId, 'tie' oder null
  /** Zuletzt ausgestiegener Mitspieler – die anderen bekommen dazu einen Hinweis. */
  lastLeft?: { name: string; at: number } | null;
  /** Fortlaufende Revision – verhindert, dass ein verspäteter Zug einen neueren
   *  Stand überschreibt (siehe shared/firebase/game-channel.ts). */
  rev: number;
  createdAt: number;
  updatedAt: number;
}
