"use client";

import { ALL_EXPRESSIONS } from "@/services/api";
import { CheckSquare, Square } from "lucide-react";

interface ExpressionSelectorProps {
  selected: string[];
  onChange: (expressions: string[]) => void;
}

const EXPRESSION_ICONS: Record<string, string> = {
  happy: "😊",
  sad: "😢",
  angry: "😠",
  surprise: "😲",
  fear: "😨",
  disgust: "🤢",
  neutral: "😐",
};

export default function ExpressionSelector({ selected, onChange }: ExpressionSelectorProps) {
  const allSelected = selected.length === ALL_EXPRESSIONS.length;

  function toggleExpression(expr: string) {
    if (selected.includes(expr)) {
      onChange(selected.filter((e) => e !== expr));
    } else {
      onChange([...selected, expr]);
    }
  }

  function toggleAll() {
    if (allSelected) {
      onChange([]);
    } else {
      onChange([...ALL_EXPRESSIONS]);
    }
  }

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-neutral-200 bg-white/60 p-5 shadow-sm backdrop-blur-md dark:border-neutral-800 dark:bg-neutral-900/60">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-bold text-neutral-800 dark:text-neutral-200">
            Target Expressions ({selected.length} / {ALL_EXPRESSIONS.length})
          </h3>
          <p className="text-xs text-neutral-500">
            Select the facial expressions to generate for this subject
          </p>
        </div>
        <button
          type="button"
          onClick={toggleAll}
          className="flex items-center gap-1.5 rounded-lg border border-purple-200 bg-purple-50/80 px-3 py-1.5 text-xs font-semibold text-purple-700 transition-colors hover:bg-purple-100 dark:border-purple-900/40 dark:bg-purple-950/40 dark:text-purple-300 dark:hover:bg-purple-900/60"
        >
          {allSelected ? (
            <>
              <CheckSquare className="h-3.5 w-3.5" /> Deselect All
            </>
          ) : (
            <>
              <Square className="h-3.5 w-3.5" /> Select All 7
            </>
          )}
        </button>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 md:grid-cols-7">
        {ALL_EXPRESSIONS.map((expr) => {
          const isSelected = selected.includes(expr);
          const icon = EXPRESSION_ICONS[expr] || "🙂";

          return (
            <button
              key={expr}
              type="button"
              onClick={() => toggleExpression(expr)}
              className={`flex flex-col items-center justify-center rounded-xl p-3 text-center transition-all ${
                isSelected
                  ? "border-2 border-purple-600 bg-purple-50 text-purple-900 shadow-sm dark:border-purple-500 dark:bg-purple-950/60 dark:text-purple-200"
                  : "border border-neutral-200 bg-neutral-50/50 text-neutral-600 hover:border-neutral-300 dark:border-neutral-800 dark:bg-neutral-900/30 dark:text-neutral-400 dark:hover:border-neutral-700"
              }`}
            >
              <span className="text-2xl">{icon}</span>
              <span className="mt-1 text-xs font-semibold capitalize">{expr}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
