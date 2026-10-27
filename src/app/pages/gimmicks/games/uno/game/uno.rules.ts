// =============================================================
//  UNO rules as pure functions.
// =============================================================
// Deliberately without Angular/Firebase: the same code decides on the moves
// on the device, in the online game and for the computer opponent.
// =============================================================
import {
  COLORS,
  START_HAND,
  type UnoCard,
  type UnoCardColor,
  type UnoColor,
  type UnoGame,
  type UnoValue,
} from './uno.types';

/** Top card of the discard pile. */
export function topCard(g: UnoGame): UnoCard | null {
  const pile = g.discardPile;
  return pile && pile.length ? pile[pile.length - 1] : null;
}

/** May this card be played on the top discard (with the current color)? */
export function isPlayable(card: UnoCard, top: UnoCard | null, currentColor: UnoColor): boolean {
  if (card.color === 'w') return true; // Wild card always fits
  if (card.color === currentColor) return true;
  if (top && card.value === top.value) return true;
  return false;
}

/** Has this player already got rid of their cards? */
export function isDone(g: UnoGame, id: string): boolean {
  return (g.hands[id]?.length ?? 0) === 0;
}

/** All players who still have cards in their hand. */
export function activePlayers(g: UnoGame): string[] {
  return g.order.filter((id) => !isDone(g, id));
}

/**
 * The next player in the current direction – whoever is already done or
 * lies `skipped` places further is skipped.
 */
export function nextPlayer(g: UnoGame, from: string, steps = 1): string {
  const n = g.order.length;
  if (n === 0) return from;
  const start = Math.max(0, g.order.indexOf(from));
  let index = start;
  let found = 0;
  for (let i = 0; i < n * 2 && found < steps; i++) {
    index = (index + g.direction + n) % n;
    if (!isDone(g, g.order[index])) found++;
  }
  return g.order[index] ?? from;
}

// ---- Card piles -----------------------------------------------------------
function isNumber(v: UnoValue): boolean {
  return v.length === 1 && v >= '0' && v <= '9';
}

export function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Builds a complete deck: 108 cards like in the original. */
export function buildDeck(): UnoCard[] {
  const deck: UnoCard[] = [];
  const actions: UnoValue[] = ['skip', 'rev', 'd2'];
  let seq = 0;
  const card = (color: UnoCardColor, value: UnoValue): UnoCard => ({
    id: 'k' + (seq++).toString(36),
    color,
    value,
  });

  for (const color of COLORS) {
    deck.push(card(color, '0'));
    for (let n = 1; n <= 9; n++) {
      deck.push(card(color, String(n) as UnoValue));
      deck.push(card(color, String(n) as UnoValue));
    }
    for (const a of actions) {
      deck.push(card(color, a));
      deck.push(card(color, a));
    }
  }
  for (let i = 0; i < 4; i++) deck.push(card('w', 'wild'));
  for (let i = 0; i < 4; i++) deck.push(card('w', 'd4'));
  return deck;
}

/** Shuffles the discard pile (without the top card) back into the draw pile. */
function reshuffle(drawPile: UnoCard[], discardPile: UnoCard[]): void {
  if (discardPile.length <= 1) return;
  const top = discardPile.pop()!;
  const rest = discardPile.splice(0, discardPile.length);
  for (const c of shuffle(rest)) drawPile.push(c);
  discardPile.push(top);
}

/** Draws n cards into `hand` and reshuffles the discard pile if needed. */
function drawInto(hand: UnoCard[], drawPile: UnoCard[], discardPile: UnoCard[], n: number): void {
  for (let i = 0; i < n; i++) {
    if (drawPile.length === 0) reshuffle(drawPile, discardPile);
    const c = drawPile.pop();
    if (!c) break; // both piles empty – nothing left to draw
    hand.push(c);
  }
}

/** Deals for a new round and places the starting card. */
export function dealNewRound(g: UnoGame, starter: string): UnoGame {
  const deck = shuffle(buildDeck());
  const hands: Record<string, UnoCard[]> = {};
  for (const id of g.order) hands[id] = [];
  for (let i = 0; i < START_HAND; i++) {
    for (const id of g.order) {
      const c = deck.pop();
      if (c) hands[id].push(c);
    }
  }
  // Starting card: use the first plain number card (no action/wild).
  let startIdx = deck.findIndex((c) => c.color !== 'w' && isNumber(c.value));
  if (startIdx < 0) startIdx = deck.length - 1;
  const [start] = deck.splice(startIdx, 1);

  return {
    ...g,
    hands,
    drawPile: deck,
    discardPile: start ? [start] : [],
    currentColor: (start && start.color !== 'w' ? start.color : 'r') as UnoColor,
    direction: 1,
    currentTurn: starter,
    status: 'playing',
    winnerId: null,
    ranking: [],
    lastAction: null,
    updatedAt: Date.now(),
  };
}

// ---- Game over ------------------------------------------------------------
/**
 * Is the game decided? That is the case when only one player still has cards
 * – or when only computers would keep playing. Nobody wants to
 * watch two computers play out the last places.
 *
 * The players who have not finished are appended to the ranking by their
 * number of cards (fewer = better).
 */
export function finishIfDecided(g: UnoGame): UnoGame {
  const active = activePlayers(g);
  const humansLeft = active.filter((id) => !g.players[id]?.cpu);
  if (active.length > 1 && humansLeft.length > 0) return g;

  const rest = [...active].sort(
    (a, b) => (g.hands[a]?.length ?? 0) - (g.hands[b]?.length ?? 0),
  );
  const ranking = [...g.ranking, ...rest];
  return {
    ...g,
    status: 'finished',
    ranking,
    winnerId: ranking[0] ?? g.winnerId,
    updatedAt: Date.now(),
  };
}

// ---- Moves ----------------------------------------------------------------
/**
 * Plays a card from the hand. For wild cards `chosenColor` must be set.
 * Returns null if the move is not allowed.
 */
export function applyPlay(
  g: UnoGame,
  playerId: string,
  cardId: string,
  chosenColor?: UnoColor,
): UnoGame | null {
  if (g.status !== 'playing' || g.currentTurn !== playerId) return null;

  const hand = [...(g.hands[playerId] ?? [])];
  const idx = hand.findIndex((c) => c.id === cardId);
  if (idx < 0) return null;

  const card = hand[idx];
  if (!isPlayable(card, topCard(g), g.currentColor)) return null;
  const isWild = card.color === 'w';
  if (isWild && !chosenColor) return null;

  hand.splice(idx, 1);
  const hands: Record<string, UnoCard[]> = { ...g.hands, [playerId]: hand };
  const drawPile = [...g.drawPile];
  const discardPile = [...g.discardPile, card];
  const currentColor: UnoColor = isWild ? (chosenColor as UnoColor) : (card.color as UnoColor);

  // With only two active players a reverse acts like a "skip".
  let direction = g.direction;
  const activeBefore = activePlayers(g).length;
  if (card.value === 'rev' && activeBefore > 2) direction = (direction * -1) as 1 | -1;

  let next: UnoGame = { ...g, hands, drawPile, discardPile, currentColor, direction };

  // Cards gone: secure the place.
  const justFinished = hand.length === 0;
  if (justFinished) {
    const ranking = [...next.ranking, playerId];
    next = { ...next, ranking, winnerId: next.winnerId ?? ranking[0] };
  }

  // Effect on the next player (drawing always hits the one whose turn it would be now).
  let forced = 0;
  if (card.value === 'd2') forced = 2;
  else if (card.value === 'd4') forced = 4;

  const victim = nextPlayer(next, playerId);
  if (forced > 0 && victim !== playerId) {
    const victimHand = [...(next.hands[victim] ?? [])];
    drawInto(victimHand, drawPile, discardPile, forced);
    next = { ...next, hands: { ...next.hands, [victim]: victimHand } };
  }

  next = {
    ...next,
    lastAction: { by: playerId, type: 'play', card, forced, at: Date.now() },
  };

  // If the result is decided, the game ends here.
  const decided = finishIfDecided(next);
  if (decided.status === 'finished') return { ...decided, updatedAt: Date.now() };

  // Skip/draw cards skip the next player, "rev" with two players as well.
  const skipsOne =
    card.value === 'skip' ||
    forced > 0 ||
    (card.value === 'rev' && activeBefore <= 2);

  const from = justFinished ? victim : playerId;
  const steps = justFinished ? (skipsOne ? 1 : 0) : skipsOne ? 2 : 1;
  const currentTurn = steps === 0 ? victim : nextPlayer(next, from, steps);

  return { ...next, currentTurn, updatedAt: Date.now() };
}

/** Draws a card from the draw pile. Afterwards it is the next player's turn. */
export function applyDraw(g: UnoGame, playerId: string): UnoGame | null {
  if (g.status !== 'playing' || g.currentTurn !== playerId) return null;

  const hand = [...(g.hands[playerId] ?? [])];
  const drawPile = [...g.drawPile];
  const discardPile = [...g.discardPile];
  drawInto(hand, drawPile, discardPile, 1);

  const next: UnoGame = {
    ...g,
    hands: { ...g.hands, [playerId]: hand },
    drawPile,
    discardPile,
    lastAction: { by: playerId, type: 'draw', at: Date.now() },
  };

  return { ...next, currentTurn: nextPlayer(next, playerId), updatedAt: Date.now() };
}
