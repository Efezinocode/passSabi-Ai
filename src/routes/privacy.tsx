import { createFileRoute, Link } from "@tanstack/react-router";
import { Logo } from "@/components/brand";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Privacy Policy — PassSabi AI" },
      {
        name: "description",
        content:
          "What PassSabi AI stores, why, and how to reach us with questions about your data.",
      },
    ],
  }),
  component: PrivacyPage,
});

const SECTIONS: { title: string; body: string[] }[] = [
  {
    title: "What we collect",
    body: [
      "When you create an account, we store your name, email, exam (WAEC, NECO or JAMB), subjects and class year, so the tutor can tailor its answers to you.",
      "We store your chat messages and practice results so your history and progress are there next time you sign in.",
      "If you send a photo of a question, it is sent to our AI provider to be read and answered, but it is not saved afterward — it is not kept in our database or storage.",
    ],
  },
  {
    title: "How we use it",
    body: [
      "To run the AI tutor, generate practice questions, and show your study plan and progress.",
      "To reply if you contact us for support or send feedback.",
      "We do not sell your data, and we do not use it to show you ads.",
    ],
  },
  {
    title: "Who can see it",
    body: [
      "Your account data is private to you. Our database is set up so that only your own signed-in account can read or change your own chats, profile and progress.",
      "Your questions may be sent to third-party AI providers (such as Google Gemini and Groq) so they can generate a response. We don't control their data retention, so avoid sharing sensitive personal details in a chat.",
    ],
  },
  {
    title: "Your choices",
    body: [
      "You can delete a chat at any time by swiping or long-pressing it in your chat list.",
      "You can ask us to delete your account and its data by contacting us using the details below.",
    ],
  },
  {
    title: "Children and students",
    body: [
      "PassSabi AI is built for secondary-school students preparing for WAEC, NECO and JAMB. If you are under 18, please review this policy with a parent or guardian, and only share the information needed to use the app.",
    ],
  },
  {
    title: "Changes to this policy",
    body: [
      "If this policy changes in a meaningful way, we'll update this page and change the date below.",
    ],
  },
];

function PrivacyPage() {
  return (
    <main className="min-h-screen">
      <header className="mx-auto flex max-w-3xl items-center justify-between px-5 py-5">
        <Link to="/">
          <Logo />
        </Link>
        <Link to="/contact">
          <Button variant="ghost" size="sm">
            Contact
          </Button>
        </Link>
      </header>

      <section className="mx-auto max-w-3xl px-5 py-8">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-highlight">
          Privacy Policy
        </p>
        <h1 className="mt-4 text-3xl font-bold leading-tight md:text-4xl">
          Your data, explained plainly.
        </h1>
        <p className="mt-4 text-sm text-muted-foreground">Last updated: September 2026</p>

        <p className="mt-6 text-sm leading-relaxed text-muted-foreground">
          This page explains, in plain language, what PassSabi AI stores about you and why. It
          is written to be clear and honest, not as a formal legal document — if you need this
          reviewed as a binding legal policy, we'd recommend having a parent, guardian or lawyer
          look it over with us.
        </p>

        <div className="mt-8 space-y-6">
          {SECTIONS.map((section) => (
            <article key={section.title} className="surface-card p-6">
              <h2 className="text-lg font-semibold">{section.title}</h2>
              <div className="mt-2 space-y-2">
                {section.body.map((paragraph) => (
                  <p key={paragraph} className="text-sm leading-relaxed text-muted-foreground">
                    {paragraph}
                  </p>
                ))}
              </div>
            </article>
          ))}
        </div>

        <p className="mt-8 text-sm text-muted-foreground">
          Questions about your data? Reach us on the{" "}
          <Link to="/contact" className="underline hover:text-foreground">
            Contact page
          </Link>
          .
        </p>
      </section>

      <footer className="mx-auto max-w-3xl px-5 pb-12 text-xs text-muted-foreground">
        <div className="flex flex-col gap-2 border-t border-border pt-6 sm:flex-row sm:items-center sm:justify-between">
          <Logo />
          <p>© {new Date().getFullYear()} PassSabi AI.</p>
        </div>
      </footer>
    </main>
  );
}
