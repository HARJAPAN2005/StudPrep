"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  FolderArchive,
  Sparkles,
  BarChart3,
  Settings,
  ShieldCheck,
  Menu,
  X,
  LogOut,
  Compass,
  Clock,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface NavItem {
  href: string;
  label: string;
  icon: React.ElementType;
  badge?: string;
}

const MAIN_NAV: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/dashboard/materials", label: "Material Library", icon: FolderArchive, badge: "4" },
  { href: "/dashboard/exams/builder", label: "Exam Builder", icon: Sparkles, badge: "AI" },
  { href: "/dashboard/analytics", label: "Analytics & Trends", icon: BarChart3 },
  { href: "/dashboard/settings", label: "Settings", icon: Settings },
];

export function DashboardNav() {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);

  return (
    <>
      {/* ── Desktop Sidebar ────────────────────────────────────────────── */}
      <aside className="hidden md:flex w-64 flex-col border-r border-border bg-card/60 backdrop-blur-sm shrink-0 sticky top-0 h-screen">
        {/* Brand */}
        <div className="h-16 px-6 flex items-center justify-between border-b border-border">
          <Link href="/dashboard" className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg bg-primary text-primary-foreground flex items-center justify-center font-bold text-sm shadow-sm">
              <Compass className="h-4 w-4" />
            </div>
            <div>
              <span className="font-bold tracking-tight text-foreground text-base">StudPilot</span>
              <span className="block text-[10px] text-muted-foreground uppercase tracking-widest font-semibold">
                CBT Engine
              </span>
            </div>
          </Link>
          <Badge variant="indigo" className="text-[10px] px-1.5 py-0 font-mono">v1.0</Badge>
        </div>

        {/* Navigation items */}
        <div className="flex-1 py-6 px-3 space-y-1 overflow-y-auto">
          <div className="px-3 pb-2 text-[11px] font-semibold tracking-wider uppercase text-muted-foreground">
            Student Space
          </div>
          {MAIN_NAV.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-all group",
                  isActive
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground hover:bg-accent/60"
                )}
              >
                <div className="flex items-center gap-3">
                  <Icon className={cn("h-4 w-4", isActive ? "text-primary-foreground" : "text-muted-foreground group-hover:text-foreground")} />
                  <span>{item.label}</span>
                </div>
                {item.badge && (
                  <span
                    className={cn(
                      "text-[10px] px-1.5 py-0.5 rounded-full font-bold",
                      isActive
                        ? "bg-primary-foreground/20 text-primary-foreground"
                        : "bg-secondary text-secondary-foreground"
                    )}
                  >
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}

          <div className="pt-6 px-3 pb-2 text-[11px] font-semibold tracking-wider uppercase text-muted-foreground">
            Administrative
          </div>
          <Link
            href="/admin"
            className={cn(
              "flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-all group",
              pathname.startsWith("/admin")
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground hover:bg-accent/60"
            )}
          >
            <div className="flex items-center gap-3">
              <ShieldCheck className="h-4 w-4 text-amber-500" />
              <span>Admin Console</span>
            </div>
            <span className="text-[10px] bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 px-1.5 py-0.5 rounded font-mono">
              STAFF
            </span>
          </Link>
        </div>

        {/* Live CBT Status pill */}
        <div className="p-3 mx-3 mb-4 rounded-xl border border-primary/20 bg-primary/5 space-y-2">
          <div className="flex items-center justify-between text-xs font-semibold text-primary">
            <span className="flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5" /> Next Live Mock
            </span>
            <Badge variant="indigo" className="text-[10px] py-0">15m</Badge>
          </div>
          <p className="text-[11px] text-muted-foreground leading-snug">
            JAMB 2026 Mathematics & English Sprint ready.
          </p>
          <Button asChild size="sm" variant="default" className="w-full text-xs h-7">
            <Link href="/exam/session-live-sample">Launch Runner</Link>
          </Button>
        </div>

        {/* User bar */}
        <div className="p-3 border-t border-border flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-full bg-indigo-600 text-white font-bold text-xs flex items-center justify-center">
              AO
            </div>
            <div className="text-xs">
              <p className="font-semibold text-foreground truncate max-w-[110px]">Amaka Okafor</p>
              <p className="text-muted-foreground truncate max-w-[110px]">amaka@exam.ng</p>
            </div>
          </div>
          <Button asChild variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive">
            <Link href="/sign-in" aria-label="Sign Out">
              <LogOut className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </aside>

      {/* ── Mobile Top Nav Bar ────────────────────────────────────────── */}
      <div className="md:hidden flex flex-col w-full">
        <header className="h-16 px-4 border-b border-border bg-card flex items-center justify-between sticky top-0 z-30">
          <Link href="/dashboard" className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-lg bg-primary text-primary-foreground flex items-center justify-center font-bold text-xs">
              <Compass className="h-3.5 w-3.5" />
            </div>
            <span className="font-bold text-foreground">StudPilot</span>
          </Link>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          </div>
        </header>

        {mobileMenuOpen && (
          <nav className="border-b border-border bg-card p-4 space-y-1.5 animate-in slide-in-from-top-2">
            {MAIN_NAV.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={cn(
                    "flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium",
                    isActive ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-accent"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <Icon className="h-4 w-4" />
                    <span>{item.label}</span>
                  </div>
                  {item.badge && <span className="text-xs font-mono">{item.badge}</span>}
                </Link>
              );
            })}
            <Link
              href="/admin"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-amber-600 hover:bg-accent"
            >
              <ShieldCheck className="h-4 w-4" />
              <span>Admin Area</span>
            </Link>
            <div className="pt-2 border-t border-border flex justify-between items-center px-2">
              <span className="text-xs text-muted-foreground">Signed in as Amaka</span>
              <Button asChild variant="ghost" size="sm">
                <Link href="/sign-in">Sign out</Link>
              </Button>
            </div>
          </nav>
        )}
      </div>
    </>
  );
}
