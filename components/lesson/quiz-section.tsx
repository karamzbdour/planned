"use client";

import { useState, useEffect } from "react";
import { CheckCircle, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface QuizQuestion {
  question?: string;
  options?: string[];
  correctIndex?: number;
}

interface QuizSectionProps {
  questions?: QuizQuestion[];
  isStreaming?: boolean;
}

export function QuizSection({ questions = [], isStreaming = false }: QuizSectionProps) {
  const [answers, setAnswers] = useState<(number | null)[]>([]);
  const [submitted, setSubmitted] = useState(false);

  // Sync answers array when questions count changes
  useEffect(() => {
    setAnswers((prev) => {
      if (prev.length === questions.length) return prev;
      const next = Array(questions.length).fill(null);
      prev.forEach((val, idx) => {
        if (idx < next.length) next[idx] = val;
      });
      return next;
    });
  }, [questions.length]);

  const validQuestions = (questions || []).filter((q) => q && q.question);
  const allAnswered =
    validQuestions.length > 0 &&
    validQuestions.every((_, i) => answers[i] !== null && answers[i] !== undefined);

  const score = submitted
    ? answers.filter(
        (a, i) =>
          a !== null &&
          validQuestions[i] &&
          typeof validQuestions[i].correctIndex === "number" &&
          a === validQuestions[i].correctIndex
      ).length
    : 0;

  function select(qIdx: number, optIdx: number) {
    if (submitted || isStreaming) return;
    setAnswers((prev) => prev.map((a, i) => (i === qIdx ? optIdx : a)));
  }

  function submit() {
    if (allAnswered && !isStreaming) setSubmitted(true);
  }

  function reset() {
    setAnswers(Array(validQuestions.length).fill(null));
    setSubmitted(false);
  }

  if (validQuestions.length === 0) {
    return (
      <div className="space-y-3">
        <div className="h-4 bg-muted/60 rounded animate-pulse w-3/4" />
        <div className="h-10 bg-muted/40 rounded-xl animate-pulse w-full" />
        <div className="h-10 bg-muted/40 rounded-xl animate-pulse w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {submitted && (
        <div
          className={cn(
            "rounded-xl px-5 py-4 flex items-center gap-3",
            score === validQuestions.length
              ? "bg-brand-mint border border-brand-green/30"
              : "bg-brand-amber border border-amber-300/50"
          )}
        >
          {score === validQuestions.length ? (
            <CheckCircle className="w-5 h-5 text-brand-green shrink-0" />
          ) : (
            <XCircle className="w-5 h-5 text-amber-600 shrink-0" />
          )}
          <div>
            <p className="font-semibold text-brand-green-deep">
              {score === validQuestions.length
                ? "🎉 Perfect score!"
                : `${score} out of ${validQuestions.length} correct`}
            </p>
            <p className="text-xs text-brand-green-deep/70 mt-0.5">
              {score === validQuestions.length
                ? "Brilliant work — all answers correct!"
                : "Review the highlighted answers and try again."}
            </p>
          </div>
        </div>
      )}

      {validQuestions.map((q, qIdx) => {
        const chosen = answers[qIdx] ?? null;
        const options = Array.isArray(q.options) ? q.options.filter(Boolean) : [];
        const isCorrect = submitted && chosen === q.correctIndex;
        const isWrong =
          submitted && chosen !== null && chosen !== q.correctIndex;

        return (
          <div key={qIdx} className="space-y-2.5">
            <p className="font-medium text-brand-green-deep text-sm">
              <span className="text-brand-green font-bold mr-1.5">
                Q{qIdx + 1}.
              </span>
              {q.question}
            </p>

            {options.length > 0 ? (
              <div className="grid grid-cols-1 gap-2">
                {options.map((opt, optIdx) => {
                  const isSelected = chosen === optIdx;
                  const isAnswer = q.correctIndex === optIdx;

                  let stateClass =
                    "bg-white border-[hsl(var(--border))] hover:border-brand-green/40 hover:bg-brand-mint/20";
                  if (!submitted && isSelected) {
                    stateClass = "bg-brand-mint border-brand-green";
                  }
                  if (submitted) {
                    if (isAnswer) {
                      stateClass = "bg-brand-mint border-brand-green";
                    } else if (isSelected && !isAnswer) {
                      stateClass = "bg-red-50 border-red-300";
                    } else {
                      stateClass =
                        "bg-white border-[hsl(var(--border))] opacity-60";
                    }
                  }

                  return (
                    <button
                      key={optIdx}
                      onClick={() => select(qIdx, optIdx)}
                      disabled={submitted || isStreaming}
                      className={cn(
                        "w-full flex items-center gap-3 px-4 py-2.5 rounded-xl border text-left text-sm transition-all",
                        stateClass,
                        !submitted && !isStreaming && "cursor-pointer"
                      )}
                    >
                      <span
                        className={cn(
                          "w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 text-xs font-bold",
                          !submitted && isSelected
                            ? "border-brand-green bg-brand-green text-white"
                            : submitted && isAnswer
                            ? "border-brand-green bg-brand-green text-white"
                            : submitted && isSelected && !isAnswer
                            ? "border-red-400 bg-red-400 text-white"
                            : "border-muted-foreground/30 text-muted-foreground"
                        )}
                      >
                        {String.fromCharCode(65 + optIdx)}
                      </span>
                      <span
                        className={cn(
                          submitted &&
                            isAnswer &&
                            "font-semibold text-brand-green-deep",
                          submitted &&
                            isSelected &&
                            !isAnswer &&
                            "text-red-600"
                        )}
                      >
                        {opt}
                      </span>
                      {submitted && isAnswer && (
                        <CheckCircle className="w-4 h-4 text-brand-green ml-auto shrink-0" />
                      )}
                      {submitted && isSelected && !isAnswer && (
                        <XCircle className="w-4 h-4 text-red-400 ml-auto shrink-0" />
                      )}
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="space-y-2">
                <div className="h-9 bg-muted/40 rounded-xl animate-pulse w-full" />
                <div className="h-9 bg-muted/40 rounded-xl animate-pulse w-full" />
              </div>
            )}
          </div>
        );
      })}

      {!submitted ? (
        <button
          onClick={submit}
          disabled={!allAnswered || isStreaming}
          className={cn(
            "w-full py-3 rounded-xl font-semibold text-sm transition-all",
            allAnswered && !isStreaming
              ? "bg-brand-green text-white hover:bg-brand-green-deep"
              : "bg-muted text-muted-foreground cursor-not-allowed"
          )}
        >
          {isStreaming
            ? "Generating quiz..."
            : allAnswered
            ? "Check my answers"
            : `Answer all ${validQuestions.length} questions to submit`}
        </button>
      ) : (
        <button
          onClick={reset}
          className="w-full py-3 rounded-xl font-semibold text-sm border border-brand-green/30 text-brand-green hover:bg-brand-mint transition-colors"
        >
          Try again
        </button>
      )}
    </div>
  );
}
