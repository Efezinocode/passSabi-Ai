import { useEffect, useState } from "react";
import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { Logo } from "@/components/brand";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/auth_/callback")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Signing you in — PassSabi AI" },
      {
        name: "description",
        content: "Completing your PassSabi AI sign-in link and opening your study dashboard.",
      },
      { property: "og:title", content: "Signing you in — PassSabi AI" },
      {
        property: "og:description",
        content: "Completing your PassSabi AI magic-link sign-in.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AuthCallback,
});

function AuthCallback() {
  const navigate = useNavigate();
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let done = false;

    const finish = () => {
      if (done) return;
      done = true;
      navigate({ to: "/app/home" });
    };

    // detectSessionInUrl parses the magic-link tokens and emits SIGNED_IN.
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) finish();
    });

    supabase.auth.getSession().then(({ data }) => {
      if (data.session) finish();
    });

    const timer = setTimeout(() => {
      if (!done) setFailed(true);
    }, 8000);

    return () => {
      clearTimeout(timer);
      sub.subscription.unsubscribe();
    };
  }, [navigate]);

  return (
    <main className="flex min-h-screen flex-col px-5 py-8">
      <Link to="/">
        <Logo />
      </Link>
      <div className="mx-auto mt-24 w-full max-w-sm text-center">
        {failed ? (
          <>
            <h1 className="text-2xl font-bold">This link didn&apos;t work</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Sign-in links expire quickly and can only be used once. Request a fresh one.
            </p>
            <Button className="mt-6 w-full" onClick={() => navigate({ to: "/auth" })}>
              Get a new link
            </Button>
          </>
        ) : (
          <>
            <h1 className="text-2xl font-bold">Signing you in…</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Hold on while we open your study dashboard.
            </p>
          </>
        )}
      </div>
    </main>
  );
}
