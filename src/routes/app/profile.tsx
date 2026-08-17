import { useEffect, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { FeedbackDialog } from "@/components/feedback-dialog";
import { LogOut } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { signOut, useInvalidateProfile, useProfile, useSession } from "@/lib/auth";
import { EXAMS, EXPLANATION_LEVELS, SUBJECTS, CLASS_YEARS } from "@/lib/curriculum";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/app/profile")({
  head: () => ({
    meta: [
      { title: "Profile & settings — PassSabi AI" },
      {
        name: "description",
        content:
          "Update your exam, class, subjects, target score and how the PassSabi AI tutor explains things to you.",
      },
      { property: "og:title", content: "Profile & settings — PassSabi AI" },
      {
        property: "og:description",
        content: "Manage your study profile, subjects and tutor explanation style.",
      },
    ],
  }),
  component: ProfilePage,
});

function ProfilePage() {
  const navigate = useNavigate();
  const { user } = useSession();
  const { data: profile } = useProfile(user);
  const invalidateProfile = useInvalidateProfile();

  const [fullName, setFullName] = useState("");
  const [classYear, setClassYear] = useState("SS 3");
  const [exam, setExam] = useState("waec");
  const [examDate, setExamDate] = useState("");
  const [target, setTarget] = useState("");
  const [explanation, setExplanation] = useState("balanced");
  const [subjects, setSubjects] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!profile) return;
    setFullName(profile.full_name ?? "");
    setClassYear(profile.class_year ?? "SS 3");
    setExam(profile.exam ?? "waec");
    setExamDate(profile.exam_date ?? "");
    setTarget(profile.target_score ?? "");
    setExplanation(profile.explanation_level ?? "balanced");
    setSubjects(profile.subjects ?? []);
  }, [profile]);

  async function save() {
    if (!user) return;
    setBusy(true);
    const { error } = await supabase
      .from("profiles")
      .update({
        full_name: fullName || null,
        class_year: classYear,
        exam,
        exam_date: examDate || null,
        target_score: target || null,
        explanation_level: explanation,
        subjects,
      })
      .eq("id", user.id);
    setBusy(false);
    if (error) {
      toast.error("Could not save your changes.");
      return;
    }
    await invalidateProfile();
    toast.success("Profile updated");
  }

  return (
    <main className="mx-auto max-w-xl px-5 py-8">
      <h1 className="text-2xl font-bold">Profile</h1>
      <p className="mt-1 text-sm text-muted-foreground">{user?.email}</p>

      <div className="surface-card mt-6 space-y-5 p-5">
        <div className="space-y-2">
          <Label htmlFor="name">Full name</Label>
          <Input id="name" value={fullName} onChange={(e) => setFullName(e.target.value)} />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label>Exam</Label>
            <Select value={exam} onValueChange={setExam}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {EXAMS.map((e) => (
                  <SelectItem key={e.id} value={e.id}>
                    {e.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Class</Label>
            <Select value={classYear} onValueChange={setClassYear}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CLASS_YEARS.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label htmlFor="date">Exam date</Label>
            <Input
              id="date"
              type="date"
              value={examDate}
              onChange={(e) => setExamDate(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="target">Target</Label>
            <Input id="target" value={target} onChange={(e) => setTarget(e.target.value)} />
          </div>
        </div>

        <div className="space-y-2">
          <Label>Explanation style</Label>
          <Select value={explanation} onValueChange={setExplanation}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {EXPLANATION_LEVELS.map((l) => (
                <SelectItem key={l.id} value={l.id}>
                  {l.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Subjects</Label>
          <div className="flex flex-wrap gap-2">
            {SUBJECTS.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() =>
                  setSubjects((prev) =>
                    prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s],
                  )
                }
                className={cn(
                  "rounded-full border px-3 py-1.5 text-xs transition-colors",
                  subjects.includes(s)
                    ? "border-primary bg-primary-soft text-foreground"
                    : "border-border text-muted-foreground",
                )}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        <Button className="w-full" onClick={save} disabled={busy}>
          {busy ? "Saving…" : "Save changes"}
        </Button>
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
        <Link to="/about" className="hover:text-foreground">
          About PassSabi AI
        </Link>
        <Link to="/contact" className="hover:text-foreground">
          Contact & support
        </Link>
        <FeedbackDialog
          trigger={
            <button type="button" className="hover:text-foreground">
              Send feedback
            </button>
          }
        />
      </div>

      <Button
        variant="ghost"
        className="mt-4 w-full text-muted-foreground"
        onClick={async () => {
          await signOut();
          navigate({ to: "/auth" });
        }}
      >
        <LogOut className="size-4" /> Sign out
      </Button>
    </main>
  );
}
