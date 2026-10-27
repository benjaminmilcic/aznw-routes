// =============================================================
//  Computer opponent for UNO.
// =============================================================
//   easy   – plays any matching card, picks the color at random
//   medium – mostly the best move, sometimes a random one
//   hard   – saves wild cards, attacks when someone is close to UNO,
//            and picks the color it has the most of itself
// =============================================================
import { isPlayable, nextPlayer, topCard } from './uno.rules';
import {
  COLORS,
  type UnoCard,
  type UnoColor,
  type UnoGame,
  type UnoLevel,
} from './uno.types';

/** What the computer wants to do: play a card (with a color if needed) or draw. */
export interface UnoDecision {
  cardId: string;
  color?: UnoColor;
}

/** Picks the computer's move – null means "I have to draw". */
export function bestMove(g: UnoGame, playerId: string, level: UnoLevel): UnoDecision | null {
  const hand = g.hands[playerId] ?? [];
  const top = topCard(g);
  const playable = hand.filter((c) => isPlayable(c, top, g.currentColor));
  if (playable.length === 0) return null;

  if (level === 'easy') {
    const card = playable[Math.floor(Math.random() * playable.length)];
    return withColor(card, hand, playerId, g, 'easy');
  }

  // "medium" misses now and then, so that children have a chance.
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

/** Rates a card – the higher, the more likely it is played. */
function rate(card: UnoCard, g: UnoGame, playerId: string): number {
  const victim = nextPlayer(g, playerId);
  const victimCards = g.hands[victim]?.length ?? 99;
  // If the next player is close to winning, an attack is especially worthwhile.
  const pressure = victimCards <= 2 ? 40 : 0;

  switch (card.value) {
    case 'd4':
      // The strongest attack – but valuable as a wild card, so not first.
      return 30 + pressure;
    case 'd2':
      return 45 + pressure;
    case 'skip':
      return 40 + pressure;
    case 'rev':
      return 35 + pressure;
    case 'wild':
      // Save wild cards as long as something else works.
      return 10;
    default: {
      // Number cards first – high cards first, so that they don't get stuck.
      const n = Number(card.value);
      return 50 + (Number.isFinite(n) ? n : 0);
    }
  }
}

/** Adds the desired color for wild cards. */
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

  // Pick the color of which the most own cards are left.
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
