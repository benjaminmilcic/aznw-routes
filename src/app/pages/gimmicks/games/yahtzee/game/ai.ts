// =============================================================
//  Computer-Gegner für Yahtzee.
// =============================================================
// Zwei Entscheidungen pro Zug:
//   1. Welche Würfel behalte ich? (chooseHolds)
//   2. In welche Kategorie trage ich ein? (chooseCategory)
// Bewusst als reine Funktionen – ohne Angular, ohne Zustand.
import { CATEGORIES, DICE_COUNT, scoreFor, type Category, type ScoreMap } from './scoring';
import type { YLevel } from './yahtzee.types';

/**
 * Wie oft der Computer daneben greift: statt der besten Wahl behält er
 * zufällige Würfel bzw. trägt in eine zufällige freie Kategorie ein.
 * "Schwer" spielt immer nach Plan.
 */
const MISTAKE: Record<YLevel, number> = {
  easy: 0.45,
  medium: 0.15,
  hard: 0,
};

/**
 * Reihenfolge, in der eine Kategorie geopfert wird, wenn gar nichts passt.
 * Vorne steht, was am wenigsten weh tut.
 */
const SACRIFICE_ORDER: Category[] = [
  'ones',
  'twos',
  'threes',
  'fourKind',
  'yatzy',
  'largeStraight',
  'fullHouse',
  'smallStraight',
  'threeKind',
  'fours',
  'fives',
  'sixes',
  'chance',
];

/** Kategorien, die dieser Spieler noch frei hat. */
export function openCategories(scores: ScoreMap): Category[] {
  return CATEGORIES.filter((c) => scores[c.key] == null).map((c) => c.key);
}

/**
 * Welche Würfel sollen liegen bleiben? Liefert ein Array mit `true` für jeden
 * Würfel, der behalten wird.
 */
export function chooseHolds(dice: number[], scores: ScoreMap, level: YLevel = 'hard'): boolean[] {
  if (Math.random() < MISTAKE[level]) return dice.map(() => Math.random() < 0.5);

  const open = openCategories(scores);
  const counts = countValues(dice);

  // Fertige Kombinationen nicht mehr anfassen.
  const maxCount = Math.max(...counts.slice(1));
  if (maxCount >= 4 && (open.includes('yatzy') || open.includes('fourKind'))) {
    return holdValue(dice, counts.indexOf(maxCount));
  }
  if (open.includes('largeStraight') && straightRun(counts) >= 5) return dice.map(() => true);
  if (open.includes('fullHouse') && isFullHouse(counts)) return dice.map(() => true);

  // Vier zu einer Straße: die Sequenz behalten und auf die fünfte hoffen.
  if (open.includes('largeStraight') || open.includes('smallStraight')) {
    const run = longestRunValues(counts);
    if (run.length >= 4) {
      const used = new Set<number>();
      return dice.map((v) => {
        if (run.includes(v) && !used.has(v)) {
          used.add(v);
          return true;
        }
        return false;
      });
    }
  }

  // Standard: das häufigste Auge behalten (bei Gleichstand das höhere).
  if (maxCount >= 2) {
    let best = 0;
    for (let v = 1; v <= 6; v++) {
      if (counts[v] > counts[best] || (counts[v] === counts[best] && v > best)) best = v;
    }
    return holdValue(dice, best);
  }

  // Nichts Brauchbares: hohe Augen behalten, der Rest wird neu gewürfelt.
  return dice.map((v) => v >= 5);
}

/** Lohnt sich ein weiterer Wurf, oder ist die Hand schon gut genug? */
export function shouldRollAgain(dice: number[], scores: ScoreMap): boolean {
  const open = openCategories(scores);
  const counts = countValues(dice);
  if (open.includes('yatzy') && counts.includes(5)) return false;
  if (open.includes('largeStraight') && straightRun(counts) >= 5) return false;
  if (open.includes('fullHouse') && isFullHouse(counts)) return false;
  // Sonst: solange Würfe übrig sind, wird gewürfelt.
  return chooseHolds(dice, scores).some((h) => !h);
}

/**
 * Beste offene Kategorie für diesen Wurf. Bringt keine Kategorie Punkte,
 * wird nach SACRIFICE_ORDER geopfert.
 */
export function chooseCategory(
  dice: number[],
  scores: ScoreMap,
  level: YLevel = 'hard',
): Category {
  const open = openCategories(scores);
  if (open.length === 0) return 'chance';
  if (Math.random() < MISTAKE[level]) return open[Math.floor(Math.random() * open.length)];

  let best: Category | null = null;
  let bestValue = -1;
  for (const cat of open) {
    const value = scoreFor(cat, dice) + bonusHint(cat, dice);
    if (value > bestValue) {
      bestValue = value;
      best = cat;
    }
  }
  if (best && scoreFor(best, dice) > 0) return best;

  return SACRIFICE_ORDER.find((c) => open.includes(c)) ?? open[0];
}

/**
 * Kleiner Zuschlag für die obere Hälfte: drei gleiche Augen dort einzutragen
 * hält den 35-Punkte-Bonus in Reichweite.
 */
function bonusHint(cat: Category, dice: number[]): number {
  const upper: Partial<Record<Category, number>> = {
    ones: 1,
    twos: 2,
    threes: 3,
    fours: 4,
    fives: 5,
    sixes: 6,
  };
  const face = upper[cat];
  if (!face) return 0;
  return countValues(dice)[face] >= 3 ? 4 : 0;
}

function countValues(dice: number[]): number[] {
  const c = [0, 0, 0, 0, 0, 0, 0];
  for (const v of dice) c[v]++;
  return c;
}

function holdValue(dice: number[], value: number): boolean[] {
  return dice.map((v) => v === value);
}

function isFullHouse(counts: number[]): boolean {
  return (counts.some((n) => n === 3) && counts.some((n) => n === 2)) || counts.some((n) => n === 5);
}

/** Länge der längsten Folge aufeinanderfolgender Augen. */
function straightRun(counts: number[]): number {
  return longestRunValues(counts).length;
}

/** Die Augen der längsten zusammenhängenden Folge. */
function longestRunValues(counts: number[]): number[] {
  let best: number[] = [];
  let run: number[] = [];
  for (let v = 1; v <= 6; v++) {
    if (counts[v] > 0) {
      run.push(v);
      if (run.length > best.length) best = [...run];
    } else {
      run = [];
    }
  }
  return best.length > DICE_COUNT ? best.slice(0, DICE_COUNT) : best;
}
