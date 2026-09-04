import { embed, embedMany } from "ai";
import { getEmbeddingModel } from "@/lib/ai/router";
import { CurriculumItemInput } from "./types";

/**
 * Normalises educational text into an optimal representation for embedding.
 * Prepends subject, year group, and strand taxonomy to maximize semantic retrieval relevance.
 */
export function formatCurriculumNodeForEmbedding(item: CurriculumItemInput): string {
  const parts = [
    `Curriculum: ${item.curriculum}`,
    `Subject: ${item.subject}`,
    `Key Stage: ${item.keyStage} (${item.yearGroup})`,
    `Strand: ${item.strand}`,
    `Unit: ${item.unitTitle}`,
    `Objective: ${item.title} — ${item.description}`,
  ];

  if (item.teachingNotes) {
    parts.push(`Teaching Guidance: ${item.teachingNotes}`);
  }

  if (item.keywords && item.keywords.length > 0) {
    parts.push(`Key Vocabulary: ${item.keywords.join(", ")}`);
  }

  return parts.join("\n").trim();
}

/**
 * Generates an embedding vector for a single query text using Vercel AI SDK.
 */
export async function getEmbedding(text: string): Promise<number[]> {
  const model = getEmbeddingModel();
  const sanitized = text.trim().replace(/\s+/g, " ");
  const { embedding } = await embed({
    model,
    value: sanitized,
  });
  return embedding;
}

/**
 * Generates embeddings for a batch of texts using Vercel AI SDK's embedMany.
 * Handles chunking to stay within provider request limits.
 */
export async function getEmbeddingsBatch(
  texts: string[],
  batchSize = 25
): Promise<number[][]> {
  const model = getEmbeddingModel();
  const results: number[][] = [];

  for (let i = 0; i < texts.length; i += batchSize) {
    const batch = texts.slice(i, i + batchSize).map((t) => t.trim().replace(/\s+/g, " "));
    const { embeddings } = await embedMany({
      model,
      values: batch,
    });
    results.push(...embeddings);
  }

  return results;
}
