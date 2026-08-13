"use client";

import { useEffect, useState } from "react";
import {
  Clock,
  Download,
  History as HistoryIcon,
  Sparkles,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  Eye,
  X,
  Cookie,
  Trash2,
  ExternalLink,
} from "lucide-react";
import { getHistory, downloadZipUrl, type HistoryItemOut, type GenerateResponse } from "@/services/api";
import { getTasksFromCookies, saveTasksToCookies, clearTasksFromCookies } from "@/utils/cookieUtils";
import { useApp } from "@/context/AppContext";
import { useRouter } from "next/navigation";
import Link from "next/link";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface PreviewModalState {
  requestId: string;
  expression: string;
  url: string;
  passed: boolean;
  reasons: string[];
}

export default function HistoryViewer() {
  const router = useRouter();
  const { setLatestResult, addToast } = useApp();
  const [history, setHistory] = useState<HistoryItemOut[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [previewingImage, setPreviewingImage] = useState<PreviewModalState | null>(null);

  useEffect(() => {
    // 1. Initialize immediately from local browser cookies / storage
    const cookieTasks = getTasksFromCookies();
    if (cookieTasks.length > 0) {
      setHistory(cookieTasks);
    }
    // 2. Fetch latest history from backend API
    loadHistory();
  }, []);

  async function loadHistory() {
    setLoading(true);
    setError(null);
    try {
      const data = await getHistory(50);
      if (data && data.length > 0) {
        // Merge API history with cookie history
        const cookieTasks = getTasksFromCookies();
        const map = new Map<string, HistoryItemOut>();
        data.forEach((item) => map.set(item.id, item));
        cookieTasks.forEach((item) => {
          if (!map.has(item.id)) {
            map.set(item.id, item);
          }
        });
        const merged = Array.from(map.values()).sort(
          (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
        setHistory(merged);
        saveTasksToCookies(merged);
      }
    } catch (err: any) {
      console.error("History fetch error:", err);
      // Fallback to cookie tasks if backend offline
      const cookieTasks = getTasksFromCookies();
      if (cookieTasks.length > 0) {
        setHistory(cookieTasks);
      } else {
        const msg =
          err?.response?.data?.detail ??
          (err?.message ? `History API Error: ${err.message}` : "Failed to load generation history from database.");
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  }

  function handleClearCookies() {
    clearTasksFromCookies();
    setHistory([]);
    addToast("Cleared generation task history from cookies.", "info");
  }

  function handleOpenInGallery(item: HistoryItemOut) {
    const generateRes: GenerateResponse = {
      request_id: item.id,
      category: item.category,
      subtype: item.subtype,
      lora_used: item.lora_used,
      images: item.outputs.map((o) => ({
        expression: o.expression,
        passed_quality: o.passed_quality,
        failure_reasons: o.failure_reasons || [],
        download_url: o.download_url || `/api/download/${item.id}/${o.expression}`,
      })),
    };

    setLatestResult(generateRes);
    addToast(`Loaded task ${item.id} into Gallery viewer!`, "success");
    router.push("/gallery");
  }

  if (loading && history.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center text-slate-400">
        <Sparkles className="mb-3 h-8 w-8 animate-spin text-purple-500" />
        <p className="text-xs font-medium">Fetching generation audit logs from cookies & SQLite database...</p>
      </div>
    );
  }

  if (error && history.length === 0) {
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
          No tasks saved in cookies or SQLite database yet. Upload a photo and run an expression generation in the Studio to populate history logs.
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
      {/* Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            Generation Audit History
            <span className="flex items-center gap-1 rounded-full border border-purple-500/30 bg-purple-500/10 px-2.5 py-0.5 text-[11px] font-semibold text-purple-300">
              <Cookie className="h-3 w-3 text-purple-400" /> Cookie Synced
            </span>
          </h2>
          <p className="text-xs text-slate-400">Showing {history.length} saved tasks from cookies & database</p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={loadHistory}
            className="flex items-center gap-1.5 rounded-xl border border-slate-800 bg-slate-900 px-3 py-1.5 text-xs font-medium text-slate-300 transition-colors hover:border-slate-700 hover:bg-slate-800"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Refresh
          </button>

          <button
            type="button"
            onClick={handleClearCookies}
            className="flex items-center gap-1.5 rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-1.5 text-xs font-medium text-red-300 transition-colors hover:bg-red-500/20"
            title="Clear saved tasks cookie"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Clear Cookies
          </button>
        </div>
      </div>

      {/* Task Cards Grid */}
      <div className="grid gap-6 sm:grid-cols-1 md:grid-cols-2">
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

                {/* Generated Images Grid Preview */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs font-medium text-slate-300">Generated Images (Click to preview):</p>
                    <button
                      type="button"
                      onClick={() => handleOpenInGallery(item)}
                      className="flex items-center gap-1 text-[11px] font-semibold text-purple-400 hover:text-purple-300 transition-colors"
                    >
                      <ExternalLink className="h-3 w-3" />
                      View in Gallery
                    </button>
                  </div>

                  <div className="grid grid-cols-4 sm:grid-cols-7 gap-2">
                    {item.outputs.map((out) => {
                      const imgUrl = out.download_url
                        ? out.download_url.startsWith("http")
                          ? out.download_url
                          : `${API_URL}${out.download_url}`
                        : `${API_URL}/api/download/${item.id}/${out.expression}`;

                      return (
                        <button
                          type="button"
                          key={out.expression}
                          onClick={() =>
                            setPreviewingImage({
                              requestId: item.id,
                              expression: out.expression,
                              url: imgUrl,
                              passed: out.passed_quality,
                              reasons: out.failure_reasons || [],
                            })
                          }
                          className="group relative aspect-square overflow-hidden rounded-xl border border-slate-800 bg-slate-950 transition-all hover:scale-105 hover:border-purple-500 focus:outline-none"
                          title={`Click to view ${out.expression}`}
                        >
                          <img
                            src={imgUrl}
                            alt={out.expression}
                            className="h-full w-full object-cover"
                            onError={(e) => {
                              // Fallback placeholder if backend not available
                              (e.target as HTMLElement).style.display = "none";
                            }}
                          />
                          <div className="absolute inset-0 bg-slate-900/60 flex items-center justify-center text-slate-500 text-[10px] hidden group-has-[img[style*='display: none']]:flex">
                            {out.expression}
                          </div>

                          <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-transparent opacity-0 transition-opacity group-hover:opacity-100 flex flex-col justify-end p-1">
                            <span className="text-[10px] font-bold text-white capitalize truncate">{out.expression}</span>
                          </div>

                          <div className="absolute top-1 right-1">
                            {out.passed_quality ? (
                              <span className="h-2 w-2 rounded-full bg-emerald-400 ring-2 ring-slate-950 block" />
                            ) : (
                              <span className="h-2 w-2 rounded-full bg-amber-400 ring-2 ring-slate-950 block" />
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="mt-4 flex items-center gap-2 border-t border-slate-800/80 pt-3">
                <a
                  href={downloadZipUrl(item.id)}
                  download
                  className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-purple-600 py-2.5 text-xs font-semibold text-white transition-colors hover:bg-purple-500 shadow-md"
                >
                  <Download className="h-3.5 w-3.5" />
                  Download ZIP
                </a>

                <button
                  type="button"
                  onClick={() => handleOpenInGallery(item)}
                  className="flex items-center justify-center gap-1.5 rounded-xl border border-slate-800 bg-slate-900 px-3.5 py-2.5 text-xs font-semibold text-slate-200 hover:bg-slate-800 transition-colors"
                >
                  <Eye className="h-3.5 w-3.5 text-purple-400" />
                  Inspect Task
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Image Preview Modal */}
      {previewingImage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-md">
          <div className="relative max-w-lg w-full rounded-3xl border border-slate-800 bg-slate-900 p-6 shadow-2xl flex flex-col gap-4">
            <button
              type="button"
              onClick={() => setPreviewingImage(null)}
              className="absolute top-4 right-4 rounded-full bg-slate-800 p-2 text-slate-400 hover:bg-slate-700 hover:text-white transition-colors"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-purple-400" />
              <h3 className="text-lg font-bold text-slate-100 capitalize">
                Synthetic {previewingImage.expression} Expression
              </h3>
            </div>

            <div className="relative aspect-square w-full overflow-hidden rounded-2xl border border-slate-800 bg-slate-950">
              <img
                src={previewingImage.url}
                alt={previewingImage.expression}
                className="h-full w-full object-cover"
              />
            </div>

            <div className="flex items-center justify-between text-xs rounded-xl bg-slate-950/70 p-3 border border-slate-800">
              <span className="text-slate-400">Quality Check:</span>
              <span className="flex items-center gap-1 font-semibold">
                {previewingImage.passed ? (
                  <span className="flex items-center gap-1 text-emerald-400">
                    <CheckCircle2 className="h-4 w-4" /> Passed Verification
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-amber-400">
                    <AlertCircle className="h-4 w-4" /> Flagged / Identity Drift
                  </span>
                )}
              </span>
            </div>

            {previewingImage.reasons.length > 0 && (
              <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-300">
                <p className="font-semibold mb-1">Failure Reasons:</p>
                <ul className="list-disc list-inside space-y-0.5 text-[11px]">
                  {previewingImage.reasons.map((r, i) => (
                    <li key={i}>{r}</li>
                  ))}
                </ul>
              </div>
            )}

            <div className="flex items-center gap-3 mt-2">
              <a
                href={previewingImage.url}
                download={`${previewingImage.expression}.png`}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-purple-600 py-2.5 text-xs font-semibold text-white hover:bg-purple-500 transition-colors shadow-md"
              >
                <Download className="h-4 w-4" />
                Download Image
              </a>
              <button
                type="button"
                onClick={() => setPreviewingImage(null)}
                className="rounded-xl border border-slate-800 bg-slate-800 px-4 py-2.5 text-xs font-semibold text-slate-300 hover:bg-slate-700 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
