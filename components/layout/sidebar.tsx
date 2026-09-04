"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  TrendingUp,
  Flower2,
  BookOpen,
  Settings,
  ChevronDown,
  Zap,
  X,
  Plus,
  MessageCircle,
} from "lucide-react";
import { BrandLogo } from "@/components/brand/brand-logo";
import { cn } from "@/lib/utils";
import { useActiveChild } from "@/contexts/active-child";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/dashboard/progress", label: "Progress", icon: TrendingUp },
  { href: "/dashboard/bloom", label: "Bloom", icon: Flower2 },
  { href: "/dashboard/journal", label: "Journal", icon: BookOpen },
  { href: "/dashboard/chat", label: "Ask AI", icon: MessageCircle },
];

interface SidebarProps {
  subscriptionTier: string;
  onClose?: () => void;
}

export function Sidebar({ subscriptionTier, onClose }: SidebarProps) {
  const pathname = usePathname();
  const { allChildren, activeChild, setActiveChildId } = useActiveChild();

  return (
    <aside className="flex flex-col w-64 h-full bg-[#FCFAF6] border-r border-border/70 shadow-2xs">
      {/* Brand */}
      <div className="h-16 flex items-center justify-between px-5 border-b border-border/60 shrink-0 bg-white/60">
        <BrandLogo size="md" subtitle="You teach. We plan." />
        {onClose && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="md:hidden w-7 h-7"
          >
            <X className="w-4 h-4" />
          </Button>
        )}
      </div>

      {/* Child switcher */}
      {allChildren.length > 0 && (
        <div className="px-3 py-3 border-b border-border/60 shrink-0">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl bg-white hover:bg-brand-mint/40 border border-border/70 shadow-2xs transition-all text-left group">
                <div className="w-8 h-8 rounded-lg planned-gradient flex items-center justify-center text-white font-serif font-bold text-sm shrink-0 shadow-2xs">
                  {activeChild?.name?.[0]?.toUpperCase() ?? "?"}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-brand-green-deep truncate group-hover:text-brand-green transition-colors">
                    {activeChild?.name ?? "Select child"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {activeChild?.yearGroup ?? `Age ${activeChild?.age ?? "—"}`}
                  </p>
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-muted-foreground group-hover:text-brand-green-deep transition-colors shrink-0" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56 shadow-md border-border/80" align="start">
              {allChildren.map((child) => (
                <DropdownMenuItem
                  key={child.id}
                  onClick={() => setActiveChildId(child.id)}
                  className="gap-2.5 cursor-pointer"
                >
                  <div
                    className={cn(
                      "w-7 h-7 rounded-lg flex items-center justify-center font-serif font-bold text-xs shrink-0",
                      child.id === activeChild?.id
                        ? "planned-gradient text-white shadow-2xs"
                        : "bg-muted text-foreground"
                    )}
                  >
                    {child.name[0]?.toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{child.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {child.yearGroup ?? `Age ${child.age}`}
                    </p>
                  </div>
                  {child.id === activeChild?.id && (
                    <div className="w-1.5 h-1.5 rounded-full bg-brand-green shrink-0" />
                  )}
                </DropdownMenuItem>
              ))}
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild className="gap-2.5 cursor-pointer">
                <Link href="/onboarding/child" onClick={onClose}>
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center bg-brand-mint text-brand-green-deep shrink-0">
                    <Plus className="w-4 h-4" />
                  </div>
                  <p className="text-sm font-medium">Add child</p>
                </Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {navItems.map(({ href, label, icon: Icon }) => {
          const active =
            href === "/dashboard"
              ? pathname === "/dashboard"
              : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              onClick={onClose}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150",
                active
                  ? "bg-brand-mint/90 text-brand-green-deep font-semibold shadow-2xs border border-brand-green/15"
                  : "text-muted-foreground hover:bg-white/80 hover:text-brand-green-deep"
              )}
            >
              <Icon
                className={cn(
                  "w-4 h-4 shrink-0 transition-colors",
                  active ? "text-brand-green" : "text-muted-foreground/70"
                )}
              />
              {label}
            </Link>
          );
        })}
      </nav>

      {/* Bottom: upgrade + settings */}
      <div className="p-3 space-y-2 border-t border-border/60 shrink-0 bg-white/40">
        {subscriptionTier === "FREE" && (
          <div className="rounded-xl planned-gradient p-3.5 text-white shadow-xs ring-1 ring-white/15">
            <div className="flex items-center gap-1.5 mb-1">
              <Zap className="w-3.5 h-3.5 text-amber-300 fill-amber-300" />
              <p className="text-[10px] font-bold uppercase tracking-wider text-amber-200">
                Upgrade to Premium
              </p>
            </div>
            <p className="text-xs text-white/80 mb-2.5 leading-relaxed">
              Unlock AI lesson generation, unlimited children &amp; progress
              reports.
            </p>
            <Link
              href="/pricing"
              onClick={onClose}
              className="block w-full text-center bg-white text-brand-green-deep text-xs font-bold py-1.5 rounded-lg hover:bg-brand-mint transition-colors shadow-2xs"
            >
              See plans →
            </Link>
          </div>
        )}
        <Link
          href="/dashboard/settings"
          onClick={onClose}
          className={cn(
            "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors",
            pathname.startsWith("/dashboard/settings")
              ? "bg-brand-mint text-brand-green-deep font-semibold border border-brand-green/15"
              : "text-muted-foreground hover:bg-white/80 hover:text-brand-green-deep"
          )}
        >
          <Settings className="w-4 h-4 shrink-0" />
          Settings
        </Link>
      </div>
    </aside>
  );
}
