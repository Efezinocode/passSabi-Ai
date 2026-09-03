// Direct Google Generative Language API client (server-only).
// Used when GEMINI_API_KEY is configured; otherwise call sites fall back to the
// Lovable AI Gateway so the Lovable-hosted deployment keeps working unchanged.

export const GEMINI_MODEL = "gemini-2.5-flash";

export function geminiKey(): string | undefined {
  const key = process.env["GEMINI_API_KEY"];
  return key && key.trim() ? key.trim() : undefined;
}

const BASE = "https://generativelanguage.googleapis.com/v1beta/models";

type ChatMessage = { role: "user" | "assistant"; content: string };

function toContents(messages: ChatMessage[]) {
  return messages.map((m) => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: m.content }],
  }));
}

export class GeminiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

async function assertOk(res: Response, what: string) {
  if (res.ok) return;
  const detail = await res.text().catch(() => "");
  console.error(`gemini ${what} error`, res.status, detail);
  if (res.status === 429) throw new GeminiError(429, "Too many requests right now. Try again shortly.");
  if (res.status === 401 || res.status === 403)
    throw new GeminiError(500, "The AI key is missing or invalid.");
  throw new GeminiError(500, "The AI service could not respond. Please try again.");
}

/**
 * Streams a Gemini answer and re-emits it in the OpenAI chat-completions SSE
 * shape the browser client already understands.
 */
export async function streamGeminiAsOpenAISSE(opts: {
  system: string;
  messages: ChatMessage[];
  key: string;
}): Promise<ReadableStream<Uint8Array>> {
  const res = await fetch(
    `${BASE}/${GEMINI_MODEL}:streamGenerateContent?alt=sse&key=${encodeURIComponent(opts.key)}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: opts.system }] },
        contents: toContents(opts.messages),
        generationConfig: { temperature: 0.7 },
      }),
    },
  );

  await assertOk(res, "stream");
  if (!res.body) throw new GeminiError(500, "The AI service returned no response.");

  const decoder = new TextDecoder();
  const encoder = new TextEncoder();
  const reader = res.body.getReader();
  let buffer = "";

  return new ReadableStream<Uint8Array>({
    async pull(controller) {
      const { value, done } = await reader.read();
      if (done) {
        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
        controller.close();
        return;
      }
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed.startsWith("data:")) continue;
        const payload = trimmed.slice(5).trim();
        if (!payload || payload === "[DONE]") continue;
        try {
          const chunk = JSON.parse(payload) as {
            candidates?: { content?: { parts?: { text?: string }[] } }[];
          };
          const text = (chunk.candidates?.[0]?.content?.parts ?? [])
            .map((p) => p.text ?? "")
            .join("");
          if (!text) continue;
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({ choices: [{ delta: { content: text } }] })}\n\n`,
            ),
          );
        } catch {
          // ignore partial/non-JSON keepalive lines
        }
      }
    },
    cancel(reason) {
      void reader.cancel(reason);
    },
  });
}

/** One-shot structured JSON generation via responseSchema. */
export async function geminiStructured<T>(opts: {
  system: string;
  prompt: string;
  schema: Record<string, unknown>;
  key: string;
}): Promise<T> {
  const res = await fetch(
    `${BASE}/${GEMINI_MODEL}:generateContent?key=${encodeURIComponent(opts.key)}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: opts.system }] },
        contents: [{ role: "user", parts: [{ text: opts.prompt }] }],
        generationConfig: {
          temperature: 0.8,
          responseMimeType: "application/json",
          responseSchema: opts.schema,
        },
      }),
    },
  );

  await assertOk(res, "structured");

  const json = (await res.json()) as {
    candidates?: { content?: { parts?: { text?: string }[] } }[];
  };
  const text = (json.candidates?.[0]?.content?.parts ?? [])
    .map((p) => p.text ?? "")
    .join("")
    .trim();
  if (!text) throw new GeminiError(500, "The AI service returned an empty response.");
  return JSON.parse(text) as T;
}
