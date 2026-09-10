// Vision-specific helpers — kept separate so image detection logic can be
// fixed or rolled back without touching the core Groq streaming client.

import type { ContentPart } from "./groq.server";

export const GROQ_VISION_MODEL = "meta-llama/llama-4-scout-17b-16e-instruct";

/** True if any message in the conversation includes an image. */
export function hasImage(messages: { content: string | ContentPart[] }[]): boolean {
  return messages.some(
    (m) => Array.isArray(m.content) && m.content.some((part) => part.type === "image_url")
  );
}
