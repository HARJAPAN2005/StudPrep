import Link from "next/link";
import { redirect } from "next/navigation";
import { BookOpen, LayoutDashboard, User, Settings } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { LogoutButton } from "@/components/layout/logout-button";
import { cn } from "@/lib/utils";

const NAV_LINKS = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/dashboard/subjects", label: "Subjects", icon: BookOpen },
  { href: "/dashboard/profile", label: "Profile", icon: User },
] as const;

export const instant = false;

/**
 * Dashboard layout — authenticated shell with top nav.
 * Reads the session server-side and redirects unauthenticated users.
 * Middleware also enforces this, providing defence-in-depth.
 */
export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Fetch profile for display name
  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  const displayName = profile?.full_name ?? user.email ?? "Student";

  return (
    <div className="min-h-screen flex flex-col">
      {/* Top Navigation */}
      <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between gap-4">
            {/* Brand */}
            <Link href="/dashboard" className="flex items-center gap-2 shrink-0">
              <span className="text-lg font-bold text-foreground">StudPrep</span>
            </Link>

            {/* Main nav */}
            <nav aria-label="Main navigation" className="hidden sm:flex items-center gap-1">
              {NAV_LINKS.map(({ href, label, icon: Icon }) => (
                <Link
                  key={href}
                  href={href}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                    "text-muted-foreground hover:text-foreground hover:bg-accent"
                  )}
                >
                  <Icon className="h-4 w-4" aria-hidden="true" />
                  {label}
                </Link>
              ))}
              {profile?.role === "admin" && (
                <Link
                  href="/admin"
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 transition-colors"
                >
                  <Settings className="h-4 w-4" aria-hidden="true" />
                  Admin
                </Link>
              )}
            </nav>

            {/* User + logout */}
            <div className="flex items-center gap-2 shrink-0">
              <span className="hidden md:block text-sm text-muted-foreground truncate max-w-[160px]">
                {displayName}
              </span>
              <LogoutButton />
            </div>
          </div>
        </div>
      </header>

      {/* Page content */}
      <main className="flex-1 mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </div>
  );
}
