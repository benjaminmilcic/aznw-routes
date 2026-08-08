// =============================================================
//  UNO-Regeln als reine Funktionen.
// =============================================================
// Bewusst ohne Angular/Firebase: derselbe Code entscheidet über die Züge
// am Gerät, im Online-Spiel und beim Computer-Gegner.
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

/** Oberste Karte des Ablagestapels. */
export function topCard(g: UnoGame): UnoCard | null {
  const pile = g.discardPile;
  return pile && pile.length ? pile[pile.length - 1] : null;
}

/** Darf diese Karte auf die oberste Ablage (mit aktueller Farbe) gelegt werden? */
export function isPlayable(card: UnoCard, top: UnoCard | null, currentColor: UnoColor): boolean {
  if (card.color === 'w') return true; // Joker passt immer
  if (card.color === currentColor) return true;
  if (top && card.value === top.value) return true;
  return false;
}

/** Ist dieser Spieler seine Karten schon losgeworden? */
export function isDone(g: UnoGame, id: string): boolean {
  return (g.hands[id]?.length ?? 0) === 0;
}

/** Alle Spieler, die noch Karten auf der Hand haben. */
export function activePlayers(g: UnoGame): string[] {
  return g.order.filter((id) => !isDone(g, id));
}

/**
 * Der nächste Spieler in der aktuellen Richtung – wer schon fertig ist oder
 * `skipped` Plätze weiter liegt, wird übersprungen.
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

// ---- Kartenstapel ---------------------------------------------------------
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

/** Baut ein vollständiges Blatt: 108 Karten wie im Original. */
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

/** Mischt den Ablagestapel (ohne oberste Karte) zurück in den Nachziehstapel. */
function reshuffle(drawPile: UnoCard[], discardPile: UnoCard[]): void {
  if (discardPile.length <= 1) return;
  const top = discardPile.pop()!;
  const rest = discardPile.splice(0, discardPile.length);
  for (const c of shuffle(rest)) drawPile.push(c);
  discardPile.push(top);
}

/** Zieht n Karten in `hand` und mischt bei Bedarf den Ablagestapel nach. */
function drawInto(hand: UnoCard[], drawPile: UnoCard[], discardPile: UnoCard[], n: number): void {
  for (let i = 0; i < n; i++) {
    if (drawPile.length === 0) reshuffle(drawPile, discardPile);
    const c = drawPile.pop();
    if (!c) break; // beide Stapel leer – nichts mehr zu ziehen
    hand.push(c);
  }
}

/** Teilt für eine neue Runde aus und legt die Startkarte. */
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
  // Startkarte: erste reine Zahlenkarte (keine Aktion/Joker) verwenden.
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

// ---- Spielende ------------------------------------------------------------
/**
 * Ist die Partie entschieden? Das ist der Fall, wenn nur noch einer Karten
 * hat – oder wenn nur noch Computer weiterspielen würden. Niemand will
 * zuschauen, wie zwei Computer die letzten Plätze ausspielen.
 *
 * Die noch nicht fertigen Spieler werden nach ihrer Kartenzahl (weniger =
 * besser) an die Rangliste angehängt.
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

// ---- Züge -----------------------------------------------------------------
/**
 * Legt eine Handkarte ab. Bei Jokern muss `chosenColor` gesetzt sein.
 * Gibt null zurück, wenn der Zug nicht erlaubt ist.
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

  // Richtungswechsel wirkt bei nur zwei Aktiven wie "Aussetzen".
  let direction = g.direction;
  const activeBefore = activePlayers(g).length;
  if (card.value === 'rev' && activeBefore > 2) direction = (direction * -1) as 1 | -1;

  let next: UnoGame = { ...g, hands, drawPile, discardPile, currentColor, direction };

  // Karten los: Platz sichern.
  const justFinished = hand.length === 0;
  if (justFinished) {
    const ranking = [...next.ranking, playerId];
    next = { ...next, ranking, winnerId: next.winnerId ?? ranking[0] };
  }

  // Wirkung auf den Nächsten (Ziehen trifft immer den, der jetzt drankäme).
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

  // Steht das Ergebnis fest, ist die Partie hier zu Ende.
  const decided = finishIfDecided(next);
  if (decided.status === 'finished') return { ...decided, updatedAt: Date.now() };

  // Aussetzen/Zieh-Karten überspringen den Nächsten, "rev" zu zweit ebenso.
  const skipsOne =
    card.value === 'skip' ||
    forced > 0 ||
    (card.value === 'rev' && activeBefore <= 2);

  const from = justFinished ? victim : playerId;
  const steps = justFinished ? (skipsOne ? 1 : 0) : skipsOne ? 2 : 1;
  const currentTurn = steps === 0 ? victim : nextPlayer(next, from, steps);

  return { ...next, currentTurn, updatedAt: Date.now() };
}

/** Zieht eine Karte vom Nachziehstapel. Danach ist der Nächste dran. */
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
