"use client";

import { useEffect, useState } from "react";
import { Clock, Download, History as HistoryIcon, Sparkles, AlertCircle, CheckCircle2, RefreshCw } from "lucide-react";
import { getHistory, downloadZipUrl, type HistoryItemOut } from "@/services/api";
import Link from "next/link";

export default function HistoryViewer() {
  const [history, setHistory] = useState<HistoryItemOut[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadHistory();
  }, []);

  async function loadHistory() {
    setLoading(true);
    setError(null);
    try {
      const data = await getHistory(50);
      setHistory(data || []);
    } catch (err: any) {
      console.error("History fetch error:", err);
      const msg =
        err?.response?.data?.detail ??
        (err?.message ? `History API Error: ${err.message}` : "Failed to load generation history from database.");
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center text-slate-400">
        <Sparkles className="mb-3 h-8 w-8 animate-spin text-purple-500" />
        <p className="text-xs font-medium">Fetching generation audit logs from SQLite database...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-6 text-red-400">
        <div className="flex items-center gap-2 font-bold text-sm">
          <AlertCircle className="h-4 w-4" />
          <span>Error Loading History</span>
        </div>
        <p className="mt-1 text-xs text-red-300">{error}</p>
        <button
          type="button"
          onClick={loadHistory}
          className="mt-3 flex items-center gap-1.5 rounded-lg border border-red-500/40 bg-red-500/20 px-3 py-1.5 text-xs font-semibold text-red-200 hover:bg-red-500/30"
        >
          <RefreshCw className="h-3 w-3" />
          Retry Connection
        </button>
      </div>
    );
  }

  if (history.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-slate-800 bg-slate-900/30 p-12 text-center text-slate-400 backdrop-blur-md">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-900 text-purple-400 border border-slate-800 mb-3">
          <HistoryIcon className="h-7 w-7" />
        </div>
        <h3 className="font-bold text-slate-200">No Generation History Found</h3>
        <p className="mt-1 max-w-sm text-xs text-slate-400">
          The SQLite database currently has 0 generation records. Upload a photo and run an expression generation in the Studio to populate history logs.
        </p>

        <Link
          href="/upload"
          className="mt-5 flex items-center gap-2 rounded-xl bg-purple-600 px-5 py-2.5 text-xs font-semibold text-white shadow-lg shadow-purple-600/30 transition-all hover:bg-purple-500"
        >
          <Sparkles className="h-4 w-4" />
          Start New Generation
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-100">Generation Audit History</h2>
          <p className="text-xs text-slate-400">Showing {history.length} recent expression generation records</p>
        </div>
        <button
          type="button"
          onClick={loadHistory}
          className="flex items-center gap-1.5 rounded-xl border border-slate-800 bg-slate-900 px-3 py-1.5 text-xs font-medium text-slate-300 transition-colors hover:border-slate-700 hover:bg-slate-800"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Refresh Log
        </button>
      </div>

      <div className="grid gap-4 sm:grid-cols-1 md:grid-cols-2">
        {history.map((item) => {
          const passedCount = item.outputs.filter((o) => o.passed_quality).length;
          const totalCount = item.outputs.length;
          const formattedDate = new Date(item.created_at).toLocaleString();

          return (
            <div
              key={item.id}
              className="flex flex-col justify-between rounded-2xl border border-slate-800 bg-slate-900/60 p-5 shadow-sm backdrop-blur-md transition-all hover:border-slate-700 hover:shadow-lg"
            >
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-semibold text-purple-400">
                    ID: {item.id}
                  </span>
                  <span className="flex items-center gap-1 text-xs text-slate-400">
                    <Clock className="h-3 w-3" />
                    {formattedDate}
                  </span>
                </div>

                <div className="flex flex-wrap gap-2 text-xs">
                  <span className="rounded-md bg-purple-950/80 px-2.5 py-1 font-medium capitalize text-purple-300 border border-purple-800/40">
                    Category: {item.category}
                  </span>
                  {item.subtype && item.subtype !== "unspecified" && (
                    <span className="rounded-md bg-slate-800 px-2.5 py-1 font-medium capitalize text-slate-300 border border-slate-700">
                      Subtype: {item.subtype}
                    </span>
                  )}
                  {item.lora_used ? (
                    <span className="rounded-md bg-emerald-950/80 px-2.5 py-1 font-medium text-emerald-300 border border-emerald-800/40">
                      LoRA: {item.lora_used}
                    </span>
                  ) : (
                    <span className="rounded-md bg-slate-800 px-2.5 py-1 text-slate-400">
                      Base SD 1.5
                    </span>
                  )}
                </div>

                <div className="flex items-center justify-between rounded-xl bg-slate-950/60 p-3 text-xs border border-slate-850">
                  <span className="text-slate-400">Quality Pass Rate:</span>
                  <span className="flex items-center gap-1 font-semibold text-slate-200">
                    {passedCount === totalCount ? (
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                    ) : (
                      <AlertCircle className="h-3.5 w-3.5 text-amber-400" />
                    )}
                    {passedCount} / {totalCount} Passed
                  </span>
                </div>

                <div>
                  <p className="mb-1.5 text-xs font-medium text-slate-400">Expressions Generated:</p>
                  <div className="flex flex-wrap gap-1.5">
                    {item.outputs.map((out, idx) => (
                      <span
                        key={idx}
                        className={`rounded-md border px-2 py-0.5 text-xs font-medium capitalize ${
                          out.passed_quality
                            ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                            : "border-amber-500/30 bg-amber-500/10 text-amber-300"
                        }`}
                      >
                        {out.expression}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <div className="mt-4 border-t border-slate-800/80 pt-3">
                <a
                  href={downloadZipUrl(item.id)}
                  download
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-purple-600 py-2.5 text-xs font-semibold text-white transition-colors hover:bg-purple-500 shadow-md"
                >
                  <Download className="h-3.5 w-3.5" />
                  Download Complete Package (.ZIP)
                </a>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
