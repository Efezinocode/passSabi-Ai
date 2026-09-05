import { useEffect, useState, useSyncExternalStore } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/**
 * A single app-wide auth store.
 *
 * The initial session restore is async (it reads storage and may refresh the
 * token). Until that first read resolves, `loading` stays true so no screen
 * can decide the user is signed out and bounce them to /auth.
 */
type AuthState = { session: Session | null; loading: boolean };

const SERVER_STATE: AuthState = { session: null, loading: true };

let state: AuthState = SERVER_STATE;
let started = false;
const listeners = new Set<() => void>();

function setState(next: AuthState) {
  if (next.session === state.session && next.loading === state.loading) return;
  state = next;
  listeners.forEach((l) => l());
}

function start() {
  if (started || typeof window === "undefined") return;
  started = true;

  let restored = false;

  supabase.auth.onAuthStateChange((event, next) => {
    // Before the first restore resolves, a null session is just "not read
    // back yet" — never treat it as signed out.
    if (!restored && !next && event !== "SIGNED_OUT") return;
    // A failed token refresh can emit a null session while storage still
    // holds a valid one; only an explicit sign-out clears it.
    if (restored && !next && event !== "SIGNED_OUT" && event !== "USER_UPDATED") return;
    restored = true;
    setState({ session: next, loading: false });
  });

  supabase.auth
    .getSession()
    .then(({ data }) => {
      const session = state.session ?? data.session;
      restored = true;
      setState({ session, loading: false });
    })
    .catch(() => {
      restored = true;
      setState({ session: state.session, loading: false });
    });
}

export function useSession() {
  const snapshot = useSyncExternalStore(
    (listener) => {
      start();
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => state,
    () => SERVER_STATE,
  );

  return {
    session: snapshot.session,
    user: snapshot.session?.user ?? null,
    loading: snapshot.loading,
  };
}

export type Profile = {
  id: string;
  full_name: string | null;
  education_level: string | null;
  class_year: string | null;
  exam: string | null;
  exam_date: string | null;
  subjects: string[];
  target_score: string | null;
  explanation_level: string;
  onboarded: boolean;
};

export function useProfile(user: User | null) {
  return useQuery({
    queryKey: ["profile", user?.id],
    enabled: !!user,
    queryFn: async (): Promise<Profile | null> => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return data as Profile | null;
    },
  });
}

export function useInvalidateProfile() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: ["profile"] });
}

export async function signOut() {
  await supabase.auth.signOut();
}
