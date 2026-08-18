import { db } from "@/lib/db";

export type MasteryTier = "EMERGING" | "DEVELOPING" | "SECURE" | "EXCEEDING";

export const MASTERY_ORDER: Record<MasteryTier, number> = {
  EMERGING: 1,
  DEVELOPING: 2,
  SECURE: 3,
  EXCEEDING: 4,
};

export const MASTERY_TIER_CONFIG: Record<
  MasteryTier,
  {
    label: string;
    description: string;
    color: string;
    bgClass: string;
    textClass: string;
    minRatio: number;
    minTopics: number;
    nextTier: MasteryTier | null;
  }
> = {
  EMERGING: {
    label: "Emerging",
    description: "Beginning to engage with core concepts; benefits from guided scaffolding.",
    color: "#f59e0b",
    bgClass: "bg-amber-100",
    textClass: "text-amber-700",
    minRatio: 0,
    minTopics: 1,
    nextTier: "DEVELOPING",
  },
  DEVELOPING: {
    label: "Developing",
    description: "Solidifying basic principles; consolidating skills across varied practice.",
    color: "#3b82f6",
    bgClass: "bg-blue-100",
    textClass: "text-blue-700",
    minRatio: 0.4,
    minTopics: 2,
    nextTier: "SECURE",
  },
  SECURE: {
    label: "Secure",
    description: "Consistently achieves curriculum objectives independently with confidence.",
    color: "#10b981",
    bgClass: "bg-emerald-100",
    textClass: "text-emerald-700",
    minRatio: 0.75,
    minTopics: 3,
    nextTier: "EXCEEDING",
  },
  EXCEEDING: {
    label: "Exceeding",
    description: "Demonstrates higher-order mastery, synthesis, and readiness for extension.",
    color: "#a855f7",
    bgClass: "bg-purple-100",
    textClass: "text-purple-700",
    minRatio: 0.93,
    minTopics: 5,
    nextTier: null,
  },
};

export interface MasteryInput {
  topicsCompleted: number;
  topicsTotal: number;
  objectivesMet: number;
  totalObjectives: number;
  currentLevel?: string;
  isManualOverride?: boolean;
  defaultBaseline?: MasteryTier;
}

export interface MasteryResult {
  newLevel: MasteryTier;
  levelChanged: boolean;
  levelUp: boolean;
  ratio: number;
  nextTierRequirements?: {
    nextTier: MasteryTier;
    targetRatio: number;
    targetTopics: number;
    neededObjectives: number;
    neededTopics: number;
  };
}

/**
 * Pure calculation function for mastery tier based on objective success ratio & topic counts.
 */
export function calculateMasteryLevel(input: MasteryInput): MasteryResult {
  const {
    topicsCompleted,
    objectivesMet,
    totalObjectives,
    currentLevel = "DEVELOPING",
    isManualOverride = false,
    defaultBaseline = "DEVELOPING",
  } = input;

  const validCurrentLevel = (
    ["EMERGING", "DEVELOPING", "SECURE", "EXCEEDING"].includes(currentLevel)
      ? currentLevel
      : "DEVELOPING"
  ) as MasteryTier;

  const ratio = totalObjectives > 0 ? objectivesMet / totalObjectives : 0;

  // If manual override is enabled by the parent, preserve chosen level
  if (isManualOverride) {
    return {
      newLevel: validCurrentLevel,
      levelChanged: false,
      levelUp: false,
      ratio,
    };
  }

  // Cold start guardrail: need at least 2 completed topics to evaluate performance ratio
  if (topicsCompleted < 2) {
    const baseline = (
      ["EMERGING", "DEVELOPING", "SECURE", "EXCEEDING"].includes(defaultBaseline)
        ? defaultBaseline
        : "DEVELOPING"
    ) as MasteryTier;

    return {
      newLevel: baseline,
      levelChanged: validCurrentLevel !== baseline,
      levelUp: false,
      ratio,
    };
  }

  let calculatedLevel: MasteryTier = "DEVELOPING";
  if (ratio < 0.4) {
    calculatedLevel = "EMERGING";
  } else if (ratio < 0.75) {
    calculatedLevel = "DEVELOPING";
  } else if (ratio < 0.93) {
    calculatedLevel = "SECURE";
  } else if (ratio >= 0.93 && topicsCompleted >= 5) {
    calculatedLevel = "EXCEEDING";
  } else {
    calculatedLevel = "SECURE";
  }

  const levelChanged = validCurrentLevel !== calculatedLevel;
  const levelUp =
    levelChanged &&
    MASTERY_ORDER[calculatedLevel] > MASTERY_ORDER[validCurrentLevel];

  // Calculate next tier requirements
  const nextTierName = MASTERY_TIER_CONFIG[calculatedLevel].nextTier;
  let nextTierRequirements: MasteryResult["nextTierRequirements"] = undefined;

  if (nextTierName) {
    const config = MASTERY_TIER_CONFIG[nextTierName];
    const targetObjectives = Math.ceil(totalObjectives * config.minRatio);
    nextTierRequirements = {
      nextTier: nextTierName,
      targetRatio: config.minRatio,
      targetTopics: config.minTopics,
      neededObjectives: Math.max(targetObjectives - objectivesMet, 0),
      neededTopics: Math.max(config.minTopics - topicsCompleted, 0),
    };
  }

  return {
    newLevel: calculatedLevel,
    levelChanged,
    levelUp,
    ratio,
    nextTierRequirements,
  };
}

/**
 * Synchronise mastery progression with Child model pillar attributes (literacy, numeracy, reasoning).
 */
async function syncChildPillars(childId: string, subject: string, newLevel: MasteryTier) {
  const normSubject = subject.toLowerCase();

  if (normSubject === "mathematics" || normSubject === "maths") {
    await db.child.update({
      where: { id: childId },
      data: { numeracyLevel: newLevel },
    });
  } else if (normSubject === "english" || normSubject === "literacy") {
    await db.child.update({
      where: { id: childId },
      data: { literacyLevel: newLevel },
    });
  } else {
    // For foundation subjects, compute average/median tier across all foundation subjects
    const foundationProgresses = await db.progress.findMany({
      where: {
        childId,
        subject: {
          notIn: ["Mathematics", "Maths", "English", "Literacy"],
        },
      },
      select: { masteryLevel: true },
    });

    if (foundationProgresses.length > 0) {
      const scores = foundationProgresses.map(
        (p) => MASTERY_ORDER[(p.masteryLevel as MasteryTier) || "DEVELOPING"]
      );
      const avgScore = Math.round(
        scores.reduce((a, b) => a + b, 0) / scores.length
      );
      const tiers: MasteryTier[] = ["EMERGING", "DEVELOPING", "SECURE", "EXCEEDING"];
      const computedReasoning = tiers[avgScore - 1] ?? "DEVELOPING";

      await db.child.update({
        where: { id: childId },
        data: { reasoningLevel: computedReasoning },
      });
    }
  }
}

/**
 * Evaluates the mastery tier for a child in a subject, updates DB records, and returns event data.
 */
export async function evaluateAndAdvanceMastery(
  childId: string,
  subject: string,
  options?: {
    isManualOverride?: boolean;
    forceRecalculate?: boolean;
  }
): Promise<{
  previousLevel: MasteryTier;
  newLevel: MasteryTier;
  levelChanged: boolean;
  levelUp: boolean;
  ratio: number;
}> {
  const [topicsCompleted, topicsTotal, objectivesMet, totalObjectives, existingProgress] =
    await Promise.all([
      db.lesson.count({
        where: { childId, subject, status: "COMPLETED" },
      }),
      db.lesson.count({
        where: { childId, subject },
      }),
      db.lessonObjective.count({
        where: { lesson: { childId, subject }, completed: true },
      }),
      db.lessonObjective.count({
        where: { lesson: { childId, subject } },
      }),
      db.progress.findUnique({
        where: { childId_subject: { childId, subject } },
      }),
    ]);

  const isManualOverride =
    options?.isManualOverride !== undefined
      ? options.isManualOverride
      : (existingProgress?.isManualOverride ?? false);

  const currentLevel = (existingProgress?.masteryLevel as MasteryTier) ?? "DEVELOPING";

  const result = calculateMasteryLevel({
    topicsCompleted,
    topicsTotal,
    objectivesMet,
    totalObjectives,
    currentLevel,
    isManualOverride,
    defaultBaseline: "DEVELOPING",
  });

  // Persist updated progress
  await db.progress.upsert({
    where: { childId_subject: { childId, subject } },
    update: {
      topicsCompleted,
      topicsTotal,
      objectivesMet,
      masteryLevel: result.newLevel,
      isManualOverride,
      ...(result.levelUp ? { lastLevelUpAt: new Date() } : {}),
    },
    create: {
      childId,
      subject,
      topicsCompleted,
      topicsTotal,
      objectivesMet,
      totalMinutes: 0,
      masteryLevel: result.newLevel,
      isManualOverride,
      lastLevelUpAt: result.levelUp ? new Date() : null,
    },
  });

  // Synchronize child pillar attributes
  if (result.levelChanged || options?.forceRecalculate) {
    await syncChildPillars(childId, subject, result.newLevel);
  }

  return {
    previousLevel: currentLevel,
    newLevel: result.newLevel,
    levelChanged: result.levelChanged,
    levelUp: result.levelUp,
    ratio: result.ratio,
  };
}
