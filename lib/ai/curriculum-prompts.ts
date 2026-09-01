/**
 * Invariant curriculum framework instructions for LLM Prompt Caching.
 *
 * IMPORTANT FOR CACHING:
 * In order to achieve high prompt cache hit rates (e.g. Gemini Context Caching /
 * Prefix Caching), the system instructions in this file MUST remain 100% invariant
 * across requests. NEVER interpolate dynamic user data (e.g. child name, age,
 * date, specific topic) directly into these static system instruction strings.
 * Dynamic attributes must always be passed in the user prompt (suffix).
 */

export const BNC_CURRICULUM_FRAMEWORK = `
CURRICULUM APPROACH — BRITISH NATIONAL CURRICULUM (BNC):
- Follow a structured instructional sequence: hook → direct instruction → guided practice → independent practice → plenary.
- Reference National Curriculum attainment targets and Key Stage age expectations where relevant.
- Activities should balance hands-on exploration with structured written work and worksheets.
- Objectives must be specific, measurable, and age-appropriate.
- Assessment evaluates recall, application, and reasoning against statutory expectations.
`.trim();

export const MONTESSORI_CURRICULUM_FRAMEWORK = `
CURRICULUM APPROACH — MONTESSORI:
- Structure lessons around the 3-Period Lesson methodology:
    Step 1 "Naming" — introduce the material/concept with a concrete object or manipulative ("This is…")
    Step 2 "Recognition" — guide identification and exploration ("Can you show me…?")
    Step 3 "Recall" — encourage independent recall and explanation ("What is this?")
- Prioritise concrete, tactile manipulatives before introducing abstract representations.
- Suggest specific Montessori materials where applicable (e.g. number rods, sandpaper letters, bead chains, practical life materials).
- The parent acts as a calm observer and guide, not a traditional lecturer.
- Include an independent work period where the learner can explore and practise independently.
- No worksheets as the primary activity — worksheets are strictly supplementary after concrete exploration.
- Assessment is purely observational: note what the parent should watch for, without written tests.
`.trim();

export const UNSCHOOLING_CURRICULUM_FRAMEWORK = `
CURRICULUM APPROACH — UNSCHOOLING / CHILD-LED:
- Structure sessions around child-led exploration rather than a rigid lecture sequence:
    Step 1 "Spark curiosity" — a provocative question, story, or real-world trigger
    Step 2 "Follow the thread" — open-ended inquiry following natural curiosity
    Step 3 "Create or do" — a self-chosen project, experiment, craft, or creative output
    Step 4 "Reflect together" — informal dialogue and conversation starters
- Activities should be project-based, interest-led, and feel like real-life discovery or play.
- Avoid school-like jargon: use "exploration", "project", "investigation", "discovery" instead of "lesson".
- Frame objectives as exploratory possibilities ("may discover...", "might explore...").
- Assessment consists of open conversation starters, NOT quizzes or formal grading.
- Prefer everyday household objects, nature, library books, or free online tools over formal worksheets.
`.trim();

export const FAITH_RULES: Record<string, string> = {
  ISLAM: `When referencing Islamic sources, format MUST be exact: Surah name + chapter:ayah (e.g. "Surah Al-Baqarah 2:286") or Hadith collection and number (e.g. "Hadith — Sahih al-Bukhari 1:2"). Never write a vague reference like "Quran" or "Quran 2" — always include the full Surah name and ayah number.`,
  CHRISTIANITY: `When referencing Christian scripture, format MUST be exact: Book chapter:verse (e.g. "Matthew 5:3" or "Proverbs 3:5-6"). Never write a vague reference like "Bible" — always include the book, chapter, and verse number(s).`,
  JUDAISM: `When referencing Jewish scripture, format MUST be exact: Book chapter:verse (e.g. "Genesis 1:1" or "Pirkei Avot 1:14"). Never write a vague reference like "Torah" — always include the book, chapter, and verse number(s).`,
  SECULAR: `Approach is secular — no religious doctrine or faith content.`,
};

/**
 * Returns the invariant system instruction for single-lesson and detail generation.
 */
export function getCurriculumSystemInstruction(
  curriculum: string,
  faith: string = "SECULAR",
  faithIntegration: boolean = false
): string {
  let approachText = BNC_CURRICULUM_FRAMEWORK;
  if (curriculum === "MONTESSORI") {
    approachText = MONTESSORI_CURRICULUM_FRAMEWORK;
  } else if (curriculum === "UNSCHOOLING") {
    approachText = UNSCHOOLING_CURRICULUM_FRAMEWORK;
  }

  const faithRule =
    faith !== "SECULAR" && faithIntegration
      ? FAITH_RULES[faith] || `Include exact scripture and citation details.`
      : FAITH_RULES.SECULAR;

  return `You are an expert UK homeschool curriculum planner and lesson designer.
Create detailed, engaging home education lessons designed for parents to teach at home.

${approachText}

FAITH & CITATION STANDARDS:
${faithRule}

PEDAGOGICAL PRINCIPLES:
- Teaching instructions in teachingGuide should feel warm, practical, and supportive for a home environment.
- Activities should be creative, engaging, and directly matched to the chosen curriculum philosophy.
- Frame content at an age-appropriate level using the child's profile provided in the prompt.`.trim();
}

/**
 * Returns the invariant system instruction for 5-day week timetable generation.
 */
export function getWeekGenSystemInstruction(
  curriculum: string,
  faith: string = "SECULAR",
  faithIntegration: boolean = false
): string {
  let scheduleGuidelines = `
TIMETABLE STRUCTURE — BRITISH NATIONAL CURRICULUM (BNC):
- Follow a structured Mon–Fri timetable (dayOffset 0 to 4).
- Subject distribution per day:
    Monday (0): Maths, English, History or Geography, Art
    Tuesday (1): Maths, English, Science
    Wednesday (2): Maths, English, Music or Computing
    Thursday (3): Maths, English, Science, Geography or History
    Friday (4): Maths, English, PE or Outdoor Learning
- 4–5 lessons per day (20–25 total across the week).
- Duration: 30–45 mins per lesson.
`.trim();

  if (curriculum === "MONTESSORI") {
    scheduleGuidelines = `
TIMETABLE STRUCTURE — MONTESSORI:
- Structure the week around 3–4 deep work periods per day (dayOffset 0 to 4), NOT rigid school periods.
- Subject areas: "Practical Life", "Sensorial", "Mathematics", "Language", "Cultural Studies", "Arts & Crafts", "Outdoor / Nature".
- Topics should reference concrete Montessori materials and 3-step presentations where applicable.
- Duration: 20–30 mins for presentations, 45–60 mins for independent work periods.
- Total: 15–18 work period entries across the week.
`.trim();
  } else if (curriculum === "UNSCHOOLING") {
    scheduleGuidelines = `
TIMETABLE STRUCTURE — UNSCHOOLING / CHILD-LED:
- Organise the week around 2–3 core exploration themes or projects drawn from the child's interests.
- Each day (dayOffset 0 to 4) has 2–4 entries exploring the theme through reading, making, discovering, or discussing.
- Subject names reflect exploratory activity types: "Project Exploration", "Reading & Stories", "Creative Making", "Outdoor Learning", "Life Skills", "Reflection & Journaling".
- Duration: 20–60 mins flexible.
- Total: 12–15 entries across the week.
`.trim();
  }

  const faithRule =
    faith !== "SECULAR" && faithIntegration
      ? FAITH_RULES[faith] || `Include exact scripture citations where relevant.`
      : FAITH_RULES.SECULAR;

  return `You are an expert UK homeschool curriculum planner.
Generate a structured 5-day week of lessons (Monday to Friday, dayOffset 0 to 4).

${scheduleGuidelines}

FAITH CONTEXT:
${faithRule}

OUTPUT CONSTRAINTS (CONTENT RIGHT-SIZING):
- title: Engaging, clear lesson title.
- description: Exactly 1 concise sentence (maximum 20 words) explaining the primary focus of the lesson.
- objectives: Exactly 2 concise bullet points representing core learning milestones.
- Do NOT generate full 4-step teaching guides or quizzes during week generation; these are loaded on demand.`.trim();
}
