import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type AdminUserRow = {
  id: string;
  email: string | null;
  full_name: string | null;
  exam: string | null;
  created_at: string;
  last_sign_in_at: string | null;
  confirmed: boolean;
};

export type AdminOverview = {
  totalUsers: number;
  onboarded: number;
  newLast7Days: number;
  feedbackCount: number;
  users: AdminUserRow[];
};

export const getAdminOverview = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<AdminOverview> => {
    const { data: isAdmin, error: roleError } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (roleError) throw new Error("Could not verify permissions");
    if (!isAdmin) throw new Error("Forbidden");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const users: AdminUserRow[] = [];
    let page = 1;
    // Supabase Auth admin API is paginated.
    for (;;) {
      const { data, error } = await supabaseAdmin.auth.admin.listUsers({
        page,
        perPage: 200,
      });
      if (error) throw new Error(error.message);
      for (const u of data.users) {
        users.push({
          id: u.id,
          email: u.email ?? null,
          full_name: null,
          exam: null,
          created_at: u.created_at,
          last_sign_in_at: u.last_sign_in_at ?? null,
          confirmed: Boolean(u.email_confirmed_at ?? u.confirmed_at),
        });
      }
      if (data.users.length < 200 || page >= 20) break;
      page += 1;
    }

    const { data: profiles } = await supabaseAdmin
      .from("profiles")
      .select("id, full_name, exam, onboarded");
    const byId = new Map((profiles ?? []).map((p) => [p.id, p]));
    let onboarded = 0;
    for (const u of users) {
      const p = byId.get(u.id);
      if (p) {
        u.full_name = p.full_name;
        u.exam = p.exam;
        if (p.onboarded) onboarded += 1;
      }
    }

    users.sort((a, b) => b.created_at.localeCompare(a.created_at));

    const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const newLast7Days = users.filter(
      (u) => new Date(u.created_at).getTime() >= weekAgo,
    ).length;

    const { count: feedbackCount } = await supabaseAdmin
      .from("feedback")
      .select("id", { count: "exact", head: true });

    return {
      totalUsers: users.length,
      onboarded,
      newLast7Days,
      feedbackCount: feedbackCount ?? 0,
      users,
    };
  });

export const checkIsAdmin = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<boolean> => {
    const { data } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    return Boolean(data);
  });
