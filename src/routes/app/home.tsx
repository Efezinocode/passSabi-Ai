import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  MessageCircleQuestion,
  Target,
  Lightbulb,
  CalendarDays,
  Timer,
  BookOpenCheck,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useProfile, useSession } from "@/lib/auth";
import { daysUntil, examLabel, greeting } from "@/lib/curriculum";
import { Logo } from "@/components/brand";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";

export const Route = createFileRoute("/app/home")({
  head: () => ({
    meta: [
      { title: "Study dashboard — PassSabi AI" },
      {
        name: "description",
        content:
          "Your PassSabi study dashboard: exam countdown, today's recommended action, recent tutor chats, weak subjects and practice history.",
      },
      { property: "og:title", content: "Study dashboard — PassSabi AI" },
      {
        property: "og:description",
        content: "See what to study today, continue your last lesson and track weak subjects.",
      },
    ],
  }),
  component: HomePage,
});

const QUICK_ACTIONS = [
  { to: "/app/chat", label: "Ask", hint: "Ask anything", icon: MessageCircleQuestion },
  { to: "/app/practice", label: "Practice", hint: "Test yourself", icon: Target },
  { to: "/app/chat", label: "Explain", hint: "Break down a topic", icon: Lightbulb },
  { to: "/app/plan", label: "Plan", hint: "Build your schedule", icon: CalendarDays },
  { to: "/app/practice", label: "CBT", hint: "Timed exam practice", icon: Timer },
  { to: "/app/progress", label: "Progress", hint: "See your growth", icon: BookOpenCheck },
] as const;

function HomePage() {
  const { user } = useSession();
  const { data: profile } = useProfile(user);

  const { data: sessions } = useQuery({
    queryKey: ["recent-sessions", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("chat_sessions")
        .select("id,title,subject,updated_at")
        .order("updated_at", { ascending: false })
        .limit(3);
      return data ?? [];
    },
  });

  const { data: attempts } = useQuery({
    queryKey: ["recent-attempts", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("practice_attempts")
        .select("id,subject,score,total,created_at")
        .order("created_at", { ascending: false })
        .limit: undefined as never,
    },
  });

  const firstName = profile?.full_name?.split(" ")[0] ?? "there";
  const exam = examLabel(profile?.exam);
  const countdown = daysUntil(profile?.exam_date);
  const subjects = profile?.subjects ?? [];

  const weak = (attempts ?? [])
    .filter((a) => a.total > 0 && a.score / a.total < 0.6)
    .slice(0, 3);

  return (
    <main className="mx-auto max-w-3xl px-5 py-6">
      <header className="flex items-center justify-between">
        <Logo />
        <Link to="/app/profile">
          <span className="grid size-9 place-items-center rounded-full bg-primary-soft text-sm font-semibold">
            {firstName.charAt(0).toUpperCase()}
          </span>
        </Link>
      </header>

      <section className="hero-gradient mt-6 rounded-3xl border border-border p-6 shadow-[var(--shadow-lift)]">
        <p className="text-sm text-muted-foreground">{greeting()} 👋</p>
        <h1 className="mt-1 text-2xl font-bold">
          Ready to improve your {subjects[0] ?? "studies"} today, {firstName}?
        </h1>
        <div className="mt-5 flex flex-wrap gap-2 text-xs">
          {exam && (
            <span className="rounded-full bg-surface/70 px-3 py-1 font-medium">{exam}</span>
          )}
          {countdown !== null && (
            <span className="rounded-full bg-highlight/15 px-3 py-1 font-medium text-highlight">
              {countdown} days to exam
            </span>
          )}
          {profile?.target_score && (
            <span className="rounded-full bg-surface/70 px-3 py-1 font-medium">
              Target: {profile.target_score}
            </span>
          )}
        </div>
        <Link to="/app/chat" className="mt-6 block">
          <Button className="w-full sm:w-auto">Start today's study session</Button>
        </Link>
      </section>

      <section className="mt-6">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Quick actions
        </h2>
        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {QUICK_ACTIONS.map((a) => (
            <Link key={a.label} to={a.to} className="surface-card p-4 transition-colors hover:border-primary/60">
              <a.icon className="size-5 text-highlight" />
              <p className="mt-3 font-semibold">{a.label}</p>
              <p className="text-xs text-muted-foreground">{a.hint}</p>
            </Link>
          ))}
        </div>
      </section>

      {subjects.length > 0 && (
        <section className="mt-6">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Your subjects
          </h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {subjects.map((s) => (
              <span key={s} className="rounded-full border border-border px-3 py-1 text-xs">
                {s}
              </span>
            ))}
          </div>
        </section>
      )}

      <section className="mt-6 grid gap-4 sm:grid-cols-2">
        <div className="surface-card p-5">
          <h2 className="font-semibold">Continue learning</h2>
          {sessions?.length ? (
            <ul className="mt-3 space-y-2 text-sm">
              {sessions.map((s) => (
                <li key={s.id}>
                  <Link
                    to="/app/chat"
                    search={{ session: s.id }}
                    className="block truncate rounded-lg px-2 py-2 hover:bg-accent"
                  >
                    {s.title}
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-sm text-muted-foreground">
              No lessons yet. Ask your first question and PassSabi will keep the thread here.
            </p>
          )}
        </div>

        <div className="surface-card p-5">
          <h2 className="font-semibold">Needs attention</h2>
          {weak.length ? (
            <ul className="mt-3 space-y-3 text-sm">
              {weak.map((a) => (
                <li key={a.id}>
                  <div className="flex justify-between">
                    <span>{a.subject}</span>
                    <span className="text-muted-foreground">
                      {a.score}/{a.total}
                    </span>
                  </div>
                  <Progress value={(a.score / a.total) * 100} className="mt-1.5 h-1.5" />
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-sm text-muted-foreground">
              Take a quick quiz and PassSabi will show the topics to focus on.
            </p>
          )}
        </div>
      </section>
    </main>
  );
}
