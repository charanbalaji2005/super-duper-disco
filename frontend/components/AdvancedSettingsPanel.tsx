"use client";

import { useState } from "react";
import { Sliders, Cpu, Dna, Layers, ShieldCheck, Sparkles, ChevronDown, ChevronUp } from "lucide-react";
import { useApp } from "@/context/AppContext";

export default function AdvancedSettingsPanel() {
  const { settings, updateSettings, availableLoras } = useApp();
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/50 backdrop-blur-md transition-all">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center justify-between p-5 text-left font-bold text-slate-100 hover:text-purple-400 transition-colors"
      >
        <div className="flex items-center gap-2.5">
          <Sliders className="h-5 w-5 text-purple-500" />
          <span>Advanced Pipeline & Diffusion Settings</span>
          {settings.loraName && (
            <span className="rounded-full bg-purple-500/20 border border-purple-500/30 px-2.5 py-0.5 text-[10px] text-purple-300">
              LoRA: {settings.loraName} ({settings.loraWeight})
            </span>
          )}
        </div>
        {isOpen ? <ChevronUp className="h-5 w-5 text-slate-400" /> : <ChevronDown className="h-5 w-5 text-slate-400" />}
      </button>

      {isOpen && (
        <div className="border-t border-slate-800/80 p-5 grid gap-6 sm:grid-cols-1 md:grid-cols-2">
          {/* LoRA Adapter Selector */}
          <div className="flex flex-col gap-2">
            <label className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-400">
              <Cpu className="h-4 w-4 text-purple-400" />
              Fine-Tuned LoRA Adapter
            </label>
            <select
              value={settings.loraName ?? ""}
              onChange={(e) => updateSettings({ loraName: e.target.value || null })}
              className="rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2.5 text-xs font-medium text-slate-100 focus:border-purple-500 focus:outline-none"
            >
              <option value="">Base SD 1.5 (No LoRA adapter)</option>
              {availableLoras.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>

            {settings.loraName && (
              <div className="mt-2 flex flex-col gap-1.5 rounded-xl border border-purple-500/20 bg-purple-500/5 p-3">
                <div className="flex items-center justify-between text-xs font-semibold text-purple-300">
                  <span>LoRA Fusion Scale</span>
                  <span className="rounded bg-purple-600 px-2 py-0.5 text-white">{settings.loraWeight.toFixed(2)}</span>
                </div>
                <input
                  type="range"
                  min={0.1}
                  max={1.5}
                  step={0.05}
                  value={settings.loraWeight}
                  onChange={(e) => updateSettings({ loraWeight: parseFloat(e.target.value) })}
                  className="accent-purple-500 cursor-pointer"
                />
              </div>
            )}
          </div>

          {/* Denoising Strength (Img2Img) */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-400">
                <Dna className="h-4 w-4 text-indigo-400" />
                Img2Img Denoising Strength
              </label>
              <span className="font-mono text-xs font-bold text-indigo-400">{settings.strength.toFixed(2)}</span>
            </div>
            <input
              type="range"
              min={0.15}
              max={0.85}
              step={0.05}
              value={settings.strength}
              onChange={(e) => updateSettings({ strength: parseFloat(e.target.value) })}
              className="accent-indigo-500 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-slate-500">
              <span>Strict Identity Preservation (0.2)</span>
              <span>Expression Shift (0.45)</span>
              <span>High Re-paint (0.8)</span>
            </div>
          </div>

          {/* Guidance Scale (CFG) */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-400">
                <Layers className="h-4 w-4 text-purple-400" />
                Guidance Scale (CFG)
              </label>
              <span className="font-mono text-xs font-bold text-purple-400">{settings.guidanceScale.toFixed(1)}</span>
            </div>
            <input
              type="range"
              min={1.0}
              max={15.0}
              step={0.5}
              value={settings.guidanceScale}
              onChange={(e) => updateSettings({ guidanceScale: parseFloat(e.target.value) })}
              className="accent-purple-500 cursor-pointer"
            />
          </div>

          {/* Inference Steps */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-400">
                <Sparkles className="h-4 w-4 text-emerald-400" />
                DPM-Solver++ Steps
              </label>
              <span className="font-mono text-xs font-bold text-emerald-400">{settings.steps} steps</span>
            </div>
            <input
              type="range"
              min={15}
              max={50}
              step={5}
              value={settings.steps}
              onChange={(e) => updateSettings({ steps: parseInt(e.target.value, 10) })}
              className="accent-emerald-500 cursor-pointer"
            />
          </div>

          {/* Seed Control */}
          <div className="flex flex-col gap-2 sm:col-span-2">
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-400">
                <ShieldCheck className="h-4 w-4 text-purple-400" />
                Generation Seed (Optional)
              </label>
              <button
                type="button"
                onClick={() => updateSettings({ seed: Math.floor(Math.random() * 1000000) })}
                className="text-[11px] text-purple-400 underline hover:no-underline"
              >
                Randomize Seed
              </button>
            </div>
            <input
              type="number"
              placeholder="Random (Default)"
              value={settings.seed ?? ""}
              onChange={(e) => updateSettings({ seed: e.target.value ? parseInt(e.target.value, 10) : null })}
              className="rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2 text-xs font-mono text-slate-100 focus:border-purple-500 focus:outline-none"
            />
          </div>
        </div>
      )}
    </div>
  );
}
