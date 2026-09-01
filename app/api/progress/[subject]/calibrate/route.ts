import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { evaluateAndAdvanceMastery, MasteryTier } from "@/lib/mastery";
import { z } from "zod";

export const dynamic = "force-dynamic";

const calibrateSchema = z.object({
  childId: z.string().min(1),
  masteryLevel: z.enum(["EMERGING", "DEVELOPING", "SECURE", "EXCEEDING"]).optional(),
  isManualOverride: z.boolean(),
});

export async function POST(
  req: Request,
  { params }: { params: { subject: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const parsed = calibrateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0].message },
      { status: 400 }
    );
  }

  const { childId, masteryLevel, isManualOverride } = parsed.data;
  const subject = decodeURIComponent(params.subject);

  const child = await db.child.findFirst({
    where: { id: childId, userId: session.user.id },
  });
  if (!child) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (isManualOverride && masteryLevel) {
    // Parent manually set the tier
    await db.progress.upsert({
      where: { childId_subject: { childId, subject } },
      update: {
        masteryLevel,
        isManualOverride: true,
      },
      create: {
        childId,
        subject,
        masteryLevel,
        isManualOverride: true,
      },
    });

    const normSubject = subject.toLowerCase();
    if (normSubject === "mathematics" || normSubject === "maths") {
      await db.child.update({
        where: { id: childId },
        data: { numeracyLevel: masteryLevel },
      });
    } else if (normSubject === "english" || normSubject === "literacy") {
      await db.child.update({
        where: { id: childId },
        data: { literacyLevel: masteryLevel },
      });
    }

    return NextResponse.json({
      success: true,
      masteryLevel,
      isManualOverride: true,
    });
  } else {
    // Remove manual override and recalculate automatically
    const evaluated = await evaluateAndAdvanceMastery(childId, subject, {
      isManualOverride: false,
      forceRecalculate: true,
    });

    return NextResponse.json({
      success: true,
      masteryLevel: evaluated.newLevel,
      isManualOverride: false,
    });
  }
}
