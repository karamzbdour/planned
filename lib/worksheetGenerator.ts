/**
 * Worksheet generation — produces a printable / interactive worksheet
 * specifically tailored to a lesson. Distinct from the lesson "quiz" in
 * that worksheet questions are designed to be filled in (short answers,
 * fill-in-the-blank, drawings) rather than recall MCQs.
 *
 * Premium users can answer in-app; Basic users can print. FREE users
 * never reach this code path — gating happens in the API route.
 */

import { generateWithFallback } from "@/lib/ai/fallback";

export type WorksheetQuestionType =
  | "short-answer"
  | "fill-blank"
  | "multiple-choice"
  | "drawing";

export interface WorksheetQuestion {
  type: WorksheetQuestionType;
  /** The question shown to the child. */
  prompt: string;
  /** For multiple-choice only. */
  options?: string[];
  /** For multiple-choice only — 0-based. */
  correctIndex?: number;
  /** Expected answer for short-answer / fill-blank (used for self-check). */
  expectedAnswer?: string;
  /** Whether the AI considered this question "hands-on" — used to
   *  recommend extra paper / craft supplies. */
  needsPaper?: boolean;
}

export interface WorksheetContent {
  title: string;
  instructions: string;
  questions: WorksheetQuestion[];
}

interface LessonContextForWorksheet {
  childName: string;
  yearGroup: string | null;
  subject: string;
  topic: string;
  lessonTitle: string;
  lessonDescription: string;
  objectives: string[];
}

/**
 * Generate a worksheet from an existing lesson's structured content.
 * Throws on hard errors; caller is responsible for retry / fallback.
 */
export async function generateWorksheet(
  ctx: LessonContextForWorksheet,
  tier: "BASIC" | "PREMIUM",
): Promise<WorksheetContent> {
  // Premium worksheets are longer + include drawing prompts because the
  // child can pair them with printed paper or the in-app reflective UI.
  const questionCount = tier === "PREMIUM" ? 8 : 5;

  const prompt = `You are an expert UK homeschool teacher. Create a worksheet a parent can give to their child to reinforce the lesson below.

CHILD: ${ctx.childName} (${ctx.yearGroup ?? "primary"})
SUBJECT: ${ctx.subject}
TOPIC: ${ctx.topic}
LESSON TITLE: ${ctx.lessonTitle}
LESSON DESCRIPTION: ${ctx.lessonDescription}
LESSON OBJECTIVES:
${ctx.objectives.map((o, i) => `${i + 1}. ${o}`).join("\n")}

Return ONLY valid JSON — no markdown, no code fences:
{
  "title": "Worksheet title that's friendly and specific (refers to ${ctx.childName} if natural)",
  "instructions": "1-2 sentences to the child explaining what to do. Warm tone. Mention they can ask their parent for help.",
  "questions": [
    {
      "type": "short-answer",
      "prompt": "An open question the child should answer in 1-2 sentences. Age-appropriate.",
      "expectedAnswer": "What a good answer looks like (1 sentence)."
    },
    {
      "type": "fill-blank",
      "prompt": "A sentence with one or more ___ blanks for the child to fill in.",
      "expectedAnswer": "The word or phrase that fills the blank."
    },
    {
      "type": "multiple-choice",
      "prompt": "A clear question testing understanding of the lesson.",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correctIndex": 0
    },
    {
      "type": "drawing",
      "prompt": "An instruction like 'Draw a picture of …' connecting visually to the topic.",
      "needsPaper": true
    }
    // …continue until ${questionCount} total
  ]
}

Rules:
- The "questions" array MUST contain exactly ${questionCount} questions, using a mix of types — at least one short-answer, one fill-blank, one multiple-choice, and one drawing.
- correctIndex is 0-based.
- Drawing prompts MUST always include "needsPaper": true.
- Questions should map back to at least one of the lesson objectives — do not test concepts the lesson never introduced.
- Difficulty must suit ${ctx.yearGroup ?? "primary school"}.
- expectedAnswer for short-answer / fill-blank should be concise (one short sentence or a single word/phrase). For multiple-choice and drawing, omit expectedAnswer.`;

  const message = await generateWithFallback({
    feature: "worksheet",
    prompt,
  });

  const text = message.text || "";
  const stripped = text
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
  const jsonMatch = stripped.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error("Worksheet generator returned no JSON");
  }
  return JSON.parse(jsonMatch[0]) as WorksheetContent;
}
