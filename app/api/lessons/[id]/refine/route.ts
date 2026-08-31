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
  type RefineIntent,
} from "@/lib/lessonGenerator";
import { getUserTier } from "@/lib/subscription";
import { rateLimit } from "@/lib/rateLimit";

export const dynamic = "force-dynamic";

const VALID_INTENTS: RefineIntent[] = ["easier", "harder", "alternative"];

const REFINE_LIMITS = {
  FREE:    { limit: 5,  windowMs: 60 * 60 * 1000 },
  BASIC:   { limit: 30, windowMs: 60 * 60 * 1000 },
  PREMIUM: { limit: 90, windowMs: 60 * 60 * 1000 },
} as const;

function safeParseJson<T>(str: string, fallback: T): T {
  try {
    return JSON.parse(str) as T;
  } catch {
    return fallback;
  }
}

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let intent: RefineIntent;
  try {
    const body = await req.json();
    intent = body.intent;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!VALID_INTENTS.includes(intent)) {
    return NextResponse.json(
      { error: `intent must be one of: ${VALID_INTENTS.join(", ")}` },
      { status: 400 }
    );
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
    },
  });

  if (!lesson) {
    return NextResponse.json({ error: "Lesson not found" }, { status: 404 });
  }

  const tier = await getUserTier(session.user.id);
  const { limit, windowMs } = REFINE_LIMITS[tier];
  const rl = rateLimit(`refine:${session.user.id}`, limit, windowMs);
  if (!rl.ok) {
    return NextResponse.json(
      { error: `Too many refines. Try again in ${rl.retryAfterSeconds}s.` },
      { status: 429, headers: { "Retry-After": String(rl.retryAfterSeconds) } }
    );
  }

  const child = lesson.child;
  const fp = child.user.familyProfile;
  const interests =
    safeParseJson<string[]>(child.interests, []).join(", ") ||
    "a variety of topics";
  const curriculum = fp?.curriculum ?? "BNC";
  const faith = fp?.faith ?? "SECULAR";
  const faithIntegration = fp?.faithIntegration ?? false;
  const location = child.user.location ?? "United Kingdom";

  const { systemPrompt, userPrompt, includeFaith } = buildLessonPrompt({
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
    refineIntent: intent,
  });

  const result = streamText({
    model: geminiModel,
    system: systemPrompt,
    prompt: userPrompt,
    output: Output.object({
      schema: fullLessonSchema,
    }),
    onEnd: async () => {
      try {
        const object = await result.output;
        if (object) {
          const processed = await postProcessLessonContent(
            object,
            includeFaith,
            faith
          );

          await db.$transaction([
            db.lesson.update({
              where: { id: lesson.id },
              data: { generatedContent: JSON.stringify(processed) },
            }),
            db.lessonObjective.deleteMany({ where: { lessonId: lesson.id } }),
          ]);

          if (processed.objectives?.length) {
            await db.$transaction(
              processed.objectives.map((text) =>
                db.lessonObjective.create({
                  data: { lessonId: lesson.id, text },
                })
              )
            );
          }
        }
      } catch (err) {
        console.error("[refine onEnd error]:", err);
      }
    },
  });

  return createTextStreamResponse({
    stream: toTextStream({ stream: result.stream }),
  });
}
