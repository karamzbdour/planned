import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

function startOfDay(d: Date) {
  const out = new Date(d);
  out.setHours(0, 0, 0, 0);
  return out;
}

function endOfDay(d: Date) {
  const out = new Date(d);
  out.setHours(23, 59, 59, 999);
  return out;
}

/**
 * Returns the ISO Monday-anchored week containing `d`. Used so that
 * "this week" / "last week" always start on Monday in the UK locale,
 * regardless of system locale.
 */
function startOfWeek(d: Date) {
  const out = startOfDay(d);
  const day = out.getDay(); // 0 = Sun … 6 = Sat
  const offsetToMonday = day === 0 ? -6 : 1 - day;
  out.setDate(out.getDate() + offsetToMonday);
  return out;
}

export type DashboardRange = "today" | "yesterday" | "this-week" | "last-week" | "custom";

const VALID_RANGES: DashboardRange[] = ["today", "yesterday", "this-week", "last-week", "custom"];

interface RangeWindow {
  from: Date;
  to: Date;
  /** Short label shown in the section heading, e.g. "Today's lessons". */
  label: string;
}

function computeRange(range: DashboardRange, now: Date, customDate?: string): RangeWindow {
  if (range === "yesterday") {
    const d = new Date(now);
    d.setDate(d.getDate() - 1);
    return { from: startOfDay(d), to: endOfDay(d), label: "Yesterday" };
  }
  if (range === "this-week") {
    const start = startOfWeek(now);
    const end = endOfDay(new Date(start.getTime() + 6 * 86_400_000));
    return { from: start, to: end, label: "This week" };
  }
  if (range === "last-week") {
    const thisStart = startOfWeek(now);
    const start = new Date(thisStart.getTime() - 7 * 86_400_000);
    const end = endOfDay(new Date(thisStart.getTime() - 1));
    return { from: start, to: end, label: "Last week" };
  }
  if (range === "custom" && customDate) {
    // YYYY-MM-DD — interpret as local midnight to avoid timezone drift on
    // the calendar boundary.
    const [y, m, d] = customDate.split("-").map(Number);
    if (y && m && d) {
      const date = new Date(y, m - 1, d);
      return {
        from: startOfDay(date),
        to: endOfDay(date),
        label: date.toLocaleDateString("en-GB", {
          weekday: "long",
          day: "numeric",
          month: "long",
        }),
      };
    }
  }
  // today (default)
  return { from: startOfDay(now), to: endOfDay(now), label: "Today" };
}

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const childId = searchParams.get("childId");
  if (!childId) {
    return NextResponse.json({ error: "childId required" }, { status: 400 });
  }

  const rangeParam = searchParams.get("range") as DashboardRange | null;
  const range: DashboardRange = rangeParam && VALID_RANGES.includes(rangeParam) ? rangeParam : "today";
  const customDate = searchParams.get("date") ?? undefined;

  // Verify the child belongs to this user
  const child = await db.child.findFirst({
    where: { id: childId, userId: session.user.id },
  });
  if (!child) {
    return NextResponse.json({ error: "Child not found" }, { status: 404 });
  }

  const familyProfile = await db.familyProfile.findUnique({
    where: { userId: session.user.id },
  });

  const window = computeRange(range, new Date(), customDate);

  // Missed lessons = scheduled in the past 14 days but not COMPLETED.
  // Capped to 14 days so the list stays manageable and the query stays fast
  // once the app has months of history.
  const now = new Date();
  const missedFrom = new Date(now);
  missedFrom.setDate(missedFrom.getDate() - 14);

  const [rangeLessons, totalLessons, completedLessons, nextReward, missedLessons, activeLesson] =
    await Promise.all([
      db.lesson.findMany({
        where: {
          childId,
          dayDate: { gte: window.from, lte: window.to },
        },
        include: { objectives: true },
        orderBy: { dayDate: "asc" },
      }),
      db.lesson.count({ where: { childId } }),
      db.lesson.count({ where: { childId, status: "COMPLETED" } }),
      db.reward.findFirst({
        where: { childId, redeemed: false },
        orderBy: { starsRequired: "asc" },
      }),
      db.lesson.findMany({
        where: {
          childId,
          status: { not: "COMPLETED" },
          dayDate: {
            gte: startOfDay(missedFrom),
            lt: startOfDay(now), // strictly before today — not "today's PENDING"
          },
        },
        orderBy: { dayDate: "desc" },
        include: { objectives: true },
        take: 20,
      }),
      db.lesson.findFirst({
        where: {
          childId,
          status: "IN_PROGRESS",
        },
        include: { objectives: true },
        orderBy: { updatedAt: "desc" },
      }),
    ]);

  // Subject progress for lessons in the selected window
  const subjects = Array.from(new Set(rangeLessons.map((l) => l.subject)));
  const subjectProgress =
    subjects.length > 0
      ? await db.progress.findMany({
          where: { childId, subject: { in: subjects } },
        })
      : [];

  const progressMap: Record<string, { done: number; total: number }> = {};
  for (const p of subjectProgress) {
    progressMap[p.subject] = {
      done: p.topicsCompleted,
      total: p.topicsTotal,
    };
  }

  const doneInRange = rangeLessons.filter((l) => l.status === "COMPLETED").length;
  const curriculumPercent =
    totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;

  return NextResponse.json({
    child,
    familyProfile,
    range,
    rangeLabel: window.label,
    rangeFrom: window.from.toISOString(),
    rangeTo: window.to.toISOString(),
    // Kept under the original key name so existing callers don't break;
    // semantically these are now "lessons in the selected window".
    todaysLessons: rangeLessons.map((l) => {
      const total = l.objectives.length;
      const done = l.objectives.filter((o) => o.completed).length;
      return {
        ...l,
        objectivesDone: done,
        objectivesTotal: total,
        parsedContent: safeParseJson(l.generatedContent),
      };
    }),
    // Currently active / in-progress lesson (if any) across any day
    activeLesson: activeLesson
      ? {
          ...activeLesson,
          objectivesDone: activeLesson.objectives.filter((o) => o.completed).length,
          objectivesTotal: activeLesson.objectives.length,
          parsedContent: safeParseJson(activeLesson.generatedContent),
        }
      : null,
    // Past 14 days of lessons the parent hasn't marked complete. Each entry
    // includes objectiveStats so the UI can distinguish "not started" from
    // "partially completed".
    missedLessons: missedLessons.map((l) => {
      const total = l.objectives.length;
      const done = l.objectives.filter((o) => o.completed).length;
      return {
        id: l.id,
        subject: l.subject,
        topic: l.topic,
        dayDate: l.dayDate.toISOString(),
        status: l.status,
        durationMins: l.durationMins,
        activeSeconds: l.activeSeconds,
        isPaused: l.isPaused,
        objectivesDone: done,
        objectivesTotal: total,
        parsedContent: safeParseJson(l.generatedContent),
      };
    }),
    stats: {
      // "Today" semantics widened to "in the selected range" — both fields
      // are renamed in spirit but kept under their original keys so the
      // existing UI code keeps compiling.
      lessonsDoneToday: doneInRange,
      totalLessonsToday: rangeLessons.length,
      curriculumPercent,
      bloomStars: child.bloomStars,
    },
    nextReward,
    hasAnyLessons: totalLessons > 0,
    subjectProgress: progressMap,
  });
}

function safeParseJson(str: string) {
  try {
    return JSON.parse(str);
  } catch {
    return {};
  }
}
