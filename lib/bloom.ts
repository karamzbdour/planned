import { db } from "@/lib/db";

// ─── Levels ───────────────────────────────────────────────────────────────────

export interface BloomLevel {
  label: string;
  minStars: number;
  emoji: string;
}

export const BLOOM_LEVELS: BloomLevel[] = [
  { label: "Just sprouting",    minStars: 0,   emoji: "🌱" },
  { label: "Growing",           minStars: 30,  emoji: "🌿" },
  { label: "Blooming",          minStars: 75,  emoji: "🌸" },
  { label: "Flourishing",       minStars: 120, emoji: "🌺" },
  { label: "Thriving",          minStars: 180, emoji: "🌻" },
  { label: "Garden of wonder",  minStars: 250, emoji: "🌳" },
];

export function getLevel(stars: number): BloomLevel {
  let level = BLOOM_LEVELS[0];
  for (const l of BLOOM_LEVELS) {
    if (stars >= l.minStars) level = l;
  }
  return level;
}

export function getNextLevel(stars: number): BloomLevel | null {
  for (const l of BLOOM_LEVELS) {
    if (stars < l.minStars) return l;
  }
  return null;
}

// ─── Garden elements ──────────────────────────────────────────────────────────

export interface GardenElement {
  id: string;
  stars: number;
  label: string; // "A butterfly appeared in [name]'s garden!"
}

export const GARDEN_ELEMENTS: GardenElement[] = [
  { id: "sprout",        stars: 10,  label: "A sprout appeared" },
  { id: "purple_flower", stars: 25,  label: "A purple flower bloomed" },
  { id: "pink_flower",   stars: 40,  label: "A pink flower bloomed" },
  { id: "sun",           stars: 50,  label: "The sun came out" },
  { id: "grass_tufts",   stars: 60,  label: "Grass grew taller" },
  { id: "first_tree",    stars: 75,  label: "A tree grew" },
  { id: "teal_flower",   stars: 90,  label: "A teal flower bloomed" },
  { id: "cloud",         stars: 100, label: "A cloud drifted in" },
  { id: "golden_flower", stars: 110, label: "A golden flower bloomed" },
  { id: "bird",          stars: 125, label: "A bird visited the garden" },
  { id: "butterfly",     stars: 128, label: "A butterfly appeared" },
  { id: "tall_tree",     stars: 150, label: "A tall tree grew" },
  { id: "pond",          stars: 175, label: "A pond appeared" },
  { id: "rainbow",       stars: 220, label: "A rainbow appeared" },
];

export function getUnlockedElements(stars: number): GardenElement[] {
  return GARDEN_ELEMENTS.filter((el) => stars >= el.stars);
}

// ─── Badge definitions ────────────────────────────────────────────────────────

export interface BadgeDef {
  type: string;
  label: string;
  description: string; // unlock condition shown when locked
  emoji: string;
}

export const BADGE_DEFS: BadgeDef[] = [
  {
    type: "FIRST_STEP",
    label: "First step",
    description: "Complete your first lesson",
    emoji: "👣",
  },
  {
    type: "STREAK_5",
    label: "5-day streak",
    description: "Complete lessons 5 days in a row",
    emoji: "🔥",
  },
  {
    type: "SCIENCE_SPROUT",
    label: "Science sprout",
    description: "Complete 3 Science lessons",
    emoji: "🔬",
  },
  {
    type: "WORD_WIZARD",
    label: "Word wizard",
    description: "Complete 5 English lessons",
    emoji: "📖",
  },
  {
    type: "NUMBER_NINJA",
    label: "Number ninja",
    description: "Complete 5 Maths lessons",
    emoji: "🔢",
  },
  {
    type: "ART_STAR",
    label: "Art star",
    description: "Complete 3 Art lessons",
    emoji: "🎨",
  },
  {
    type: "DAY_TRIPPER",
    label: "Day tripper",
    description: "Log a day out activity",
    emoji: "🚗",
  },
  {
    type: "BOOK_LOVER",
    label: "Book lover",
    description: "Log 5 external activities",
    emoji: "📚",
  },
  {
    type: "FAITH_SCHOLAR",
    label: "Faith scholar",
    description: "Complete 3 Religious Studies lessons",
    emoji: "🌙",
  },
  {
    type: "HALF_WAY",
    label: "Half way",
    description: "Complete 50% of your lessons",
    emoji: "⭐",
  },
  {
    type: "JOURNAL_FIRST",
    label: "First reflection",
    description: "Record your first learning journal entry",
    emoji: "📝",
  },
  {
    type: "PHOTO_JOURNALIST",
    label: "Visual storyteller",
    description: "Attach photo evidence to 3 journal entries",
    emoji: "📸",
  },
  {
    type: "FIELD_EXPLORER",
    label: "Field explorer",
    description: "Record 3 Day Out journal entries",
    emoji: "🧭",
  },
  {
    type: "PROLIFIC_AUTHOR",
    label: "Dedicated scribe",
    description: "Record 10 journal entries",
    emoji: "✍️",
  },
];

// ─── Badge checking ───────────────────────────────────────────────────────────

/** Called after any action that might unlock badges. Returns newly earned badge types. */
export async function checkAndAwardBadges(childId: string): Promise<string[]> {
  const [
    child,
    earnedBadges,
    completedLessons,
    totalLessons,
    scienceCount,
    englishCount,
    mathsCount,
    artCount,
    rsCount,
    externalCount,
    dayOutCount,
    journalCount,
    journalPhotoCount,
    journalDayOutCount,
  ] = await Promise.all([
    db.child.findUnique({ where: { id: childId }, select: { id: true } }),
    db.badge.findMany({ where: { childId }, select: { badgeType: true } }),
    db.lesson.count({ where: { childId, status: "COMPLETED" } }),
    db.lesson.count({ where: { childId } }),
    db.lesson.count({ where: { childId, subject: { in: ["Science"] }, status: "COMPLETED" } }),
    db.lesson.count({ where: { childId, subject: { in: ["English", "Literacy"] }, status: "COMPLETED" } }),
    db.lesson.count({ where: { childId, subject: { in: ["Mathematics", "Maths"] }, status: "COMPLETED" } }),
    db.lesson.count({ where: { childId, subject: "Art", status: "COMPLETED" } }),
    db.lesson.count({ where: { childId, subject: "Religious Studies", status: "COMPLETED" } }),
    db.externalActivity.count({ where: { childId } }),
    db.externalActivity.count({ where: { childId, description: { contains: "day out" } } }),
    db.journalEntry.count({ where: { childId } }),
    db.journalEntry.count({ where: { childId, hasPhoto: true } }),
    db.journalEntry.count({ where: { childId, moment: "DAY_OUT" } }),
  ]);

  if (!child) return [];

  const earned = new Set(earnedBadges.map((b) => b.badgeType));
  const toAward: string[] = [];

  function maybe(type: string, condition: boolean) {
    if (condition && !earned.has(type)) toAward.push(type);
  }

  maybe("FIRST_STEP",        completedLessons >= 1);
  maybe("SCIENCE_SPROUT",    scienceCount >= 3);
  maybe("WORD_WIZARD",       englishCount >= 5);
  maybe("NUMBER_NINJA",      mathsCount >= 5);
  maybe("ART_STAR",          artCount >= 3);
  maybe("FAITH_SCHOLAR",     rsCount >= 3);
  maybe("BOOK_LOVER",        externalCount >= 5);
  maybe("DAY_TRIPPER",       dayOutCount >= 1 || journalDayOutCount >= 1);
  maybe("HALF_WAY",          totalLessons > 0 && completedLessons / totalLessons >= 0.5);
  maybe("JOURNAL_FIRST",     journalCount >= 1);
  maybe("PHOTO_JOURNALIST",  journalPhotoCount >= 3);
  maybe("FIELD_EXPLORER",    journalDayOutCount >= 3);
  maybe("PROLIFIC_AUTHOR",   journalCount >= 10);

  // 5-day streak — check last 5 distinct calendar days with completedAt
  if (!earned.has("STREAK_5") && completedLessons >= 5) {
    const recent = await db.lesson.findMany({
      where: { childId, status: "COMPLETED", completedAt: { not: null } },
      orderBy: { completedAt: "desc" },
      take: 10,
      select: { completedAt: true },
    });
    const days = new Set(
      recent.map((l) => l.completedAt!.toISOString().split("T")[0])
    );
    // Check if any 5 consecutive calendar days appear
    const sortedDays = Array.from(days).sort().reverse();
    let streak = 1;
    for (let i = 1; i < sortedDays.length; i++) {
      const prev = new Date(sortedDays[i - 1]);
      const curr = new Date(sortedDays[i]);
      const diffDays = Math.round(
        (prev.getTime() - curr.getTime()) / 86400000
      );
      if (diffDays === 1) {
        streak++;
        if (streak >= 5) { toAward.push("STREAK_5"); break; }
      } else {
        streak = 1;
      }
    }
  }

  // Award badges one at a time (SQLite doesn't support createMany skipDuplicates)
  for (const badgeType of toAward) {
    await db.badge.upsert({
      where: { childId_badgeType: { childId, badgeType } },
      create: { childId, badgeType },
      update: {},
    });
  }

  return toAward;
}
