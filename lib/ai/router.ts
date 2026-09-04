import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createOpenAI } from "@ai-sdk/openai";
import { createAnthropic } from "@ai-sdk/anthropic";
import type { LanguageModel } from "ai";
import { AIFeature, FEATURE_REGISTRY, ModelTier } from "./features";

// ── Providers Initialisation ──────────────────────────────────────────────────

export const google = createGoogleGenerativeAI({
  apiKey: process.env.GEMINI_API_KEY || "",
});

export const openai = createOpenAI({
  apiKey: process.env.OPENAI_API_KEY || "",
});

export const anthropic = createAnthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || "",
});

export const groq = createOpenAI({
  apiKey: process.env.GROQ_API_KEY || "",
  baseURL: "https://api.groq.com/openai/v1",
});

export const deepseek = createOpenAI({
  apiKey: process.env.DEEPSEEK_API_KEY || "",
  baseURL: "https://api.deepseek.com",
});

// ── Model Entry Interface ─────────────────────────────────────────────────────

export interface ModelChainEntry {
  id: string;
  name: string;
  isAvailable: () => boolean;
  getModel: () => LanguageModel;
  supportsStructuredOutputs: boolean;
}

// ── Configured Model Catalog ──────────────────────────────────────────────────

export const MODEL_CATALOG: Record<string, ModelChainEntry> = {
  // Google Gemini models
  "gemini-3.1-flash-lite": {
    id: "gemini-3.1-flash-lite",
    name: "Gemini 3.1 Flash-Lite",
    isAvailable: () => Boolean(process.env.GEMINI_API_KEY),
    getModel: () => google(process.env.GEMINI_MODEL ?? "gemini-3.1-flash-lite"),
    supportsStructuredOutputs: true,
  },
  "gemini-3.5-flash": {
    id: "gemini-3.5-flash",
    name: "Gemini 3.5 Flash",
    isAvailable: () => Boolean(process.env.GEMINI_API_KEY),
    getModel: () => google("gemini-3.5-flash"),
    supportsStructuredOutputs: true,
  },
  "gemini-3.5-pro": {
    id: "gemini-3.5-pro",
    name: "Gemini 3.1 Pro",
    isAvailable: () => Boolean(process.env.GEMINI_API_KEY),
    getModel: () => google("gemini-3.1-pro-preview"),
    supportsStructuredOutputs: true,
  },

  // Groq models (Ultra-low TTFT)
  "groq-llama-3.3-70b": {
    id: "groq-llama-3.3-70b",
    name: "Groq Llama 3.3 70B",
    isAvailable: () => Boolean(process.env.GROQ_API_KEY),
    getModel: () => groq("llama-3.3-70b-versatile"),
    supportsStructuredOutputs: true,
  },

  // DeepSeek models
  "deepseek-r1": {
    id: "deepseek-r1",
    name: "DeepSeek R1",
    isAvailable: () => Boolean(process.env.DEEPSEEK_API_KEY),
    getModel: () => deepseek("deepseek-reasoner"),
    supportsStructuredOutputs: false, // Reasoner outputs thought stream; use prompt framing
  },
  "deepseek-chat": {
    id: "deepseek-chat",
    name: "DeepSeek Chat",
    isAvailable: () => Boolean(process.env.DEEPSEEK_API_KEY),
    getModel: () => deepseek("deepseek-chat"),
    supportsStructuredOutputs: true,
  },

  // OpenAI models
  "gpt-4o-mini": {
    id: "gpt-4o-mini",
    name: "OpenAI GPT-4o mini",
    isAvailable: () => Boolean(process.env.OPENAI_API_KEY),
    getModel: () => openai("gpt-4o-mini"),
    supportsStructuredOutputs: true,
  },

  // Anthropic Claude models
  "claude-3-5-haiku": {
    id: "claude-3-5-haiku",
    name: "Claude 3.5 Haiku",
    isAvailable: () => Boolean(process.env.ANTHROPIC_API_KEY),
    getModel: () => anthropic("claude-3-5-haiku-20241022"),
    supportsStructuredOutputs: true,
  },
  "claude-sonnet": {
    id: "claude-sonnet",
    name: "Claude Sonnet",
    isAvailable: () => Boolean(process.env.ANTHROPIC_API_KEY),
    getModel: () => anthropic("claude-sonnet-4-20250514"),
    supportsStructuredOutputs: true,
  },
};

// ── Default Tier Fallback Chains ──────────────────────────────────────────────

const TIER_CHAINS: Record<ModelTier, ModelChainEntry[]> = {
  fast: [
    MODEL_CATALOG["gemini-3.1-flash-lite"],
    MODEL_CATALOG["gpt-4o-mini"],
    MODEL_CATALOG["deepseek-chat"],
    MODEL_CATALOG["gemini-3.5-flash"],
  ],
  chat: [
    MODEL_CATALOG["gemini-3.1-flash-lite"],
    MODEL_CATALOG["groq-llama-3.3-70b"],
    MODEL_CATALOG["gemini-3.5-flash"],
    MODEL_CATALOG["claude-3-5-haiku"],
  ],
  reasoning: [
    MODEL_CATALOG["gemini-3.1-flash-lite"],
    MODEL_CATALOG["gemini-3.5-flash"],
    MODEL_CATALOG["deepseek-r1"],
    MODEL_CATALOG["claude-sonnet"],
    MODEL_CATALOG["gemini-3.5-pro"],
  ],
  balanced: [
    MODEL_CATALOG["gemini-3.1-flash-lite"],
    MODEL_CATALOG["gemini-3.5-flash"],
    MODEL_CATALOG["deepseek-r1"],
  ],
};

// ── Resolver Functions ────────────────────────────────────────────────────────

/**
 * Returns the candidate model chain for a given AI feature,
 * filtered to only models that currently have API keys configured.
 * Always guarantees at least one available model if GEMINI_API_KEY is present.
 */
export function getCandidateChain(feature: AIFeature): ModelChainEntry[] {
  const config = FEATURE_REGISTRY[feature];
  const chain = TIER_CHAINS[config.tier] || TIER_CHAINS.fast;

  // Filter to available models whose API keys are configured
  const available = chain.filter((entry) => entry && entry.isAvailable());

  if (available.length > 0) {
    return available;
  }

  // Fallback to default Gemini Flash-Lite if none in chain are available
  return [MODEL_CATALOG["gemini-3.1-flash-lite"]];
}

/**
 * Returns the primary (first available) model for a given feature.
 */
export function getPrimaryModel(feature: AIFeature): LanguageModel {
  const chain = getCandidateChain(feature);
  return chain[0].getModel();
}

/**
 * Returns an embedding model from configured providers using Vercel AI SDK.
 * Defaults to Google Gemini text-embedding-004, or OpenAI text-embedding-3-small if configured.
 */
export function getEmbeddingModel() {
  if (process.env.EMBEDDING_PROVIDER === "openai" && process.env.OPENAI_API_KEY) {
    return openai.textEmbeddingModel(process.env.EMBEDDING_MODEL ?? "text-embedding-3-small");
  }
  return google.textEmbeddingModel(process.env.EMBEDDING_MODEL ?? "text-embedding-004");
}
