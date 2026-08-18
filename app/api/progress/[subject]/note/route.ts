import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { ai, MODEL } from "@/lib/ai";

export const dynamic = "force-dynamic";

interface GuidanceResponse {
  strength?: string;
  growth?: string;
  nextStep?: string;
}

export async function POST(
  req: Request,
  { params }: { params: { subject: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { childId } = await req.json();
  if (!childId) return NextResponse.json({ error: "childId required" }, { status: 400 });

  const subject = decodeURIComponent(params.subject);

  const child = await db.child.findFirst({
    where: { id: childId, userId: session.user.id },
  });
  if (!child) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const [
    progressRow,
    completedLessons,
    pendingLessons,
    metObjectives,
    totalObjectives,
    recentLesson,
    nextLesson,
  ] = await Promise.all([
    db.progress.findUnique({
      where: { childId_subject: { childId, subject } },
    }),
    db.lesson.count({ where: { childId, subject, status: "COMPLETED" } }),
    db.lesson.count({ where: { childId, subject, status: "PENDING" } }),
    db.lessonObjective.count({ where: { lesson: { childId, subject }, completed: true } }),
    db.lessonObjective.count({ where: { lesson: { childId, subject } } }),
    db.lesson.findFirst({
      where: { childId, subject, status: "COMPLETED" },
      orderBy: { completedAt: "desc" },
      select: { topic: true },
    }),
    db.lesson.findFirst({
      where: { childId, subject, status: { in: ["PENDING", "IN_PROGRESS"] } },
      orderBy: { dayDate: "asc" },
      select: { topic: true },
    }),
  ]);

  const abilityLevel =
    subject === "Mathematics" || subject === "Maths"
      ? child.numeracyLevel
      : subject === "English" || subject === "Literacy"
      ? child.literacyLevel
      : child.reasoningLevel;

  const totalMinutes = progressRow?.totalMinutes ?? 0;
  const hours = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;
  const timeStr = hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
  const totalTopics = completedLessons + pendingLessons;

  // Ultra-compact, token-efficient pedagogical prompt maintaining ~110-120 input tokens
  const prompt = `You are an expert UK homeschool learning advisor. Provide a concise parent guidance hint assessing the child's progress in ${subject}.

Child: ${child.name} (${child.yearGroup ?? "Primary age"})
Subject: ${subject} | Level: ${abilityLevel} (EMERGING / DEVELOPING / SECURE / EXCEEDING scale)
Progress: ${completedLessons}/${totalTopics} topics completed, ${metObjectives}/${totalObjectives} objectives met (${timeStr})${
    recentLesson?.topic ? `\nRecent completed topic: "${recentLesson.topic}"` : ""
  }${nextLesson?.topic ? `\nNext topic: "${nextLesson.topic}"` : ""}

Respond ONLY with a valid JSON object formatted as:
{
  "strength": "1 concise sentence on what ${child.name} is demonstrating strong capability or solid grasp in.",
  "growth": "1 concise sentence on where they can improve or consolidate understanding.",
  "nextStep": "1 concise, practical action or quick activity for the parent next."
}`;

  try {
    const message = await ai.messages.create({
      model: MODEL,
      max_tokens: 350,
      messages: [{ role: "user", content: prompt }],
    });

    const rawText =
      message.content[0]?.type === "text" ? message.content[0].text.trim() : "";

    let strength = "";
    let growth = "";
    let nextStep = "";
    let note = rawText;

    const jsonMatch = rawText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch[0]) as GuidanceResponse;
        strength = parsed.strength?.trim() ?? "";
        growth = parsed.growth?.trim() ?? "";
        nextStep = parsed.nextStep?.trim() ?? "";

        const parts = [strength, growth, nextStep].filter(Boolean);
        if (parts.length > 0) {
          note = parts.join(" ");
        }
      } catch {
        // parsing failed, use rawText as note
      }
    }

    return NextResponse.json({
      note,
      strength: strength || undefined,
      growth: growth || undefined,
      nextStep: nextStep || undefined,
    });
  } catch (error) {
    console.error("Failed to generate guidance note:", error);
    return NextResponse.json(
      { error: "Failed to generate guidance note" },
      { status: 500 }
    );
  }
}
