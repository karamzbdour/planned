"use client";

import { useState, useCallback, useEffect } from "react";
import { Check, Circle } from "lucide-react";
import { cn } from "@/lib/utils";

interface Objective {
  id: string;
  text: string;
  completed: boolean;
  completedAt: string | null;
}

interface ObjectiveListProps {
  lessonId: string;
  objectives: Objective[];
}

export function ObjectiveList({ lessonId, objectives: initial }: ObjectiveListProps) {
  const [objectives, setObjectives] = useState<Objective[]>(initial || []);

  useEffect(() => {
    setObjectives(initial || []);
  }, [initial]);

  const toggle = useCallback(
    async (objId: string, currentCompleted: boolean) => {
      const next = !currentCompleted;

      // Optimistic update
      setObjectives((prev) =>
        prev.map((o) =>
          o.id === objId
            ? { ...o, completed: next, completedAt: next ? new Date().toISOString() : null }
            : o
        )
      );

      try {
        const res = await fetch(`/api/lessons/${lessonId}/objectives/${objId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ completed: next }),
        });
        if (!res.ok) throw new Error("Failed");
      } catch {
        // Revert on error
        setObjectives((prev) =>
          prev.map((o) =>
            o.id === objId
              ? { ...o, completed: currentCompleted, completedAt: null }
              : o
          )
        );
      }
    },
    [lessonId]
  );

  const doneCount = objectives.filter((o) => o.completed).length;

  return (
    <div className="space-y-2.5">
      {doneCount > 0 && (
        <p className="text-xs text-brand-green font-medium mb-1">
          {doneCount}/{objectives.length} completed
        </p>
      )}
      {objectives.map((obj) => (
        <button
          key={obj.id}
          onClick={() => toggle(obj.id, obj.completed)}
          className={cn(
            "w-full flex items-start gap-3 px-4 py-3 rounded-xl border text-left transition-all duration-150",
            obj.completed
              ? "bg-brand-mint border-brand-green/30"
              : "bg-white border-[hsl(var(--border))] hover:border-brand-green/30 hover:bg-brand-mint/30"
          )}
        >
          <span
            className={cn(
              "mt-0.5 w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors",
              obj.completed
                ? "bg-brand-green border-brand-green"
                : "border-muted-foreground/40"
            )}
          >
            {obj.completed ? (
              <Check className="w-3 h-3 text-white" strokeWidth={3} />
            ) : (
              <Circle className="w-2.5 h-2.5 text-muted-foreground/30" />
            )}
          </span>
          <span
            className={cn(
              "text-sm leading-relaxed",
              obj.completed
                ? "text-brand-green-deep line-through decoration-brand-green/50"
                : "text-foreground"
            )}
          >
            {obj.text}
          </span>
        </button>
      ))}
    </div>
  );
}
