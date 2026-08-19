"use client";

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useMemo,
  useEffect,
  ReactNode,
} from "react";
import { usePathname, useParams } from "next/navigation";
import {
  LayoutDashboard,
  TrendingUp,
  Flower2,
  BookOpen,
  Settings,
  MessageCircle,
  CalendarDays,
  Users,
  BookMarked,
  Printer,
  Sparkles,
  type LucideIcon,
} from "lucide-react";

export interface BreadcrumbItemData {
  label: string;
  href?: string;
  icon?: LucideIcon | React.ComponentType<{ className?: string }>;
  isCurrent?: boolean;
}

interface BreadcrumbsContextType {
  breadcrumbs: BreadcrumbItemData[];
  setBreadcrumbOverride: (key: string, label: string) => void;
  removeBreadcrumbOverride: (key: string) => void;
  setCustomBreadcrumbs: (crumbs: BreadcrumbItemData[] | null) => void;
}

const BreadcrumbsContext = createContext<BreadcrumbsContextType>({
  breadcrumbs: [],
  setBreadcrumbOverride: () => {},
  removeBreadcrumbOverride: () => {},
  setCustomBreadcrumbs: () => {},
});

// Known section route definitions
const ROUTE_DEFINITIONS: Record<
  string,
  { label: string; icon?: LucideIcon }
> = {
  dashboard: { label: "Dashboard", icon: LayoutDashboard },
  progress: { label: "Progress", icon: TrendingUp },
  bloom: { label: "Bloom", icon: Flower2 },
  journal: { label: "Journal", icon: BookOpen },
  chat: { label: "Ask AI", icon: MessageCircle },
  planner: { label: "Planner", icon: CalendarDays },
  children: { label: "Children", icon: Users },
  settings: { label: "Settings", icon: Settings },
  pdf: { label: "PDF Keepsake", icon: Printer },
  worksheet: { label: "Worksheet", icon: Printer },
};

function formatSegmentLabel(segment: string): string {
  try {
    const decoded = decodeURIComponent(segment);
    // Replace hyphens and underscores with spaces
    const withSpaces = decoded.replace(/[-_]/g, " ");
    // Capitalize words
    return withSpaces
      .split(" ")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(" ");
  } catch {
    return segment;
  }
}

export function BreadcrumbProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname() || "";
  const [overrides, setOverrides] = useState<Record<string, string>>({});
  const [customBreadcrumbs, setCustomBreadcrumbs] = useState<BreadcrumbItemData[] | null>(null);

  const setBreadcrumbOverride = useCallback((key: string, label: string) => {
    if (!key || !label) return;
    setOverrides((prev) => {
      if (prev[key] === label) return prev;
      return { ...prev, [key]: label };
    });
  }, []);

  const removeBreadcrumbOverride = useCallback((key: string) => {
    if (!key) return;
    setOverrides((prev) => {
      if (!(key in prev)) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }, []);

  const computedBreadcrumbs = useMemo<BreadcrumbItemData[]>(() => {
    if (customBreadcrumbs) return customBreadcrumbs;
    if (!pathname || !pathname.startsWith("/dashboard")) {
      return [];
    }

    const rawSegments = pathname.split("/").filter(Boolean);
    if (rawSegments.length === 0) return [];

    const crumbs: BreadcrumbItemData[] = [];

    // Root is always Dashboard
    crumbs.push({
      label: "Dashboard",
      href: "/dashboard",
      icon: LayoutDashboard,
      isCurrent: rawSegments.length === 1,
    });

    if (rawSegments.length === 1) {
      return crumbs;
    }

    // Process subsequent segments starting from index 1 (after "dashboard")
    const subSegments = rawSegments.slice(1);
    let accumulatedPath = "/dashboard";

    for (let i = 0; i < subSegments.length; i++) {
      const segment = subSegments[i];
      const isLast = i === subSegments.length - 1;
      accumulatedPath += `/${segment}`;

      // Special case: "lesson" folder itself doesn't have a standalone view
      // We skip adding "Lesson" as an intermediate unclickable breadcrumb,
      // and instead let the lesson ID/title be the breadcrumb directly under Dashboard.
      if (segment === "lesson") {
        continue;
      }

      // Check if this segment is a special sub-page of a section
      let label = overrides[segment] || overrides[accumulatedPath];
      let icon: LucideIcon | undefined;

      if (!label) {
        if (segment === "settings" && subSegments[i - 1] === "bloom") {
          label = "Reward Settings";
          icon = Settings;
        } else if (segment === "pdf" && subSegments[i - 1] === "journal") {
          label = "PDF Keepsake";
          icon = Printer;
        } else if (segment === "worksheet" && subSegments[i - 2] === "lesson") {
          label = "Worksheet";
          icon = Printer;
        } else if (ROUTE_DEFINITIONS[segment]) {
          label = ROUTE_DEFINITIONS[segment].label;
          icon = ROUTE_DEFINITIONS[segment].icon;
        } else {
          // Dynamic segment (e.g. subject or ID)
          label = formatSegmentLabel(segment);
          if (subSegments[i - 1] === "progress") {
            icon = BookMarked;
          } else if (subSegments[i - 1] === "lesson") {
            icon = Sparkles;
          }
        }
      }

      crumbs.push({
        label,
        href: isLast ? undefined : accumulatedPath,
        icon,
        isCurrent: isLast,
      });
    }

    return crumbs;
  }, [pathname, overrides, customBreadcrumbs]);

  return (
    <BreadcrumbsContext.Provider
      value={{
        breadcrumbs: computedBreadcrumbs,
        setBreadcrumbOverride,
        removeBreadcrumbOverride,
        setCustomBreadcrumbs,
      }}
    >
      {children}
    </BreadcrumbsContext.Provider>
  );
}

export function useBreadcrumbs() {
  return useContext(BreadcrumbsContext);
}

/**
 * Hook to dynamically set or update the title for the active sub-page in the breadcrumbs.
 * Cleans up when the component unmounts.
 */
export function useSetBreadcrumbTitle(
  title: string | undefined | null,
  overrideKey?: string
) {
  const { setBreadcrumbOverride, removeBreadcrumbOverride } = useBreadcrumbs();
  const params = useParams();
  const pathname = usePathname();

  useEffect(() => {
    if (!title) return;

    // Determine the key: provided overrideKey, or route param (id / subject), or last segment
    const key =
      overrideKey ||
      (typeof params?.id === "string" ? params.id : undefined) ||
      (typeof params?.subject === "string" ? params.subject : undefined) ||
      pathname?.split("/").filter(Boolean).pop();

    if (key) {
      setBreadcrumbOverride(key, title);
      return () => {
        removeBreadcrumbOverride(key);
      };
    }
  }, [title, overrideKey, params, pathname, setBreadcrumbOverride, removeBreadcrumbOverride]);
}
