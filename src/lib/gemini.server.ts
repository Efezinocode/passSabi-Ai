// Direct Google Generative Language API client (server-only).
// Used when GEMINI_API_KEY is configured; otherwise call sites can fall back
// to the secondary AI provider.
//
// Gemini 3.6 Flash is a stable, production-ready multimodal model.
// It supports text and image input, structured outputs, and streaming.
//
// Google currently lists Gemini 3.6 Flash as a stable model with no announced
// shutdown date. Keep the model ID centralized here so it can be upgraded
// without changing call sites.
//
// Source:
// https://ai.google.dev/gemini-api/docs/models
//
// This file accepts image content (ContentPart[]) so Gemini can act as a
// real fallback for photo questions too, rather than making photo support
// depend on a single provider.

import type { ChatMessage } from "./chat-types";

export const GEMINI_MODEL = "gemini-3.6-flash";

const BASE = "https://generativelanguage.googleapis.com/v1beta/models";

export function geminiKey(): string | undefined {
  const key = process.env["GEMINI_API_KEY"];
  return key && key.trim() ? key.trim() : undefined;
}

/**
 * Splits a "data:image/jpeg;base64,...." URL into the format expected by
 * Gemini's inlineData field.
 */
function dataUrlToInlineData(
  url: string,
): { mimeType: string; data: string } | null {
  const match = /^data:([^;]+);base64,(.+)$/.exec(url);

  if (!match) return null;

  return {
    mimeType: match[1],
    data: match[2],
  };
}

/**
 * Converts the application's ChatMessage format into Gemini's contents
 * format while preserving both text and image parts.
 */
function toContents(messages: ChatMessage[]) {
  return messages.map((m) => {
    const role = m.role === "assistant" ? "model" : "user";

    if (typeof m.content === "string") {
      return {
        role,
        parts: [{ text: m.content }],
      };
    }

    const parts = m.content.flatMap((part) => {
      if (part.type === "text") {
        return [{ text: part.text }];
      }

      const inline = dataUrlToInlineData(part.image_url.url);

      return inline ? [{ inlineData: inline }] : [];
    });

    return {
      role,
      parts,
    };
  });
}

export class GeminiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "GeminiError";
    this.status = status;
  }
}

/**
 * Converts an upstream Gemini HTTP error into a safe application-level
 * error message.
 *
 * Detailed provider responses are logged server-side only and are never
 * returned to the browser.
 */
async function assertOk(res: Response, what: string): Promise<void> {
  if (res.ok) return;

  const detail = await res.text().catch(() => "");

  console.error(`Gemini ${what} error`, {
    status: res.status,
    detail,
  });

  if (res.status === 429) {
    throw new GeminiError(
      429,
      "Too many requests right now. Please try again shortly.",
    );
  }

  if (res.status === 400) {
    throw new GeminiError(
      400,
      "The AI request was invalid. Please try again.",
    );
  }

  if (res.status === 401 || res.status === 403) {
    throw new GeminiError(
      500,
      "The AI service is not configured correctly.",
    );
  }

  if (res.status === 404) {
    throw new GeminiError(
      500,
      "The requested AI model is unavailable.",
    );
  }

  if (res.status === 408 || res.status === 504) {
    throw new GeminiError(
      504,
      "The AI service took too long to respond. Please try again.",
    );
  }

  if (res.status === 500 || res.status === 502 || res.status === 503) {
    throw new GeminiError(
      503,
      "The AI service is temporarily unavailable. Please try again.",
    );
  }

  throw new GeminiError(
    500,
    "The AI service could not respond. Please try again.",
  );
}

/**
 * Streams a Gemini answer and re-emits it in the OpenAI chat-completions
 * SSE shape that the existing browser client already understands.
 */
export async function streamGeminiAsOpenAISSE(opts: {
  system: string;
  messages: ChatMessage[];
  key: string;
}): Promise<ReadableStream<Uint8Array>> {
  const res = await fetch(
    `${BASE}/${GEMINI_MODEL}:streamGenerateContent?alt=sse&key=${encodeURIComponent(
      opts.key,
    )}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        systemInstruction: {
          parts: [{ text: opts.system }],
        },
        contents: toContents(opts.messages),
      }),
    },
  );

  await assertOk(res, "stream");

  if (!res.body) {
    throw new GeminiError(
      500,
      "The AI service returned no response.",
    );
  }

  const decoder = new TextDecoder();
  const encoder = new TextEncoder();
  const reader = res.body.getReader();

  let buffer = "";

  /**
   * Converts one Gemini SSE payload into the OpenAI-compatible SSE format
   * expected by the browser client.
   */
  const processLine = (
    line: string,
    controller: ReadableStreamDefaultController<Uint8Array>,
  ) => {
    const trimmed = line.trim();

    if (!trimmed.startsWith("data:")) return;

    const payload = trimmed.slice(5).trim();

    if (!payload || payload === "[DONE]") return;

    try {
      const chunk = JSON.parse(payload) as {
        candidates?: {
          content?: {
            parts?: {
              text?: string;
            }[];
          };
        }[];
      };

      const text = (chunk.candidates?.[0]?.content?.parts ?? [])
        .map((part) => part.text ?? "")
        .join("");

      if (!text) return;

      controller.enqueue(
        encoder.encode(
          `data: ${JSON.stringify({
            choices: [
              {
                delta: {
                  content: text,
                },
              },
            ],
          })}\n\n`,
        ),
      );
    } catch (error) {
      // Gemini may occasionally send an incomplete/non-JSON SSE line.
      // Keep the stream alive instead of failing the entire response.
      console.warn("Ignoring malformed Gemini SSE payload", error);
    }
  };

  return new ReadableStream<Uint8Array>({
    async pull(controller) {
      try {
        const { value, done } = await reader.read();

        if (done) {
          // IMPORTANT:
          // Process any final partial line left in the buffer before
          // closing the stream. Without this, the last Gemini chunk
          // could be silently lost.
          if (buffer.trim()) {
            processLine(buffer, controller);
          }

          controller.enqueue(
            encoder.encode("data: [DONE]\n\n"),
          );

          controller.close();
          return;
        }

        buffer += decoder.decode(value, {
          stream: true,
        });

        const lines = buffer.split("\n");

        // Keep the incomplete final line for the next network chunk.
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          processLine(line, controller);
        }
      } catch (error) {
        console.error("Gemini stream error", error);

        controller.error(
          error instanceof GeminiError
            ? error
            : new GeminiError(
                500,
                "The AI service interrupted the response.",
              ),
        );
      }
    },

    cancel(reason) {
      void reader.cancel(reason);
    },
  });
}

/**
 * One-shot structured JSON generation using Gemini responseSchema.
 */
export async function geminiStructured<T>(opts: {
  system: string;
  prompt: string;
  schema: Record<string, unknown>;
  key: string;
}): Promise<T> {
  const request = () =>
    fetch(
      `${BASE}/${GEMINI_MODEL}:generateContent?key=${encodeURIComponent(
        opts.key,
      )}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          systemInstruction: {
            parts: [{ text: opts.system }],
          },
          contents: [
            {
              role: "user",
              parts: [{ text: opts.prompt }],
            },
          ],
          generationConfig: {
            responseMimeType: "application/json",
            responseSchema: opts.schema,
          },
        }),
      },
    );

  // Gemini can occasionally return transient 503/429 responses.
  // Retry briefly before surfacing the error.
  let res = await request();

  for (
    let attempt = 0;
    attempt < 2 &&
    (res.status === 503 || res.status === 429);
    attempt++
  ) {
    await new Promise((resolve) =>
      setTimeout(resolve, 800 * (attempt + 1)),
    );

    res = await request();
  }

  await assertOk(res, "structured");

  const json = (await res.json()) as {
    candidates?: {
      content?: {
        parts?: {
          text?: string;
        }[];
      };
    }[];
  };

  const text = (json.candidates?.[0]?.content?.parts ?? [])
    .map((part) => part.text ?? "")
    .join("")
    .trim();

  if (!text) {
    throw new GeminiError(
      500,
      "The AI service returned an empty response.",
    );
  }

  try {
    return JSON.parse(text) as T;
  } catch (error) {
    console.error("Gemini structured JSON parse error", {
      error,
      responsePreview: text.slice(0, 500),
    });

  throw new GeminiError(
      500,
      "The AI service returned invalid structured data.",
    );
  }
}
