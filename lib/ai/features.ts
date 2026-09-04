/**
 * AI Feature Registry
 * Defines all AI workloads in Planned, their required reasoning/speed tier,
 * output token limits, default temperatures, and metadata.
 */

export type AIFeature =
  | "week-generation"
  | "lesson-detail"
  | "lesson-refine"
  | "worksheet"
  | "parent-chat"
  | "journal-analysis"
  | "progress-note"
  | "preview-lesson"
  | "lesson-generate";

export type ModelTier = "fast" | "balanced" | "reasoning" | "chat";

export interface FeatureConfig {
  tier: ModelTier;
  maxOutputTokens: number;
  temperature: number;
  description: string;
}

export const FEATURE_REGISTRY: Record<AIFeature, FeatureConfig> = {
  "week-generation": {
    tier: "fast",
    maxOutputTokens: 2048,
    temperature: 0.3,
    description: "5-day timetable generation (12-25 lessons with objectives)",
  },
  "lesson-detail": {
    tier: "reasoning",
    maxOutputTokens: 10000,
    temperature: 0.5,
    description: "Full lesson plan with 4-step guide, activities, quizzes, faith & excursions",
  },
  "lesson-refine": {
    tier: "balanced",
    maxOutputTokens: 6144,
    temperature: 0.4,
    description: "Adaptive lesson refinement (easier, harder, or alternative approach)",
  },
  "worksheet": {
    tier: "fast",
    maxOutputTokens: 1024,
    temperature: 0.3,
    description: "Multi-format interactive & printable question synthesis",
  },
  "parent-chat": {
    tier: "chat",
    maxOutputTokens: 1024,
    temperature: 0.6,
    description: "Context-aware parent AI tutor conversation with ultra-low latency",
  },
  "journal-analysis": {
    tier: "fast",
    maxOutputTokens: 1024,
    temperature: 0.2,
    description: "Parent journal reflection analysis, moment classification & skills extraction",
  },
  "progress-note": {
    tier: "fast",
    maxOutputTokens: 350,
    temperature: 0.3,
    description: "Pedagogical subject progress guidance summary (strength, growth, nextStep)",
  },
  "preview-lesson": {
    tier: "fast",
    maxOutputTokens: 600,
    temperature: 0.4,
    description: "Onboarding sample lesson teaser personalized to child interests & location",
  },
  "lesson-generate": {
    tier: "balanced",
    maxOutputTokens: 2048,
    temperature: 0.4,
    description: "Standalone one-shot lesson generation",
  },
};

export function getFeatureConfig(feature: AIFeature): FeatureConfig {
  const config = FEATURE_REGISTRY[feature];
  if (!config) {
    throw new Error(`Unknown AI feature requested: "${feature}"`);
  }
  return config;
}
