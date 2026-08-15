import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { BarChart3 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/lib/auth";
import { Progress } from "@/components/ui/progress";

export const Route = createFileRoute("/app/progress")({
  head: () => ({
    meta: [
      { title: "Your progress — PassSabi AI" },
      {
        name: "description",
        content:
          "Track quiz accuracy by subject, time studied and every practice attempt so you know exactly where to improve.",
      },
      { property: "og:title", content: "Your progress — PassSabi AI" },
      {
        property: "og:description",
        content: "Accuracy by subject, study time and a full history of your practice attempts.",
      },
    ],
  }),
  component: ProgressPage,
});

function ProgressPage() {
  const { user } = useSession();

  const { data: attempts } = useQuery({
    queryKey: ["attempts", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("practice_attempts")
        .select("id,subject,topic,score,total,duration_seconds,created_at")
        .order("created_at", { ascending: false })
        .limit(100);
      return data ?? [];
    },
  });

  const rows = attempts ?? [];
  const totalQuestions = rows.reduce((n, a) => n + a.total, 0);
  const totalCorrect = rows.reduce((n, a) => n + a.score, 0);
  const minutes = Math.round(rows.reduce((n, a) => n + (a.duration_seconds ?? 0), 0) / 60);
  const accuracy = totalQuestions ? Math.round((totalCorrect / totalQuestions) * 100) : 0;

  const bySubject = Object.values(
    rows.reduce<Record<string, { subject: string; score: number; total: number }>>((acc, a) => {
      const entry = acc[a.subject] ?? { subject: a.subject, score: 0, total: 0 };
      entry.score += a.score;
      entry.total += a.total;
      acc[a.subject] = entry;
      return acc;
    }, {}),
  ).sort((a, b) => a.score / a.total - b.score / b.total);

  return (
    <main className="mx-auto max-w-2xl px-5 py-8">
      <h1 className="text-2xl font-bold">Progress</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Based on every practice attempt you've completed.
      </p>

      <div className="mt-6 grid grid-cols-3 gap-3">
        {[
          { label: "Accuracy", value: `${accuracy}%` },
          { label: "Questions", value: totalQuestions },
          { label: "Minutes", value: minutes },
        ].map((s) => (
          <div key={s.label} className="surface-card p-4 text-center">
            <p className="text-xl font-bold">{s.value}</p>
            <p className="text-xs text-muted-foreground">{s.label}</p>
          </div>
        ))}
      </div>

      {rows.length === 0 ? (
        <div className="surface-card mt-6 p-8 text-center">
          <BarChart3 className="mx-auto size-7 text-highlight" />
          <p className="mt-3 font-semibold">Nothing to show yet</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Finish a practice set and your accuracy by subject will appear here.
          </p>
        </div>
      ) : (
        <>
          <section className="mt-8">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Accuracy by subject
            </h2>
            <ul className="mt-3 space-y-4">
              {bySubject.map((s) => (
                <li key={s.subject}>
                  <div className="flex justify-between text-sm">
                    <span>{s.subject}</span>
                    <span className="text-muted-foreground">
                      {Math.round((s.score / s.total) * 100)}%
                    </span>
                  </div>
                  <Progress value={(s.score / s.total) * 100} className="mt-1.5 h-1.5" />
                </li>
              ))}
            </ul>
          </section>

          <section className="mt-8">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Recent attempts
            </h2>
            <ul className="mt-3 space-y-2">
              {rows.slice(0, 15).map((a) => (
                <li key={a.id} className="surface-card flex items-center justify-between p-4 text-sm">
                  <div>
                    <p className="font-medium">{a.subject}</p>
                    <p className="text-xs text-muted-foreground">
                      {a.topic ?? "Mixed topics"} ·{" "}
                      {new Date(a.created_at).toLocaleDateString("en-NG", {
                        day: "numeric",
                        month: "short",
                      })}
                    </p>
                  </div>
                  <span className="font-semibold">
                    {a.score}/{a.total}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        </>
      )}
    </main>
  );
}
