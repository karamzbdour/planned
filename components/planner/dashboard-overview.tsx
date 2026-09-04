"use client";

import Link from "next/link";
import { Users, BookOpen, Flower2, Sparkles, Plus, Star } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getInitials } from "@/lib/utils";
import { BrandLogo } from "@/components/brand/brand-logo";

interface DashboardOverviewProps {
  children: any[];
  pendingLessons: any[];
  userName: string;
}

export function DashboardOverview({ children, pendingLessons, userName }: DashboardOverviewProps) {
  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return "Good morning";
    if (h < 17) return "Good afternoon";
    return "Good evening";
  };

  if (children.length === 0) {
    return (
      <div className="max-w-lg mx-auto pt-16 text-center">
        <BrandLogo size="xl" showWordmark={false} className="mx-auto mb-6" />
        <h1 className="font-display text-3xl font-bold text-brand-green-deep mb-3">
          Welcome to Planned!
        </h1>
        <p className="text-muted-foreground mb-8 text-base">
          Let&apos;s add your first child to start generating personalised lessons.
        </p>
        <Link href="/dashboard/children">
          <Button className="bg-brand-green hover:bg-brand-green-deep gap-2 shadow-sm active:scale-[0.99]">
            <Plus className="w-4 h-4" />
            Add your first child
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h1 className="font-display text-3xl font-bold text-brand-green-deep">
          {greeting()}, {userName.split(" ")[0]} 👋
        </h1>
        <p className="text-muted-foreground text-sm mt-1 font-sans">
          Here&apos;s your family&apos;s learning snapshot.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {[
          {
            label: "Children",
            value: children.length,
            icon: <Users className="w-4 h-4 text-brand-green" />,
            colour: "bg-brand-mint border border-brand-green/20",
          },
          {
            label: "Lessons due",
            value: pendingLessons.length,
            icon: <BookOpen className="w-4 h-4 text-[#1C4E75]" />,
            colour: "bg-[#F0F5F9] border border-[#CDE0EE]",
          },
          {
            label: "Bloom stars",
            value: children.reduce((sum, c) => sum + c.bloomStars, 0),
            icon: <Flower2 className="w-4 h-4 text-amber-600" />,
            colour: "bg-brand-amber border border-amber-300/40",
          },
        ].map((stat) => (
          <Card key={stat.label} className="border-border/80 shadow-2xs hover:shadow-xs transition-shadow">
            <CardContent className="p-4">
              <div className={`w-8 h-8 rounded-lg ${stat.colour} flex items-center justify-center mb-3 shadow-2xs`}>
                {stat.icon}
              </div>
              <p className="font-display font-bold text-2xl text-brand-green-deep leading-none">{stat.value}</p>
              <p className="text-xs text-muted-foreground mt-1 font-sans">{stat.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Children cards */}
        <Card className="border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Users className="w-4 h-4 text-brand-green" />
                Your children
              </span>
              <Link href="/dashboard/children">
                <Button variant="ghost" size="sm" className="text-xs h-7">View all</Button>
              </Link>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {children.slice(0, 3).map((child) => (
              <div key={child.id} className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-brand-mint flex items-center justify-center text-brand-green-deep font-display font-bold text-sm shrink-0">
                  {getInitials(child.name)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-brand-green-deep truncate">{child.name}</p>
                  <p className="text-xs text-muted-foreground">{child.yearGroup ?? `Age ${child.age}`}</p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                  <span className="text-xs font-medium text-brand-green-deep">{child.bloomStars}</span>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* AI prompt card */}
        <Card className="border-brand-green/20 bg-gradient-to-br from-brand-mint to-brand-amber border-0">
          <CardContent className="p-6 flex flex-col justify-between h-full gap-4">
            <div>
              <p className="font-display font-semibold text-lg text-brand-green-deep">
                Generate a lesson with AI
              </p>
              <p className="text-sm text-brand-green-deep/70 mt-1">
                Tell us the subject and topic — get a full, personalised lesson plan in seconds.
              </p>
            </div>
            <Link href="/dashboard/planner">
              <Button className="bg-brand-green hover:bg-brand-green-deep w-full gap-2">
                <Sparkles className="w-4 h-4" />
                Open planner
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
