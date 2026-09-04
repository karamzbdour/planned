import {
  generateText,
  streamText,
  Output,
  type LanguageModel,
} from "ai";
import type { z } from "zod";
import { AIFeature, FEATURE_REGISTRY } from "./features";
import { getCandidateChain, type ModelChainEntry } from "./router";

// ── Shared Execution Types ───────────────────────────────────────────────────

export interface BaseFallbackOptions {
  feature: AIFeature;
  system?: string;
  prompt?: string;
  messages?: any[];
  temperature?: number;
  maxOutputTokens?: number;
  onFailover?: (fromModel: string, toModel: string, error: Error) => void;
}

export interface GenerateFallbackOptions<T = any> extends BaseFallbackOptions {
  schema?: z.ZodType<T>;
  output?: any;
}

export interface StreamFallbackOptions<T = any> extends BaseFallbackOptions {
  schema?: z.ZodType<T>;
  output?: any;
  onEnd?: (event: any) => Promise<void> | void;
  onFinish?: (event: any) => Promise<void> | void;
}

export interface GenerateFallbackResult<T = any> {
  text: string;
  output?: T;
  modelUsed: string;
  modelName: string;
  failoverCount: number;
  rawResult: Awaited<ReturnType<typeof generateText>>;
}

export interface StreamFallbackResult {
  result: ReturnType<typeof streamText>;
  modelUsed: string;
  modelName: string;
  failoverCount: number;
}

// ── Non-Streaming Fallback Executor ──────────────────────────────────────────

/**
 * Executes a non-streaming AI generation with automatic failover across candidate models.
 * If the primary model encounters rate limits (4xx), timeouts, or provider 5xx errors,
 * it immediately cascades to the next available tier model.
 */
export async function generateWithFallback<T = any>(
  options: GenerateFallbackOptions<T>
): Promise<GenerateFallbackResult<T>> {
  const chain = getCandidateChain(options.feature);
  const config = FEATURE_REGISTRY[options.feature];

  let lastError: Error | null = null;

  for (let i = 0; i < chain.length; i++) {
    const entry = chain[i];
    try {
      const model: LanguageModel = entry.getModel();

      const callParams: any = {
        model,
        system: options.system,
        maxOutputTokens: options.maxOutputTokens ?? config.maxOutputTokens,
        temperature: options.temperature ?? config.temperature,
      };

      if (options.messages && options.messages.length > 0) {
        callParams.messages = options.messages;
      } else if (options.prompt) {
        callParams.prompt = options.prompt;
      }

      // Structured output if schema or output parameter provided
      if (options.output) {
        callParams.output = options.output;
      } else if (options.schema) {
        if (entry.supportsStructuredOutputs) {
          callParams.output = Output.object({ schema: options.schema });
        } else {
          // Model does not have native structured JSON support (e.g. DeepSeek R1)
          // Append JSON guidance to prompt and validate afterwards
          callParams.prompt = `${callParams.prompt || ""}\n\nPlease respond ONLY with valid JSON adhering to the required schema.`;
        }
      }

      const rawResult = await generateText(callParams);

      let parsedOutput: T | undefined = undefined;
      if (options.schema) {
        if (rawResult.output) {
          parsedOutput = rawResult.output as T;
        } else if (rawResult.text) {
          // Attempt parsing text directly if model output free text JSON
          try {
            const cleanText = rawResult.text
              .replace(/^```json\s*/i, "")
              .replace(/^```\s*/i, "")
              .replace(/\s*```$/i, "")
              .trim();
            const jsonMatch = cleanText.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
            if (jsonMatch) {
              parsedOutput = options.schema.parse(JSON.parse(jsonMatch[0])) as T;
            }
          } catch (parseErr) {
            console.warn(`[AI Router] Schema parsing failed for ${entry.name}, triggering fallback:`, parseErr);
            throw parseErr;
          }
        }
      }

      return {
        text: rawResult.text,
        output: parsedOutput,
        modelUsed: entry.id,
        modelName: entry.name,
        failoverCount: i,
        rawResult,
      };
    } catch (err: any) {
      lastError = err;
      const nextEntry = chain[i + 1];
      if (nextEntry) {
        options.onFailover?.(entry.name, nextEntry.name, err);
        console.warn(
          `[AI Router] ${entry.name} failed for "${options.feature}". Failing over to ${nextEntry.name}. Reason:`,
          err?.message || err
        );
      }
    }
  }

  throw new Error(
    `All candidate models in chain failed for AI feature "${options.feature}". Last error: ${lastError?.message}`
  );
}

// ── Streaming Fallback Executor ──────────────────────────────────────────────

/**
 * Initiates a streaming AI response using the candidate model chain.
 * Note: Streaming failover applies during stream initiation.
 */
export async function streamWithFallback(
  options: StreamFallbackOptions
): Promise<StreamFallbackResult> {
  const chain = getCandidateChain(options.feature);
  const config = FEATURE_REGISTRY[options.feature];

  let lastError: Error | null = null;

  for (let i = 0; i < chain.length; i++) {
    const entry = chain[i];
    // Skip candidate models that do not support structured outputs if a schema is requested
    if (options.schema && !entry.supportsStructuredOutputs) {
      continue;
    }

    try {
      const model: LanguageModel = entry.getModel();

      const callParams: any = {
        model,
        system: options.system,
        maxOutputTokens: options.maxOutputTokens ?? config.maxOutputTokens,
        temperature: options.temperature ?? config.temperature,
        onEnd: options.onEnd,
        onFinish: options.onFinish,
      };

      if (options.messages && options.messages.length > 0) {
        callParams.messages = options.messages;
      } else if (options.prompt) {
        callParams.prompt = options.prompt;
      }

      if (options.output) {
        callParams.output = options.output;
      } else if (options.schema) {
        callParams.output = Output.object({ schema: options.schema });
      }

      const result = streamText(callParams);

      // Verify connection by reading only until the first lifecycle chunk.
      // - If provider rejects (e.g. 401, 429, 503), an 'error' chunk is enqueued.
      // - If provider accepts, a 'start-step' or 'text-start' chunk is enqueued on initial connection.
      // We do NOT await result.response, which would consume and buffer the entire generation.
      const reader = result.stream.getReader();
      try {
        const handshakePromise = (async () => {
          while (true) {
            const { value, done } = await reader.read();
            if (done) break;
            if (value?.type === "error") {
              throw (value as any).error ?? new Error(`Stream error from ${entry.name}`);
            }
            if (
              value?.type === "start-step" ||
              value?.type === "text-start" ||
              value?.type === "text-delta"
            ) {
              return; // Connection established and output stream started
            }
          }
        })();

        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(
            () => reject(new Error(`Handshake timeout after 15s for ${entry.name}`)),
            15000
          )
        );

        await Promise.race([handshakePromise, timeoutPromise]);
      } finally {
        reader.releaseLock();
      }

      return {
        result,
        modelUsed: entry.id,
        modelName: entry.name,
        failoverCount: i,
      };
    } catch (err: any) {
      lastError = err;
      const nextEntry = chain[i + 1];
      if (nextEntry) {
        options.onFailover?.(entry.name, nextEntry.name, err);
        console.warn(
          `[AI Router] Stream initiation failed for ${entry.name} on "${options.feature}". Failing over to ${nextEntry.name}. Reason:`,
          err?.message || err
        );
      }
    }
  }

  throw new Error(
    `Could not initiate stream for AI feature "${options.feature}". Last error: ${lastError?.message}`
  );
}
