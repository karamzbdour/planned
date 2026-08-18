import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

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
  });
  if (!lesson) {
    return NextResponse.json({ error: "Lesson not found" }, { status: 404 });
  }
  if (lesson.status === "COMPLETED") {
    return NextResponse.json({ error: "Lesson already completed" }, { status: 400 });
  }

  const updated = await db.lesson.update({
    where: { id: params.id },
    data: {
      status: "IN_PROGRESS",
      isPaused: false,
      startedAt: lesson.startedAt ?? new Date(),
      lastActiveAt: new Date(),
    },
  });

  return NextResponse.json({ lesson: updated });
}
