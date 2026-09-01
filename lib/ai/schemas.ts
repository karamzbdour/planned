import { z } from "zod";

export const weekLessonSchema = z.object({
  dayOffset: z.number().int().min(0).max(4),
  subject: z.string(),
  topic: z.string(),
  durationMins: z.number().default(45),
  title: z.string(),
  description: z
    .string()
    .describe("1 concise sentence summary explaining the session focus, max 20 words"),
  objectives: z
    .array(z.string())
    .max(2)
    .describe("Exactly 2 concise bullet points representing core learning milestones"),
});

export const weekGenerationSchema = z.object({
  lessons: z.array(weekLessonSchema),
});

export const teachingStepSchema = z.object({
  step: z.number(),
  title: z.string(),
  instructions: z.string(),
});

export const activitySchema = z.object({
  title: z.string(),
  type: z.enum(["Hands-on", "Drawing", "Worksheet", "Discussion"]),
  description: z.string(),
  durationMins: z.number().optional(),
});

export const videoResourceSchema = z.object({
  title: z.string(),
  searchQuery: z.string(),
  youtubeId: z.string().optional(),
  url: z.string().optional(),
});

export const faithConnectionSchema = z.object({
  reference: z.string(),
  arabicText: z.string().optional(),
  translation: z.string().optional(),
  explanation: z.string(),
});

export const dayOutSchema = z.object({
  venueName: z.string(),
  description: z.string(),
  address: z.string(),
});

export const quizQuestionSchema = z.object({
  question: z.string(),
  options: z.array(z.string()),
  correctIndex: z.number(),
});

export const fullLessonSchema = z.object({
  title: z.string(),
  description: z.string(),
  objectives: z.array(z.string()),
  teachingGuide: z.array(teachingStepSchema),
  activities: z.array(activitySchema),
  videoResources: z.array(videoResourceSchema),
  faithConnection: faithConnectionSchema.optional(),
  dayOut: dayOutSchema.optional(),
  quiz: z.array(quizQuestionSchema),
});

export const lessonRefineSchema = z.object({
  title: z.string().optional(),
  description: z.string().optional(),
  teachingGuide: z.array(teachingStepSchema),
  activities: z.array(activitySchema),
  quiz: z.array(quizQuestionSchema).optional(),
});

export type WeekLessonData = z.infer<typeof weekLessonSchema>;
export type WeekGenerationData = z.infer<typeof weekGenerationSchema>;
export type TeachingStepData = z.infer<typeof teachingStepSchema>;
export type ActivityData = z.infer<typeof activitySchema>;
export type VideoResourceData = z.infer<typeof videoResourceSchema>;
export type FaithConnectionData = z.infer<typeof faithConnectionSchema>;
export type DayOutData = z.infer<typeof dayOutSchema>;
export type QuizQuestionData = z.infer<typeof quizQuestionSchema>;
export type FullLessonData = z.infer<typeof fullLessonSchema>;
export type LessonRefineData = z.infer<typeof lessonRefineSchema>;
