/**
 * AI provider — currently Google Gemini.
 *
 * Set GEMINI_API_KEY in .env.local. Override the model via GEMINI_MODEL.
 *
 * Why a thin compatibility shim? The route handlers were originally written
 * against Anthropic's SDK shape (`ai.messages.create({ model, max_tokens,
 * messages: [{ role, content }] })` returning `{ content: [{ type, text }] }`).
 * We mirror that shape here so callers don't all have to change when we swap
 * providers. If we ever move off Gemini, only this file needs updating.
 */

import { GoogleGenerativeAI } from "@google/generative-ai";

let _client: GoogleGenerativeAI | null = null;
function getClient(): GoogleGenerativeAI {
  if (!_client) {
    if (!process.env.GEMINI_API_KEY) {
      throw new Error(
        "GEMINI_API_KEY is not set. Add it to .env.local — get one at https://aistudio.google.com/app/apikey"
      );
    }
    _client = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  }
  return _client;
}

// Defaults to flash-lite — smallest/cheapest Gemini 2.5 model, reliably
// available on the free tier. The larger `gemini-2.5-flash` and Pro variants
// are frequently overloaded (503 "high demand") for free-tier projects, and
// Pro requires billing to be enabled at all. Override via GEMINI_MODEL once
// billing is on.
export const MODEL = process.env.GEMINI_MODEL ?? "gemini-3.1-flash-lite";

interface CreateParams {
  model: string;
  max_tokens: number;
  messages: { role: string; content: string }[];
}

interface CreateResponse {
  content: { type: "text"; text: string }[];
}

export const ai = {
  messages: {
    async create(params: CreateParams): Promise<CreateResponse> {
      const model = getClient().getGenerativeModel({
        model: params.model,
        generationConfig: { maxOutputTokens: params.max_tokens },
      });
      const prompt = params.messages.map((m) => m.content).join("\n\n");
      const result = await model.generateContent(prompt);
      const text = result.response.text();
      return { content: [{ type: "text", text }] };
    },
  },
};

// ─── One-shot lesson helper used by /api/ai/generate-lesson ──────────────────

export interface LessonGenerationParams {
  subject: string;
  topic: string;
  yearGroup: string;
  childName: string;
  duration?: number;
  learningStyle?: string;
  previousKnowledge?: string;
}

export async function generateLesson(params: LessonGenerationParams) {
  const {
    subject,
    topic,
    yearGroup,
    childName,
    duration = 60,
    learningStyle,
    previousKnowledge,
  } = params;

  const prompt = `You are an expert UK homeschool curriculum planner. Create a detailed, engaging lesson plan for a UK homeschool family.

Child: ${childName}
Year Group: ${yearGroup} (UK curriculum)
Subject: ${subject}
Topic: ${topic}
Duration: ${duration} minutes
${learningStyle ? `Learning Style: ${learningStyle}` : ""}
${previousKnowledge ? `Previous Knowledge: ${previousKnowledge}` : ""}

Please generate a structured lesson plan in JSON format with these fields:
{
  "title": "Lesson title",
  "description": "Brief overview (2-3 sentences)",
  "objectives": ["Learning objective 1", "Learning objective 2", "Learning objective 3"],
  "activities": [
    {
      "title": "Activity name",
      "description": "What to do",
      "duration": 15,
      "order": 1
    }
  ],
  "resources": ["Resource or material needed"],
  "ukCurriculumLinks": ["National Curriculum link"],
  "extensionIdeas": ["Ideas for further exploration"],
  "assessmentSuggestions": "How to assess understanding"
}

Keep the language warm, encouraging, and appropriate for home education. Activities should be hands-on where possible.`;

  const message = await ai.messages.create({
    model: MODEL,
    max_tokens: 2048,
    messages: [{ role: "user", content: prompt }],
  });

  const content = message.content[0];
  if (content.type !== "text") throw new Error("Unexpected response type");

  const jsonMatch = content.text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("No JSON found in response");

  return JSON.parse(jsonMatch[0]);
}

// ─── Journal AI Auto-Analysis Helper ──────────────────────────────────────────

export interface JournalAnalysisParams {
  notes: string;
  childName?: string;
  yearGroup?: string;
  currentSubject?: string;
}

export interface JournalAnalysisResult {
  suggestedTitle: string;
  suggestedSubject: string;
  suggestedMoment: "REGULAR" | "BREAKTHROUGH" | "DAY_OUT" | "CREATIVE" | "SPECIAL";
  suggestedTags: string[];
  keySkills: string[];
  estimatedDurationMins?: number;
  learningSummary: string;
}

export async function analyzeJournalEntry(
  params: JournalAnalysisParams
): Promise<JournalAnalysisResult> {
  const { notes, childName, yearGroup, currentSubject } = params;

  const prompt = `You are an expert UK homeschool learning analyst.
Analyze the following parent's journal notes/reflections about a child's learning activity (including real-world activities like nature walks, museum field trips, baking/cooking, gardening, DIY experiments, sports, and life skills):

Child: ${childName || "Student"}
${yearGroup ? `Year Group: ${yearGroup} (UK curriculum)` : ""}
${currentSubject ? `Current Subject context: ${currentSubject}` : ""}
Notes / Learning description:
"""
${notes}
"""

Available subjects to match against (pick the single most relevant):
- Maths
- English
- Science
- Art
- Geography
- History
- Music
- Computing
- Islamic Studies
- PE
- Day out
- Other

Available moments (pick the most fitting):
- REGULAR (regular hands-on, practical skill, or textbook learning)
- BREAKTHROUGH (eureka moment, mastered a tricky concept)
- DAY_OUT (field trip, museum, nature walk, excursion, zoo, library)
- CREATIVE (art, building, drama, crafting, storytelling, baking)
- SPECIAL (celebration, memorable milestone, community, volunteering)

Guidance:
1. For real-world activities (e.g. baking, shopping, gardening, nature study), connect them intelligently to academic and developmental skills (e.g. measuring & fractions for cooking -> Maths, plant biology/habitats for nature walk -> Science).
2. Suggest realistic learning durations (e.g. 45-60m for nature walks/cooking/sports, 90-120m for museum trips, 30m for focused table activities).
3. Extract 2-4 clean lowercase tags without '#' symbol (e.g. ["nature", "biology", "outdoors"]).
4. Formulate 1-3 formal yet encouraging curriculum skills / learning objectives observed.

Please respond in valid JSON format only with the following structure:
{
  "suggestedTitle": "A concise, engaging title for this activity (max 6 words)",
  "suggestedSubject": "One of the available subjects above",
  "suggestedMoment": "One of REGULAR | BREAKTHROUGH | DAY_OUT | CREATIVE | SPECIAL",
  "suggestedTags": ["tag1", "tag2", "tag3"],
  "keySkills": ["Specific skill or curriculum objective observed (1-3 items)"],
  "estimatedDurationMins": 45,
  "learningSummary": "A concise 1-2 sentence affirming summary of what the child achieved."
}`;

  const message = await ai.messages.create({
    model: MODEL,
    max_tokens: 1024,
    messages: [{ role: "user", content: prompt }],
  });

  const content = message.content[0];
  if (content.type !== "text") throw new Error("Unexpected response type");

  const jsonMatch = content.text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("No JSON found in response");

  return JSON.parse(jsonMatch[0]);
}
