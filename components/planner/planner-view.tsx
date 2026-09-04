"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CalendarDays, Plus, Sparkles, BookOpen, Clock } from "lucide-react";
import { getInitials, cn } from "@/lib/utils";
import { getSubjectTheme } from "@/lib/subject-colors";

interface PlannerViewProps {
  children: any[];
}

export function PlannerView({ children }: PlannerViewProps) {
  const [selectedChildId, setSelectedChildId] = useState<string | null>(
    children[0]?.id ?? null
  );

  const selectedChild = children.find((c) => c.id === selectedChildId);
  const lessons = selectedChild?.lessons ?? [];

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-serif text-2xl sm:text-3xl font-bold text-brand-green-deep tracking-tight">Planner</h1>
          <p className="text-muted-foreground text-sm mt-1">Plan and manage lessons for each child.</p>
        </div>
        <Button
          disabled
          title="Coming soon — manual lesson creation isn't available yet."
          className="bg-brand-green hover:bg-brand-green-deep gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Plus className="w-4 h-4" />
          New lesson
          <span className="ml-1 text-[10px] uppercase tracking-wider opacity-75">Soon</span>
        </Button>
      </div>

      {children.length === 0 ? (
        <Card className="border-[#EAE3D2] bg-white shadow-2xs">
          <CardContent className="py-16 text-center">
            <CalendarDays className="w-12 h-12 text-muted-foreground/40 mx-auto mb-4" />
            <p className="font-serif font-bold text-lg text-brand-green-deep mb-2">No children added yet</p>
            <p className="text-sm text-muted-foreground">Add a child first to start planning lessons.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Child picker */}
          <div className="space-y-2.5">
            {children.map((child) => (
              <button
                key={child.id}
                onClick={() => setSelectedChildId(child.id)}
                className={cn(
                  "w-full text-left rounded-2xl p-3.5 border transition-all",
                  selectedChildId === child.id
                    ? "bg-[#EFF4F6] border-[#2B5F75]/40 shadow-xs ring-1 ring-[#2B5F75]/20"
                    : "bg-white border-[#EAE3D2] hover:bg-[#FAF6ED]/60 shadow-2xs"
                )}
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#182848] to-[#2B5F75] flex items-center justify-center text-white text-xs font-serif font-bold shadow-2xs">
                    {getInitials(child.name)}
                  </div>
                  <div>
                    <p className="font-serif font-bold text-sm text-[#182848]">{child.name}</p>
                    <p className="text-xs text-muted-foreground">{child.yearGroup ?? `Age ${child.age}`}</p>
                  </div>
                </div>
                <p className="text-xs text-[#546477] font-medium mt-2.5 pl-0.5">
                  {child.lessons.length} lesson{child.lessons.length !== 1 ? "s" : ""}
                </p>
              </button>
            ))}
          </div>

          {/* Lessons */}
          <div className="md:col-span-2 space-y-3">
            {selectedChild && (
              <>
                <div className="flex items-center justify-between">
                  <h2 className="font-serif text-lg font-bold text-brand-green-deep">
                    {selectedChild.name}&apos;s lessons
                  </h2>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled
                    title="Use the dashboard's Generate flow — this entry point isn't wired up yet."
                    className="gap-2 border-brand-green/30 text-brand-green hover:bg-brand-mint disabled:opacity-50 disabled:cursor-not-allowed text-xs"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    Generate with AI
                    <span className="ml-1 text-[10px] uppercase tracking-wider opacity-75">Soon</span>
                  </Button>
                </div>

                {lessons.length === 0 ? (
                  <Card className="border-[#EAE3D2] bg-white shadow-2xs">
                    <CardContent className="py-10 text-center">
                      <BookOpen className="w-8 h-8 text-muted-foreground/40 mx-auto mb-3" />
                      <p className="text-sm text-muted-foreground">No lessons yet. Generate one with AI or add manually.</p>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="space-y-2.5">
                    {lessons.map((lesson: any) => {
                      const theme = getSubjectTheme(lesson.subject);
                      return (
                        <div
                          key={lesson.id}
                          className="bg-white rounded-2xl border border-[#EAE3D2] p-4 flex items-start gap-3 shadow-2xs hover:shadow-xs transition-shadow"
                        >
                          <div
                            className={cn("w-1.5 self-stretch rounded-full shrink-0 -my-1", theme.dot)}
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                              <p className="font-serif font-bold text-sm text-[#182848] truncate">
                                {lesson.title ?? lesson.topic}
                              </p>
                              <Badge
                                variant={lesson.status === "COMPLETED" ? "heritage" : "sage"}
                                className="text-[10px] shrink-0 font-medium uppercase tracking-wider"
                              >
                                {lesson.status === "COMPLETED" ? "Completed" : lesson.status}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-2 mt-2 flex-wrap">
                              <span className={cn("text-[11px] font-semibold px-2 py-0.5 rounded-md border", theme.badgeBg, theme.badgeBorder, theme.text)}>
                                {lesson.subject}
                              </span>
                              {lesson.durationMins && (
                                <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                                  <Clock className="w-3 h-3" />
                                  {lesson.durationMins} min
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
