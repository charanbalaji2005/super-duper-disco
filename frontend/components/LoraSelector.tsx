"use client";

import { useEffect, useState } from "react";
import { Sliders, Cpu, Info } from "lucide-react";
import { listLoras } from "@/services/api";

interface LoraSelectorProps {
  value: string | null;
  weight: number;
  onChange: (loraName: string | null) => void;
  onWeightChange: (weight: number) => void;
}

export default function LoraSelector({ value, weight, onChange, onWeightChange }: LoraSelectorProps) {
  const [available, setAvailable] = useState<string[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    listLoras()
      .then((res) => setAvailable(res.available))
      .catch(() => setAvailable([]))
      .finally(() => setLoaded(true));
  }, []);

  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-neutral-200 bg-white/60 p-5 shadow-sm backdrop-blur-md dark:border-neutral-800 dark:bg-neutral-900/60">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Cpu className="h-5 w-5 text-purple-600 dark:text-purple-400" />
          <div>
            <h3 className="font-bold text-neutral-800 dark:text-neutral-200">
              LoRA Expression Adapter
            </h3>
            <p className="text-xs text-neutral-500">
              Fine-tuned Stable Diffusion 1.5 weights trained on facial expression edits
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-1 md:grid-cols-2">
        <div className="flex flex-col gap-2">
          <label className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
            Selected Adapter
          </label>
          <select
            value={value ?? ""}
            onChange={(e) => onChange(e.target.value || null)}
            className="rounded-xl border border-neutral-300 bg-white px-3.5 py-2.5 text-sm font-medium transition-colors hover:border-purple-500 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100"
          >
            <option value="">Base SD 1.5 (Zero-shot prompt engineering)</option>
            {available.map((name) => (
              <option key={name} value={name}>
                LoRA: {name}
              </option>
            ))}
          </select>
          {loaded && available.length === 0 && (
            <div className="flex items-center gap-1.5 rounded-lg bg-neutral-100 p-2 text-xs text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400">
              <Info className="h-4 w-4 shrink-0 text-neutral-400" />
              <span>No custom LoRA models in <code>models/loras/</code>. Running with base SD1.5.</span>
            </div>
          )}
        </div>

        {value && (
          <div className="flex flex-col gap-2 rounded-xl border border-purple-200 bg-purple-50/50 p-3.5 dark:border-purple-900/40 dark:bg-purple-950/30">
            <div className="flex items-center justify-between text-xs font-semibold text-purple-900 dark:text-purple-200">
              <span className="flex items-center gap-1">
                <Sliders className="h-3.5 w-3.5 text-purple-600" />
                LoRA Scale / Fusion Strength
              </span>
              <span className="rounded-md bg-purple-600 px-2 py-0.5 text-white">{weight.toFixed(2)}</span>
            </div>
            <input
              type="range"
              min={0.1}
              max={1.5}
              step={0.05}
              value={weight}
              onChange={(e) => onWeightChange(parseFloat(e.target.value))}
              className="accent-purple-600 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-neutral-400">
              <span>Subtle (0.1)</span>
              <span>Balanced (0.8)</span>
              <span>Strong (1.5)</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
