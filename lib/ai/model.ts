import { createGoogleGenerativeAI } from "@ai-sdk/google";

const apiKey =
  process.env.GEMINI_API_KEY || "";

export const googleProvider = createGoogleGenerativeAI({
  apiKey: apiKey ?? "",
});

export const geminiModel = googleProvider(
  process.env.GEMINI_MODEL ?? "gemini-3.1-flash-lite"
);
