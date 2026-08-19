"use client";

import React from "react";
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { useBreadcrumbs, BreadcrumbItemData } from "@/contexts/breadcrumbs";
import { cn } from "@/lib/utils";

interface BreadcrumbsProps {
  items?: BreadcrumbItemData[];
  className?: string;
  showHomeIcon?: boolean;
  showAllOnMobile?: boolean;
}

export function Breadcrumbs({
  items,
  className,
  showHomeIcon = true,
  showAllOnMobile = false,
}: BreadcrumbsProps) {
  const context = useBreadcrumbs();
  const breadcrumbItems = items ?? context.breadcrumbs;

  // Don't render empty or single-item dashboard breadcrumb if not needed,
  // or render if on sub-pages (2+ items).
  if (!breadcrumbItems || breadcrumbItems.length <= 1) {
    return null;
  }

  return (
    <Breadcrumb className={cn("py-1", className)}>
      <BreadcrumbList className="flex-nowrap overflow-x-auto no-scrollbar py-0.5">
        {breadcrumbItems.map((item, index) => {
          const isFirst = index === 0;
          const isLast = index === breadcrumbItems.length - 1;
          const Icon = item.icon;

          return (
            <React.Fragment key={item.href ?? `${item.label}-${index}`}>
              {index > 0 && <BreadcrumbSeparator />}
              <BreadcrumbItem
                className={cn(
                  "shrink-0",
                  !showAllOnMobile && !isLast && index < breadcrumbItems.length - 2
                    ? "hidden sm:inline-flex"
                    : "inline-flex"
                )}
              >
                {isLast ? (
                  <BreadcrumbPage
                    className="max-w-[140px] sm:max-w-[220px] md:max-w-[300px] truncate"
                    title={item.label}
                  >
                    {isFirst && showHomeIcon && Icon && (
                      <Icon className="w-3.5 h-3.5 text-brand-green shrink-0" />
                    )}
                    <span>{item.label}</span>
                  </BreadcrumbPage>
                ) : (
                  <BreadcrumbLink
                    href={item.href || "#"}
                    className="max-w-[120px] sm:max-w-[180px] md:max-w-[240px] truncate"
                    title={item.label}
                  >
                    {isFirst && showHomeIcon && Icon && (
                      <Icon className="w-3.5 h-3.5 text-muted-foreground/80 hover:text-brand-green shrink-0" />
                    )}
                    <span>{item.label}</span>
                  </BreadcrumbLink>
                )}
              </BreadcrumbItem>
            </React.Fragment>
          );
        })}
      </BreadcrumbList>
    </Breadcrumb>
  );
}
