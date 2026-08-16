import { createFileRoute, Link } from "@tanstack/react-router";
import { Mail, Phone } from "lucide-react";
import { Logo } from "@/components/brand";
import { Button } from "@/components/ui/button";
import { FeedbackDialog } from "@/components/feedback-dialog";

export const Route = createFileRoute("/contact")({
  head: () => ({
    meta: [
      { title: "Contact & Feedback — PassSabi AI" },
      {
        name: "description",
        content:
          "Report a bug, suggest a feature or share your experience with PassSabi AI. Reach us by email at uzeziefezino@gmail.com or phone 07032449275.",
      },
      { property: "og:title", content: "Contact & Feedback — PassSabi AI" },
      {
        property: "og:description",
        content:
          "Your feedback matters. Tell us what worked, what broke, and what would make PassSabi AI better for students.",
      },
    ],
  }),
  component: ContactPage,
});

function ContactPage() {
  return (
    <main className="min-h-screen">
      <header className="mx-auto flex max-w-4xl items-center justify-between px-5 py-5">
        <Link to="/">
          <Logo />
        </Link>
        <div className="flex items-center gap-2">
          <Link to="/about">
            <Button variant="ghost" size="sm">
              About
            </Button>
          </Link>
          <Link to="/auth">
            <Button size="sm">Start free</Button>
          </Link>
        </div>
      </header>

      <section className="hero-gradient mx-4 rounded-3xl border border-border px-6 py-12 shadow-[var(--shadow-lift)] md:mx-auto md:max-w-4xl md:px-12 md:py-16">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-highlight">
          Contact & Feedback
        </p>
        <h1 className="mt-4 text-4xl font-bold leading-tight md:text-5xl">
          Your feedback matters.
        </h1>
        <p className="mt-4 max-w-2xl text-base leading-relaxed text-muted-foreground">
          Whether you have discovered a bug, have a suggestion, want to report a problem, or have
          an idea for a feature, we would be happy to hear from you. Your feedback helps us
          understand what students need and improve PassSabi AI into a better learning platform.
        </p>
        <div className="mt-8">
          <FeedbackDialog
            trigger={<Button size="lg">Send feedback</Button>}
          />
        </div>
      </section>

      <div className="mx-auto grid max-w-4xl gap-4 px-5 py-12 md:grid-cols-2">
        <article className="surface-card p-6">
          <h2 className="text-lg font-semibold">Contact information</h2>
          <ul className="mt-4 space-y-3 text-sm">
            <li className="flex items-center gap-3">
              <Mail className="size-4 text-highlight" />
              <a className="hover:underline" href="mailto:uzeziefezino@gmail.com">
                uzeziefezino@gmail.com
              </a>
            </li>
            <li className="flex items-center gap-3">
              <Phone className="size-4 text-highlight" />
              <a className="hover:underline" href="tel:+2347032449275">
                07032449275
              </a>
            </li>
          </ul>
        </article>

        <article className="surface-card p-6">
          <h2 className="text-lg font-semibold">When reporting an issue</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            To help us investigate a problem more quickly, please include:
          </p>
          <ul className="mt-3 list-disc space-y-1.5 pl-5 text-sm text-muted-foreground">
            <li>A clear description of what happened</li>
            <li>What you were trying to do</li>
            <li>The device and browser you were using</li>
            <li>A screenshot or screen recording, when possible</li>
          </ul>
        </article>
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
