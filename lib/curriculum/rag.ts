import { db } from "@/lib/db";
import { getEmbedding } from "./embedding";
import {
  CurriculumQueryParams,
  RetrievedCurriculumContext,
  RetrievedCurriculumObjective,
} from "./types";

function safeJsonArray(val: unknown): string[] {
  if (Array.isArray(val)) return val as string[];
  if (typeof val === "string") {
    try {
      const parsed = JSON.parse(val);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
}

/**
 * Retrieves matching statutory curriculum nodes using hybrid filtering:
 * 1. Hard metadata filter on curriculum, year group, and subject.
 * 2. Dense vector cosine distance (<=>) on topic/query embedding.
 *
 * Includes graceful zero-downtime fallback if vector extension or tables are unindexed.
 */
export async function retrieveCurriculumContext(
  params: CurriculumQueryParams
): Promise<RetrievedCurriculumContext> {
  const { curriculum, yearGroup, subject, topic, limit = 3 } = params;

  try {
    // 1. Generate query embedding using Vercel AI SDK
    const searchQuery = `${subject} (${yearGroup}): ${topic}`;
    const queryVector = await getEmbedding(searchQuery);
    const vectorString = `[${queryVector.join(",")}]`;

    // 2. Query PostgreSQL with metadata filtering + vector cosine distance
    const rows: any[] = await db.$queryRaw`
      SELECT 
        id,
        "objectiveCode",
        title,
        description,
        strand,
        "unitTitle",
        "teachingNotes",
        prerequisites,
        keywords,
        1 - (embedding <=> ${vectorString}::vector) AS similarity
      FROM "CurriculumNode"
      WHERE curriculum = ${curriculum}
        AND "yearGroup" = ${yearGroup}
        AND LOWER(subject) = LOWER(${subject})
        AND embedding IS NOT NULL
      ORDER BY embedding <=> ${vectorString}::vector ASC
      LIMIT ${limit};
    `;

    if (!rows || rows.length === 0) {
      return {
        objectives: [],
        promptSnippet: "",
      };
    }

    const objectives: RetrievedCurriculumObjective[] = rows.map((r) => ({
      id: r.id,
      code: r.objectiveCode ?? null,
      title: r.title,
      description: r.description,
      strand: r.strand,
      unitTitle: r.unitTitle,
      teachingNotes: r.teachingNotes ?? null,
      prerequisites: safeJsonArray(r.prerequisites),
      keywords: safeJsonArray(r.keywords),
      similarity: typeof r.similarity === "number" ? r.similarity : undefined,
    }));

    // 3. Format into a structured context block for the prompt
    const formattedList = objectives
      .map((obj, i) => {
        const codeLabel = obj.code ? `[${obj.code}] ` : "";
        let block = `${i + 1}. ${codeLabel}${obj.title} — ${obj.description}`;
        if (obj.teachingNotes) {
          block += `\n   Teaching Guidance / Misconceptions: ${obj.teachingNotes}`;
        }
        if (obj.keywords.length > 0) {
          block += `\n   Key Vocabulary: ${obj.keywords.join(", ")}`;
        }
        return block;
      })
      .join("\n\n");

    const promptSnippet = `
STATUTORY CURRICULUM OBJECTIVES & TEACHING GUIDANCE (${curriculum} • ${yearGroup} • ${subject}):
You must ground this lesson in the following official learning outcomes:
${formattedList}

GROUNDING REQUIREMENT:
- Focus the lesson objectives and activities on these verified curriculum standards.
- Do NOT fabricate non-existent statutory codes or expectations.
`.trim();

    return {
      objectives,
      promptSnippet,
    };
  } catch (error) {
    // Graceful fallback for environments before migration/indexing
    console.warn(
      `[curriculum-rag] Retrieval fallback for "${subject} - ${topic}":`,
      error instanceof Error ? error.message : error
    );
    return {
      objectives: [],
      promptSnippet: "",
    };
  }
}

/**
 * Retrieves sequential upcoming curriculum units for weekly timetable generation.
 */
export async function retrieveUpcomingCurriculumUnits(params: {
  curriculum: string;
  yearGroup: string;
  subject?: string;
  limit?: number;
}): Promise<RetrievedCurriculumObjective[]> {
  const { curriculum, yearGroup, subject, limit = 10 } = params;

  try {
    const whereSubject = subject ? `AND LOWER(subject) = LOWER('${subject.replace(/'/g, "''")}')` : "";
    const rows: any[] = await db.$queryRawUnsafe(`
      SELECT 
        id,
        "objectiveCode",
        title,
        description,
        strand,
        "unitTitle",
        "teachingNotes",
        prerequisites,
        keywords
      FROM "CurriculumNode"
      WHERE curriculum = '${curriculum.replace(/'/g, "''")}'
        AND "yearGroup" = '${yearGroup.replace(/'/g, "''")}'
        ${whereSubject}
      ORDER BY subject ASC, "orderIndex" ASC
      LIMIT ${limit};
    `);

    return (rows || []).map((r) => ({
      id: r.id,
      code: r.objectiveCode ?? null,
      title: r.title,
      description: r.description,
      strand: r.strand,
      unitTitle: r.unitTitle,
      teachingNotes: r.teachingNotes ?? null,
      prerequisites: safeJsonArray(r.prerequisites),
      keywords: safeJsonArray(r.keywords),
    }));
  } catch (error) {
    console.warn("[curriculum-rag] Upcoming units fallback:", error);
    return [];
  }
}
