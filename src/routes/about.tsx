import { createFileRoute, Link } from "@tanstack/react-router";
import { Logo } from "@/components/brand";
import { Button } from "@/components/ui/button";
import { FeedbackDialog } from "@/components/feedback-dialog";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "About PassSabi AI — Learn Smarter. Understand Better." },
      {
        name: "description",
        content:
          "PassSabi AI is an AI-powered learning platform helping students understand difficult topics through clear explanations, practice questions and personalized study support.",
      },
      { property: "og:title", content: "About PassSabi AI" },
      {
        property: "og:description",
        content:
          "Our mission, our story, and the belief behind PassSabi AI: technology should help students understand, not just provide answers.",
      },
    ],
  }),
  component: AboutPage,
});

function AboutPage() {
  return (
    <main className="min-h-screen">
      <header className="mx-auto flex max-w-4xl items-center justify-between px-5 py-5">
        <Link to="/">
          <Logo />
        </Link>
        <div className="flex items-center gap-2">
          <Link to="/contact">
            <Button variant="ghost" size="sm">
              Contact
            </Button>
          </Link>
          <Link to="/auth">
            <Button size="sm">Start free</Button>
          </Link>
        </div>
      </header>

      <section className="hero-gradient mx-4 rounded-3xl border border-border px-6 py-12 shadow-[var(--shadow-lift)] md:mx-auto md:max-w-4xl md:px-12 md:py-16">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-highlight">
          About PassSabi AI
        </p>
        <h1 className="mt-4 text-4xl font-bold leading-tight md:text-5xl">
          Learn Smarter. Understand Better.
        </h1>
        <p className="mt-4 max-w-2xl text-base leading-relaxed text-muted-foreground">
          PassSabi AI is an AI-powered learning platform created to help students understand
          difficult topics, study more effectively, and build confidence in their education.
        </p>
      </section>

      <div className="mx-auto max-w-4xl space-y-6 px-5 py-12">
        <article className="surface-card p-6">
          <h2 className="text-lg font-semibold">Beyond answers</h2>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            PassSabi AI is designed to go beyond simply providing answers. It helps students
            learn through clear explanations, step-by-step guidance, practice questions,
            revision support, and personalized assistance across different subjects.
          </p>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            Our vision is to make quality learning support more accessible to students by
            combining education and artificial intelligence in a simple, practical, and
            student-friendly platform.
          </p>
        </article>

        <article className="surface-card p-6">
          <h2 className="text-lg font-semibold">Our mission</h2>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            Our mission is to make learning simpler, clearer, and more accessible. We believe
            students should be able to ask questions, explore difficult concepts, practice what
            they have learned, and receive helpful explanations without feeling limited by where
            or when they study.
          </p>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            PassSabi AI is continuously being developed and improved based on real student needs
            and feedback.
          </p>
        </article>

        <article className="surface-card p-6">
          <h2 className="text-lg font-semibold">Founded by Efezino Great Uzezi</h2>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            PassSabi AI was founded by Efezino Great Uzezi, a young technology enthusiast
            interested in programming, artificial intelligence, education, and building practical
            solutions to real-world problems.
          </p>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            The idea behind PassSabi AI came from a simple belief: technology should help students
            understand, not just provide answers.
          </p>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            Through PassSabi AI, the goal is to build useful educational technology that helps
            students learn at their own pace, understand challenging topics more clearly, and
            prepare more effectively for their academic goals. PassSabi AI is an ongoing project,
            and its development is driven by continuous learning, experimentation, and feedback
            from its users.
          </p>
        </article>

        <div className="surface-card flex flex-col items-start gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-semibold">How is your experience so far?</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Every suggestion, report and idea helps us improve.
            </p>
          </div>
          <FeedbackDialog />
        </div>
      </div>

      <footer className="mx-auto max-w-4xl px-5 pb-12 text-xs text-muted-foreground">
        <div className="flex flex-col gap-2 border-t border-border pt-6 sm:flex-row sm:items-center sm:justify-between">
          <Logo />
          <p>PassSabi AI — Learn Smarter. Understand Better.</p>
        </div>
      </footer>
    </main>
  );
}
