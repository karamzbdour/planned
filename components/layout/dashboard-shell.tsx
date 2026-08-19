"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ActiveChildProvider, ChildSummary, useActiveChild } from "@/contexts/active-child";
import { BreadcrumbProvider, useBreadcrumbs } from "@/contexts/breadcrumbs";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { Sidebar } from "@/components/layout/sidebar";
import { Button } from "@/components/ui/button";
import {
  Menu,
  CalendarCheck,
  LayoutDashboard,
  TrendingUp,
  Flower2,
  BookOpen,
  Settings,
} from "lucide-react";
import { cn } from "@/lib/utils";

const BOTTOM_NAV = [
  { href: "/dashboard",          label: "Dashboard", icon: LayoutDashboard },
  { href: "/dashboard/progress", label: "Progress",  icon: TrendingUp },
  { href: "/dashboard/bloom",    label: "Bloom",     icon: Flower2 },
  { href: "/dashboard/journal",  label: "Journal",   icon: BookOpen },
  { href: "/dashboard/settings", label: "Settings",  icon: Settings },
];

function DashboardHeader({ onOpenSidebar }: { onOpenSidebar: () => void }) {
  const { activeChild } = useActiveChild();
  const { breadcrumbs } = useBreadcrumbs();
  const isSubPage = breadcrumbs.length > 1;

  return (
    <header className="h-14 bg-white/90 backdrop-blur-sm border-b border-[hsl(var(--border))] flex items-center justify-between px-4 md:px-6 shrink-0 z-10">
      {/* Left: Mobile hamburger or breadcrumbs / brand */}
      <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1 mr-2">
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden -ml-1 mr-1 h-8 w-8 text-muted-foreground hover:text-foreground shrink-0"
          onClick={onOpenSidebar}
          aria-label="Open navigation menu"
        >
          <Menu className="w-5 h-5" />
        </Button>

        {/* Mobile: If on subpage show breadcrumb trail, otherwise show brand */}
        <div className="flex md:hidden items-center min-w-0 flex-1">
          {isSubPage ? (
            <Breadcrumbs className="py-0" showAllOnMobile={false} />
          ) : (
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-lg planned-gradient flex items-center justify-center">
                <CalendarCheck className="w-3.5 h-3.5 text-white" />
              </div>
              <span className="font-display font-bold text-brand-green-deep text-sm">
                Planned
              </span>
            </div>
          )}
        </div>

        {/* Desktop: Dynamic Breadcrumb trail */}
        <div className="hidden md:flex items-center min-w-0 flex-1">
          {isSubPage ? (
            <Breadcrumbs className="py-0" />
          ) : (
            <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
              <span className="w-2 h-2 rounded-full bg-brand-green animate-pulse" />
              <span className="font-medium text-brand-green-deep">Dashboard Overview</span>
            </div>
          )}
        </div>
      </div>

      {/* Right: Active Child Pill / Quick Switch */}
      {activeChild && (
        <div className="flex items-center gap-2 shrink-0">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-brand-mint/60 border border-brand-green/20 shadow-2xs">
            <div className="w-5 h-5 rounded-full bg-brand-green text-white text-[10px] font-bold flex items-center justify-center">
              {activeChild.name[0]?.toUpperCase()}
            </div>
            <span className="text-xs font-semibold text-brand-green-deep max-w-[100px] truncate">
              {activeChild.name}
            </span>
          </div>
        </div>
      )}
    </header>
  );
}

interface DashboardShellProps {
  children: React.ReactNode;
  allChildren: ChildSummary[];
  subscriptionTier: string;
}

export function DashboardShell({
  children,
  allChildren,
  subscriptionTier,
}: DashboardShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const pathname = usePathname();

  return (
    <ActiveChildProvider allChildren={allChildren}>
      <BreadcrumbProvider>
        <div className="flex h-screen overflow-hidden bg-[hsl(var(--background))]">
          {/* Mobile overlay */}
          {sidebarOpen && (
            <div
              className="fixed inset-0 bg-black/40 z-20 md:hidden"
              onClick={() => setSidebarOpen(false)}
            />
          )}

          {/* Sidebar — desktop only */}
          <div
            className={[
              "fixed inset-y-0 left-0 z-30 md:relative md:flex",
              "transition-transform duration-200 ease-in-out",
              sidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0",
            ].join(" ")}
          >
            <Sidebar
              subscriptionTier={subscriptionTier}
              onClose={() => setSidebarOpen(false)}
            />
          </div>

          {/* Main content */}
          <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
            {/* Top header with dynamic breadcrumbs and active child info */}
            <DashboardHeader onOpenSidebar={() => setSidebarOpen(true)} />

            {/* Scrollable page content — extra bottom padding on mobile for bottom nav */}
            <main className="flex-1 overflow-y-auto pb-16 md:pb-0">{children}</main>
          </div>

          {/* ── Mobile bottom navigation bar ─────────────────────────────── */}
          <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-white border-t border-[hsl(var(--border))] flex items-stretch h-16 safe-area-inset-bottom">
            {BOTTOM_NAV.map(({ href, label, icon: Icon }) => {
              const active =
                href === "/dashboard"
                  ? pathname === "/dashboard"
                  : pathname.startsWith(href);
              return (
                <Link
                  key={href}
                  href={href}
                  className={cn(
                    "flex-1 flex flex-col items-center justify-center gap-0.5 text-[10px] font-medium transition-colors",
                    active
                      ? "text-brand-green"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <Icon
                    className={cn(
                      "w-5 h-5 shrink-0",
                      active ? "text-brand-green" : "text-muted-foreground"
                    )}
                  />
                  {label}
                </Link>
              );
            })}
          </nav>
        </div>
      </BreadcrumbProvider>
    </ActiveChildProvider>
  );
}
