import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ShieldCheck, Users, UserCheck, Sparkles, MessageSquareHeart } from "lucide-react";
import { getAdminOverview } from "@/lib/admin.functions";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/app/admin")({
  head: () => ({
    meta: [
      { title: "Admin dashboard — PassSabi AI" },
      {
        name: "description",
        content:
          "Private admin dashboard for PassSabi AI: registered students, emails, signup dates and feedback volume.",
      },
      { property: "og:title", content: "Admin dashboard — PassSabi AI" },
      {
        property: "og:description",
        content: "Registered students, emails and activity for PassSabi AI.",
      },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: AdminPage,
});

function fmt(d: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString(undefined, {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function AdminPage() {
  const fetchOverview = useServerFn(getAdminOverview);
  const { data, isLoading, error } = useQuery({
    queryKey: ["admin-overview"],
    queryFn: () => fetchOverview({}),
    retry: false,
  });

  if (isLoading) {
    return (
      <div className="grid min-h-[60vh] place-items-center">
        <p className="animate-pulse text-sm text-muted-foreground">Loading admin data…</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="mx-auto max-w-md px-5 py-16 text-center">
        <ShieldCheck className="mx-auto size-8 text-muted-foreground" />
        <h1 className="mt-4 text-lg font-semibold">Admin access only</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          This dashboard is restricted to PassSabi AI administrators.
        </p>
        <Link to="/app/home" className="mt-6 inline-block">
          <Button variant="secondary" size="sm">
            Back to home
          </Button>
        </Link>
      </div>
    );
  }

  const stats = [
    { label: "Registered users", value: data.totalUsers, icon: Users },
    { label: "Completed onboarding", value: data.onboarded, icon: UserCheck },
    { label: "New this week", value: data.newLast7Days, icon: Sparkles },
    { label: "Feedback received", value: data.feedbackCount, icon: MessageSquareHeart },
  ];

  return (
    <main className="mx-auto max-w-5xl px-5 py-8">
      <div className="flex items-center gap-2">
        <ShieldCheck className="size-5 text-highlight" />
        <h1 className="text-2xl font-bold">Admin dashboard</h1>
      </div>
      <p className="mt-1 text-sm text-muted-foreground">
        Everyone who has registered on PassSabi AI.
      </p>

      <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="surface-card p-4">
            <s.icon className="size-4 text-muted-foreground" />
            <p className="mt-3 text-2xl font-bold">{s.value}</p>
            <p className="text-xs text-muted-foreground">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="surface-card mt-6 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="border-b border-border text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-medium">Email</th>
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Exam</th>
                <th className="px-4 py-3 font-medium">Signed up</th>
                <th className="px-4 py-3 font-medium">Last sign-in</th>
              </tr>
            </thead>
            <tbody>
              {data.users.map((u) => (
                <tr key={u.id} className="border-b border-border/60 last:border-0">
                  <td className="px-4 py-3 font-medium">{u.email ?? "—"}</td>
                  <td className="px-4 py-3 text-muted-foreground">{u.full_name ?? "—"}</td>
                  <td className="px-4 py-3 text-muted-foreground">{u.exam ?? "—"}</td>
                  <td className="px-4 py-3 text-muted-foreground">{fmt(u.created_at)}</td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {fmt(u.last_sign_in_at)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}
