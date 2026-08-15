export const EXAMS = [
  { id: "waec", label: "WAEC", blurb: "West African School Certificate" },
  { id: "neco", label: "NECO", blurb: "National Examinations Council" },
  { id: "jamb", label: "JAMB / UTME", blurb: "University admission exam" },
  { id: "gce", label: "GCE", blurb: "General Certificate of Education" },
  { id: "nabteb", label: "NABTEB", blurb: "Technical & business exam" },
  { id: "school", label: "School exam", blurb: "Termly and mock exams" },
  { id: "none", label: "Just learning", blurb: "No exam right now" },
] as const;

export const EDUCATION_LEVELS = [
  "Primary",
  "Junior Secondary",
  "Senior Secondary",
  "Post-secondary",
] as const;

export const CLASS_YEARS = [
  "JSS 1",
  "JSS 2",
  "JSS 3",
  "SS 1",
  "SS 2",
  "SS 3",
  "Post-secondary",
] as const;

export const SUBJECTS = [
  "Mathematics",
  "English Language",
  "Physics",
  "Chemistry",
  "Biology",
  "Economics",
  "Government",
  "Literature-in-English",
  "Geography",
  "Agricultural Science",
  "Further Mathematics",
  "Commerce",
  "Financial Accounting",
  "Civic Education",
  "Computer Studies",
  "CRS / IRS",
] as const;

export const EXPLANATION_LEVELS = [
  { id: "simple", label: "Very simple", blurb: "Explain like I'm new to it" },
  { id: "balanced", label: "Balanced", blurb: "Clear, with worked examples" },
  { id: "advanced", label: "Advanced", blurb: "Go deep, exam-standard depth" },
] as const;

export const TUTOR_MODES = [
  { id: "tutor", label: "Normal Tutor", hint: "Friendly, direct help" },
  { id: "study", label: "Study Mode", hint: "Diagnose, teach, practice, check" },
  { id: "quiz", label: "Quiz Mode", hint: "Ask me questions one at a time" },
  { id: "exam", label: "Exam Mode", hint: "Exam-standard answers and marking" },
  { id: "simple", label: "Explain Simply", hint: "Plain words, small chunks" },
  { id: "steps", label: "Step-by-Step Solver", hint: "Full worked solutions" },
] as const;

export type TutorModeId = (typeof TUTOR_MODES)[number]["id"];

export function examLabel(id?: string | null) {
  return EXAMS.find((e) => e.id === id)?.label ?? null;
}

export function daysUntil(date?: string | null) {
  if (!date) return null;
  const diff = new Date(date + "T00:00:00").getTime() - Date.now();
  return Math.max(0, Math.ceil(diff / 86_400_000));
}

export function greeting(now = new Date()) {
  const h = now.getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}
