"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getInitials } from "@/lib/utils";
import { Plus, Users, Star, BookOpen } from "lucide-react";
import Link from "next/link";

interface ChildrenViewProps {
  children: any[];
}

export function ChildrenView({ children }: ChildrenViewProps) {
  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-serif text-2xl sm:text-3xl font-bold text-brand-green-deep tracking-tight">Children</h1>
          <p className="text-muted-foreground text-sm mt-1">Manage learner profiles and track individual progress.</p>
        </div>
        <Link href="/onboarding/child">
          <Button className="bg-brand-green hover:bg-brand-green-deep gap-2 shadow-2xs">
            <Plus className="w-4 h-4" />
            Add child
          </Button>
        </Link>
      </div>

      {children.length === 0 ? (
        <Card className="border-[#EAE3D2] bg-white shadow-2xs">
          <CardContent className="py-16 text-center">
            <Users className="w-12 h-12 text-muted-foreground/40 mx-auto mb-4" />
            <p className="font-serif font-bold text-lg text-brand-green-deep mb-2">No children added yet</p>
            <p className="text-sm text-muted-foreground mb-6">Add your children to start their learning journey.</p>
            <Link href="/onboarding/child">
              <Button className="bg-brand-green hover:bg-brand-green-deep gap-2 shadow-2xs">
                <Plus className="w-4 h-4" />
                Add your first child
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {children.map((child) => {
            const completedLessons = child.lessons?.filter((l: any) => l.status === "COMPLETED").length ?? 0;
            const interests: string[] = JSON.parse(child.interests ?? "[]");

            return (
              <div key={child.id} className="bg-white rounded-2xl border border-[#EAE3D2] p-5 shadow-2xs hover:shadow-xs transition-shadow">
                <div className="flex items-start gap-3.5">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#182848] to-[#2B5F75] flex items-center justify-center text-white font-serif font-bold text-lg shrink-0 shadow-2xs">
                    {getInitials(child.name)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h2 className="font-serif font-bold text-base text-brand-green-deep">{child.name}</h2>
                      {child.yearGroup && <Badge variant="heritage" className="text-[10px] tracking-wide font-medium">{child.yearGroup}</Badge>}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">Age {child.age}</p>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-2.5">
                  <div className="bg-[#FDF6E7] border border-[#E9CE98] rounded-xl p-2.5 text-center">
                    <div className="flex items-center justify-center gap-1 mb-0.5">
                      <Star className="w-3.5 h-3.5 text-[#C98A2C] fill-[#C98A2C]" />
                      <p className="font-serif font-bold text-lg text-brand-green-deep">{child.bloomStars}</p>
                    </div>
                    <p className="text-[11px] text-muted-foreground font-medium">Bloom stars</p>
                  </div>
                  <div className="bg-[#EFF4F6] border border-[#D1DFE4] rounded-xl p-2.5 text-center">
                    <div className="flex items-center justify-center gap-1 mb-0.5">
                      <BookOpen className="w-3.5 h-3.5 text-brand-green" />
                      <p className="font-serif font-bold text-lg text-brand-green-deep">{completedLessons}</p>
                    </div>
                    <p className="text-[11px] text-muted-foreground font-medium">Lessons done</p>
                  </div>
                </div>

                {interests.length > 0 && (
                  <div className="mt-3.5 flex flex-wrap gap-1.5">
                    {interests.slice(0, 5).map((interest: string) => (
                      <span key={interest} className="text-[11px] font-medium bg-[#FAF6ED] text-[#546477] border border-[#EAE3D2] rounded-full px-2.5 py-0.5 capitalize">
                        {interest}
                      </span>
                    ))}
                    {interests.length > 5 && (
                      <span className="text-[11px] text-muted-foreground self-center font-medium">+{interests.length - 5}</span>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
