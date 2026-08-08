"use client";

import { Scan, Eye } from "lucide-react";

interface LandmarkViewerProps {
  imageSrc: string;
  bbox?: [number, number, number, number] | null;
  confidence?: number | null;
  category?: string;
  subtype?: string;
}

export default function LandmarkViewer({
  imageSrc,
  bbox,
  confidence,
  category,
  subtype,
}: LandmarkViewerProps) {
  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-neutral-200 bg-white/60 p-4 shadow-sm backdrop-blur-md dark:border-neutral-800 dark:bg-neutral-900/60">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Scan className="h-4 w-4 text-purple-600 dark:text-purple-400" />
          <h4 className="text-sm font-bold text-neutral-800 dark:text-neutral-200">
            Face Detection & Alignment
          </h4>
        </div>
        {confidence !== undefined && confidence !== null && (
          <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-medium text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
            {(confidence * 100).toFixed(0)}% Confidence
          </span>
        )}
      </div>

      <div className="relative overflow-hidden rounded-xl bg-neutral-950">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={imageSrc}
          alt="Aligned Face Preview"
          className="aspect-square w-full max-w-[320px] object-cover"
        />
      </div>

      <div className="flex flex-wrap gap-2 text-xs">
        {category && (
          <span className="rounded-md bg-neutral-100 px-2.5 py-1 font-medium capitalize text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300">
            Category: {category}
          </span>
        )}
        {subtype && subtype !== "unspecified" && (
          <span className="rounded-md bg-neutral-100 px-2.5 py-1 font-medium capitalize text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300">
            Subtype: {subtype}
          </span>
        )}
        {bbox && (
          <span className="rounded-md bg-purple-100 px-2.5 py-1 font-mono text-purple-700 dark:bg-purple-950/60 dark:text-purple-300">
            BBox: [{bbox.join(", ")}]
          </span>
        )}
      </div>
    </div>
  );
}
