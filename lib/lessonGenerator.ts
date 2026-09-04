import { db } from "@/lib/db";
import { fullLessonSchema, type FullLessonData } from "@/lib/ai/schemas";
import { generateWithFallback } from "@/lib/ai/fallback";
import { fetchQuranVerse } from "@/lib/quranApi";
import { enrichVideoResources } from "@/lib/youtube";
import { getCurriculumSystemInstruction } from "@/lib/ai/curriculum-prompts";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface TeachingStep {
  step: number;
  title: string;
  instructions: string;
}

export type ActivityType = "Drawing" | "Worksheet" | "Hands-on" | "Discussion";

export interface Activity {
  title: string;
  type: ActivityType;
  description: string;
  durationMins?: number;
}

export interface VideoResource {
  title: string;
  searchQuery: string;
  youtubeId?: string;
  url?: string;
}

export interface FaithConnection {
  reference: string;
  arabicText?: string;
  translation?: string;
  explanation: string;
}

export interface DayOut {
  venueName: string;
  description: string;
  address: string;
}

export interface QuizQuestion {
  question: string;
  options: string[];
  correctIndex: number;
}

export interface FullLessonContent {
  title: string;
  description: string;
  objectives: string[];
  teachingGuide: TeachingStep[];
  activities: Activity[];
  videoResources: VideoResource[];
  faithConnection?: FaithConnection;
  dayOut?: DayOut;
  quiz: QuizQuestion[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function safeParseJson<T>(str: string, fallback: T): T {
  try {
    return JSON.parse(str) as T;
  } catch {
    return fallback;
  }
}

const CURRICULUM_LABELS: Record<string, string> = {
  BNC:         "British National Curriculum",
  MONTESSORI:  "Montessori",
  UNSCHOOLING: "Unschooling / Child-led",
};

const FAITH_LABELS: Record<string, string> = {
  ISLAM:        "Islam",
  CHRISTIANITY: "Christianity",
  JUDAISM:      "Judaism",
};

export function curriculumApproachSection(curriculum: string, childName: string): string {
  if (curriculum === "MONTESSORI") {
    return `
CURRICULUM APPROACH — MONTESSORI:
- The teachingGuide should follow the 3-Period Lesson structure:
    Step 1 "Naming" — introduce the material/concept with a concrete object or manipulative ("This is…")
    Step 2 "Recognition" — ask ${childName} to identify/point/show ("Can you show me…?")
    Step 3 "Recall" — ${childName} names it independently ("What is this?")
- Activities must be hands-on and use concrete materials before abstract representation.
  Suggest specific Montessori materials where applicable (e.g. number rods, sandpaper letters, bead chains).
- The parent's role is as a calm observer/guide, NOT a lecturer. Instructions should reflect this.
- Include an "independent work period" activity where ${childName} can practise alone.
- No worksheets as the primary activity — if a worksheet is used, it comes AFTER concrete work.
- Assessment is observational: describe what the parent should watch for, not a written test.`;
  }

  if (curriculum === "UNSCHOOLING") {
    return `
CURRICULUM APPROACH — UNSCHOOLING / CHILD-LED:
- The teachingGuide should NOT be a formal lesson sequence. Instead it should be a facilitation guide:
    Step 1 "Spark curiosity" — a question, story, or real-world trigger that invites exploration
    Step 2 "Follow the thread" — how to follow ${childName}'s questions and expand them
    Step 3 "Create or do" — a self-chosen project, experiment, or creative output
    Step 4 "Reflect together" — informal conversation questions, NOT a quiz
- Activities should be project-based, interest-led, and feel like play or real life — not school.
- Avoid the word "lesson". Use "exploration", "project", "discovery", "investigation".
- Objectives should be framed as possibilities, not requirements: "may discover…", "might explore…"
- The quiz section should still be generated but frame questions as "conversation starters" rather than a test.
- Materials should be everyday objects, library books, or free online resources — not worksheets.`;
  }

  // BNC (default)
  return `
CURRICULUM APPROACH — BRITISH NATIONAL CURRICULUM:
- The teachingGuide should follow a clear instructional sequence: hook → direct instruction → guided practice → independent practice → plenary.
- Reference National Curriculum attainment targets where relevant (e.g. "KS2 Maths — number and place value").
- Activities may include worksheets, written work, and structured exercises alongside hands-on tasks.
- Objectives must be specific and measurable against NC year-group expectations.
- The quiz tests recall and application at the appropriate year-group level.`;
}

export type RefineIntent = "easier" | "harder" | "alternative";

export function refineSection(intent: RefineIntent | undefined, childName: string): string {
  if (!intent) return "";
  if (intent === "easier") {
    return `
REFINEMENT — MAKE IT EASIER:
- ${childName} found the previous version of this lesson too challenging.
- Simplify the language, break each teaching step into smaller chunks, and add more scaffolding (visuals, concrete examples before abstract ideas).
- Reduce the number of new concepts introduced — go deep on one core idea rather than covering several.
- Activities should require less independent reasoning. Use familiar everyday materials and templates with clear, guided steps.
- Quiz questions should focus on recall and recognition rather than application or analysis.`;
  }
  if (intent === "harder") {
    return `
REFINEMENT — MAKE IT HARDER:
- ${childName} found the previous version of this lesson too easy.
- Stretch them with more advanced vocabulary, fewer scaffolds, and questions that require multi-step reasoning or applying the concept in a new context.
- Add one extension idea or open-ended challenge.
- Quiz questions should lean toward application, analysis, and "why / how" reasoning rather than simple recall.`;
  }
  // alternative
  return `
REFINEMENT — A DIFFERENT TAKE:
- The previous version of this lesson didn't land with ${childName} (e.g. the activity needed materials they don't have, or the angle didn't grab them).
- Keep the same subject, topic, and difficulty level, but approach it from a completely different angle — different real-world hook, different activity type, different materials.
- Prefer common household items over specialist resources (no binoculars / microscopes / specific books). Assume only paper, pens, basic craft supplies, and what's in a typical kitchen / garden.
- The teachingGuide steps and activities should look noticeably different from a typical lesson on this topic.`;
}

export interface BuildLessonPromptArgs {
  childName: string;
  childAge: number | null;
  childYearGroup: string | null;
  learningStyle: string | null;
  interests: string;
  literacyLevel?: string;
  numeracyLevel?: string;
  reasoningLevel?: string;
  curriculum: string;
  faith: string;
  faithIntegration: boolean;
  location: string;
  subject: string;
  topic: string;
  tier: "FREE" | "BASIC" | "PREMIUM";
  refineIntent?: RefineIntent;
}

export interface BuildLessonPromptResult {
  systemPrompt: string;
  userPrompt: string;
  prompt: string;
  includeFaith: boolean;
  faith: string;
}

export function buildLessonPrompt(args: BuildLessonPromptArgs): BuildLessonPromptResult {
  const {
    childName,
    childAge,
    childYearGroup,
    learningStyle,
    interests,
    literacyLevel = "age-appropriate",
    numeracyLevel = "age-appropriate",
    reasoningLevel = "age-appropriate",
    curriculum,
    faith,
    faithIntegration,
    location,
    subject,
    topic,
    tier,
    refineIntent,
  } = args;

  const includeFaith = faith !== "SECULAR" && faithIntegration;
  const faithLabel = FAITH_LABELS[faith] ?? faith;
  const curriculumLabel = CURRICULUM_LABELS[curriculum] ?? curriculum;
  const quizCount = tier === "PREMIUM" ? 10 : 5;

  // Invariant static system instruction for prompt caching
  const systemPrompt = getCurriculumSystemInstruction(
    curriculum,
    faith,
    faithIntegration
  );

  // Dynamic user prompt suffix
  const userPrompt = `Create a detailed, engaging lesson for this child:

CHILD PROFILE:
- Name: ${childName}
- Age: ${childAge ?? "primary school age"}
- Year Group: ${childYearGroup ?? "primary"}
- Curriculum: ${curriculumLabel}
- Learning Style: ${learningStyle ?? "balanced"}
- Interests: ${interests}
- Literacy level: ${literacyLevel}
- Numeracy level: ${numeracyLevel}
- Reasoning level: ${reasoningLevel}

LESSON FOCUS:
- Subject: ${subject}
- Topic: ${topic}

FAMILY & LOCATION:
- Faith context: ${includeFaith ? `${faithLabel} (weave in naturally)` : "secular — no religious content"}
- Location: ${location}
${refineSection(refineIntent, childName)}

SPECIFIC OUTPUT REQUIREMENTS:
- Generate ${quizCount} quiz questions progressing from recall to application.
- Teaching instructions in teachingGuide should feel warm, encouraging, and practical for a parent in a home setting.
- Connect to ${childName}'s interests (${interests}) where natural.
- Include hands-on and creative activities tailored to the curriculum approach.
${tier === "PREMIUM" ? `- Suggest a specific day-out venue near ${location}.` : ""}`.trim();

  return {
    systemPrompt,
    userPrompt,
    prompt: `${systemPrompt}\n\n${userPrompt}`,
    includeFaith,
    faith,
  };
}

export async function postProcessLessonContent(
  content: FullLessonData,
  includeFaith: boolean,
  faith: string
): Promise<FullLessonContent> {
  const result: FullLessonContent = {
    title: content.title,
    description: content.description,
    objectives: content.objectives,
    teachingGuide: content.teachingGuide,
    activities: content.activities,
    videoResources: content.videoResources,
    faithConnection: content.faithConnection,
    dayOut: content.dayOut,
    quiz: content.quiz,
  };

  // ── Replace AI-generated Quran text with verified content ─────────────────
  if (includeFaith && faith === "ISLAM" && result.faithConnection?.reference) {
    try {
      const real = await fetchQuranVerse(result.faithConnection.reference);
      if (real) {
        result.faithConnection = {
          ...result.faithConnection,
          arabicText: real.arabicText,
          translation: real.translation,
        };
      } else {
        console.warn(
          `[lessonGenerator] Dropping unverified faithConnection for "${result.faithConnection.reference}"`
        );
        delete result.faithConnection;
      }
    } catch (e) {
      console.warn("[lessonGenerator] Quran verification failed:", e);
      delete result.faithConnection;
    }
  }

  // ── Enrich YouTube video resources with verified video IDs ─────────────────
  if (result.videoResources?.length) {
    try {
      result.videoResources = await enrichVideoResources(result.videoResources);
    } catch (e) {
      console.warn("[lessonGenerator] Failed to enrich video resources:", e);
    }
  }

  return result;
}

export async function generateLesson(
  childId: string,
  subject: string,
  topic: string,
  tier: "FREE" | "BASIC" | "PREMIUM" = "FREE",
  refineIntent?: RefineIntent
): Promise<FullLessonContent> {
  const child = await db.child.findUnique({
    where: { id: childId },
    include: {
      user: {
        select: {
          location: true,
          familyProfile: true,
        },
      },
    },
  });

  if (!child) throw new Error("Child not found");

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
    subject,
    topic,
    tier,
    refineIntent,
  });

  const { output } = await generateWithFallback<FullLessonData>({
    feature: "lesson-generate",
    system: systemPrompt,
    prompt: userPrompt,
    schema: fullLessonSchema,
  });

  if (!output) {
    throw new Error("Lesson generation failed to produce valid structured content");
  }

  return postProcessLessonContent(output, includeFaith, faith);
}
