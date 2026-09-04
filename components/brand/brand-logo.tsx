import React from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";

export interface BrandLogoProps {
  size?: "sm" | "md" | "lg" | "xl";
  showWordmark?: boolean;
  showSubtitle?: boolean;
  subtitle?: string;
  href?: string;
  className?: string;
  inverted?: boolean;
}

/**
 * BrandLogo — "The Bloom Folio"
 * Unites the open learning folio (curriculum & keepsake journal)
 * with the rising botanical sprout (Bloom milestone celebration).
 */
export function BrandLogo({
  size = "md",
  showWordmark = true,
  showSubtitle = true,
  subtitle = "Home Education",
  href,
  className,
  inverted = false,
}: BrandLogoProps) {
  const sizeMap = {
    sm: { box: "w-6 h-6 rounded-lg", text: "text-base", sub: "text-[9px]" },
    md: { box: "w-8 h-8 rounded-xl", text: "text-lg", sub: "text-[10px]" },
    lg: { box: "w-11 h-11 rounded-2xl", text: "text-2xl", sub: "text-xs" },
    xl: { box: "w-14 h-14 rounded-2xl", text: "text-3xl", sub: "text-xs" },
  };

  const currentSize = sizeMap[size];

  const content = (
    <div className={cn("inline-flex items-center gap-2.5 group select-none", className)}>
      {/* Emblem / Mark */}
      <div
        className={cn(
          currentSize.box,
          "planned-gradient flex items-center justify-center shadow-xs ring-1 ring-black/5 shrink-0"
        )}
      >
        <svg
          viewBox="0 0 32 32"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-[66%] h-[66%] text-white"
          aria-hidden="true"
        >
          {/* Left Page of Folio */}
          <path
            d="M16 25C13.2 23.4 9 23 5 24V8C9 7 13.2 7.4 16 9V25Z"
            fill="currentColor"
            fillOpacity="0.25"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {/* Right Page of Folio */}
          <path
            d="M16 25C18.8 23.4 23 23 27 24V8C23 7 18.8 7.4 16 9V25Z"
            fill="currentColor"
            fillOpacity="0.25"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {/* Spine Divider */}
          <path
            d="M16 9V25"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
          {/* Central Bloom Sprout Stem */}
          <path
            d="M16 19V7"
            stroke="#F3C66F"
            strokeWidth="1.75"
            strokeLinecap="round"
          />
          {/* Left Leaf Petal */}
          <path
            d="M16 13C13.5 13 11.5 10.8 12 8C14.5 8 16 10.2 16 13Z"
            fill="#F3C66F"
          />
          {/* Right Leaf Petal */}
          <path
            d="M16 10C18.5 10 20.5 7.8 20 5C17.5 5 16 7.2 16 10Z"
            fill="#F3C66F"
          />
        </svg>
      </div>

      {/* Wordmark + Tagline */}
      {showWordmark && (
        <div className="flex flex-col justify-center text-left">
          <span
            className={cn(
              "font-serif font-bold tracking-tight leading-none transition-colors",
              currentSize.text,
              inverted
                ? "text-white"
                : "text-brand-green-deep group-hover:text-brand-green"
            )}
          >
            Planned
          </span>
          {showSubtitle && size !== "sm" && (
            <span
              className={cn(
                "font-sans font-medium uppercase tracking-widest mt-0.5 leading-none",
                currentSize.sub,
                inverted ? "text-white/70" : "text-muted-foreground"
              )}
            >
              {subtitle}
            </span>
          )}
        </div>
      )}
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="inline-flex items-center">
        {content}
      </Link>
    );
  }

  return content;
}
