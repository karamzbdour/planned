import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const lesson = await db.lesson.findFirst({
    where: { id: params.id, child: { userId: session.user.id } },
  });

  if (!lesson) {
    return NextResponse.json({ error: "Lesson not found" }, { status: 404 });
  }

  // If completed, don't overwrite completed duration
  if (lesson.status === "COMPLETED") {
    return NextResponse.json({
      success: true,
      activeSeconds: lesson.activeSeconds,
      isPaused: lesson.isPaused,
    });
  }

  const body = await req.json().catch(() => ({}));
  const dataToUpdate: {
    lastActiveAt: Date;
    activeSeconds?: number;
    isPaused?: boolean;
  } = {
    lastActiveAt: new Date(),
  };

  if (typeof body.activeSeconds === "number" && !isNaN(body.activeSeconds)) {
    dataToUpdate.activeSeconds = Math.max(0, Math.floor(body.activeSeconds));
  }

  if (typeof body.isPaused === "boolean") {
    dataToUpdate.isPaused = body.isPaused;
  }

  const updated = await db.lesson.update({
    where: { id: params.id },
    data: dataToUpdate,
  });

  return NextResponse.json({
    success: true,
    activeSeconds: updated.activeSeconds,
    isPaused: updated.isPaused,
  });
}
