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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Menu,
  CalendarCheck,
  LayoutDashboard,
  TrendingUp,
  Flower2,
  BookOpen,
  Settings,
  ChevronDown,
  Check,
  Plus,
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
  const { allChildren, activeChild, setActiveChildId } = useActiveChild();
  const { breadcrumbs } = useBreadcrumbs();
  const isSubPage = breadcrumbs.length > 1;

  return (
    <header className="sticky top-0 bg-white/95 backdrop-blur-md border-b border-[hsl(var(--border))] h-14 flex items-center justify-between px-3 sm:px-4 md:px-6 shrink-0 z-20 shadow-2xs">
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

      {/* Right: Compact Sticky Child Selector Dropdown (Mobile only — desktop uses sidebar switcher) */}
      {activeChild && (
        <div className="flex md:hidden items-center gap-2 shrink-0">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="flex items-center gap-1.5 pl-1.5 pr-2 py-1 rounded-full bg-brand-mint/70 hover:bg-brand-mint border border-brand-green/25 hover:border-brand-green/40 transition-all shadow-2xs text-left group cursor-pointer"
                aria-label={`Current child: ${activeChild.name}. Tap to switch child`}
              >
                <div className="w-5 h-5 rounded-full bg-brand-green text-white text-[10px] font-bold flex items-center justify-center shrink-0 shadow-2xs">
                  {activeChild.name[0]?.toUpperCase() ?? "?"}
                </div>
                <span className="text-xs font-semibold text-brand-green-deep max-w-[85px] sm:max-w-[120px] truncate">
                  {activeChild.name}
                </span>
                <ChevronDown className="w-3 h-3 text-brand-green-deep/60 group-hover:text-brand-green-deep shrink-0 transition-transform duration-200" />
              </button>
            </DropdownMenuTrigger>

            <DropdownMenuContent align="end" className="w-56 p-1.5 rounded-2xl shadow-xl border border-[hsl(var(--border))] z-50 bg-white">
              <div className="px-2 py-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center justify-between">
                <span>Children</span>
                <span className="text-[10px] font-normal text-muted-foreground">
                  {allChildren.length} {allChildren.length === 1 ? "child" : "children"}
                </span>
              </div>
              {allChildren.map((child) => {
                const isSelected = child.id === activeChild.id;
                return (
                  <DropdownMenuItem
                    key={child.id}
                    onClick={() => setActiveChildId(child.id)}
                    className={cn(
                      "flex items-center gap-2.5 px-2.5 py-2 rounded-xl cursor-pointer text-xs transition-colors",
                      isSelected ? "bg-brand-mint/70 font-semibold text-brand-green-deep" : "hover:bg-muted/60"
                    )}
                  >
                    <div
                      className={cn(
                        "w-6 h-6 rounded-full flex items-center justify-center font-bold text-[10px] shrink-0",
                        isSelected
                          ? "bg-brand-green text-white"
                          : "bg-muted text-foreground"
                      )}
                    >
                      {child.name[0]?.toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="truncate font-medium text-xs text-brand-green-deep">
                        {child.name}
                      </p>
                      <p className="text-[10px] text-muted-foreground truncate">
                        {child.yearGroup ?? (child.age ? `Age ${child.age}` : "Student")}
                      </p>
                    </div>
                    {isSelected && (
                      <Check className="w-3.5 h-3.5 text-brand-green shrink-0" />
                    )}
                  </DropdownMenuItem>
                );
              })}
              <DropdownMenuSeparator className="my-1" />
              <DropdownMenuItem asChild className="p-0">
                <Link
                  href="/onboarding/child"
                  className="flex items-center gap-2 px-2.5 py-2 rounded-xl cursor-pointer text-xs text-brand-green font-medium hover:bg-brand-mint/40 transition-colors"
                >
                  <div className="w-6 h-6 rounded-full bg-brand-mint flex items-center justify-center text-brand-green shrink-0">
                    <Plus className="w-3.5 h-3.5" />
                  </div>
                  <span>Add another child</span>
                </Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
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
