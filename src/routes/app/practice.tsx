import { useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, XCircle, Timer } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useProfile, useSession } from "@/lib/auth";
import { SUBJECTS } from "@/lib/curriculum";
import { createQuiz, type QuizQuestion } from "@/lib/quiz.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/app/practice")({
  head: () => ({
    meta: [
      { title: "Practice & CBT mode — PassSabi AI" },
      {
        name: "description",
        content:
          "Generate exam-style practice questions with instant marking, explanations and a timed CBT mode for WAEC, NECO and JAMB.",
      },
      { property: "og:title", content: "Practice & CBT mode — PassSabi AI" },
      {
        property: "og:description",
        content: "Timed, exam-style multiple choice practice with explanations after every question.",
      },
    ],
  }),
  component: PracticePage,
});

type Phase = "setup" | "quiz" | "result";

function PracticePage() {
  const { user } = useSession();
  const { data: profile } = useProfile(user);
  const generate = useServerFn(createQuiz);
  const qc = useQueryClient();

  const [phase, setPhase] = useState<Phase>("setup");
  const [subject, setSubject] = useState<string>("Mathematics");
  const [topic, setTopic] = useState("");
  const [count, setCount] = useState("5");
  const [difficulty, setDifficulty] = useState<"easy" | "medium" | "hard">("medium");
  const [timed, setTimed] = useState(false);
  const [loading, setLoading] = useState(false);

  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<(number | null)[]>([]);
  const [revealed, setRevealed] = useState(false);
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    if (profile?.subjects?.length) setSubject(profile.subjects[0]!);
  }, [profile?.subjects]);

  useEffect(() => {
    if (phase !== "quiz") return;
    const t = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [phase]);

  const score = useMemo(
    () => answers.filter((a, i) => a !== null && a === questions[i]?.answerIndex).length,
    [answers, questions],
  );

  async function start() {
    setLoading(true);
    try {
      const data = await generate({
        data: {
          subject,
          topic: topic.trim() || undefined,
          count: Number(count),
          difficulty,
          exam: profile?.exam ?? undefined,
          classYear: profile?.class_year ?? undefined,
        },
      });
      if (!data.length) throw new Error("empty");
      setQuestions(data);
      setAnswers(Array(data.length).fill(null));
      setIndex(0);
      setRevealed(false);
      setSeconds(0);
      setPhase("quiz");
    } catch {
      toast.error("Couldn't generate questions right now. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function finish(finalAnswers: (number | null)[]) {
    const correct = finalAnswers.filter(
      (a, i) => a !== null && a === questions[i]?.answerIndex,
    ).length;
    setPhase("result");
    if (!user) return;
    await supabase.from("practice_attempts").insert({
      user_id: user.id,
      subject,
      topic: topic.trim() || null,
      score: correct,
      total: questions.length,
      duration_seconds: seconds,
      mode: timed ? "cbt" : "quiz",
    });
    qc.invalidateQueries({ queryKey: ["recent-attempts"] });
    qc.invalidateQueries({ queryKey: ["attempts"] });
  }

  function choose(optionIndex: number) {
    if (revealed && !timed) return;
    const next = [...answers];
    next[index] = optionIndex;
    setAnswers(next);
    if (!timed) setRevealed(true);
  }

  function advance() {
    if (index + 1 < questions.length) {
      setIndex(index + 1);
      setRevealed(false);
    } else {
      finish(answers);
    }
  }

  if (phase === "setup") {
    return (
      <main className="mx-auto max-w-xl px-5 py-8">
        <h1 className="text-2xl font-bold">Practice</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Fresh exam-style questions generated for your level — with explanations.
        </p>

        <div className="surface-card mt-6 space-y-5 p-5">
          <div className="space-y-2">
            <Label>Subject</Label>
            <Select value={subject} onValueChange={setSubject}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SUBJECTS.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="topic">Topic (optional)</Label>
            <Input
              id="topic"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="e.g. Quadratic equations"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Questions</Label>
              <Select value={count} onValueChange={setCount}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {["5", "10", "15", "20"].map((n) => (
                    <SelectItem key={n} value={n}>
                      {n}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Difficulty</Label>
              <Select
                value={difficulty}
                onValueChange={(v) => setDifficulty(v as typeof difficulty)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="easy">Easy</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="hard">Hard</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setTimed(false)}
              className={cn(
                "flex-1 rounded-xl border px-4 py-3 text-sm",
                !timed ? "border-primary bg-primary-soft" : "border-border text-muted-foreground",
              )}
            >
              Practice mode
              <span className="block text-xs text-muted-foreground">Explain after each answer</span>
            </button>
            <button
              type="button"
              onClick={() => setTimed(true)}
              className={cn(
                "flex-1 rounded-xl border px-4 py-3 text-sm",
                timed ? "border-primary bg-primary-soft" : "border-border text-muted-foreground",
              )}
            >
              CBT mode
              <span className="block text-xs text-muted-foreground">Answer all, mark at the end</span>
            </button>
          </div>

          <Button className="w-full" onClick={start} disabled={loading}>
            {loading ? "Generating questions…" : "Start practice"}
          </Button>
        </div>
      </main>
    );
  }

  if (phase === "quiz") {
    const q = questions[index]!;
    const selected = answers[index];
    return (
      <main className="mx-auto max-w-2xl px-5 py-6">
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>
            Question {index + 1} of {questions.length}
          </span>
          <span className="flex items-center gap-1">
            <Timer className="size-4" />
            {Math.floor(seconds / 60)}:{String(seconds % 60).padStart(2, "0")}
          </span>
        </div>
        <Progress value={((index + 1) / questions.length) * 100} className="mt-3 h-1.5" />

        <h1 className="mt-6 text-lg font-semibold leading-snug">{q.question}</h1>

        <div className="mt-5 space-y-3">
          {q.options.map((opt, i) => {
            const isCorrect = revealed && i === q.answerIndex;
            const isWrong = revealed && selected === i && i !== q.answerIndex;
            return (
              <button
                key={i}
                onClick={() => choose(i)}
                className={cn(
                  "flex w-full items-center gap-3 rounded-2xl border px-4 py-3 text-left text-sm transition-colors",
                  isCorrect && "border-success bg-success/10",
                  isWrong && "border-destructive bg-destructive/10",
                  !revealed && selected === i && "border-primary bg-primary-soft",
                  !isCorrect && !isWrong && selected !== i && "border-border hover:border-primary/50",
                )}
              >
                <span className="grid size-6 shrink-0 place-items-center rounded-full border border-border text-xs">
                  {String.fromCharCode(65 + i)}
                </span>
                <span className="flex-1">{opt}</span>
                {isCorrect && <CheckCircle2 className="size-4 text-success" />}
                {isWrong && <XCircle className="size-4 text-destructive" />}
              </button>
            );
          })}
        </div>

        {revealed && (
          <div className="surface-card mt-5 p-4 text-sm">
            <p className="font-semibold">Explanation</p>
            <p className="mt-1 text-muted-foreground">{q.explanation}</p>
          </div>
        )}

        <div className="mt-6 flex gap-3">
          <Button
            className="flex-1"
            onClick={advance}
            disabled={selected === null && !timed ? true : selected === null}
          >
            {index + 1 === questions.length ? "Submit" : "Next question"}
          </Button>
        </div>
      </main>
    );
  }

  const percent = Math.round((score / questions.length) * 100);
  return (
    <main className="mx-auto max-w-2xl px-5 py-8">
      <h1 className="text-2xl font-bold">
        You scored {score}/{questions.length}
      </h1>
      <p className="mt-1 text-sm text-muted-foreground">
        {percent >= 70
          ? "Strong work — keep this pace up."
          : "Review the explanations below, then try again to lock it in."}
      </p>
      <Progress value={percent} className="mt-4 h-2" />

      <ul className="mt-6 space-y-4">
        {questions.map((q, i) => {
          const ok = answers[i] === q.answerIndex;
          return (
            <li key={i} className="surface-card p-4">
              <div className="flex items-start gap-2">
                {ok ? (
                  <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-success" />
                ) : (
                  <XCircle className="mt-0.5 size-4 shrink-0 text-destructive" />
                )}
                <div className="text-sm">
                  <p className="font-medium">{q.question}</p>
                  <p className="mt-1 text-muted-foreground">
                    Correct answer: {q.options[q.answerIndex]}
                  </p>
                  <p className="mt-1 text-muted-foreground">{q.explanation}</p>
                </div>
              </div>
            </li>
          );
        })}
      </ul>

      <div className="mt-6 flex gap-3">
        <Button className="flex-1" onClick={() => setPhase("setup")}>
          Practice again
        </Button>
      </div>
    </main>
  );
}
