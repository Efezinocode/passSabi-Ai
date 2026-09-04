import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import { buildSystemPrompt } from "@/lib/tutor-prompt";
import { GeminiError, geminiKey, streamGeminiAsOpenAISSE } from "@/lib/gemini.server";
import { GroqError, groqKey, streamGroqSSE } from "@/lib/groq.server";


type Body = {
  messages?: { role: "user" | "assistant"; content: string }[];
  context?: Record<string, unknown>;
};

export const Route = createFileRoute("/api/tutor")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const token = request.headers.get("authorization")?.replace("Bearer ", "");
        if (!token) return new Response("Unauthorized", { status: 401 });

        const supabase = createClient(
          process.env["SUPABASE_URL"]!,
          process.env["SUPABASE_PUBLISHABLE_KEY"]!,
          { auth: { persistSession: false, autoRefreshToken: false } },
        );
        const { data: userData } = await supabase.auth.getUser(token);
        if (!userData?.user) return new Response("Unauthorized", { status: 401 });

        const body = (await request.json()) as Body;
        const messages = (body.messages ?? []).slice(-20);
        if (!messages.length) return new Response("No messages", { status: 400 });

        const system = buildSystemPrompt({
          mode: String(body.context?.["mode"] ?? "tutor"),
          name: (body.context?.["name"] as string) ?? null,
          exam: (body.context?.["exam"] as string) ?? null,
          classYear: (body.context?.["classYear"] as string) ?? null,
          subject: (body.context?.["subject"] as string) ?? null,
          subjects: (body.context?.["subjects"] as string[]) ?? [],
          explanationLevel: (body.context?.["explanationLevel"] as string) ?? null,
        });

        const sseHeaders = {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          Connection: "keep-alive",
        };

        const gKey = groqKey();
        if (gKey) {
          try {
            const stream = await streamGroqSSE({ system, messages, key: gKey });
            return new Response(stream, { headers: sseHeaders });
          } catch (err) {
            const status = err instanceof GroqError ? err.status : 500;
            const message =
              err instanceof GroqError ? err.message : "The tutor could not respond. Please try again.";
            return new Response(message, { status });
          }
        }

        const key = geminiKey();
        if (key) {

          try {
            const stream = await streamGeminiAsOpenAISSE({ system, messages, key });
            return new Response(stream, {
              headers: {
                "Content-Type": "text/event-stream",
                "Cache-Control": "no-cache",
                Connection: "keep-alive",
              },
            });
          } catch (err) {
            const status = err instanceof GeminiError ? err.status : 500;
            const message =
              err instanceof GeminiError ? err.message : "The tutor could not respond. Please try again.";
            return new Response(message, { status });
          }
        }

        const upstream = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${process.env["LOVABLE_API_KEY"]}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "google/gemini-3.5-flash",
            stream: true,
            messages: [{ role: "system", content: system }, ...messages],
          }),
        });

        if (upstream.status === 429)
          return new Response("Too many requests right now. Try again shortly.", {
            status: 429,
          });
        if (upstream.status === 402)
          return new Response("AI credits exhausted. Please top up to continue.", {
            status: 402,
          });
        if (!upstream.ok || !upstream.body) {
          const detail = await upstream.text().catch(() => "");
          console.error("AI gateway error", upstream.status, detail);
          return new Response("The tutor could not respond. Please try again.", {
            status: 500,
          });
        }

        return new Response(upstream.body, {
          headers: {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache",
            Connection: "keep-alive",
          },
        });
      },
    },
  },
});
