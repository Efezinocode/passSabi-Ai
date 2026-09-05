import { useEffect } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/auth/callback")({
  component: AuthCallback,
});

function AuthCallback() {
  const navigate = useNavigate();

  useEffect(() => {
    async function handleCallback() {
      try {
        // Parse the OAuth redirect URL and store the session in the client (supabase v2)
        // storeSession: true will persist the session in local storage/cookies depending on your supabase client configuration
        const { data, error } = await supabase.auth.getSessionFromUrl({ storeSession: true });
        if (error) throw error;

        // If a session is present, go to the app home. Otherwise fall back to /auth
        navigate({ to: "/app/home" });
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "OAuth callback failed");
        navigate({ to: "/auth" });
      }
    }

    handleCallback();
  }, [navigate]);

  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <div className="text-center">Signing you in…</div>
    </main>
  );
}
