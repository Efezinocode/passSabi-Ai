import { createFileRoute, Link } from "@tanstack/react-router";
import { Logo } from "@/components/brand";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "PassSabi AI — AI study tutor for WAEC, NECO & JAMB" },
      {
        name: "description",
        content:
          "PassSabi AI is a study platform for Nigerian students: an AI tutor, exam practice, CBT mocks, study plans and progress tracking in one app.",
      },
      { property: "og:title", content: "PassSabi AI — Your personal study operating system" },
      {
        property: "og:description",
        content:
          "Understand topics, practice past-question style questions, plan your revision and track progress for WAEC, NECO, JAMB and school exams.",
      },
    ],
  }),
  component: Landing,
});

const PILLARS = [
  {
    title: "AI tutor that teaches",
    body: "Study Mode diagnoses what you know, teaches in small chunks, then checks your understanding.",
  },
  {
    title: "Exam-shaped practice",
    body: "Objective quizzes and timed CBT mocks written in WAEC, NECO and JAMB style — with explanations.",
  },
  {
    title: "A plan that fits your term",
    body: "Pick your exam and subjects, and get a daily study plan with a countdown to exam day.",
  },
];

const FLOW = ["Ask", "Understand", "Practice", "Check", "Improve", "Remember"];

function Landing() {
  return (
    <main className="min-h-screen">
      <header className="mx-auto flex max-w-5xl items-center justify-between px-5 py-5">
        <Logo />
        <nav className="flex items-center gap-1">
          <Link to="/about">
            <Button variant="ghost" size="sm">
              About
            </Button>
          </Link>
          <Link to="/contact">
            <Button variant="ghost" size="sm">
              Contact
            </Button>
          </Link>
          <Link to="/auth">
            <Button size="sm">Sign in</Button>
          </Link>
        </nav>
      </header>

      <section className="hero-gradient mx-4 rounded-3xl border border-border px-6 py-12 shadow-[var(--shadow-lift)] md:mx-auto md:max-w-5xl md:px-12 md:py-20">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-highlight">
          Built for Nigerian students
        </p>
        <h1 className="mt-4 text-balance-pretty text-4xl font-bold leading-tight md:text-6xl">
          Your personal study operating system.
        </h1>
        <p className="mt-4 max-w-xl text-balance-pretty text-base text-muted-foreground md:text-lg">
          PassSabi AI helps you understand what you're learning, practice it, prepare for
          WAEC, NECO and JAMB, and see your progress — not just collect answers.
        </p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Link to="/auth" search={{ mode: "signup" }}>
            <Button size="lg" className="w-full sm:w-auto">
              Start studying free
            </Button>
          </Link>
          <Link to="/auth">
            <Button size="lg" variant="secondary" className="w-full sm:w-auto">
              I already have an account
            </Button>
          </Link>
        </div>
        <ul className="mt-10 flex flex-wrap gap-2">
          {FLOW.map((step) => (
            <li
              key={step}
              className="rounded-full border border-border bg-surface/60 px-3 py-1 text-xs font-medium text-muted-foreground"
            >
              {step}
            </li>
          ))}
        </ul>
      </section>

      <section className="mx-auto grid max-w-5xl gap-4 px-5 py-14 md:grid-cols-3">
        {PILLARS.map((p) => (
          <article key={p.title} className="surface-card p-6">
            <h2 className="text-lg font-semibold">{p.title}</h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{p.body}</p>
          </article>
        ))}
      </section>

      <footer className="mx-auto max-w-5xl px-5 pb-12 text-xs text-muted-foreground">
        <div className="flex flex-col gap-3 border-t border-border pt-6 sm:flex-row sm:items-center sm:justify-between">
          <Logo />
          <div className="flex flex-wrap items-center gap-4">
            <Link to="/about" className="hover:text-foreground">
              About
            </Link>
            <Link to="/contact" className="hover:text-foreground">
              Contact
            </Link>
            <FeedbackDialog
              trigger={
                <button type="button" className="hover:text-foreground">
                  Give feedback
                </button>
              }
            />
          </div>
          <p>© {new Date().getFullYear()} PassSabi AI. Study honestly, pass confidently.</p>
        </div>
      </footer>
    </main>
  );
}
