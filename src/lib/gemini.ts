/**
 * StopBucks Gemini Server Helper
 *
 * Server-only. Never import this module from a client component: it reads
 * GEMINI_API_KEY and must stay out of the browser bundle.
 *
 * Returns null on any failure (missing key, timeout, malformed output) so
 * callers can always fall back to deterministic logic.
 */

import { GoogleGenAI, Type } from "@google/genai";
import type { Schema } from "@google/genai";

export const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-3.8-flash";
export const GEMINI_TIMEOUT_MS = 12000;

export { Type };

export function isGeminiConfigured(): boolean {
  const key = process.env.GEMINI_API_KEY;
  return Boolean(key && key.trim().length > 0);
}

/**
 * Calls Gemini with a structured JSON schema and parses the JSON response.
 * Any transport, timeout or parse problem resolves to null.
 * Uses an AbortController so timed-out requests abort the in-flight network call.
 */
export async function generateStructuredJson(
  prompt: string,
  schema: Schema,
  timeoutMs: number = GEMINI_TIMEOUT_MS
): Promise<unknown | null> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey.trim().length === 0) {
    return null;
  }

  const controller = new AbortController();
  const timer = setTimeout(() => {
    controller.abort();
  }, timeoutMs);

  try {
    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        timeout: timeoutMs,
        fetch: (url, init) => fetch(url, { ...init, signal: controller.signal }),
      },
    });

    const response = await ai.models.generateContent({
      model: GEMINI_MODEL,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: schema,
        temperature: 0.2,
      },
    });

    const text = response.text;
    if (!text || text.trim().length === 0) return null;

    return JSON.parse(text) as unknown;
  } catch (error) {
    if (controller.signal.aborted) {
      console.warn("[StopBucks] Gemini request timed out and was aborted.");
    } else {
      console.warn(
        "[StopBucks] Gemini request failed; using deterministic fallback.",
        error instanceof Error ? error.message : error
      );
    }
    return null;
  } finally {
    clearTimeout(timer);
  }
}
