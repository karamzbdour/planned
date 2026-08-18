import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { checkAndAwardBadges } from "@/lib/bloom";
import { evaluateAndAdvanceMastery } from "@/lib/mastery";

export async function POST(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const lesson = await db.lesson.findFirst({
    where: { id: params.id, child: { userId: session.user.id } },
    include: { objectives: true },
  });
  if (!lesson) {
    return NextResponse.json({ error: "Lesson not found" }, { status: 404 });
  }

  const body = await _req.json().catch(() => ({}));

  const now = new Date();
  let finalActiveSeconds = 0;

  if (typeof body.activeSeconds === "number" && !isNaN(body.activeSeconds) && body.activeSeconds >= 0) {
    finalActiveSeconds = Math.floor(body.activeSeconds);
  } else if (lesson.activeSeconds > 0) {
    finalActiveSeconds = lesson.activeSeconds;
  } else if (lesson.startedAt) {
    // Fallback: elapsed wall clock minutes, capped at 120 minutes to prevent runaway idle time
    const wallClockSecs = Math.max(0, Math.floor((now.getTime() - lesson.startedAt.getTime()) / 1000));
    finalActiveSeconds = Math.min(wallClockSecs, 120 * 60);
  }

  const durationMins = Math.max(1, Math.round(finalActiveSeconds / 60));

  const updated = await db.lesson.update({
    where: { id: params.id },
    data: {
      status: "COMPLETED",
      completedAt: now,
      durationMins,
      activeSeconds: finalActiveSeconds,
      isPaused: false,
    },
  });

  // Award 3 bloom stars for completing a lesson
  const child = await db.child.update({
    where: { id: lesson.childId },
    data: { bloomStars: { increment: 3 } },
  });

  // Update subject progress & total minutes
  await db.progress.upsert({
    where: { childId_subject: { childId: lesson.childId, subject: lesson.subject } },
    update: {
      totalMinutes: { increment: durationMins },
    },
    create: {
      childId: lesson.childId,
      subject: lesson.subject,
      topicsCompleted: 1,
      topicsTotal: 1,
      totalMinutes: durationMins,
    },
  });

  // Evaluate dynamic mastery tier advancement
  const mastery = await evaluateAndAdvanceMastery(lesson.childId, lesson.subject);

  // Check for newly unlocked badges
  const newBadges = await checkAndAwardBadges(lesson.childId);

  return NextResponse.json({
    lesson: updated,
    bloomStars: child.bloomStars,
    newBadges,
    mastery,
  });
}
