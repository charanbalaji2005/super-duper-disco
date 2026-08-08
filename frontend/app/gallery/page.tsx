"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Gallery from "@/components/Gallery";
import DownloadButton from "@/components/DownloadButton";
import BeforeAfterSlider from "@/components/BeforeAfterSlider";
import { useApp } from "@/context/AppContext";
import { alignedPreviewUrl, downloadZipUrl } from "@/services/api";
import { Images, Sparkles, RefreshCw, SlidersHorizontal, ArrowLeft } from "lucide-react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export default function GalleryPage() {
  const router = useRouter();
  const { latestResult, uploadFilename } = useApp();
  const [showComparison, setShowComparison] = useState(false);
  const [selectedExpressionForCompare, setSelectedExpressionForCompare] = useState<string | null>(null);

  if (!latestResult || latestResult.images.length === 0) {
    return (
      <div className="mx-auto max-w-2xl text-center flex flex-col items-center justify-center p-12 gap-4">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-purple-950/80 text-purple-400 border border-purple-800/40">
          <Images className="h-7 w-7" />
        </div>
        <h2 className="text-xl font-bold text-slate-100">No Generation Results Found</h2>
        <p className="text-xs text-slate-400">
          Run expression generation in the Studio or check past runs in History.
        </p>
        <button
          type="button"
          onClick={() => router.push("/generate")}
          className="flex items-center gap-2 rounded-xl bg-purple-600 px-5 py-2.5 text-xs font-semibold text-white transition-colors hover:bg-purple-500"
        >
          <Sparkles className="h-4 w-4" />
          Go to Expression Studio
        </button>
      </div>
    );
  }

  const activeCompareImage = latestResult.images.find(
    (img) => img.expression === selectedExpressionForCompare
  ) || latestResult.images[0];

  return (
    <div className="mx-auto max-w-6xl flex flex-col gap-8 py-6">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-2">
            <Images className="h-6 w-6 text-purple-400" />
            Generation Results & Comparison
          </h1>
          <p className="text-xs text-slate-400">
            Request ID: <span className="font-mono text-purple-400">{latestResult.request_id}</span>
            {latestResult.lora_used && <span> · LoRA Adapter: {latestResult.lora_used}</span>}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setShowComparison(!showComparison)}
            className={`flex items-center gap-2 rounded-xl border px-4 py-2.5 text-xs font-semibold transition-all ${
              showComparison
                ? "border-purple-500 bg-purple-600 text-white"
                : "border-slate-800 bg-slate-900 text-slate-300 hover:border-slate-700"
            }`}
          >
            <SlidersHorizontal className="h-4 w-4" />
            {showComparison ? "Hide Comparison" : "Compare Before/After"}
          </button>

          <DownloadButton href={downloadZipUrl(latestResult.request_id)} />

          <button
            type="button"
            onClick={() => router.push("/generate")}
            className="flex items-center gap-1.5 rounded-xl border border-slate-800 bg-slate-900 px-3.5 py-2.5 text-xs font-semibold text-slate-300 transition-colors hover:bg-slate-800"
          >
            <RefreshCw className="h-3.5 w-3.5 text-purple-400" />
            Modify & Regenerate
          </button>
        </div>
      </div>

      {/* Before / After Split Slider Section */}
      {showComparison && uploadFilename && (
        <section className="flex flex-col gap-4 rounded-3xl border border-purple-500/30 bg-purple-500/5 p-6 backdrop-blur-xl">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
              <SlidersHorizontal className="h-4 w-4 text-purple-400" />
              Before / After Split-View Inspection
            </h3>

            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400">Expression:</span>
              <select
                value={activeCompareImage.expression}
                onChange={(e) => setSelectedExpressionForCompare(e.target.value)}
                className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-1.5 text-xs font-semibold text-slate-200 capitalize"
              >
                {latestResult.images.map((img) => (
                  <option key={img.expression} value={img.expression}>
                    {img.expression}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="mx-auto max-w-xl w-full">
            <BeforeAfterSlider
              beforeSrc={alignedPreviewUrl(uploadFilename)}
              afterSrc={`${API_URL}${activeCompareImage.download_url}`}
              beforeLabel="Original Subject"
              afterLabel={`Synthetic ${activeCompareImage.expression}`}
            />
          </div>
        </section>
      )}

      {/* Gallery Grid */}
      <Gallery images={latestResult.images} apiUrl={API_URL} />
    </div>
  );
}
