import { z } from "zod";

/**
 * Standard input schema for indexing curriculum documents.
 * This is the exact format expected in `data/curriculum/*.json`.
 */
export const curriculumItemSchema = z.object({
  curriculum: z.enum(["BNC", "MONTESSORI", "EYFS"]).default("BNC"),
  keyStage: z.string().describe("e.g. EYFS, KS1, KS2, KS3, KS4"),
  yearGroup: z.string().describe("e.g. Year 1, Year 2, ... Year 6, or 3-6"),
  subject: z.string().describe("e.g. Maths, Science, English, History, Geography"),
  strand: z.string().describe("e.g. Number and place value, States of matter"),
  unitTitle: z.string().describe("e.g. Solids, Liquids and Gases"),
  objectiveCode: z.string().optional().describe("e.g. BNC-M-Y3-NPV-1"),
  title: z.string().describe("Concise title of the objective"),
  description: z.string().describe("Full statutory or framework description"),
  teachingNotes: z.string().optional().describe("Teaching guidance, common misconceptions, manipulatives"),
  prerequisites: z.array(z.string()).default([]),
  keywords: z.array(z.string()).default([]),
  orderIndex: z.number().default(0),
});

export type CurriculumItemInput = z.infer<typeof curriculumItemSchema>;

export interface CurriculumQueryParams {
  curriculum: string;   // "BNC" | "MONTESSORI" | "EYFS"
  yearGroup: string;    // "Year 3"
  subject: string;      // "Maths"
  topic: string;        // "Fractions" or search query
  limit?: number;
}

export interface RetrievedCurriculumObjective {
  id: string;
  code: string | null;
  title: string;
  description: string;
  strand: string;
  unitTitle: string;
  teachingNotes: string | null;
  prerequisites: string[];
  keywords: string[];
  similarity?: number;
}

export interface RetrievedCurriculumContext {
  objectives: RetrievedCurriculumObjective[];
  promptSnippet: string;
}
