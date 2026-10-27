// =============================================================
//  Computer opponent for Yahtzee.
// =============================================================
// Two decisions per turn:
//   1. Which dice do I keep? (chooseHolds)
//   2. Which category do I fill in? (chooseCategory)
// Deliberately as pure functions – without Angular, without state.
import { CATEGORIES, DICE_COUNT, scoreFor, type Category, type ScoreMap } from './scoring';
import type { YLevel } from './yahtzee.types';

/**
 * How often the computer misses: instead of the best choice it keeps
 * random dice or fills in a random free category.
 * "Hard" always plays to plan.
 */
const MISTAKE: Record<YLevel, number> = {
  easy: 0.45,
  medium: 0.15,
  hard: 0,
};

/**
 * Order in which a category is sacrificed when nothing fits at all.
 * At the front is what hurts the least.
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

/** Categories this player still has free. */
export function openCategories(scores: ScoreMap): Category[] {
  return CATEGORIES.filter((c) => scores[c.key] == null).map((c) => c.key);
}

/**
 * Which dice should stay? Returns an array with `true` for every
 * die that is kept.
 */
export function chooseHolds(dice: number[], scores: ScoreMap, level: YLevel = 'hard'): boolean[] {
  if (Math.random() < MISTAKE[level]) return dice.map(() => Math.random() < 0.5);

  const open = openCategories(scores);
  const counts = countValues(dice);

  // Don't touch finished combinations anymore.
  const maxCount = Math.max(...counts.slice(1));
  if (maxCount >= 4 && (open.includes('yatzy') || open.includes('fourKind'))) {
    return holdValue(dice, counts.indexOf(maxCount));
  }
  if (open.includes('largeStraight') && straightRun(counts) >= 5) return dice.map(() => true);
  if (open.includes('fullHouse') && isFullHouse(counts)) return dice.map(() => true);

  // Four of a straight: keep the sequence and hope for the fifth.
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

  // Default: keep the most frequent pip (on a tie the higher one).
  if (maxCount >= 2) {
    let best = 0;
    for (let v = 1; v <= 6; v++) {
      if (counts[v] > counts[best] || (counts[v] === counts[best] && v > best)) best = v;
    }
    return holdValue(dice, best);
  }

  // Nothing useful: keep high pips, the rest is rolled again.
  return dice.map((v) => v >= 5);
}

/** Is another roll worth it, or is the hand already good enough? */
export function shouldRollAgain(dice: number[], scores: ScoreMap): boolean {
  const open = openCategories(scores);
  const counts = countValues(dice);
  if (open.includes('yatzy') && counts.includes(5)) return false;
  if (open.includes('largeStraight') && straightRun(counts) >= 5) return false;
  if (open.includes('fullHouse') && isFullHouse(counts)) return false;
  // Otherwise: roll as long as rolls are left.
  return chooseHolds(dice, scores).some((h) => !h);
}

/**
 * Best open category for this roll. If no category scores points,
 * a category is sacrificed according to SACRIFICE_ORDER.
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
 * Small bonus for the upper half: filling in three of a kind there
 * keeps the 35-point bonus within reach.
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

/** Length of the longest run of consecutive pips. */
function straightRun(counts: number[]): number {
  return longestRunValues(counts).length;
}

/** The pips of the longest consecutive run. */
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
