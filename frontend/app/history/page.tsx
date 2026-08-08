"use client";

import HistoryViewer from "@/components/HistoryViewer";
import { History, Sparkles } from "lucide-react";

export default function HistoryPage() {
  return (
    <div className="mx-auto max-w-6xl flex flex-col gap-8 py-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-2">
          <History className="h-6 w-6 text-purple-400" />
          Generation History & Audit Logs
        </h1>
        <p className="text-xs text-slate-400">
          Persistent SQLite database history of all synthetic expression generation requests and quality verification scores
        </p>
      </div>

      <HistoryViewer />
    </div>
  );
}
