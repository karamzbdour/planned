import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { toTextStream, createTextStreamResponse } from "ai";
import { streamWithFallback } from "@/lib/ai/fallback";
import { weekGenerationSchema, type WeekLessonData } from "@/lib/ai/schemas";
import { getUserTier, freeWeekLimitReached, PAYWALL_RESPONSES } from "@/lib/subscription";
import { rateLimit } from "@/lib/rateLimit";
import { getWeekGenSystemInstruction } from "@/lib/ai/curriculum-prompts";

// Per-tier hourly limits for week generation.
const WEEK_GEN_LIMITS = {
  FREE:    { limit: 10, windowMs: 60 * 60 * 1000 },
  BASIC:   { limit: 30, windowMs: 60 * 60 * 1000 },
  PREMIUM: { limit: 90, windowMs: 60 * 60 * 1000 },
} as const;

export const dynamic = "force-dynamic";

// ─── Date helpers ─────────────────────────────────────────────────────────────

function getMondayOfWeek(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d;
}

function getISOWeek(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d.valueOf() - yearStart.valueOf()) / 86400000) + 1) / 7);
}

// ─── Curriculum config ────────────────────────────────────────────────────────

const CURRICULUM_LABELS: Record<string, string> = {
  BNC:        "British National Curriculum",
  MONTESSORI: "Montessori",
  UNSCHOOLING: "Unschooling / Child-led",
};

function safeParseJson(str: string, fallback: unknown) {
  try { return JSON.parse(str); }
  catch { return fallback; }
}

// ─── Route handler ────────────────────────────────────────────────────────────

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { childId } = await req.json();
  if (!childId) {
    return NextResponse.json({ error: "childId required" }, { status: 400 });
  }

  const child = await db.child.findFirst({
    where: { id: childId, userId: session.user.id },
  });
  if (!child) {
    return NextResponse.json({ error: "Child not found" }, { status: 404 });
  }

  // ── Tier paywall ──────────────────────────────────────────────────────────
  const userTier = await getUserTier(session.user.id);
  if (userTier === "FREE") {
    const limitReached = await freeWeekLimitReached(session.user.id);
    if (limitReached) {
      return NextResponse.json(PAYWALL_RESPONSES.weekLimit(), { status: 403 });
    }
  }

  // ── Rate limit ────────────────────────────────────────────────────────────
  const { limit, windowMs } = WEEK_GEN_LIMITS[userTier];
  const rl = rateLimit(`gen-week:${session.user.id}`, limit, windowMs);
  if (!rl.ok) {
    return NextResponse.json(
      { error: `Too many generations. Try again in ${rl.retryAfterSeconds}s.` },
      { status: 429, headers: { "Retry-After": String(rl.retryAfterSeconds) } },
    );
  }

  const familyProfile = await db.familyProfile.findUnique({
    where: { userId: session.user.id },
  });

  const interests =
    safeParseJson(child.interests, []).join(", ") || "a variety of topics";
  const curriculum   = familyProfile?.curriculum ?? "BNC";
  const faith        = familyProfile?.faith ?? "SECULAR";
  const faithIntegration = familyProfile?.faithIntegration ?? false;
  const curriculumLabel  = CURRICULUM_LABELS[curriculum] ?? curriculum;

  // ── Invariant static system instruction for prompt caching ────────────────
  const systemInstruction = getWeekGenSystemInstruction(
    curriculum,
    faith,
    faithIntegration
  );

  // ── Dynamic user prompt suffix ────────────────────────────────────────────
  const prompt = `Generate a personalised 5-day week timetable of lessons (Monday to Friday, dayOffset 0 to 4) for this child:

CHILD PROFILE:
- Name: ${child.name}
- Age: ${child.age ?? "primary school age"}
- Year Group: ${child.yearGroup ?? "primary"}
- Learning style: ${child.learningStyle ?? "balanced"}
- Curriculum: ${curriculumLabel}
- Interests: ${interests}

CONTENT RIGHT-SIZING CONSTRAINTS:
- For each lesson, generate:
  * dayOffset: 0 (Mon), 1 (Tue), 2 (Wed), 3 (Thu), 4 (Fri)
  * subject: Subject name matched to the curriculum timetable structure
  * topic: Engaging, specific topic title
  * durationMins: Appropriate lesson duration (typically 30-45 mins)
  * title: Clear, encouraging lesson title
  * description: Exactly 1 concise sentence (maximum 20 words) explaining what ${child.name} will learn or explore
  * objectives: Exactly 2 concise bullet points representing core learning milestones
- Connect to ${child.name}'s interests (${interests}) wherever natural.
- Ensure all content is age-appropriate for ${child.yearGroup ?? "primary age"}.`;

  // ── Stream structured response via Multi-Model Router ────────────────────
  const { result } = await streamWithFallback({
    feature: "week-generation",
    system: systemInstruction,
    prompt,
    schema: weekGenerationSchema,
    onEnd: async () => {
      try {
        const object = await result.output;
        if (object?.lessons && Array.isArray(object.lessons) && object.lessons.length > 0) {
          const monday     = getMondayOfWeek(new Date());
          const weekNumber = getISOWeek(monday);
          const weekEnd    = new Date(monday);
          weekEnd.setDate(monday.getDate() + 7);

          // Remove any existing lessons for this week to avoid duplicates
          await db.lesson.deleteMany({
            where: { childId, dayDate: { gte: monday, lt: weekEnd } },
          });

          await db.$transaction(
            object.lessons.map((lesson: WeekLessonData) => {
              const lessonDate = new Date(monday);
              lessonDate.setDate(monday.getDate() + Math.min(Math.max(lesson.dayOffset ?? 0, 0), 4));
              lessonDate.setHours(9, 0, 0, 0);

              return db.lesson.create({
                data: {
                  childId,
                  subject:    lesson.subject,
                  topic:      lesson.topic,
                  dayDate:    lessonDate,
                  weekNumber,
                  termNumber: 1,
                  durationMins: lesson.durationMins ?? 45,
                  status: "PENDING",
                  generatedContent: JSON.stringify({
                    title:       lesson.title,
                    description: lesson.description,
                    objectives:  lesson.objectives ?? [],
                  }),
                },
              });
            }),
          );
        }
      } catch (e) {
        console.error("[generate-week] Error saving generated lessons:", e);
      }
    },
  });

  return createTextStreamResponse({
    stream: toTextStream({ stream: result.stream }),
  });
}
