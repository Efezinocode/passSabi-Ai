import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import { buildSystemPrompt } from "@/lib/tutor-prompt";
import {
  GeminiError,
  geminiKey,
  streamGeminiAsOpenAISSE,
} from "@/lib/gemini.server";
import {
  GroqError,
  groqKey,
  streamGroqSSE,
} from "@/lib/groq.server";
import { GROQ_VISION_MODEL, hasImage } from "@/lib/vision.server";
import type { ContentPart } from "@/lib/chat-types";

type Body = {
  messages?: {
    role: "user" | "assistant";
    content: string | ContentPart[];
  }[];
  context?: Record<string, unknown>;
};

export const Route = createFileRoute("/api/tutor")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        // ------------------------------------------------------------
        // 1. AUTHENTICATION
        // ------------------------------------------------------------

        const token = request.headers
          .get("authorization")
          ?.replace("Bearer ", "")
          .trim();

        if (!token) {
          return new Response("Unauthorized", {
            status: 401,
          });
        }

        const supabaseUrl = process.env["SUPABASE_URL"];
        const supabaseKey = process.env["SUPABASE_PUBLISHABLE_KEY"];

        if (!supabaseUrl || !supabaseKey) {
          console.error("Supabase environment variables are missing.");

          return new Response(
            "Server authentication is not configured correctly.",
            {
              status: 500,
            },
          );
        }

        const supabase = createClient(
          supabaseUrl,
          supabaseKey,
          {
            auth: {
              persistSession: false,
              autoRefreshToken: false,
            },
          },
        );

        const { data: userData, error: userError } =
          await supabase.auth.getUser(token);

        if (userError || !userData?.user) {
          return new Response("Unauthorized", {
            status: 401,
          });
        }

        // ------------------------------------------------------------
        // 2. PARSE REQUEST BODY
        // ------------------------------------------------------------

        let body: Body;

        try {
          body = (await request.json()) as Body;
        } catch (error) {
          console.error("Invalid tutor request JSON:", error);

          return new Response("Invalid request body", {
            status: 400,
          });
        }

        const messages = (body.messages ?? []).slice(-20);

        if (!messages.length) {
          return new Response("No messages", {
            status: 400,
          });
        }

        const containsImage = hasImage(messages);

        // ------------------------------------------------------------
        // 3. BUILD SYSTEM PROMPT
        // ------------------------------------------------------------

        const system = buildSystemPrompt({
          mode: String(
            body.context?.["mode"] ?? "tutor",
          ),

          name:
            (body.context?.["name"] as string) ??
            null,

          exam:
            (body.context?.["exam"] as string) ??
            null,

          classYear:
            (body.context?.["classYear"] as string) ??
            null,

          subject:
            (body.context?.["subject"] as string) ??
            null,

          subjects:
            (body.context?.["subjects"] as string[]) ??
            [],

          explanationLevel:
            (body.context?.["explanationLevel"] as string) ??
            null,
        });

        // ------------------------------------------------------------
        // 4. COMMON SSE HEADERS
        // ------------------------------------------------------------

        const sseHeaders = {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache, no-transform",
          Connection: "keep-alive",
          "X-Accel-Buffering": "no",
        };

        // ============================================================
        // PROVIDER 1 — GROQ
        // ============================================================

        const gKey = groqKey();

        if (gKey) {
          try {
            const stream = await streamGroqSSE({
              system,
              messages,
              key: gKey,

              // Use the vision model only when an image exists.
              model: containsImage
                ? GROQ_VISION_MODEL
                : undefined,
            });

            return new Response(stream, {
              headers: sseHeaders,
            });
          } catch (err) {
            const status =
              err instanceof GroqError
                ? err.status
                : 500;

            const message =
              err instanceof GroqError
                ? err.message
                : "The tutor could not respond. Please try again.";

            // If Gemini exists, keep going.
            if (geminiKey()) {
              console.error(
                "Groq failed. Falling back to Gemini.",
                {
                  status,
                  message,
                  containsImage,
                },
              );
            } else {
              return new Response(message, {
                status,
              });
            }
          }
        }

        // ============================================================
        // PROVIDER 2 — GEMINI
        // ============================================================

        const gKeyFallback = geminiKey();

        if (gKeyFallback) {
          try {
            const stream =
              await streamGeminiAsOpenAISSE({
                system,
                messages,
                key: gKeyFallback,
              });

            return new Response(stream, {
              headers: sseHeaders,
            });
          } catch (err) {
            const status =
              err instanceof GeminiError
                ? err.status
                : 500;

            const message =
              err instanceof GeminiError
                ? err.message
                : "The tutor could not respond. Please try again.";

            console.error(
              "Gemini provider failed.",
              {
                status,
                message,
                containsImage,
              },
            );

            // Do NOT immediately return here.
            // We still have one final provider available.
          }
        }

        // ============================================================
        // PROVIDER 3 — LOVABLE AI GATEWAY
        // ============================================================

        const lovableKey =
          process.env["LOVABLE_API_KEY"];

        if (!lovableKey) {
          return new Response(
            "No AI provider is currently configured.",
            {
              status: 503,
            },
          );
        }

        try {
          const upstream = await fetch(
            "https://ai.gateway.lovable.dev/v1/chat/completions",
            {
              method: "POST",

              headers: {
                Authorization: `Bearer ${lovableKey}`,
                "Content-Type": "application/json",
              },

              body: JSON.stringify({
                model: "google/gemini-3.5-flash",
                stream: true,

                messages: [
                  {
                    role: "system",
                    content: system,
                  },
                  ...messages,
                ],
              }),
            },
          );

          if (upstream.status === 429) {
            return new Response(
              "Too many requests right now. Please try again shortly.",
              {
                status: 429,
              },
            );
          }

          if (upstream.status === 402) {
            return new Response(
              "AI credits are exhausted. Please try again later.",
              {
                status: 402,
              },
            );
          }

          if (!upstream.ok || !upstream.body) {
            const detail = await upstream
              .text()
              .catch(() => "");

            console.error(
              "Lovable AI gateway error",
              {
                status: upstream.status,
                detail,
              },
            );

            return new Response(
              "The tutor could not respond. Please try again.",
              {
                status: 500,
              },
            );
          }

          return new Response(
            upstream.body,
            {
              headers: sseHeaders,
            },
          );
        } catch (error) {
          console.error(
            "Lovable AI gateway request failed:",
            error,
          );

          return new Response(
            "The tutor could not respond. Please try again.",
            {
              status: 500,
            },
          );
        }
      },
    },
  },
});
