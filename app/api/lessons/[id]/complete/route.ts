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

  const now = new Date();
  const startedAt = lesson.startedAt ?? now;
  const durationMins = Math.round((now.getTime() - startedAt.getTime()) / 60000);

  const updated = await db.lesson.update({
    where: { id: params.id },
    data: {
      status: "COMPLETED",
      completedAt: now,
      durationMins: Math.max(durationMins, 1),
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
