import { useEffect, useState } from "react";
import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/lib/auth";
import { Logo } from "@/components/brand";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Mode = "signin" | "signup" | "forgot" | "reset";

export const Route = createFileRoute("/auth")({
  validateSearch: (search: Record<string, unknown>): { mode?: Mode | undefined } => ({
    mode: (["signin", "signup", "forgot", "reset"] as const).includes(
      search["mode"] as Mode,
    )
      ? (search["mode"] as Mode)
      : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Sign in to PassSabi AI" },
      {
        name: "description",
        content:
          "Create your PassSabi AI account or sign in to continue your study plan, tutor chats and exam practice.",
      },
      { property: "og:title", content: "Sign in to PassSabi AI" },
      {
        property: "og:description",
        content: "Access your AI tutor, practice questions and study progress.",
      },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const { mode: initialMode } = Route.useSearch();
  const navigate = useNavigate();
  const { session, loading } = useSession();
  const [mode, setMode] = useState<Mode>(initialMode ?? "signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState<null | "verify" | "reset" | "magic">(null);

  useEffect(() => {
    if (typeof window !== "undefined" && window.location.hash.includes("type=recovery")) {
      setMode("reset");
    }
  }, []);

  useEffect(() => {
    if (!loading && session && mode !== "reset") {
      navigate({ to: "/app/home" });
    }
  }, [loading, session, mode, navigate]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/app/home`,
            data: { full_name: name },
          },
        });
        if (error) throw error;
        setSent("verify");
      } else if (mode === "signin") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        navigate({ to: "/app/home" });
      } else if (mode === "forgot") {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/auth?mode=reset`,
        });
        if (error) throw error;
        setSent("reset");
      } else {
        const { error } = await supabase.auth.updateUser({ password });
        if (error) throw error;
        toast.success("Password updated. Welcome back!");
        navigate({ to: "/app/home" });
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  async function handleMagicLink() {
    if (!email) {
      toast.error("Enter your email first.");
      return;
    }
    setBusy(true);
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
      });
      if (error) throw error;
      setSent("magic");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not send the sign-in link");
    } finally {
      setBusy(false);
    }
  }

  const copy = {
    signin: { title: "Welcome back", cta: "Sign in" },
    signup: { title: "Create your account", cta: "Create account" },
    forgot: { title: "Reset your password", cta: "Send reset link" },
    reset: { title: "Set a new password", cta: "Update password" },
  }[mode];

  return (
    <main className="flex min-h-screen flex-col px-5 py-8">
      <Link to="/">
        <Logo />
      </Link>

      <div className="mx-auto mt-10 w-full max-w-sm">
        <h1 className="text-3xl font-bold">{copy.title}</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {mode === "signup"
            ? "Set up your study profile in under a minute."
            : mode === "forgot"
              ? "We'll email you a secure link to choose a new password."
              : "Continue your study plan and tutor chats."}
        </p>

        {sent ? (
          <div className="surface-card mt-8 p-5 text-sm">
            {sent === "magic" ? (
              <>
                <p className="font-semibold">Sign-in link sent ✉️</p>
                <p className="mt-2 text-muted-foreground">
                  We emailed a one-tap sign-in link to{" "}
                  <span className="text-foreground">{email}</span>. Open it on this device to
                  continue — no password needed.
                </p>
              </>
            ) : sent === "verify" ? (
              <>
                <p className="font-semibold">Check your email 📩</p>
                <p className="mt-2 text-muted-foreground">
                  We sent a verification link to <span className="text-foreground">{email}</span>.
                  Open it to activate your account, then sign in.
                </p>
              </>
            ) : (
              <>
                <p className="font-semibold">Reset link sent</p>
                <p className="mt-2 text-muted-foreground">
                  Check {email} for the password reset link.
                </p>
              </>
            )}
            <Button
              variant="secondary"
              className="mt-4 w-full"
              onClick={() => {
                setSent(null);
                setMode("signin");
              }}
            >
              Back to sign in
            </Button>
          </div>
        ) : (
          <>
            <form onSubmit={handleSubmit} className="mt-8 space-y-4">
              {mode === "signup" && (
                <div className="space-y-2">
                  <Label htmlFor="name">Full name</Label>
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Chidera Okoye"
                    required
                  />
                </div>
              )}
              {mode !== "reset" && (
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    required
                  />
                </div>
              )}
              {mode !== "forgot" && (
                <div className="space-y-2">
                  <Label htmlFor="password">
                    {mode === "reset" ? "New password" : "Password"}
                  </Label>
                  <Input
                    id="password"
                    type="password"
                    autoComplete={mode === "signin" ? "current-password" : "new-password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    minLength={6}
                    placeholder="At least 6 characters"
                    required
                  />
                </div>
              )}
              <Button type="submit" className="w-full" disabled={busy}>
                {busy ? "Please wait…" : copy.cta}
              </Button>
            </form>

            {mode !== "reset" && (
              <>
                <div className="my-5 flex items-center gap-3 text-xs text-muted-foreground">
                  <span className="h-px flex-1 bg-border" />
                  or
                  <span className="h-px flex-1 bg-border" />
                </div>
                <Button
                  variant="secondary"
                  className="w-full"
                  onClick={handleMagicLink}
                  disabled={busy}
                >
                  Email me a sign-in link
                </Button>
                <p className="mt-2 text-center text-xs text-muted-foreground">
                  We&apos;ll send a link to your email — tap it and you&apos;re in.
                </p>
              </>
            )}

            <div className="mt-6 space-y-2 text-center text-sm text-muted-foreground">
              {mode === "signin" && (
                <>
                  <button className="underline" onClick={() => setMode("forgot")}>
                    Forgot password?
                  </button>
                  <p>
                    New here?{" "}
                    <button
                      className="font-medium text-foreground underline"
                      onClick={() => setMode("signup")}
                    >
                      Create an account
                    </button>
                  </p>
                </>
              )}
              {mode !== "signin" && (
                <button className="underline" onClick={() => setMode("signin")}>
                  Back to sign in
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </main>
  );
}
