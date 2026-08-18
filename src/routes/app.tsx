import { useEffect } from "react";
import { createFileRoute, Outlet, useNavigate, useRouterState, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  Home,
  MessageCircle,
  Target,
  CalendarDays,
  BarChart3,
  User,
  ShieldCheck,
} from "lucide-react";
import { useProfile, useSession } from "@/lib/auth";
import { checkIsAdmin } from "@/lib/admin.functions";
import { Logo } from "@/components/brand";
import { FeedbackFab } from "@/components/feedback-dialog";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/app")({
  component: AppLayout,
});


const NAV = [
  { to: "/app/home", label: "Home", icon: Home },
  { to: "/app/chat", label: "Tutor", icon: MessageCircle },
  { to: "/app/practice", label: "Practice", icon: Target },
  { to: "/app/plan", label: "Plan", icon: CalendarDays },
  { to: "/app/progress", label: "Progress", icon: BarChart3 },
  { to: "/app/profile", label: "Profile", icon: User },
] as const;

function AppLayout() {
  const navigate = useNavigate();
  const { session, user, loading } = useSession();
  const { data: profile, isLoading: profileLoading } = useProfile(user);
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const isAdminFn = useServerFn(checkIsAdmin);
  const { data: isAdmin } = useQuery({
    queryKey: ["is-admin", user?.id],
    enabled: !!user,
    retry: false,
    queryFn: () => isAdminFn({}),
  });


  useEffect(() => {
    if (!loading && !session) navigate({ to: "/auth" });
  }, [loading, session, navigate]);

  useEffect(() => {
    if (profile && !profile.onboarded) navigate({ to: "/onboarding" });
  }, [profile, navigate]);

  if (loading || (session && profileLoading)) {
    return (
      <div className="grid min-h-screen place-items-center">
        <div className="animate-pulse text-sm text-muted-foreground">Loading PassSabi…</div>
      </div>
    );
  }

  if (!session) return null;

  return (
    <div className="min-h-screen md:flex">
      <aside className="hidden w-60 shrink-0 border-r border-border bg-sidebar px-4 py-6 md:block">
        <Logo />
        <nav className="mt-8 space-y-1">
          {NAV.map((item) => {
            const active = pathname.startsWith(item.to);
            return (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                  active
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "text-muted-foreground hover:bg-sidebar-accent/60",
                )}
              >
                <item.icon className="size-4" />
                {item.label}
              </Link>
            );
          })}
          {isAdmin ? (
            <Link
              to="/app/admin"
              className={cn(
                "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                pathname.startsWith("/app/admin")
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-muted-foreground hover:bg-sidebar-accent/60",
              )}
            >
              <ShieldCheck className="size-4" />
              Admin
            </Link>
          ) : null}
        </nav>
      </aside>

      <div className="flex-1 pb-24 md:pb-0">
        <Outlet />
      </div>

      {pathname.startsWith("/app/chat") ? null : <FeedbackFab />}


      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-surface/95 backdrop-blur md:hidden">
        <ul className="mx-auto flex max-w-lg items-stretch justify-between px-2 pb-[env(safe-area-inset-bottom)]">
          {NAV.filter((n) => n.label !== "Plan").map((item) => {
            const active = pathname.startsWith(item.to);
            return (
              <li key={item.to} className="flex-1">
                <Link
                  to={item.to}
                  className={cn(
                    "flex flex-col items-center gap-1 py-2.5 text-[11px] font-medium transition-colors",
                    active ? "text-highlight" : "text-muted-foreground",
                  )}
                >
                  <item.icon className="size-5" />
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}
