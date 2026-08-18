import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

function getISOWeek(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d.valueOf() - yearStart.valueOf()) / 86400000) + 1) / 7);
}

function getTermWeek(date: Date): { week: number; term: string; totalWeeks: number } {
  const isoWeek = getISOWeek(date);
  // UK approximate term weeks:
  // Autumn: 36–49, Spring: 2–14, Summer: 18–30
  if (isoWeek >= 36) return { week: isoWeek - 35, term: "Autumn", totalWeeks: 14 };
  if (isoWeek <= 14) return { week: Math.max(isoWeek - 1, 1), term: "Spring", totalWeeks: 13 };
  return { week: Math.max(isoWeek - 17, 1), term: "Summer", totalWeeks: 13 };
}

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const childId = searchParams.get("childId");
  if (!childId) return NextResponse.json({ error: "childId required" }, { status: 400 });

  const child = await db.child.findFirst({
    where: { id: childId, userId: session.user.id },
  });
  if (!child) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const safeChild = child;

  const familyProfile = await db.familyProfile.findUnique({
    where: { userId: session.user.id },
  });

  // ── Lesson aggregates ──────────────────────────────────────────────────────
  const [allLessons, progressRows, objectivesTotal, objectivesMet] = await Promise.all([
    db.lesson.findMany({
      where: { childId },
      select: { id: true, subject: true, topic: true, status: true, completedAt: true, durationMins: true },
    }),
    db.progress.findMany({ where: { childId } }),
    db.lessonObjective.count({ where: { lesson: { childId } } }),
    db.lessonObjective.count({ where: { lesson: { childId }, completed: true } }),
  ]);

  // Per-subject lesson counts (from Lesson table — ground truth)
  const subjectMap: Record<string, { total: number; completed: number; inProgress: number }> = {};
  for (const l of allLessons) {
    if (!subjectMap[l.subject]) subjectMap[l.subject] = { total: 0, completed: 0, inProgress: 0 };
    subjectMap[l.subject].total++;
    if (l.status === "COMPLETED") subjectMap[l.subject].completed++;
    if (l.status === "IN_PROGRESS") subjectMap[l.subject].inProgress++;
  }

  // Progress table — for objectivesMet, totalMinutes, masteryLevel per subject
  const progressBySubject: Record<
    string,
    {
      objectivesMet: number;
      totalMinutes: number;
      masteryLevel?: string;
      isManualOverride?: boolean;
    }
  > = {};
  for (const p of progressRows) {
    progressBySubject[p.subject] = {
      objectivesMet: p.objectivesMet,
      totalMinutes: p.totalMinutes,
      masteryLevel: p.masteryLevel,
      isManualOverride: p.isManualOverride,
    };
  }

  // Ability level mapping fallback
  const abilityMap: Record<string, string> = {
    Mathematics: child.numeracyLevel,
    Maths: child.numeracyLevel,
    English: child.literacyLevel,
    Literacy: child.literacyLevel,
  };
  function getAbility(subject: string) {
    return (
      progressBySubject[subject]?.masteryLevel ||
      abilityMap[subject] ||
      safeChild.reasoningLevel ||
      "DEVELOPING"
    );
  }

  const subjects = Object.entries(subjectMap).map(([subject, counts]) => ({
    subject,
    topicsCompleted: counts.completed,
    topicsTotal: counts.total,
    topicsInProgress: counts.inProgress,
    objectivesMet: progressBySubject[subject]?.objectivesMet ?? 0,
    totalMinutes: progressBySubject[subject]?.totalMinutes ?? 0,
    abilityLevel: getAbility(subject),
    isManualOverride: progressBySubject[subject]?.isManualOverride ?? false,
  }));

  const totalLessons = allLessons.length;
  const completedLessons = allLessons.filter((l) => l.status === "COMPLETED").length;
  const totalMinutes = progressRows.reduce((sum, p) => sum + p.totalMinutes, 0);
  const curriculumPercent = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;

  // ── Recent activity (lessons + external) ─────────────────────────────────
  const [completedLessonsFull, externalActivities] = await Promise.all([
    db.lesson.findMany({
      where: { childId, status: "COMPLETED" },
      orderBy: { completedAt: "desc" },
      take: 8,
      include: {
        objectives: { select: { id: true, completed: true } },
      },
    }),
    db.externalActivity.findMany({
      where: { childId },
      orderBy: { activityDate: "desc" },
      take: 8,
    }),
  ]);

  const recentActivity = [
    ...completedLessonsFull.map((l) => ({
      id: l.id,
      type: "LESSON" as const,
      subject: l.subject,
      title: l.topic,
      completedAt: l.completedAt?.toISOString() ?? null,
      objectivesDone: l.objectives.filter((o) => o.completed).length,
      objectivesTotal: l.objectives.length,
      durationMins: l.durationMins,
      isExternal: false,
    })),
    ...externalActivities.map((a) => ({
      id: a.id,
      type: "EXTERNAL" as const,
      subject: a.subject,
      title: a.description,
      completedAt: a.activityDate.toISOString(),
      objectivesDone: 0,
      objectivesTotal: 0,
      durationMins: a.durationMins,
      isExternal: true,
    })),
  ]
    .sort((a, b) => (b.completedAt ?? "").localeCompare(a.completedAt ?? ""))
    .slice(0, 8);

  const termInfo = getTermWeek(new Date());

  return NextResponse.json({
    child,
    familyProfile,
    overallStats: {
      lessonsCompleted: completedLessons,
      objectivesMet,
      objectivesTotal,
      totalMinutes,
      curriculumPercent,
    },
    termInfo,
    subjects,
    recentActivity,
  });
}
