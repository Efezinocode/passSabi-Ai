import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarDays } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useProfile, useSession } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/app/plan")({
  head: () => ({
    meta: [
      { title: "Weekly study plan — PassSabi AI" },
      {
        name: "description",
        content:
          "A seven-day study plan built around your subjects and exam date, with daily tasks you can tick off as you go.",
      },
      { property: "og:title", content: "Weekly study plan — PassSabi AI" },
      {
        property: "og:description",
        content: "Plan your week subject by subject and track what you've completed.",
      },
    ],
  }),
  component: PlanPage,
});

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

const TASK_TEMPLATES = [
  (s: string) => `Revise core concepts in ${s}`,
  (s: string) => `Work 10 practice questions in ${s}`,
  (s: string) => `Review mistakes from your last ${s} quiz`,
];

function PlanPage() {
  const { user } = useSession();
  const { data: profile } = useProfile(user);
  const qc = useQueryClient();

  const { data: items } = useQuery({
    queryKey: ["plan", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("study_plan_items")
        .select("id,title,subject,day_index,done")
        .order("day_index", { ascending: true });
      return data ?? [];
    },
  });

  async function generatePlan() {
    if (!user) return;
    const subjects = profile?.subjects?.length ? profile.subjects : ["Mathematics", "English Language"];
    const rows = DAYS.flatMap((_, dayIndex) => {
      const subject = subjects[dayIndex % subjects.length]!;
      const template = TASK_TEMPLATES[dayIndex % TASK_TEMPLATES.length]!;
      return [
        { user_id: user.id, title: template(subject), subject, day_index: dayIndex },
        {
          user_id: user.id,
          title: `30-minute tutor session on ${subject}`,
          subject,
          day_index: dayIndex,
        },
      ];
    });
    await supabase.from("study_plan_items").delete().eq("user_id", user.id);
    await supabase.from("study_plan_items").insert(rows);
    qc.invalidateQueries({ queryKey: ["plan"] });
  }

  async function toggle(id: string, done: boolean) {
    await supabase.from("study_plan_items").update({ done }).eq("id", id);
    qc.invalidateQueries({ queryKey: ["plan"] });
  }

  const total = items?.length ?? 0;
  const completed = items?.filter((i) => i.done).length ?? 0;

  return (
    <main className="mx-auto max-w-2xl px-5 py-8">
      <h1 className="text-2xl font-bold">Study plan</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        A week of focused work built around your subjects.
      </p>

      {total > 0 && (
        <div className="surface-card mt-5 p-4">
          <div className="flex justify-between text-sm">
            <span className="font-medium">This week</span>
            <span className="text-muted-foreground">
              {completed}/{total} done
            </span>
          </div>
          <Progress value={(completed / total) * 100} className="mt-2 h-1.5" />
        </div>
      )}

      {total === 0 ? (
        <div className="surface-card mt-6 p-8 text-center">
          <CalendarDays className="mx-auto size-7 text-highlight" />
          <p className="mt-3 font-semibold">No plan yet</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Generate a 7-day plan from your subjects and tick tasks off as you finish them.
          </p>
          <Button className="mt-5" onClick={generatePlan}>
            Generate my plan
          </Button>
        </div>
      ) : (
        <>
          <div className="mt-6 space-y-5">
            {DAYS.map((day, i) => {
              const dayItems = items!.filter((it) => it.day_index === i);
              if (!dayItems.length) return null;
              return (
                <section key={day}>
                  <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                    {day}
                  </h2>
                  <ul className="mt-2 space-y-2">
                    {dayItems.map((it) => (
                      <li key={it.id} className="surface-card flex items-start gap-3 p-4">
                        <Checkbox
                          checked={it.done}
                          onCheckedChange={(v) => toggle(it.id, v === true)}
                          className="mt-0.5"
                        />
                        <div>
                          <p className={cn("text-sm", it.done && "line-through opacity-60")}>
                            {it.title}
                          </p>
                          {it.subject && (
                            <p className="text-xs text-muted-foreground">{it.subject}</p>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                </section>
              );
            })}
          </div>
          <Button variant="secondary" className="mt-6 w-full" onClick={generatePlan}>
            Regenerate plan
          </Button>
        </>
      )}
    </main>
  );
}
