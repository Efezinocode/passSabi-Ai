import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { FeedbackDialog } from "@/components/feedback-dialog";
import {
  CalendarDays,
  ChevronRight,
  GraduationCap,
  LogOut,
  Mail,
  Pencil,
  ShieldCheck,
  Target as TargetIcon,
  X,
} from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { checkIsAdmin } from "@/lib/admin.functions";
import { signOut, useInvalidateProfile, useProfile, useSession } from "@/lib/auth";
import {
  EXAMS,
  EXPLANATION_LEVELS,
  SUBJECTS,
  CLASS_YEARS,
  EDUCATION_LEVELS,
  examLabel,
  daysUntil,
} from "@/lib/curriculum";
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
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ProfilePage,
});

function initials(name: string | null | undefined, email: string | null | undefined) {
  const source = (name || email || "?").trim();
  const parts = source.split(/[\s@._-]+/).filter(Boolean);
  return (parts[0]?.[0] ?? "?").toUpperCase() + (parts[1]?.[0]?.toUpperCase() ?? "");
}

function formatDate(value?: string | null) {
  if (!value) return null;
  const d = new Date(value + "T00:00:00");
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString(undefined, { day: "numeric", month: "long", year: "numeric" });
}

function Row({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-3 py-3">
      <Icon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
      <div className="min-w-0 flex-1">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="mt-0.5 break-words text-sm font-medium">{value ?? "Not set"}</p>
      </div>
    </div>
  );
}

function ProfilePage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useSession();
  const { data: profile, isLoading } = useProfile(user);
  const invalidateProfile = useInvalidateProfile();
  const isAdminFn = useServerFn(checkIsAdmin);
  const { data: isAdmin } = useQuery({
    queryKey: ["is-admin", user?.id],
    enabled: !!user,
    retry: false,
    queryFn: () => isAdminFn({}),
  });

  const [editing, setEditing] = useState(false);
  const [fullName, setFullName] = useState("");
  const [educationLevel, setEducationLevel] = useState("Senior Secondary");
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
    setEducationLevel(profile.education_level ?? "Senior Secondary");
    setClassYear(profile.class_year ?? "SS 3");
    setExam(profile.exam ?? "waec");
    setExamDate(profile.exam_date ?? "");
    setTarget(profile.target_score ?? "");
    setExplanation(profile.explanation_level ?? "balanced");
    setSubjects(profile.subjects ?? []);
  }, [profile]);

  const countdown = useMemo(() => daysUntil(profile?.exam_date), [profile?.exam_date]);

  async function save() {
    if (!user) return;
    if (subjects.length === 0) {
      toast.error("Pick at least one subject.");
      return;
    }
    setBusy(true);
    const { error } = await supabase
      .from("profiles")
      .update({
        full_name: fullName || null,
        education_level: educationLevel,
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
    setEditing(false);
    toast.success("Profile updated");
  }

  async function handleSignOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await signOut();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <main className="mx-auto max-w-xl px-5 py-8">
      <header className="flex items-center gap-4">
        <div className="grid size-14 shrink-0 place-items-center rounded-2xl bg-primary-soft text-lg font-bold">
          {initials(profile?.full_name, user?.email)}
        </div>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-2xl font-bold">
            {profile?.full_name || "Your profile"}
          </h1>
          <p className="truncate text-sm text-muted-foreground">{user?.email}</p>
        </div>
        <Button
          variant={editing ? "ghost" : "secondary"}
          size="sm"
          onClick={() => setEditing((v) => !v)}
        >
          {editing ? <X className="size-4" /> : <Pencil className="size-4" />}
          {editing ? "Cancel" : "Edit"}
        </Button>
      </header>

      {isLoading ? (
        <div className="surface-card mt-6 animate-pulse p-5 text-sm text-muted-foreground">
          Loading your profile…
        </div>
      ) : !editing ? (
        <>
          <section className="surface-card mt-6 divide-y divide-border px-5 py-1">
            <Row icon={Mail} label="Email" value={user?.email} />
            <Row icon={GraduationCap} label="Education level" value={profile?.education_level} />
            <Row icon={GraduationCap} label="Class" value={profile?.class_year} />
            <Row icon={TargetIcon} label="Exam" value={examLabel(profile?.exam) ?? profile?.exam} />
            <Row
              icon={CalendarDays}
              label="Exam date"
              value={
                profile?.exam_date
                  ? `${formatDate(profile.exam_date)}${countdown !== null ? ` · ${countdown} days to go` : ""}`
                  : null
              }
            />
            <Row icon={TargetIcon} label="Target score" value={profile?.target_score} />
            <Row
              icon={GraduationCap}
              label="Explanation style"
              value={
                EXPLANATION_LEVELS.find((l) => l.id === profile?.explanation_level)?.label ??
                profile?.explanation_level
              }
            />
          </section>

          <section className="surface-card mt-4 p-5">
            <h2 className="text-sm font-semibold">Subjects</h2>
            {profile?.subjects?.length ? (
              <div className="mt-3 flex flex-wrap gap-2">
                {profile.subjects.map((s) => (
                  <span
                    key={s}
                    className="rounded-full border border-primary bg-primary-soft px-3 py-1.5 text-xs"
                  >
                    {s}
                  </span>
                ))}
              </div>
            ) : (
              <p className="mt-2 text-sm text-muted-foreground">No subjects picked yet.</p>
            )}
          </section>
        </>
      ) : (
        <div className="surface-card mt-6 space-y-5 p-5">
          <div className="space-y-2">
            <Label htmlFor="name">Full name</Label>
            <Input id="name" value={fullName} onChange={(e) => setFullName(e.target.value)} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Education level</Label>
              <Select value={educationLevel} onValueChange={setEducationLevel}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {EDUCATION_LEVELS.map((l) => (
                    <SelectItem key={l} value={l}>
                      {l}
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
              <Label htmlFor="target">Target score</Label>
              <Input
                id="target"
                value={target}
                placeholder="e.g. 300+"
                onChange={(e) => setTarget(e.target.value)}
              />
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
      )}

      {isAdmin ? (
        <Link to="/app/admin" className="surface-card mt-4 flex items-center gap-3 p-4">
          <ShieldCheck className="size-5 text-highlight" />
          <span className="flex-1">
            <span className="block text-sm font-semibold">Admin dashboard</span>
            <span className="block text-xs text-muted-foreground">
              Registered users, emails and feedback
            </span>
          </span>
          <ChevronRight className="size-4 text-muted-foreground" />
        </Link>
      ) : null}

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
        onClick={handleSignOut}
      >
        <LogOut className="size-4" /> Sign out
      </Button>
    </main>
  );
}
