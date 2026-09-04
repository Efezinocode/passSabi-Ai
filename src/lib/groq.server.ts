// Groq (OpenAI-compatible) client — server only.
// Preferred provider when GROQ_API_KEY is configured; call sites fall back to
// Gemini, then the Lovable AI Gateway.

export const GROQ_MODEL = "openai/gpt-oss-120b";

const ENDPOINT = "https://api.groq.com/openai/v1/chat/completions";

export function groqKey(): string | undefined {
  const key = process.env["GROQ_API_KEY"];
  return key && key.trim() ? key.trim() : undefined;
}

type ChatMessage = { role: "user" | "assistant"; content: string };

export class GroqError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

async function assertOk(res: Response, what: string) {
  if (res.ok) return;
  const detail = await res.text().catch(() => "");
  console.error(`groq ${what} error`, res.status, detail);
  if (res.status === 429) throw new GroqError(429, "Too many requests right now. Try again shortly.");
  if (res.status === 401 || res.status === 403)
    throw new GroqError(500, "The AI key is missing or invalid.");
  throw new GroqError(500, "The AI service could not respond. Please try again.");
}

/**
 * Streams a Groq answer. Groq speaks the OpenAI chat-completions SSE format
 * natively, which is exactly what the browser client already parses, so the
 * upstream body is passed through untouched.
 */
export async function streamGroqSSE(opts: {
  system: string;
  messages: ChatMessage[];
  key: string;
}): Promise<ReadableStream<Uint8Array>> {
  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${opts.key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: GROQ_MODEL,
      stream: true,
      temperature: 0.7,
      messages: [{ role: "system", content: opts.system }, ...opts.messages],
    }),
  });

  await assertOk(res, "stream");
  if (!res.body) throw new GroqError(500, "The AI service returned no response.");
  return res.body;
}

/** One-shot structured JSON generation via OpenAI-style json_schema mode. */
export async function groqStructured<T>(opts: {
  system: string;
  prompt: string;
  schema: Record<string, unknown>;
  key: string;
  schemaName?: string;
}): Promise<T> {
  const request = () =>
    fetch(ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${opts.key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: GROQ_MODEL,
        temperature: 0.8,
        messages: [
          { role: "system", content: opts.system },
          { role: "user", content: opts.prompt },
        ],
        response_format: {
          type: "json_schema",
          json_schema: {
            name: opts.schemaName ?? "result",
            schema: opts.schema,
          },
        },
      }),
    });

  let res = await request();
  for (let attempt = 0; attempt < 2 && (res.status === 503 || res.status === 429); attempt++) {
    await new Promise((r) => setTimeout(r, 800 * (attempt + 1)));
    res = await request();
  }

  await assertOk(res, "structured");

  const json = (await res.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  const text = (json.choices?.[0]?.message?.content ?? "").trim();
  if (!text) throw new GroqError(500, "The AI service returned an empty response.");
  return JSON.parse(text) as T;
}
