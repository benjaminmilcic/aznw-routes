export type UnoStatus = 'waiting' | 'playing' | 'finished';

/** Spielart: am Gerät (mit Computer-Gegnern) oder online über einen Spiel-Code. */
export type UnoMode = 'local' | 'online';

/** Spielstärke der Computer-Gegner. */
export type UnoLevel = 'easy' | 'medium' | 'hard';

/** Spielbare Kartenfarben + 'w' für Joker (Wild). */
export type UnoColor = 'r' | 'y' | 'g' | 'b';
export type UnoCardColor = UnoColor | 'w';

/**
 * Kartenwert:
 *  - '0' … '9'  Zahlenkarten
 *  - 'skip'     Aussetzen (der Nächste kommt nicht dran)
 *  - 'rev'      Richtungswechsel (bei zwei Aktiven wie Aussetzen)
 *  - 'd2'       Zieh Zwei (der Nächste zieht 2 und setzt aus)
 *  - 'wild'     Farbwahl-Joker
 *  - 'd4'       Zieh-Vier-Joker (der Nächste zieht 4 und setzt aus)
 */
export type UnoValue =
  | '0' | '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9'
  | 'skip' | 'rev' | 'd2' | 'wild' | 'd4';

export interface UnoCard {
  /** Innerhalb eines Spiels eindeutige Id (Karten kommen doppelt vor). */
  id: string;
  color: UnoCardColor;
  value: UnoValue;
}

export interface UnoPlayer {
  id: string;
  name: string;
  emoji: string;
  /** true = wird vom Computer gespielt (nur im Modus "local"). */
  cpu?: boolean;
}

/** Beschreibt den letzten Zug, damit die anderen sehen, was passiert ist. */
export interface UnoAction {
  /** Wer den Zug gemacht hat. */
  by: string;
  /** 'play' = Karte gelegt, 'draw' = Karte gezogen. */
  type: 'play' | 'draw';
  /** Gelegte Karte (nur bei type === 'play'). */
  card?: UnoCard;
  /** Wie viele Karten der Nächste ziehen musste (d2/d4). */
  forced?: number;
  at: number;
}

export interface UnoGame {
  code: string;
  status: UnoStatus;
  hostId: string;
  players: Record<string, UnoPlayer>;
  /** Sitzreihenfolge der Spieler-Ids. */
  order: string[];
  /** Handkarten je Spieler. */
  hands: Record<string, UnoCard[]>;
  /** Verdeckter Nachziehstapel (oberste Karte = letztes Element). */
  drawPile: UnoCard[];
  /** Offener Ablagestapel (oberste Karte = letztes Element). */
  discardPile: UnoCard[];
  /** Aktuell geforderte Farbe (löst Joker auf). */
  currentColor: UnoColor;
  /** Spielrichtung: 1 = der Reihe nach, -1 = rückwärts (nach "Richtungswechsel"). */
  direction: 1 | -1;
  /** playerId, der gerade dran ist. */
  currentTurn: string;
  winnerId: string | null;
  /**
   * Spieler-Ids in der Reihenfolge, in der sie ihre Karten losgeworden sind –
   * ranking[0] ist der Sieger. Wer drinsteht, wird übersprungen.
   */
  ranking: string[];
  /** Letzter Spielzug (für die kurze Hinweis-Einblendung), oder null. */
  lastAction: UnoAction | null;
  /** Zuletzt ausgestiegener Mitspieler – die anderen bekommen dazu einen Hinweis. */
  lastLeft?: { name: string; at: number } | null;
  /** Fortlaufende Revision – verhindert, dass ein verspäteter Zug einen neueren
   *  Stand überschreibt (siehe shared/firebase/game-channel.ts). */
  rev: number;
  createdAt: number;
  updatedAt: number;
}

/** Karten auf der Hand zu Spielbeginn. */
export const START_HAND = 7;

/** UNO spielt sich zu zweit bis zu sechst gut. */
export const MAX_PLAYERS = 6;
export const MIN_PLAYERS = 2;

export const COLORS: UnoColor[] = ['r', 'y', 'g', 'b'];
