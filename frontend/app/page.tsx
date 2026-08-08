"use client";

import Link from "next/link";
import { Sparkles, UploadCloud, ShieldCheck, Layers, Cpu, ArrowRight, CheckCircle2 } from "lucide-react";
import { useApp } from "@/context/AppContext";

export default function HomePage() {
  const { backendHealth } = useApp();

  return (
    <div className="flex flex-col gap-16 py-8">
      {/* Hero Section */}
      <section className="relative overflow-hidden rounded-3xl border border-slate-800 bg-slate-900/40 p-8 md:p-14 backdrop-blur-2xl shadow-2xl">
        <div className="absolute -left-20 -top-20 h-64 w-64 rounded-full bg-purple-600/20 blur-3xl" />
        <div className="absolute -right-20 -bottom-20 h-64 w-64 rounded-full bg-indigo-600/20 blur-3xl" />

        <div className="relative z-10 flex flex-col items-center text-center max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 rounded-full border border-purple-500/30 bg-purple-500/10 px-4 py-1.5 text-xs font-semibold text-purple-300 backdrop-blur-md mb-6">
            <Sparkles className="h-3.5 w-3.5 text-purple-400" />
            Research-Grade Expression Synthesis Pipeline
          </div>

          <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight text-slate-100 leading-tight">
            Identity-Preserving <br />
            <span className="bg-gradient-to-r from-purple-400 via-indigo-300 to-emerald-400 bg-clip-text text-transparent">
              Facial Expression Synthesis
            </span>
          </h1>

          <p className="mt-5 text-base md:text-lg text-slate-400 leading-relaxed max-w-2xl">
            Edit facial expressions of human and animal subjects from a single photo using Stable Diffusion 1.5 img2img, InsightFace landmarks, and LoRA adapters.
          </p>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            <Link
              href="/upload"
              className="flex items-center gap-2.5 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 px-7 py-4 text-sm font-bold text-white shadow-xl shadow-purple-600/30 transition-all hover:from-purple-500 hover:to-indigo-500 hover:scale-105"
            >
              <UploadCloud className="h-5 w-5" />
              Upload Photo & Start
              <ArrowRight className="h-4 w-4" />
            </Link>

            <Link
              href="/generate"
              className="flex items-center gap-2 rounded-2xl border border-slate-700 bg-slate-900/80 px-6 py-4 text-sm font-semibold text-slate-200 transition-colors hover:border-slate-600 hover:bg-slate-800"
            >
              <Layers className="h-4 w-4 text-purple-400" />
              Open Expression Studio
            </Link>
          </div>

          {/* Quick System Badges */}
          <div className="mt-10 flex flex-wrap justify-center gap-6 text-xs text-slate-400 border-t border-slate-800/80 pt-6 w-full">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-400" />
              <span>Identity Preservation Engine</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-400" />
              <span>Human & Animal Support</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-400" />
              <span>Quality Verification Gate</span>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Grid Section */}
      <section className="grid gap-6 sm:grid-cols-1 md:grid-cols-3">
        <div className="flex flex-col gap-3 rounded-3xl border border-slate-800 bg-slate-900/50 p-6 backdrop-blur-xl transition-all hover:border-purple-500/40">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-purple-950/80 text-purple-400 border border-purple-800/40">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <h3 className="text-lg font-bold text-slate-100">Identity Preservation</h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            Maintains 512-d ArcFace facial embeddings and low denoising strength so identity is preserved across all 7 target expressions.
          </p>
        </div>

        <div className="flex flex-col gap-3 rounded-3xl border border-slate-800 bg-slate-900/50 p-6 backdrop-blur-xl transition-all hover:border-purple-500/40">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-950/80 text-indigo-400 border border-indigo-800/40">
            <Cpu className="h-6 w-6" />
          </div>
          <h3 className="text-lg font-bold text-slate-100">LoRA Expression Adapters</h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            Plug-and-play fine-tuned LoRA adapters with real-time strength sliders to control expression intensity and style fusion.
          </p>
        </div>

        <div className="flex flex-col gap-3 rounded-3xl border border-slate-800 bg-slate-900/50 p-6 backdrop-blur-xl transition-all hover:border-purple-500/40">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-950/80 text-emerald-400 border border-emerald-800/40">
            <Sparkles className="h-6 w-6" />
          </div>
          <h3 className="text-lg font-bold text-slate-100">Automated Quality Gate</h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            Automated image quality verification scoring for blurriness, identity drift, and structural degradation with full ZIP downloads.
          </p>
        </div>
      </section>
    </div>
  );
}
