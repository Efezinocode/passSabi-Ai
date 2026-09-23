import { useEffect, useRef, useState } from "react";
import type { ChangeEvent } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, SendHorizonal, Sparkles, PanelLeft, ImagePlus, X, Trash2, Copy, ThumbsUp, ThumbsDown } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useProfile, useSession } from "@/lib/auth";
import { SUBJECTS, TUTOR_MODES } from "@/lib/curriculum";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { ChatMarkdown } from "@/components/chat-markdown";
import { cn } from "@/lib/utils";
import type { ContentPart } from "@/lib/chat-types";
import { assertValidImage, fileToDataUrl, ImageValidationError } from "@/lib/image-upload";

type ChatMessage = { id: string; role: "user" | "assistant"; content: string | ContentPart[] };

/** Extracts only the text portion of a message — used for rendering, session titles, and saving to Supabase. */
function textOf(content: string | ContentPart[]): string {
  if (typeof content === "string") return content;
  return content
    .filter((part): part is Extract<ContentPart, { type: "text" }> => part.type === "text")
    .map((part) => part.text)
    .join("\n");
}

export const Route = createFileRoute("/app/chat")({
  validateSearch: (search: Record<string, unknown>): { session?: string | undefined } => ({
    session: typeof search["session"] === "string" ? search["session"] : undefined,
  }),
  head: () => ({
    meta: [
      { title: "AI tutor chat — PassSabi AI" },
      {
        name: "description",
        content: "Chat with the PassSabi AI tutor in study, quiz, exam or step-by-step mode for WAEC, NECO and JAMB subjects.",
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
  const [pendingImage, setPendingImage] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const sessionId = search.session ?? null;

  const { data: sessions } = useQuery({
    queryKey: ["sessions", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("chat_sessions")
        .select("id,title,updated_at")
        .order("updated_at", { ascending: false })
        .limit(40);
      if (error) {
        console.error("Failed to load sessions:", error);
        throw error;
      }
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
      const { data, error } = await supabase
        .from("chat_messages")
        .select("id,role,content")
        .eq("session_id", sessionId)
        .order("created_at", { ascending: true });
      if (error) {
        console.error("Failed to load chat messages:", error);
        if (!cancelled) toast.error("Could not load this chat.");
        return;
      }
      if (!cancelled) setMessages((data ?? []) as ChatMessage[]);
    })();
    return () => {
      cancelled = true;
    };
  }, [sessionId]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, streaming]);

  async function ensureSession(firstMessage: string): Promise<string> {
    if (sessionId) return sessionId;
    if (!user) throw new Error("You must be signed in to start a chat.");

    const { data, error } = await supabase
      .from("chat_sessions")
      .insert({
        user_id: user.id,
        title: firstMessage.trim().slice(0, 60) || "Photo question",
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

  // ------------------------------------------------------------
  // DELETE A CHAT
  // Deletes the session's messages first, then the session row
  // itself, so nothing gets orphaned regardless of whether a
  // cascade rule exists at the database level.
  // ------------------------------------------------------------
  async function deleteSession(idToDelete: string, title: string) {
    const confirmed = window.confirm(`Delete "${title}"? This can't be undone.`);
    if (!confirmed) return;

    setDeletingId(idToDelete);
    try {
      const { error: messagesError } = await supabase
        .from("chat_messages")
        .delete()
        .eq("session_id", idToDelete);
      if (messagesError) throw messagesError;

      const { error: sessionError } = await supabase
        .from("chat_sessions")
        .delete()
        .eq("id", idToDelete);
      if (sessionError) throw sessionError;

      qc.invalidateQueries({ queryKey: ["sessions"] });
      qc.invalidateQueries({ queryKey: ["recent-sessions"] });

      if (sessionId === idToDelete) {
        navigate({ search: {}, replace: true });
      }
    } catch (err) {
      console.error("Failed to delete chat:", err);
      toast.error("Couldn't delete that chat. Please try again.");
    } finally {
      setDeletingId(null);
    }
  }

  const [feedback, setFeedback] = useState<Record<string, "up" | "down">>({});

  async function copyMessage(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Copied");
    } catch {
      toast.error("Couldn't copy — try selecting the text manually.");
    }
  }

  function sendFeedback(messageId: string, type: "up" | "down") {
    // UI-only for now — nothing is saved to Supabase yet. If you want
    // this to actually inform how PassSabi improves, it needs a small
    // feedback table and an insert call here.
    setFeedback((prev) => ({ ...prev, [messageId]: type }));
    toast.success(type === "up" ? "Thanks for the feedback!" : "Thanks — noted.");
  }

  function handleImageButtonClick() {
    if (streaming) return;
    fileInputRef.current?.click();
  }

  async function handleImageSelected(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    try {
      assertValidImage(file);
      const dataUrl = await fileToDataUrl(file);
      setPendingImage(dataUrl);
    } catch (err) {
      const message = err instanceof ImageValidationError ? err.message : "Could not attach that image.";
      toast.error(message);
    }
  }

  async function send(text: string) {
    const content = text.trim();
    const image = pendingImage;
    if ((!content && !image) || streaming || !user) return;

    setInput("");
    setPendingImage(null);
    setStreaming(true);

    const parts: ContentPart[] | null = image
      ? [
          ...(content ? [{ type: "text", text: content } as ContentPart] : []),
          { type: "image_url", image_url: { url: image } } as ContentPart,
        ]
      : null;

    const userMessage: ChatMessage = { id: crypto.randomUUID(), role: "user", content: parts ?? content };

    // The "thinking" placeholder is added right here, before the
    // session is even created or the network request is sent — so
    // it shows immediately on tap, not just during the SSE stream.
    const assistantId = crypto.randomUUID();
    const outgoing: ChatMessage[] = [...messages, userMessage];
    setMessages([...outgoing, { id: assistantId, role: "assistant", content: "" }]);

    try {
      const sid = await ensureSession(content || "Photo question");

      const { error: saveUserError } = await supabase.from("chat_messages").insert({
        session_id: sid,
        user_id: user.id,
        role: "user",
        content: content || "[Photo attached]",
      });
      if (saveUserError) console.error("Failed to save user message:", saveUserError);

      const accessToken = authSession?.access_token;
      if (!accessToken) {
        toast.error("Your session has expired. Please sign in again.");
        return;
      }

      const response = await fetch("/api/tutor", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({
          messages: outgoing.map((message) => ({ role: message.role, content: message.content })),
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
        const errorText = await response.text().catch(() => "The tutor could not respond. Please try again.");
        toast.error(errorText || "The tutor could not respond. Please try again.");
        setMessages(messages);
        return;
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let acc = "";
      let buffer = "";

      const processLine = (line: string) => {
        const trimmed = line.trim();
        if (!trimmed.startsWith("data:")) return;
        const payload = trimmed.slice(5).trim();
        if (!payload || payload === "[DONE]") return;
        try {
          const json = JSON.parse(payload);
          const delta = json.choices?.[0]?.delta?.content;
          if (!delta) return;
          acc += delta;
          setMessages((prev) => prev.map((m) => (m.id === assistantId ? { ...m, content: acc } : m)));
        } catch {
          // ignore malformed/partial SSE payloads
        }
      };

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) processLine(line);
      }
      if (buffer.trim()) processLine(buffer);

      if (acc.trim()) {
        const { error: saveAssistantError } = await supabase.from("chat_messages").insert({
          session_id: sid,
          user_id: user.id,
          role: "assistant",
          content: acc,
        });
        if (saveAssistantError) console.error("Failed to save assistant message:", saveAssistantError);

        await supabase.from("chat_sessions").update({ updated_at: new Date().toISOString() }).eq("id", sid);
        qc.invalidateQueries({ queryKey: ["sessions"] });
        qc.invalidateQueries({ queryKey: ["recent-sessions"] });
      } else {
        setMessages((prev) => prev.filter((m) => m.id !== assistantId));
        toast.error("The tutor returned an empty response. Please try again.");
      }
    } catch (error) {
      console.error("Chat request failed:", error);
      setMessages(messages);
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
        <Plus className="size-4" />
        New chat
      </button>

      {sessions?.map((session) => (
        <div
          key={session.id}
          className={cn(
            "group flex items-center rounded-xl transition-colors",
            sessionId === session.id ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:bg-accent/60",
          )}
        >
          <button
            onClick={() => navigate({ search: { session: session.id }, replace: true })}
            className="min-w-0 flex-1 truncate px-3 py-2 text-left text-sm"
          >
            {session.title}
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              void deleteSession(session.id, session.title);
            }}
            disabled={deletingId === session.id}
            aria-label={`Delete "${session.title}"`}
            className="mr-1 shrink-0 rounded-lg p-2 text-muted-foreground opacity-0 transition-opacity hover:text-destructive focus-visible:opacity-100 group-hover:opacity-100 disabled:opacity-50"
          >
            <Trash2 className="size-3.5" />
          </button>
        </div>
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
            {TUTOR_MODES.map((item) => (
              <SelectItem key={item.id} value={item.id}>
                {item.label}
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
            {SUBJECTS.map((item) => (
              <SelectItem key={item} value={item}>
                {item}
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
                {STARTERS.map((starter) => (
                  <button
                    key={starter}
                    onClick={() => void send(starter)}
                    className="surface-card px-4 py-3 text-sm text-muted-foreground hover:border-primary/60"
                  >
                    {starter}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((message) => {
            const imagePart = Array.isArray(message.content)
              ? message.content.find(
                  (part): part is Extract<ContentPart, { type: "image_url" }> => part.type === "image_url",
                )
              : undefined;
            const text = textOf(message.content);
            const isFinishedAssistantReply = message.role === "assistant" && text.trim().length > 0;

            return (
              <div key={message.id}>
                <div
                  className={cn(
                    "max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed",
                    message.role === "user"
                      ? "ml-auto whitespace-pre-wrap bg-primary text-primary-foreground"
                      : "mr-auto border border-border bg-card",
                  )}
                >
                  {imagePart && (
                    <img src={imagePart.image_url.url} alt="Attached photo" className="mb-2 max-h-48 rounded-lg object-cover" />
                  )}
                  {message.role === "user" ? (
                    text
                  ) : text ? (
                    <ChatMarkdown content={text} />
                  ) : (
                    <span className="flex items-center gap-1 py-1">
                      <span className="size-1.5 animate-bounce rounded-full bg-current" style={{ animationDelay: "0ms" }} />
                      <span className="size-1.5 animate-bounce rounded-full bg-current" style={{ animationDelay: "150ms" }} />
                      <span className="size-1.5 animate-bounce rounded-full bg-current" style={{ animationDelay: "300ms" }} />
                    </span>
                  )}
                </div>

                {isFinishedAssistantReply && (
                  <div className="mr-auto mt-1 flex max-w-[85%] items-center gap-1 text-muted-foreground">
                    <button
                      type="button"
                      onClick={() => void copyMessage(text)}
                      aria-label="Copy response"
                      className="rounded-lg p-1.5 hover:bg-accent/60 hover:text-foreground"
                    >
                      <Copy className="size-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => sendFeedback(message.id, "up")}
                      aria-label="Good response"
                      className={cn(
                        "rounded-lg p-1.5 hover:bg-accent/60 hover:text-foreground",
                        feedback[message.id] === "up" && "text-primary",
                      )}
                    >
                      <ThumbsUp className="size-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => sendFeedback(message.id, "down")}
                      aria-label="Poor response"
                      className={cn(
                        "rounded-lg p-1.5 hover:bg-accent/60 hover:text-foreground",
                        feedback[message.id] === "down" && "text-destructive",
                      )}
                    >
                      <ThumbsDown className="size-3.5" />
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* INPUT AREA — everything lives inside one rounded pill,
          instead of separate floating controls. */}
      <div className="border-t border-border px-4 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
        <div className="mx-auto max-w-2xl">
          {pendingImage && (
            <div className="mb-2 flex items-center gap-2">
              <img src={pendingImage} alt="Selected photo" className="h-14 w-14 rounded-lg object-cover" />
              <button
                type="button"
                onClick={() => setPendingImage(null)}
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                <X className="mr-1 inline size-3" />
                Remove photo
              </button>
            </div>
          )}

          <form
            className="flex items-end gap-1.5 rounded-3xl border border-border bg-card p-1.5 shadow-sm"
            onSubmit={(event) => {
              event.preventDefault();
              void send(input);
            }}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={handleImageSelected}
            />

            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={handleImageButtonClick}
              aria-label="Attach a photo"
              disabled={streaming}
              className="mb-0.5 shrink-0 rounded-full"
            >
              <ImagePlus className="size-4" />
            </Button>

            <Textarea
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  void send(input);
                }
              }}
              placeholder="Ask PassSabi anything…"
              rows={1}
              className="max-h-40 min-h-10 resize-none border-0 bg-transparent px-2 py-2 shadow-none focus-visible:ring-0"
            />

            <Button
              type="submit"
              size="icon"
              disabled={streaming || (!input.trim() && !pendingImage)}
              aria-label="Send message"
              className="mb-0.5 shrink-0 rounded-full"
            >
              <SendHorizonal className="size-4" />
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
