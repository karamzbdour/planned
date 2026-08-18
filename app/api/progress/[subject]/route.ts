import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { calculateMasteryLevel, MasteryTier } from "@/lib/mastery";

export const dynamic = "force-dynamic";

export async function GET(
  req: Request,
  { params }: { params: { subject: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const childId = searchParams.get("childId");
  if (!childId) return NextResponse.json({ error: "childId required" }, { status: 400 });

  const subject = decodeURIComponent(params.subject);

  const child = await db.child.findFirst({
    where: { id: childId, userId: session.user.id },
  });
  if (!child) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const [lessons, progressRow, externalActivities] = await Promise.all([
    db.lesson.findMany({
      where: { childId, subject },
      include: { objectives: { orderBy: { id: "asc" } } },
      orderBy: { dayDate: "asc" },
    }),
    db.progress.findUnique({
      where: { childId_subject: { childId, subject } },
    }),
    db.externalActivity.findMany({
      where: { childId, subject },
      orderBy: { activityDate: "desc" },
    }),
  ]);

  const completed = lessons.filter((l) => l.status === "COMPLETED");
  const inProgress = lessons.filter((l) => l.status === "IN_PROGRESS");
  const upcoming = lessons.filter((l) => l.status === "PENDING" || l.status === "SKIPPED");

  // All objectives across all lessons in this subject
  const allObjectives = lessons.flatMap((l) =>
    l.objectives.map((o) => ({
      id: o.id,
      lessonId: l.id,
      lessonTopic: l.topic,
      text: o.text,
      completed: o.completed,
      completedAt: o.completedAt?.toISOString() ?? null,
    }))
  );

  const fallbackAbilityLevel =
    subject === "Mathematics" || subject === "Maths"
      ? child.numeracyLevel
      : subject === "English" || subject === "Literacy"
      ? child.literacyLevel
      : child.reasoningLevel;

  const currentMasteryLevel = (progressRow?.masteryLevel || fallbackAbilityLevel || "DEVELOPING") as MasteryTier;
  const isManualOverride = progressRow?.isManualOverride ?? false;
  const metObjectivesCount = allObjectives.filter((o) => o.completed).length;

  const masteryCalculation = calculateMasteryLevel({
    topicsCompleted: completed.length,
    topicsTotal: lessons.length,
    objectivesMet: metObjectivesCount,
    totalObjectives: allObjectives.length,
    currentLevel: currentMasteryLevel,
    isManualOverride,
  });

  return NextResponse.json({
    subject,
    child: { id: child.id, name: child.name, yearGroup: child.yearGroup },
    progress: {
      topicsCompleted: completed.length,
      topicsTotal: lessons.length,
      topicsInProgress: inProgress.length,
      objectivesMet: metObjectivesCount,
      totalMinutes: progressRow?.totalMinutes ?? 0,
    },
    abilityLevel: masteryCalculation.newLevel,
    isManualOverride,
    lastLevelUpAt: progressRow?.lastLevelUpAt?.toISOString() ?? null,
    nextTierRequirements: masteryCalculation.nextTierRequirements,
    lessons: {
      completed: completed.map((l) => ({
        id: l.id,
        topic: l.topic,
        completedAt: l.completedAt?.toISOString() ?? null,
        durationMins: l.durationMins,
        objectivesDone: l.objectives.filter((o) => o.completed).length,
        objectivesTotal: l.objectives.length,
      })),
      inProgress: inProgress.map((l) => ({ id: l.id, topic: l.topic })),
      upcoming: upcoming.map((l) => ({ id: l.id, topic: l.topic })),
    },
    objectives: allObjectives,
    externalActivities: externalActivities.map((a) => ({
      id: a.id,
      description: a.description,
      durationMins: a.durationMins,
      activityDate: a.activityDate.toISOString(),
    })),
  });
}
