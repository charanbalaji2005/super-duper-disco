"use client";

import { useState } from "react";
import { SlidersHorizontal } from "lucide-react";

interface BeforeAfterSliderProps {
  beforeSrc: string;
  afterSrc: string;
  beforeLabel?: string;
  afterLabel?: string;
}

export default function BeforeAfterSlider({
  beforeSrc,
  afterSrc,
  beforeLabel = "Original Subject",
  afterLabel = "Synthetic Expression",
}: BeforeAfterSliderProps) {
  const [sliderPosition, setSliderPosition] = useState(50);
  const [isDragging, setIsDragging] = useState(false);

  function handleMove(clientX: number, rect: DOMRect) {
    const x = clientX - rect.left;
    let percentage = (x / rect.width) * 100;
    if (percentage < 0) percentage = 0;
    if (percentage > 100) percentage = 100;
    setSliderPosition(percentage);
  }

  function handleTouchMove(e: React.TouchEvent<HTMLDivElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    handleMove(e.touches[0].clientX, rect);
  }

  function handleMouseMove(e: React.MouseEvent<HTMLDivElement>) {
    if (!isDragging && e.buttons !== 1) return;
    const rect = e.currentTarget.getBoundingClientRect();
    handleMove(e.clientX, rect);
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between text-xs font-semibold text-slate-400 px-1">
        <span className="text-purple-400">{beforeLabel}</span>
        <span className="flex items-center gap-1 text-[11px] text-slate-500">
          <SlidersHorizontal className="h-3 w-3" /> Drag slider to compare
        </span>
        <span className="text-emerald-400">{afterLabel}</span>
      </div>

      <div
        className="relative aspect-square w-full select-none overflow-hidden rounded-2xl border border-slate-800 bg-slate-950 shadow-2xl cursor-ew-resize"
        onMouseDown={() => setIsDragging(true)}
        onMouseUp={() => setIsDragging(false)}
        onMouseLeave={() => setIsDragging(false)}
        onMouseMove={handleMouseMove}
        onTouchMove={handleTouchMove}
      >
        {/* After Image (Background) */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={afterSrc}
          alt={afterLabel}
          className="absolute inset-0 h-full w-full object-cover"
        />

        
        <div
          className="absolute inset-0 overflow-hidden"
          style={{ width: `${sliderPosition}%` }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={beforeSrc}
            alt={beforeLabel}
            className="h-full w-full object-cover"
            style={{ width: "100%", maxWidth: "none" }}
          />
        </div>

        {/* Vertical Divider Handle */}
        <div
          className="absolute top-0 bottom-0 w-0.5 bg-white/80 shadow-[0_0_10px_rgba(255,255,255,0.8)]"
          style={{ left: `${sliderPosition}%` }}
        >
          <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-slate-900 shadow-xl backdrop-blur-md">
            <SlidersHorizontal className="h-4 w-4" />
          </div>
        </div>
      </div>
    </div>
  );
}
