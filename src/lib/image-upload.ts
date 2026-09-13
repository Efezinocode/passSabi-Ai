// Client-side helper for turning a selected photo into something we can send
// to the AI. Kept separate from chat.tsx so the validation/conversion logic
// can be tested and changed without touching the chat UI or the streaming
// logic.

export const MAX_IMAGE_BYTES = 5 * 1024 * 1024; // 5MB
export const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;

export class ImageValidationError extends Error {}

/** Throws ImageValidationError if the file isn't a photo we can send to the tutor. */
export function assertValidImage(file: File): void {
  if (!ACCEPTED_IMAGE_TYPES.includes(file.type as (typeof ACCEPTED_IMAGE_TYPES)[number])) {
    throw new ImageValidationError("Please choose a JPG, PNG or WEBP image.");
  }
  if (file.size > MAX_IMAGE_BYTES) {
    throw new ImageValidationError("That photo is too large. Please choose one under 5MB.");
  }
}

/**
 * Reads a File into a base64 data URL (e.g. "data:image/jpeg;base64,...")
 * so it can be sent inline as an image_url content part.
 */
export function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error("Could not read that image. Please try again."));
    reader.readAsDataURL(file);
  });
}
