import { useEffect, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, SendHorizonal, Sparkles, PanelLeft } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useProfile, useSession } from "@/lib/auth";
import { SUBJECTS, TUTOR_MODES } from "@/lib/curriculum";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { ChatMarkdown } from "@/components/chat-markdown";
import { cn } from "@/lib/utils";

type ChatMessage = { id: string; role: "user" | "assistant"; content: string };

export const Route = createFileRoute("/app/chat")({
  validateSearch: (search: Record<string, unknown>): { session?: string | undefined } => ({
    session: typeof search["session"] === "string" ? search["session"] : undefined,
  }),
  head: () => ({
    meta: [
      { title: "AI tutor chat — PassSabi AI" },
      {
        name: "description",
        content:
          "Chat with the PassSabi AI tutor in study, quiz, exam or step-by-step mode for WAEC, NECO and JAMB subjects.",
      },
      { property: "og:title", content: "AI tutor chat — PassSabi AI" },
      {
        property: "og:description",
        content: "Ask questions, get worked solutions and practice with an AI tutor built for Nigerian exams.",
      },
    ],
  }),
  component: ChatPage,
});

const STARTERS = [
  "Explain photosynthesis like I'm in SS1",
  "Solve: 2x² − 5x − 3 = 0 step by step",
  "Quiz me on Nigerian government structures",
  "Summarise the causes of the First World War",
];

function ChatPage() {
  const { session: authSession, user } = useSession();
  const { data: profile } = useProfile(user);
  const qc = useQueryClient();
  const search = Route.useSearch();
  const navigate = Route.useNavigate();

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [mode, setMode] = useState("tutor");
  const [subject, setSubject] = useState<string>("general");
  const [streaming, setStreaming] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const sessionId = search.session ?? null;

  const { data: sessions } = useQuery({
    queryKey: ["sessions", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("chat_sessions")
        .select("id,title,updated_at")
        .order("updated_at", { ascending: false })
        .limit(40);
      return data ?? [];
    },
  });

  useEffect(() => {
    if (!sessionId) {
      setMessages([]);
      return;
    }
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("chat_messages")
        .select("id,role,content")
        .eq("session_id", sessionId)
        .order("created_at", { ascending: true });
      if (!cancelled) setMessages((data ?? []) as ChatMessage[]);
    })();
    return () => {
      cancelled = true;
    };
  }, [sessionId]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, streaming]);

  async function ensureSession(firstMessage: string) {
    if (sessionId) return sessionId;
    const { data, error } = await supabase
      .from("chat_sessions")
      .insert({
        user_id: user!.id,
        title: firstMessage.slice(0, 60),
        mode,
        subject: subject === "general" ? null : subject,
      })
      .select("id")
      .single();
    if (error || !data) throw error ?? new Error("Could not start chat");
    navigate({ search: { session: data.id }, replace: true });
    qc.invalidateQueries({ queryKey: ["sessions"] });
    return data.id as string;
  }

  async function send(text: string) {
    const content = text.trim();
    if (!content || streaming || !user) return;
    setInput("");
    const outgoing: ChatMessage[] = [
      ...messages,
      { id: crypto.randomUUID(), role: "user", content },
    ];
    setMessages(outgoing);
    setStreaming(true);

    try {
      const sid = await ensureSession(content);
      await supabase
        .from("chat_messages")
        .insert({ session_id: sid, user_id: user.id, role: "user", content });

      const response = await fetch("/api/tutor", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authSession?.access_token ?? ""}`,
        },
        body: JSON.stringify({
          messages: outgoing.map((m) => ({ role: m.role, content: m.content })),
          context: {
            mode,
            name: profile?.full_name,
            exam: profile?.exam,
            classYear: profile?.class_year,
            subject: subject === "general" ? null : subject,
            subjects: profile?.subjects ?? [],
            explanationLevel: profile?.explanation_level,
          },
        }),
      });

      if (!response.ok || !response.body) {
        toast.error(await response.text());
        setStreaming(false);
        return;
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      const assistantId = crypto.randomUUID();
      let acc = "";
      let buffer = "";
      setMessages((prev) => [...prev, { id: assistantId, role: "assistant", content: "" }]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const payload = line.slice(6).trim();
          if (payload === "[DONE]") continue;
          try {
            const json = JSON.parse(payload);
            const delta = json.choices?.[0]?.delta?.content;
            if (delta) {
              acc += delta;
              setMessages((prev) =>
                prev.map((m) => (m.id === assistantId ? { ...m, content: acc } : m)),
              );
            }
          } catch {
            /* partial chunk */
          }
        }
      }

      if (acc) {
        await supabase
          .from("chat_messages")
          .insert({ session_id: sid, user_id: user.id, role: "assistant", content: acc });
        await supabase
          .from("chat_sessions")
          .update({ updated_at: new Date().toISOString() })
          .eq("id", sid);
        qc.invalidateQueries({ queryKey: ["sessions"] });
        qc.invalidateQueries({ queryKey: ["recent-sessions"] });
      }
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setStreaming(false);
    }
  }

  const sessionList = (
    <nav className="space-y-1">
      <button
        onClick={() => navigate({ search: {}, replace: true })}
        className="flex w-full items-center gap-2 rounded-xl border border-border px-3 py-2.5 text-sm font-medium hover:border-primary/60"
      >
        <Plus className="size-4" /> New chat
      </button>
      {sessions?.map((s) => (
        <button
          key={s.id}
          onClick={() => navigate({ search: { session: s.id }, replace: true })}
          className={cn(
            "block w-full truncate rounded-xl px-3 py-2 text-left text-sm transition-colors",
            sessionId === s.id
              ? "bg-accent text-accent-foreground"
              : "text-muted-foreground hover:bg-accent/60",
          )}
        >
          {s.title}
        </button>
      ))}
    </nav>
  );

  return (
    <div className="flex h-[100dvh] flex-col md:h-screen">
      <header className="flex items-center gap-2 border-b border-border px-4 py-3">
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" aria-label="Chat history">
              <PanelLeft className="size-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-80 overflow-y-auto p-4">
            <SheetTitle className="mb-4">Your chats</SheetTitle>
            {sessionList}
          </SheetContent>
        </Sheet>

        <Select value={mode} onValueChange={setMode}>
          <SelectTrigger className="h-9 w-[9.5rem] text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {TUTOR_MODES.map((m) => (
              <SelectItem key={m.id} value={m.id}>
                {m.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={subject} onValueChange={setSubject}>
          <SelectTrigger className="h-9 w-[8.5rem] text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="general">Any subject</SelectItem>
            {SUBJECTS.map((s) => (
              <SelectItem key={s} value={s}>
                {s}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </header>

      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-6">
        <div className="mx-auto max-w-2xl space-y-4">
          {messages.length === 0 && (
            <div className="pt-6 text-center">
              <Sparkles className="mx-auto size-7 text-highlight" />
              <h1 className="mt-3 text-xl font-bold">What are we studying today?</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Ask in English or Pidgin — PassSabi will teach step by step.
              </p>
              <div className="mt-5 grid gap-2 text-left">
                {STARTERS.map((s) => (
                  <button
                    key={s}
                    onClick={() => send(s)}
                    className="surface-card px-4 py-3 text-sm text-muted-foreground hover:border-primary/60"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((m) => (
            <div
              key={m.id}
              className={cn(
                "max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed",
                m.role === "user"
                  ? "ml-auto whitespace-pre-wrap bg-primary text-primary-foreground"
                  : "mr-auto border border-border bg-card",
              )}
            >
              {m.role === "user" ? (
                m.content
              ) : m.content ? (
                <ChatMarkdown content={m.content} />
              ) : (
                "…"
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="border-t border-border px-4 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
        <form
          className="mx-auto flex max-w-2xl items-end gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            send(input);
          }}
        >
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send(input);
              }
            }}
            placeholder="Ask PassSabi anything…"
            rows={1}
            className="max-h-40 min-h-11 resize-none"
          />
          <Button type="submit" size="icon" disabled={streaming || !input.trim()}>
            <SendHorizonal className="size-4" />
          </Button>
        </form>
      </div>
    </div>
  );
}
