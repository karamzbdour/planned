import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { streamText, Output, toTextStream, createTextStreamResponse } from "ai";
import { geminiModel } from "@/lib/ai/model";
import { weekGenerationSchema } from "@/lib/ai/schemas";
import { getUserTier, freeWeekLimitReached, PAYWALL_RESPONSES } from "@/lib/subscription";
import { rateLimit } from "@/lib/rateLimit";

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

function buildCurriculumPrompt(
  curriculum: string,
  yearGroup: string | null,
  interests: string,
  faith: string,
  faithIntegration: boolean,
): string {
  const faithReferenceRule =
    faith === "ISLAM"
      ? `When a lesson references the Quran or Hadith, the topic/description MUST include the exact Surah name and ayah number (e.g. "Surah Al-Baqarah 2:286") or the Hadith collection and number. Never write a vague reference like "Quran" or "Quran 2".`
      : faith === "CHRISTIANITY"
      ? `When a lesson references the Bible, the topic/description MUST include book + chapter:verse (e.g. "Matthew 5:3", "Proverbs 3:5-6"). No vague "Bible" references.`
      : faith === "JUDAISM"
      ? `When a lesson references the Torah or Talmud, include book + chapter:verse (e.g. "Genesis 1:1", "Pirkei Avot 1:14"). No vague references.`
      : ``;

  const faithLine =
    faith !== "SECULAR" && faithIntegration
      ? `Faith context: ${faith} — weave in naturally through stories, references, and examples where appropriate. ${faithReferenceRule}`
      : `Faith context: secular approach — no religious content.`;

  if (curriculum === "MONTESSORI") {
    return `
Curriculum approach: Montessori

In Montessori homeschool the child works in long, uninterrupted "work periods" of 2–3 hours rather than short subject slots. Lessons are brief presentations (3-step lessons) that introduce a concept or material; the child then practises independently.

Structure the week as follows (dayOffset 0=Mon … 4=Fri):
- Each day has 3–4 "work period" entries, NOT traditional timed lessons.
- Subject names should reflect Montessori areas: "Practical Life", "Sensorial", "Mathematics", "Language", "Cultural Studies", "Arts & Crafts", "Outdoor / Nature".
- Topics should reference concrete Montessori materials where appropriate (e.g. "Golden Bead introduction", "Sandpaper Letters — b, d, p", "Binomial Cube exploration").
- durationMins should be 20–30 min for presentations; 45–60 min for independent work periods.
- Descriptions should describe what the parent presents and what the child does independently.
- Avoid bell-schedule thinking — no "Maths at 9, English at 10" style. Instead, describe the material and the 3-step lesson.
- Total: 15–18 work entries across the week.
${faithLine}
- Year group context (for material difficulty only): ${yearGroup ?? "primary"}
- Child's interests to incorporate into cultural/language work: ${interests}`;
  }

  if (curriculum === "UNSCHOOLING") {
    return `
Curriculum approach: Unschooling / Child-led learning

Unschooling follows the child's natural curiosity rather than a fixed timetable. There are no mandatory subjects. Learning emerges from the child's interests, real-life experiences, projects, and play.

Structure the week as follows:
- Organise the week around 2–3 **projects or themes** drawn from the child's interests: ${interests}.
- Each day has 2–4 entries that explore the theme through different lenses (reading, creating, experimenting, visiting, discussing, watching).
- Subject names should reflect the activity type: "Project Exploration", "Reading & Stories", "Creative Making", "Outdoor Learning", "Life Skills", "Field Trip Prep", "Reflection & Journaling".
- Topics should be specific and connected: e.g. if interested in dinosaurs — "Create a dinosaur timeline", "Write a story from a dinosaur's perspective", "Visit natural history museum prep".
- Descriptions should sound inviting and child-centred, written TO the parent as a facilitator, not instructor.
- durationMins: flexible, 20–60 min. Shorter for focused activities, longer for deep project work.
- Total: 12–15 entries across the week — fewer but richer than a structured curriculum.
${faithLine}
- Age/year group context (for language/complexity only): ${yearGroup ?? "primary"}`;
  }

  // Default: BNC
  const faithSubject =
    faith !== "SECULAR" && faithIntegration ? `Religious Studies / ${faith.charAt(0) + faith.slice(1).toLowerCase()}, ` : "";

  return `
Curriculum approach: British National Curriculum (BNC)

Follow a structured Mon–Fri timetable with dedicated subject slots.

Subject schedule per day:
- Monday (0):    Maths, English, History or Geography, ${faithSubject}Art
- Tuesday (1):   Maths, English, Science
- Wednesday (2): Maths, English, Music or Computing
- Thursday (3):  Maths, English, Science, Geography or History
- Friday (4):    Maths, English, PE or Outdoor Learning

That gives 4–5 lessons per day (20–25 total).
- durationMins: 30–45 min per lesson (Maths/English 45 min, others 30 min).
- All content age-appropriate for ${yearGroup ?? "primary"}.
- Connect to the child's interests where natural: ${interests}.
${faithLine}`;
}

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

  const curriculumSection = buildCurriculumPrompt(
    curriculum,
    child.yearGroup,
    interests,
    faith,
    faithIntegration,
  );

  // ── Build the prompt ──────────────────────────────────────────────────────
  const prompt = `You are an expert UK homeschool curriculum planner. Generate a personalised week of lessons (Monday to Friday, dayOffset 0 to 4) for this child:

Name: ${child.name}
Age: ${child.age ?? "unknown"}
Year Group: ${child.yearGroup ?? "unknown"}
Learning style: ${child.learningStyle ?? "balanced"}
Curriculum: ${curriculumLabel}
${curriculumSection}

Important guidelines:
- Follow the curriculum approach described above — do NOT use a BNC timetable for Montessori or Unschooling.
- Make objectives measurable and age-appropriate for ${child.yearGroup ?? "primary age"}.
- Descriptions should be warm, specific, and refer to ${child.name} by name.
- Connect to interests (${interests}) wherever natural.`;

  // ── Stream structured response via Vercel AI SDK ──────────────────────────
  const result = streamText({
    model: geminiModel,
    output: Output.object({
      schema: weekGenerationSchema,
    }),
    prompt,
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
            object.lessons.map((lesson) => {
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
