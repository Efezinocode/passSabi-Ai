import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useInvalidateProfile, useProfile, useSession } from "@/lib/auth";
import {
  CLASS_YEARS,
  EDUCATION_LEVELS,
  EXAMS,
  EXPLANATION_LEVELS,
  SUBJECTS,
} from "@/lib/curriculum";
import { Logo } from "@/components/brand";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/onboarding")({
  head: () => ({
    meta: [
      { title: "Set up your study profile — PassSabi AI" },
      {
        name: "description",
        content:
          "Tell PassSabi AI your exam, class and subjects so your dashboard, tutor and practice questions match what you're studying.",
      },
      { property: "og:title", content: "Set up your study profile — PassSabi AI" },
      {
        property: "og:description",
        content: "Choose your exam, subjects and target score to personalise your study plan.",
      },
    ],
  }),
  component: Onboarding,
});

function Chip({
  active,
  children,
  onClick,
}: {
  active: boolean;
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-2xl border px-4 py-3 text-left text-sm transition-colors",
        active
          ? "border-primary bg-primary-soft text-foreground"
          : "border-border bg-card text-muted-foreground hover:border-primary/50",
      )}
    >
      {children}
    </button>
  );
}

function Onboarding() {
  const navigate = useNavigate();
  const { user, loading } = useSession();
  const { data: profile } = useProfile(user);
  const invalidateProfile = useInvalidateProfile();

  const [step, setStep] = useState(0);
  const [level, setLevel] = useState<string>("Senior Secondary");
  const [classYear, setClassYear] = useState<string>("SS 3");
  const [exam, setExam] = useState<string>("waec");
  const [examDate, setExamDate] = useState<string>("");
  const [subjects, setSubjects] = useState<string[]>([]);
  const [target, setTarget] = useState("");
  const [explanation, setExplanation] = useState("balanced");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/auth" });
  }, [loading, user, navigate]);

  useEffect(() => {
    if (profile?.onboarded) navigate({ to: "/app/home" });
  }, [profile, navigate]);

  async function save(skip = false) {
    if (!user) return;
    setBusy(true);
    const payload = skip
      ? { onboarded: true }
      : {
          education_level: level,
          class_year: classYear,
          exam,
          exam_date: examDate || null,
          subjects,
          target_score: target || null,
          explanation_level: explanation,
          onboarded: true,
        };
    const { error } = await supabase.from("profiles").update(payload).eq("id", user.id);
    setBusy(false);
    if (error) {
      toast.error("Could not save your profile. Try again.");
      return;
    }
    await invalidateProfile();
    navigate({ to: "/app/home" });
  }

  const steps = [
    {
      title: "What are you preparing for?",
      body: (
        <div className="grid grid-cols-2 gap-3">
          {EXAMS.map((e) => (
            <Chip key={e.id} active={exam === e.id} onClick={() => setExam(e.id)}>
              <span className="block font-semibold text-foreground">{e.label}</span>
              <span className="block text-xs">{e.blurb}</span>
            </Chip>
          ))}
        </div>
      ),
    },
    {
      title: "Where are you in school?",
      body: (
        <div className="space-y-5">
          <div className="grid grid-cols-2 gap-3">
            {EDUCATION_LEVELS.map((l) => (
              <Chip key={l} active={level === l} onClick={() => setLevel(l)}>
                <span className="font-semibold text-foreground">{l}</span>
              </Chip>
            ))}
          </div>
          <div className="grid grid-cols-3 gap-2">
            {CLASS_YEARS.map((c) => (
              <Chip key={c} active={classYear === c} onClick={() => setClassYear(c)}>
                <span className="font-semibold text-foreground">{c}</span>
              </Chip>
            ))}
          </div>
        </div>
      ),
    },
    {
      title: "Which subjects do you want help with?",
      body: (
        <div className="grid grid-cols-2 gap-2">
          {SUBJECTS.map((s) => (
            <Chip
              key={s}
              active={subjects.includes(s)}
              onClick={() =>
                setSubjects((prev) =>
                  prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s],
                )
              }
            >
              <span className="font-medium text-foreground">{s}</span>
            </Chip>
          ))}
        </div>
      ),
    },
    {
      title: "Your goal and study style",
      body: (
        <div className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="target">Target score or grade</Label>
            <Input
              id="target"
              value={target}
              onChange={(e) => setTarget(e.target.value)}
              placeholder="e.g. 300 in JAMB, or A1 in Maths"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="date">Exam date (optional)</Label>
            <Input
              id="date"
              type="date"
              value={examDate}
              onChange={(e) => setExamDate(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>How should the tutor explain things?</Label>
            <div className="grid gap-2">
              {EXPLANATION_LEVELS.map((l) => (
                <Chip
                  key={l.id}
                  active={explanation === l.id}
                  onClick={() => setExplanation(l.id)}
                >
                  <span className="block font-semibold text-foreground">{l.label}</span>
                  <span className="block text-xs">{l.blurb}</span>
                </Chip>
              ))}
            </div>
          </div>
        </div>
      ),
    },
  ];

  const current = steps[step]!;
  const isLast = step === steps.length - 1;

  return (
    <main className="mx-auto flex min-h-screen max-w-lg flex-col px-5 py-8">
      <div className="flex items-center justify-between">
        <Logo />
        <button
          className="text-sm text-muted-foreground underline"
          onClick={() => save(true)}
          disabled={busy}
        >
          Skip
        </button>
      </div>

      <div className="mt-8 flex gap-1.5">
        {steps.map((_, i) => (
          <span
            key={i}
            className={cn(
              "h-1 flex-1 rounded-full",
              i <= step ? "bg-primary" : "bg-muted",
            )}
          />
        ))}
      </div>

      <h1 className="mt-8 text-2xl font-bold">{current.title}</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Step {step + 1} of {steps.length} — this shapes your dashboard and tutor.
      </p>

      <div className="mt-6 flex-1">{current.body}</div>

      <div className="sticky bottom-0 mt-8 flex gap-3 bg-background/90 py-4 backdrop-blur">
        {step > 0 && (
          <Button variant="secondary" className="flex-1" onClick={() => setStep(step - 1)}>
            Back
          </Button>
        )}
        <Button
          className="flex-1"
          disabled={busy}
          onClick={() => (isLast ? save() : setStep(step + 1))}
        >
          {isLast ? (busy ? "Saving…" : "Finish setup") : "Continue"}
        </Button>
      </div>
    </main>
  );
}
