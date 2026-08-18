import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { evaluateAndAdvanceMastery } from "@/lib/mastery";

export async function PATCH(
  req: Request,
  { params }: { params: { id: string; objId: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Verify ownership via the lesson → child → user chain
  const objective = await db.lessonObjective.findFirst({
    where: {
      id: params.objId,
      lessonId: params.id,
      lesson: { child: { userId: session.user.id } },
    },
    include: { lesson: { select: { childId: true, subject: true } } },
  });

  if (!objective) {
    return NextResponse.json({ error: "Objective not found" }, { status: 404 });
  }

  const { completed } = (await req.json()) as { completed: boolean };
  const wasCompleted = objective.completed;

  const updated = await db.lessonObjective.update({
    where: { id: params.objId },
    data: {
      completed,
      completedAt: completed ? new Date() : null,
    },
  });

  let mastery = undefined;

  // Update Progress.objectivesMet & evaluate mastery
  if (completed !== wasCompleted) {
    const delta = completed ? 1 : -1;
    await db.progress.upsert({
      where: {
        childId_subject: {
          childId: objective.lesson.childId,
          subject: objective.lesson.subject,
        },
      },
      update: {
        objectivesMet: { increment: delta },
      },
      create: {
        childId: objective.lesson.childId,
        subject: objective.lesson.subject,
        objectivesMet: Math.max(delta, 0),
        topicsCompleted: 0,
        topicsTotal: 1,
      },
    });

    mastery = await evaluateAndAdvanceMastery(
      objective.lesson.childId,
      objective.lesson.subject
    );
  }

  return NextResponse.json({ objective: updated, mastery });
}
