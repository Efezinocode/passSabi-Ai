// Groq (OpenAI-compatible) client — server only.
// Preferred provider when GROQ_API_KEY is configured; call sites fall back
// to Gemini, then the Lovable AI Gateway.
//
// ContentPart/ChatMessage live in ./chat-types so the browser chat UI can
// use the same types without ever importing this server-only file.

import type {
  ContentPart,
  ChatMessage,
} from "./chat-types";

export type {
  ContentPart,
  ChatMessage,
};

export const GROQ_MODEL = "openai/gpt-oss-120b";

const ENDPOINT =
  "https://api.groq.com/openai/v1/chat/completions";

/**
 * Returns the configured Groq API key.
 *
 * Keeping the key access on the server prevents accidental exposure
 * to browser/client bundles.
 */
export function groqKey(): string | undefined {
  const key = process.env["GROQ_API_KEY"];

  return key && key.trim()
    ? key.trim()
    : undefined;
}

/**
 * Application-level Groq error.
 *
 * status is preserved so route handlers can decide whether to return
 * the error or fall through to another AI provider.
 */
export class GroqError extends Error {
  status: number;

  constructor(
    status: number,
    message: string,
  ) {
    super(message);
    this.name = "GroqError";
    this.status = status;
  }
}

/**
 * Converts an upstream Groq HTTP error into a safe application-level
 * error message.
 *
 * Detailed provider information is logged server-side only.
 */
async function assertOk(
  res: Response,
  what: string,
): Promise<void> {
  if (res.ok) return;

  const detail = await res.text().catch(() => "");

  console.error(`Groq ${what} error`, {
    status: res.status,
    detail,
  });

  if (res.status === 400) {
    throw new GroqError(
      400,
      "The AI request was invalid. Please try again.",
    );
  }

  if (res.status === 401 || res.status === 403) {
    throw new GroqError(
      500,
      "The AI service is not configured correctly.",
    );
  }

  if (res.status === 404) {
    throw new GroqError(
      500,
      "The requested AI model is unavailable.",
    );
  }

  if (res.status === 408 || res.status === 504) {
    throw new GroqError(
      504,
      "The AI service took too long to respond. Please try again.",
    );
  }

  if (res.status === 429) {
    throw new GroqError(
      429,
      "Too many requests right now. Please try again shortly.",
    );
  }

  if (
    res.status === 500 ||
    res.status === 502 ||
    res.status === 503
  ) {
    throw new GroqError(
      503,
      "The AI service is temporarily unavailable. Please try again.",
    );
  }

  throw new GroqError(
    500,
    "The AI service could not respond. Please try again.",
  );
}

/**
 * Streams a Groq answer.
 *
 * Groq uses the OpenAI-compatible chat-completions SSE format,
 * so the upstream response body can be passed directly to the
 * browser client without another SSE transformation layer.
 */
export async function streamGroqSSE(opts: {
  system: string;
  messages: ChatMessage[];
  key: string;
  model?: string;
}): Promise<ReadableStream<Uint8Array>> {
  const res = await fetch(
    ENDPOINT,
    {
      method: "POST",

      headers: {
        Authorization: `Bearer ${opts.key}`,
        "Content-Type": "application/json",
      },

      body: JSON.stringify({
        model: opts.model ?? GROQ_MODEL,
        stream: true,

        messages: [
          {
            role: "system",
            content: opts.system,
          },
          ...opts.messages,
        ],
      }),
    },
  );

  await assertOk(res, "stream");

  if (!res.body) {
    throw new GroqError(
      500,
      "The AI service returned no response.",
    );
  }

  return res.body;
}

/**
 * One-shot structured JSON generation using Groq JSON Schema mode.
 *
 * GPT-OSS 120B currently supports Structured Outputs / JSON Schema
 * on Groq, making it suitable for quizzes, exams, lesson structures,
 * and other machine-readable PassSabi responses.
 */
export async function groqStructured<T>(opts: {
  system: string;
  prompt: string;
  schema: Record<string, unknown>;
  key: string;
  schemaName?: string;
  model?: string;
}): Promise<T> {
  const request = () =>
    fetch(
      ENDPOINT,
      {
        method: "POST",

        headers: {
          Authorization: `Bearer ${opts.key}`,
          "Content-Type": "application/json",
        },

        body: JSON.stringify({
          model: opts.model ?? GROQ_MODEL,

          messages: [
            {
              role: "system",
              content: opts.system,
            },
            {
              role: "user",
              content: opts.prompt,
            },
          ],

          response_format: {
            type: "json_schema",

            json_schema: {
              name: opts.schemaName ?? "result",
              strict: true,
              schema: opts.schema,
            },
          },
        }),
      },
    );

  // Retry transient provider failures briefly.
  let res = await request();

  for (
    let attempt = 0;
    attempt < 2 &&
    (res.status === 503 || res.status === 429);
    attempt++
  ) {
    await new Promise((resolve) =>
      setTimeout(
        resolve,
        800 * (attempt + 1),
      ),
    );

    res = await request();
  }

  await assertOk(res, "structured");

  const json = (await res.json()) as {
    choices?: {
      message?: {
        content?: string;
      };
    }[];
  };

  const text = (
    json.choices?.[0]?.message?.content ??
    ""
  ).trim();

  if (!text) {
    throw new GroqError(
      500,
      "The AI service returned an empty response.",
    );
  }

  try {
    return JSON.parse(text) as T;
  } catch (error) {
    console.error(
      "Groq structured JSON parse error",
      {
        error,
        responsePreview: text.slice(0, 500),
      },
    );

    throw new GroqError(
      500,
      "The AI service returned invalid structured data.",
    );
  }
}
