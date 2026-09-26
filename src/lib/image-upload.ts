// Client-side helper for turning a selected photo into something we can send
// to the AI. Kept separate from chat.tsx so the validation/conversion logic
// can be tested and changed without touching the chat UI or the streaming
// logic.

export const MAX_IMAGE_BYTES = 10 * 1024 * 1024; // 10MB raw upload; we compress before sending
export const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;

// /api/tutor runs as a Vercel serverless function, which rejects any
// request body over ~4.5MB with FUNCTION_PAYLOAD_TOO_LARGE. A phone photo
// is often 3-10MB straight out of the camera, and turning it into a base64
// data URL inflates that by another ~33% -- so a "5MB" photo becomes a
// ~6.5MB request body on its own, before the rest of the chat history and
// context are even added. We resize + re-compress every photo client-side
// before it's ever sent, with headroom under that limit for everything else
// in the request.
const MAX_OUTPUT_BASE64_BYTES = 3.5 * 1024 * 1024; // ~3.5MB, leaves room under Vercel's 4.5MB cap
const MAX_OUTPUT_DIMENSION = 1600; // px, longest side -- plenty for a homework photo
const QUALITY_STEPS = [0.82, 0.65, 0.5, 0.35] as const;

export class ImageValidationError extends Error {}

/** Throws ImageValidationError if the file isn't a photo we can send to the tutor. */
export function assertValidImage(file: File): void {
  if (!ACCEPTED_IMAGE_TYPES.includes(file.type as (typeof ACCEPTED_IMAGE_TYPES)[number])) {
    throw new ImageValidationError("Please choose a JPG, PNG or WEBP image.");
  }
  if (file.size > MAX_IMAGE_BYTES) {
    throw new ImageValidationError("That photo is too large. Please choose one under 10MB.");
  }
}

function base64Bytes(dataUrl: string): number {
  const commaIndex = dataUrl.indexOf(",");
  const base64 = commaIndex === -1 ? dataUrl : dataUrl.slice(commaIndex + 1);
  // Every 4 base64 chars encode 3 bytes.
  return Math.floor((base64.length * 3) / 4);
}

function loadImage(objectUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Could not read that image. Please try again."));
    img.src = objectUrl;
  });
}

function readAsDataUrlFallback(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error("Could not read that image. Please try again."));
    reader.readAsDataURL(file);
  });
}

/**
 * Reads a File, downsizes it so its longest side is at most
 * MAX_OUTPUT_DIMENSION, and re-encodes it as JPEG -- trying progressively
 * lower quality if the result is still too large -- so the base64 payload
 * we send to /api/tutor stays comfortably under Vercel's request-body
 * limit. Falls back to a plain base64 read if canvas re-encoding isn't
 * available, rather than failing outright.
 */
export async function fileToDataUrl(file: File): Promise<string> {
  const objectUrl = URL.createObjectURL(file);
  try {
    const img = await loadImage(objectUrl);
    const scale = Math.min(1, MAX_OUTPUT_DIMENSION / Math.max(img.width, img.height));
    const width = Math.max(1, Math.round(img.width * scale));
    const height = Math.max(1, Math.round(img.height * scale));

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("no-2d-context");

    ctx.drawImage(img, 0, 0, width, height);

    let dataUrl = canvas.toDataURL("image/jpeg", QUALITY_STEPS[0]);
    for (let i = 1; i < QUALITY_STEPS.length && base64Bytes(dataUrl) > MAX_OUTPUT_BASE64_BYTES; i++) {
      dataUrl = canvas.toDataURL("image/jpeg", QUALITY_STEPS[i]);
    }

    if (base64Bytes(dataUrl) > MAX_OUTPUT_BASE64_BYTES) {
      throw new ImageValidationError(
        "That photo is too detailed to send even after compressing. Try cropping closer to the question, or retake it with less background.",
      );
    }

    return dataUrl;
  } catch (err) {
    if (err instanceof ImageValidationError) throw err;
    // Canvas re-encoding failed for some reason (rare) -- fall back to a
    // raw base64 read so the feature still works.
    return await readAsDataUrlFallback(file);
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}
