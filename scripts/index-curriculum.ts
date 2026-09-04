import { loadEnvConfig } from "@next/env";
loadEnvConfig(process.cwd());

import fs from "fs";
import path from "path";
import { PrismaClient } from "@prisma/client";
import { curriculumItemSchema, type CurriculumItemInput } from "@/lib/curriculum/types";
import { formatCurriculumNodeForEmbedding, getEmbeddingsBatch } from "@/lib/curriculum/embedding";

const prisma = new PrismaClient();

function generateNodeId(item: CurriculumItemInput): string {
  const parts = [
    item.curriculum,
    item.yearGroup.replace(/\s+/g, ""),
    item.subject,
    item.objectiveCode || item.title.slice(0, 30),
  ];
  return parts
    .join("-")
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, "-")
    .replace(/-+/g, "-");
}

async function indexFile(filePath: string) {
  console.log(`\n📄 Reading dataset: ${path.basename(filePath)}...`);
  const rawContent = fs.readFileSync(filePath, "utf-8");
  let json: unknown;

  try {
    json = JSON.parse(rawContent);
  } catch (e) {
    console.error(`❌ Failed to parse JSON in ${filePath}:`, e);
    return;
  }

  const itemsArray = Array.isArray(json) ? json : [json];
  const validItems: CurriculumItemInput[] = [];

  for (let i = 0; i < itemsArray.length; i++) {
    const parsed = curriculumItemSchema.safeParse(itemsArray[i]);
    if (!parsed.success) {
      console.warn(`⚠️ Skipped invalid item at index ${i}:`, parsed.error.issues);
    } else {
      validItems.push(parsed.data);
    }
  }

  if (validItems.length === 0) {
    console.log(`ℹ️ No valid items found in ${path.basename(filePath)}.`);
    return;
  }

  console.log(`🧩 Generating embeddings for ${validItems.length} curriculum items via Vercel AI SDK...`);
  const embeddingTexts = validItems.map(formatCurriculumNodeForEmbedding);
  const embeddings = await getEmbeddingsBatch(embeddingTexts, 25);

  console.log(`💾 Upserting ${validItems.length} curriculum nodes into database...`);

  let upsertedCount = 0;
  for (let i = 0; i < validItems.length; i++) {
    const item = validItems[i];
    const embedding = embeddings[i];
    const id = generateNodeId(item);
    const vectorStr = `[${embedding.join(",")}]`;

    await prisma.$executeRawUnsafe(
      `
      INSERT INTO "CurriculumNode" (
        id, curriculum, "keyStage", "yearGroup", subject, strand, "unitTitle",
        "objectiveCode", title, description, "teachingNotes", prerequisites,
        keywords, "orderIndex", embedding, "createdAt", "updatedAt"
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15::vector, NOW(), NOW()
      )
      ON CONFLICT (id) DO UPDATE SET
        curriculum = EXCLUDED.curriculum,
        "keyStage" = EXCLUDED."keyStage",
        "yearGroup" = EXCLUDED."yearGroup",
        subject = EXCLUDED.subject,
        strand = EXCLUDED.strand,
        "unitTitle" = EXCLUDED."unitTitle",
        "objectiveCode" = EXCLUDED."objectiveCode",
        title = EXCLUDED.title,
        description = EXCLUDED.description,
        "teachingNotes" = EXCLUDED."teachingNotes",
        prerequisites = EXCLUDED.prerequisites,
        keywords = EXCLUDED.keywords,
        "orderIndex" = EXCLUDED."orderIndex",
        embedding = EXCLUDED.embedding,
        "updatedAt" = NOW();
      `,
      id,
      item.curriculum,
      item.keyStage,
      item.yearGroup,
      item.subject,
      item.strand,
      item.unitTitle,
      item.objectiveCode ?? null,
      item.title,
      item.description,
      item.teachingNotes ?? null,
      JSON.stringify(item.prerequisites ?? []),
      JSON.stringify(item.keywords ?? []),
      item.orderIndex ?? 0,
      vectorStr
    );
    upsertedCount++;
  }

  console.log(`✅ Successfully indexed ${upsertedCount} items from ${path.basename(filePath)}.`);
}

async function main() {
  const dataDir = path.join(process.cwd(), "data", "curriculum");

  if (!fs.existsSync(dataDir)) {
    console.log(`Creating directory: ${dataDir}`);
    fs.mkdirSync(dataDir, { recursive: true });
  }

  const files = fs
    .readdirSync(dataDir)
    .filter((f) => f.endsWith(".json"))
    .map((f) => path.join(dataDir, f));

  if (files.length === 0) {
    console.log("\n⚠️ No curriculum files found in data/curriculum/.");
    console.log("Add your JSON curriculum files to data/curriculum/ and run this script again.");
    return;
  }

  console.log(`🚀 Found ${files.length} curriculum dataset file(s). Starting indexing...\n`);
  for (const file of files) {
    await indexFile(file);
  }

  console.log("\n🎉 Curriculum indexing complete!");
}

main()
  .catch((e) => {
    console.error("❌ Fatal error during curriculum indexing:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
