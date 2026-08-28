import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { streamText, Output, toTextStream, createTextStreamResponse } from "ai";
import { geminiModel } from "@/lib/ai/model";
import { fullLessonSchema } from "@/lib/ai/schemas";
import {
  buildLessonPrompt,
  postProcessLessonContent,
} from "@/lib/lessonGenerator";
import { getUserTier } from "@/lib/subscription";

export const dynamic = "force-dynamic";

function safeParseJson<T>(str: string, fallback: T): T {
  try {
    return JSON.parse(str) as T;
  } catch {
    return fallback;
  }
}

async function ensureObjectives(
  lessonId: string,
  texts: string[]
): Promise<{ id: string; text: string; completed: boolean; completedAt: string | null }[]> {
  const existing = await db.lessonObjective.findMany({ where: { lessonId } });

  if (existing.length === texts.length) {
    return existing.map((o) => ({
      id: o.id,
      text: o.text,
      completed: o.completed,
      completedAt: o.completedAt?.toISOString() ?? null,
    }));
  }

  await db.lessonObjective.deleteMany({ where: { lessonId } });
  const created = await db.$transaction(
    texts.map((text) =>
      db.lessonObjective.create({ data: { lessonId, text } })
    )
  );

  return created.map((o) => ({
    id: o.id,
    text: o.text,
    completed: o.completed,
    completedAt: o.completedAt?.toISOString() ?? null,
  }));
}

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
    include: {
      child: {
        include: {
          user: {
            select: {
              location: true,
              familyProfile: true,
            },
          },
        },
      },
      objectives: true,
    },
  });

  if (!lesson) {
    return NextResponse.json({ error: "Lesson not found" }, { status: 404 });
  }

  const tier = await getUserTier(session.user.id);
  const child = lesson.child;
  const fp = child.user.familyProfile;
  const interests =
    safeParseJson<string[]>(child.interests, []).join(", ") ||
    "a variety of topics";
  const curriculum = fp?.curriculum ?? "BNC";
  const faith = fp?.faith ?? "SECULAR";
  const faithIntegration = fp?.faithIntegration ?? false;
  const location = child.user.location ?? "United Kingdom";

  const { prompt, includeFaith } = buildLessonPrompt({
    childName: child.name,
    childAge: child.age,
    childYearGroup: child.yearGroup,
    learningStyle: child.learningStyle,
    interests,
    literacyLevel: child.literacyLevel,
    numeracyLevel: child.numeracyLevel,
    reasoningLevel: child.reasoningLevel,
    curriculum,
    faith,
    faithIntegration,
    location,
    subject: lesson.subject,
    topic: lesson.topic,
    tier,
  });

  const result = streamText({
    model: geminiModel,
    output: Output.object({
      schema: fullLessonSchema,
    }),
    prompt,
    onEnd: async () => {
      try {
        const object = await result.output;
        if (object) {
          const processed = await postProcessLessonContent(
            object,
            includeFaith,
            faith
          );

          await db.lesson.update({
            where: { id: lesson.id },
            data: { generatedContent: JSON.stringify(processed) },
          });

          await ensureObjectives(lesson.id, processed.objectives ?? []);
        }
      } catch (err) {
        console.error("[generate-detail onEnd error]:", err);
      }
    },
  });

  return createTextStreamResponse({
    stream: toTextStream({ stream: result.stream }),
  });
}
