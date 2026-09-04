import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default: "border-transparent bg-primary text-primary-foreground shadow-2xs",
        secondary: "border-transparent bg-secondary text-secondary-foreground",
        destructive: "border-transparent bg-destructive text-destructive-foreground",
        outline: "border-border text-foreground bg-white/60",
        success: "border-brand-green/20 bg-brand-mint text-brand-green-deep font-medium",
        amber: "border-amber-300/40 bg-brand-amber text-amber-950 font-medium",
        heritage: "border-transparent bg-brand-green-deep text-white shadow-2xs",
        sage: "border-brand-green/20 bg-brand-mint text-brand-green-deep",
        gold: "border-amber-300/60 bg-gradient-to-b from-amber-50 to-amber-100/90 text-amber-950 shadow-2xs font-semibold",
        terracotta: "border-transparent bg-[#FDF2EE] text-[#8E3B20] border-[#F6D7CC]",
        subtle: "border-border/60 bg-muted/60 text-muted-foreground",
      },
    },
    defaultVariants: { variant: "default" },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
