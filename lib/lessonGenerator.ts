import { ai, MODEL } from "@/lib/ai";
import { db } from "@/lib/db";
import { fetchQuranVerse } from "@/lib/quranApi";

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

/**
 * Returns curriculum-specific instructions that shape the tone, structure, and
 * content of the teaching guide and activities.
 */
function curriculumApproachSection(curriculum: string, childName: string): string {
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

// ─── Core generator ───────────────────────────────────────────────────────────

export type RefineIntent = "easier" | "harder" | "alternative";

function refineSection(intent: RefineIntent | undefined, childName: string): string {
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

export async function generateLesson(
  childId: string,
  subject: string,
  topic: string,
  tier: "FREE" | "BASIC" | "PREMIUM" = "FREE",
  refineIntent?: RefineIntent,
): Promise<FullLessonContent> {
  // Fetch child + user + family profile
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

  // Location-based "day out" suggestions are a Premium-only feature, so only
  // include them in the prompt if the caller told us this is a Premium user.
  // (Caller passes `tier`; default to FREE so we never accidentally leak the
  // section to a non-Premium user.)
  const includeDayOut = tier === "PREMIUM";

  // Quiz length scales with tier: 5 questions for FREE / BASIC, 10 for
  // PREMIUM. Client asked for the bump after early users found 2 questions
  // too shallow.
  const quizCount = tier === "PREMIUM" ? 10 : 5;

  const includeFaith = faith !== "SECULAR" && faithIntegration;
  const faithLabel = FAITH_LABELS[faith] ?? faith;
  const curriculumLabel = CURRICULUM_LABELS[curriculum] ?? curriculum;
  const approachSection = curriculumApproachSection(curriculum, child.name);

  const faithReferenceFormat =
    faith === "ISLAM"
      ? `Format MUST be exact: Surah name + chapter:ayah, e.g. "Surah Al-Baqarah 2:286" or "Hadith — Sahih al-Bukhari 1:2". Never write a vague reference like "Quran" or "Quran 2" — always include the full Surah name and ayah number. If citing a Hadith, name the collection and number.`
      : faith === "CHRISTIANITY"
      ? `Format MUST be exact: Book chapter:verse, e.g. "Matthew 5:3" or "Proverbs 3:5-6". Never write a vague reference like "Bible" — always include the book, chapter, and verse number(s).`
      : faith === "JUDAISM"
      ? `Format MUST be exact: Book chapter:verse, e.g. "Genesis 1:1" or "Pirkei Avot 1:14". Never write a vague reference like "Torah" — always include the book, chapter, and verse number(s).`
      : `Always include exact citation details (book, chapter, verse, or equivalent).`;

  const faithBlock = includeFaith
    ? `
  "faithConnection": {
    "reference": "A real, verifiable ${faithLabel} reference relevant to ${topic}. ${faithReferenceFormat}",
    "arabicText": "Original Arabic/Hebrew text of the verse, exactly as in the source — empty string if not applicable",
    "translation": "Faithful English translation of the verse",
    "explanation": "2-3 sentences connecting this ${faithLabel} teaching naturally and gently to the lesson topic of ${topic}"
  },`
    : "";

  const prompt = `You are an expert UK homeschool curriculum planner and lesson designer. Create a detailed, engaging lesson for a child to be taught at home by their parent.

CHILD PROFILE:
- Name: ${child.name}
- Age: ${child.age ?? "primary school age"}
- Year Group: ${child.yearGroup ?? "primary"}
- Curriculum: ${curriculumLabel}
- Learning Style: ${child.learningStyle ?? "balanced"}
- Interests: ${interests}
- Literacy level: ${child.literacyLevel ?? "age-appropriate"}
- Numeracy level: ${child.numeracyLevel ?? "age-appropriate"}
- Reasoning level: ${child.reasoningLevel ?? "age-appropriate"}

LESSON:
- Subject: ${subject}
- Topic: ${topic}

FAMILY:
- Faith: ${includeFaith ? `${faithLabel} (weave in naturally)` : "secular — no religious content"}
- Location: ${location}
${approachSection}${refineSection(refineIntent, child.name)}

Return ONLY valid JSON — no markdown, no code fences, just the raw JSON object:
{
  "title": "Engaging, specific lesson title for this topic",
  "description": "2-3 sentences that paint a vivid picture of what ${child.name} will do and discover today.",
  "objectives": [
    "By the end of this lesson, ${child.name} will be able to [measurable outcome 1]",
    "By the end of this lesson, ${child.name} will be able to [measurable outcome 2]",
    "By the end of this lesson, ${child.name} will be able to [measurable outcome 3]",
    "By the end of this lesson, ${child.name} will be able to [measurable outcome 4]"
  ],
  "teachingGuide": [
    {
      "step": 1,
      "title": "Warm Up (5 min)",
      "instructions": "Detailed instructions for the parent — exactly what to say, ask, and do. Include suggested questions and expected responses. 4-5 sentences."
    },
    {
      "step": 2,
      "title": "Introduce the Concept (10 min)",
      "instructions": "Explain the core idea step by step. What to show, demonstrate, or explain. Include a real-world analogy. 4-5 sentences."
    },
    {
      "step": 3,
      "title": "Guided Practice (15 min)",
      "instructions": "Walk through the main activity together. What to do, watch for, and how to support ${child.name}. 4-5 sentences."
    },
    {
      "step": 4,
      "title": "Wrap Up & Reflect (5 min)",
      "instructions": "How to consolidate learning. Suggested questions to check understanding. How to celebrate what ${child.name} achieved. 4-5 sentences."
    }
  ],
  "activities": [
    {
      "title": "Activity name",
      "type": "Hands-on",
      "description": "Clear, step-by-step instructions for the activity. What materials are needed. What ${child.name} should produce. 3-4 sentences.",
      "durationMins": 15
    },
    {
      "title": "Activity name",
      "type": "Drawing",
      "description": "Clear instructions. What to draw, label, or create. How it connects to the lesson. 3-4 sentences.",
      "durationMins": 10
    }
  ],
  "videoResources": [
    {
      "title": "Descriptive title so parent knows what the video covers",
      "searchQuery": "specific YouTube search query to find the best video"
    },
    {
      "title": "Second video title",
      "searchQuery": "second YouTube search query"
    }
  ],${faithBlock}${
    includeDayOut
      ? `
  "dayOut": {
    "venueName": "Specific named venue near ${location} — museum, science centre, nature reserve, historic site, etc.",
    "description": "2-3 sentences explaining why this venue brings the lesson topic to life and what ${child.name} will experience there.",
    "address": "Full UK address including postcode"
  },`
      : ""
  }
  "quiz": [
    {
      "question": "Specific question testing understanding of ${topic}",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correctIndex": 0
    },
    {
      "question": "Another question at an appropriate level for ${child.yearGroup ?? "this year group"}",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correctIndex": 2
    }
    // ...continue until ${quizCount} questions total
  ]
}

Rules:
- The "quiz" array MUST contain exactly ${quizCount} questions — do not produce fewer or more. The first two are example shapes; you must add ${quizCount - 2} more questions of the same shape.
- Questions should progress from easier recall ("what is…") to applied / multi-step understanding so the quiz feels graduated, not repetitive.
- Activity type MUST be exactly one of: Drawing, Worksheet, Hands-on, Discussion
- correctIndex is 0-based (0 = first option)
- All content must be age-appropriate for ${child.yearGroup ?? "primary school"}
- Teaching instructions should feel warm, encouraging, and practical for a home setting
- Connect to ${child.name}'s interests (${interests}) where natural
- Follow the CURRICULUM APPROACH section above — do not default to a BNC-style lesson if the curriculum is Montessori or Unschooling`;

  // ── Call AI Model ─────────────────────────────────────────────────────────
  let message;
  try {
    message = await ai.messages.create({
      model: MODEL,
      max_tokens: 4096,
      messages: [{ role: "user", content: prompt }],
    });
  } catch (err: unknown) {
    const detail = err instanceof Error ? err.message : String(err);
    throw new Error(`Anthropic API error: ${detail}`);
  }

  const text =
    message.content[0].type === "text" ? message.content[0].text : "";

  // Strip any markdown code fences if the AI model added them
  const stripped = text
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

  const jsonMatch = stripped.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    console.error("[lessonGenerator] No JSON in response:", text.slice(0, 300));
    throw new Error("AI returned an unexpected response — please try again");
  }

  let parsed: FullLessonContent;
  try {
    parsed = JSON.parse(jsonMatch[0]) as FullLessonContent;
  } catch {
    throw new Error("AI response could not be parsed — please try again");
  }

  // ── Replace AI-generated Quran text with verified content ─────────────────
  // Gemini/Claude sometimes hallucinate Arabic and translations that don't
  // match the cited verse. For Islamic faith integration, trust the AI for
  // *which* verse to cite but always replace the Arabic + English with the
  // real verse from Quran.com's public API. If the API call fails for any
  // reason we drop the faithConnection rather than ship fabricated text.
  if (includeFaith && faith === "ISLAM" && parsed.faithConnection?.reference) {
    const real = await fetchQuranVerse(parsed.faithConnection.reference);
    if (real) {
      parsed.faithConnection = {
        ...parsed.faithConnection,
        arabicText: real.arabicText,
        translation: real.translation,
      };
    } else {
      // Couldn't verify — better to omit than risk fabricated scripture.
      console.warn(
        `[lessonGenerator] Dropping unverified faithConnection for "${parsed.faithConnection.reference}"`,
      );
      delete parsed.faithConnection;
    }
  }

  return parsed;
}
