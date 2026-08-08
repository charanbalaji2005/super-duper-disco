"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import ExpressionSelector from "@/components/ExpressionSelector";
import AdvancedSettingsPanel from "@/components/AdvancedSettingsPanel";
import ProgressBar from "@/components/ProgressBar";
import LandmarkViewer from "@/components/LandmarkViewer";
import { useApp } from "@/context/AppContext";
import { alignedPreviewUrl, generateExpressions, cancelGeneration } from "@/services/api";
import { Sparkles, Layers, ArrowLeft, ArrowRight, AlertCircle, XCircle } from "lucide-react";

export default function GeneratePage() {
  const router = useRouter();
  const {
    uploadFilename,
    classification,
    detection,
    selectedExpressions,
    setSelectedExpressions,
    settings,
    setLatestResult,
    addToast,
  } = useApp();

  const [generating, setGenerating] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [progressPercent, setProgressPercent] = useState(0);
  const [currentExpression, setCurrentExpression] = useState("");
  const [currentStep, setCurrentStep] = useState(0);
  const [totalSteps, setTotalSteps] = useState(30);
  const [activeRequestId, setActiveRequestId] = useState<string | null>(null);
  
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);

  async function handleCancel() {
    if (!activeRequestId) return;
    try {
      await cancelGeneration(activeRequestId);
      addToast("Generation cancellation request sent.", "info");
    } catch (err) {
      console.error("Cancel error:", err);
    }
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
    setGenerating(false);
    setErrorMsg("Generation was stopped by the user.");
  }

  async function handleGenerate() {
    if (!uploadFilename) {
      addToast("Please upload a subject photo first.", "error");
      router.push("/upload");
      return;
    }

    if (selectedExpressions.length === 0) {
      addToast("Please select at least one facial expression.", "info");
      return;
    }

    const clientReqId = "req_" + Math.random().toString(36).substring(2, 9);
    setActiveRequestId(clientReqId);

    setGenerating(true);
    setErrorMsg(null);
    setProgressPercent(0);
    setCurrentExpression("");
    setCurrentStep(0);

    // Start background progress polling
    pollIntervalRef.current = setInterval(async () => {
      try {
        const { getGenerationProgress } = await import("@/services/api");
        const prog = await getGenerationProgress(clientReqId);
        setProgressPercent(prog.progress_percent);
        setCurrentExpression(prog.current_expression);
        setCurrentStep(prog.current_step);
        setTotalSteps(prog.total_steps);
      } catch (e) {
        // Stale or not started yet, ignore
      }
    }, 1000);

    try {
      const res = await generateExpressions(
        uploadFilename,
        selectedExpressions,
        settings.loraName,
        settings.loraWeight,
        clientReqId
      );

      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
      setLatestResult(res);
      addToast(`Successfully generated ${res.images.length} synthetic expression(s)!`, "success");
      router.push("/gallery");
    } catch (err: any) {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
      console.error("Generation error:", err);
      const msg =
        err?.response?.data?.detail ??
        (err?.message ? `Generation Error: ${err.message}` : "Expression generation failed.");
      setErrorMsg(msg);
      addToast(msg, "error");
    } finally {
      setGenerating(false);
      setActiveRequestId(null);
    }
  }

  if (!uploadFilename || !classification) {
    return (
      <div className="mx-auto max-w-2xl text-center flex flex-col items-center justify-center p-12 gap-4">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-purple-950/80 text-purple-400 border border-purple-800/40">
          <Layers className="h-7 w-7" />
        </div>
        <h2 className="text-xl font-bold text-slate-100">No Active Subject Photo Found</h2>
        <p className="text-xs text-slate-400">
          Please upload a photo of a human or animal subject before configuring facial expressions.
        </p>
        <button
          type="button"
          onClick={() => router.push("/upload")}
          className="flex items-center gap-2 rounded-xl bg-purple-600 px-5 py-2.5 text-xs font-semibold text-white transition-colors hover:bg-purple-500"
        >
          <ArrowLeft className="h-4 w-4" />
          Go to Upload Page
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl flex flex-col gap-8 py-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-purple-400" />
            Expression Studio & Fine-Tuning
          </h1>
          <p className="text-xs text-slate-400">
            Configure target facial expressions and LoRA parameters for Stable Diffusion 1.5 img2img synthesis
          </p>
        </div>

        <button
          type="button"
          onClick={() => router.push("/upload")}
          className="flex items-center gap-1.5 rounded-xl border border-slate-800 bg-slate-900 px-3.5 py-2 text-xs font-semibold text-slate-300 transition-colors hover:border-slate-700 hover:bg-slate-800"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to Upload
        </button>
      </div>

      {errorMsg && (
        <div className="flex items-center gap-3 rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-400">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <div>{errorMsg}</div>
        </div>
      )}

      <div className="grid gap-8 sm:grid-cols-1 md:grid-cols-3">
        {/* Left Column: Aligned Preview */}
        <div className="md:col-span-1">
          <LandmarkViewer
            imageSrc={alignedPreviewUrl(uploadFilename)}
            bbox={detection?.bbox}
            confidence={detection?.confidence ?? classification.category_confidence}
            category={classification.category}
            subtype={classification.subtype}
          />
        </div>

        {/* Right Column: Controls */}
        <div className="md:col-span-2 flex flex-col gap-6">
          <ExpressionSelector selected={selectedExpressions} onChange={setSelectedExpressions} />

          <AdvancedSettingsPanel />

          <div className="flex items-center justify-between pt-2">
            <div className="text-xs text-slate-400">
              Generating <span className="font-bold text-purple-400">{selectedExpressions.length}</span> expression(s) using{" "}
              {settings.loraName ? `LoRA (${settings.loraName})` : "Base SD 1.5"}
            </div>

            <button
              type="button"
              onClick={handleGenerate}
              disabled={generating || selectedExpressions.length === 0}
              className="flex items-center gap-2 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 px-7 py-3.5 font-bold text-white shadow-xl shadow-purple-600/30 transition-all hover:from-purple-500 hover:to-indigo-500 disabled:opacity-50"
            >
              <Sparkles className="h-5 w-5" />
              {generating
                ? `Synthesizing ${selectedExpressions.length} Expressions...`
                : `Run Generation (${selectedExpressions.length})`}
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>

          {generating && (
            <div className="flex flex-col gap-3">
              <ProgressBar
                label={
                  currentExpression
                    ? `Generating '${currentExpression}'... (Step ${currentStep}/${totalSteps})`
                    : "Initializing Stable Diffusion model..."
                }
                progress={progressPercent || 5}
              />
              <button
                type="button"
                onClick={handleCancel}
                className="flex items-center justify-center gap-1.5 self-end rounded-xl border border-red-500/30 bg-red-950/20 px-4 py-2.5 text-xs font-bold text-red-400 transition-all hover:bg-red-900/30 hover:border-red-500/50"
              >
                <XCircle className="h-4 w-4" />
                Stop Generation
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
