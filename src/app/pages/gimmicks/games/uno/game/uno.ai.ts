// =============================================================
//  Computer-Gegner für UNO.
// =============================================================
//   easy   – legt irgendeine passende Karte, wählt die Farbe zufällig
//   medium – meistens der beste Zug, manchmal ein zufälliger
//   hard   – spart Joker auf, greift an, wenn jemand kurz vor UNO steht,
//            und wählt die Farbe, von der er selbst am meisten hat
// =============================================================
import { isPlayable, nextPlayer, topCard } from './uno.rules';
import {
  COLORS,
  type UnoCard,
  type UnoColor,
  type UnoGame,
  type UnoLevel,
} from './uno.types';

/** Was der Computer tun will: eine Karte legen (ggf. mit Farbe) oder ziehen. */
export interface UnoDecision {
  cardId: string;
  color?: UnoColor;
}

/** Wählt den Zug des Computers – null bedeutet "ich muss ziehen". */
export function bestMove(g: UnoGame, playerId: string, level: UnoLevel): UnoDecision | null {
  const hand = g.hands[playerId] ?? [];
  const top = topCard(g);
  const playable = hand.filter((c) => isPlayable(c, top, g.currentColor));
  if (playable.length === 0) return null;

  if (level === 'easy') {
    const card = playable[Math.floor(Math.random() * playable.length)];
    return withColor(card, hand, playerId, g, 'easy');
  }

  // "medium" greift ab und zu daneben, damit Kinder eine Chance haben.
  if (level === 'medium' && Math.random() < 0.35) {
    const card = playable[Math.floor(Math.random() * playable.length)];
    return withColor(card, hand, playerId, g, level);
  }

  let best = playable[0];
  let bestScore = -Infinity;
  for (const card of playable) {
    const score = rate(card, g, playerId);
    if (score > bestScore) {
      bestScore = score;
      best = card;
    }
  }
  return withColor(best, hand, playerId, g, level);
}

/** Bewertet eine Karte – je höher, desto lieber wird sie gelegt. */
function rate(card: UnoCard, g: UnoGame, playerId: string): number {
  const victim = nextPlayer(g, playerId);
  const victimCards = g.hands[victim]?.length ?? 99;
  // Steht der Nächste kurz vor dem Sieg, lohnt sich ein Angriff besonders.
  const pressure = victimCards <= 2 ? 40 : 0;

  switch (card.value) {
    case 'd4':
      // Der stärkste Angriff – aber als Joker wertvoll, deshalb nicht zuerst.
      return 30 + pressure;
    case 'd2':
      return 45 + pressure;
    case 'skip':
      return 40 + pressure;
    case 'rev':
      return 35 + pressure;
    case 'wild':
      // Joker aufsparen, solange etwas anderes geht.
      return 10;
    default: {
      // Zahlenkarten zuerst – hohe Karten zuerst, damit sie nicht liegen bleiben.
      const n = Number(card.value);
      return 50 + (Number.isFinite(n) ? n : 0);
    }
  }
}

/** Ergänzt bei Jokern die Wunschfarbe. */
function withColor(
  card: UnoCard,
  hand: UnoCard[],
  playerId: string,
  g: UnoGame,
  level: UnoLevel,
): UnoDecision {
  if (card.color !== 'w') return { cardId: card.id };

  if (level === 'easy') {
    return { cardId: card.id, color: COLORS[Math.floor(Math.random() * COLORS.length)] };
  }

  // Die Farbe wählen, von der noch die meisten eigenen Karten übrig sind.
  const counts = new Map<UnoColor, number>(COLORS.map((c) => [c, 0]));
  for (const c of hand) {
    if (c.id === card.id || c.color === 'w') continue;
    counts.set(c.color as UnoColor, (counts.get(c.color as UnoColor) ?? 0) + 1);
  }
  let color: UnoColor = COLORS[0];
  let max = -1;
  for (const c of COLORS) {
    const n = counts.get(c) ?? 0;
    if (n > max) {
      max = n;
      color = c;
    }
  }
  return { cardId: card.id, color };
}
