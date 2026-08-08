"use client";

import { Download, CheckCircle2, AlertTriangle, Maximize2, X } from "lucide-react";
import { useState } from "react";
import type { GeneratedImageOut } from "@/services/api";

interface ImageCardProps {
  image: GeneratedImageOut;
  apiUrl: string;
}

export default function ImageCard({ image, apiUrl }: ImageCardProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const fullImageUrl = `${apiUrl}${image.download_url}`;

  return (
    <>
      <div className="group relative flex flex-col overflow-hidden rounded-2xl border border-neutral-200 bg-white/60 shadow-sm backdrop-blur-md transition-all hover:border-purple-300 hover:shadow-lg dark:border-neutral-800 dark:bg-neutral-900/60 dark:hover:border-purple-800">
        <div className="relative aspect-square w-full overflow-hidden bg-neutral-100 dark:bg-neutral-950">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={fullImageUrl}
            alt={image.expression}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          />

          <button
            onClick={() => setModalOpen(true)}
            className="absolute right-3 top-3 rounded-full bg-black/60 p-2 text-white backdrop-blur-md opacity-0 transition-opacity group-hover:opacity-100 hover:bg-black/80"
            title="Expand Preview"
          >
            <Maximize2 className="h-4 w-4" />
          </button>

          <div className="absolute left-3 top-3">
            {image.passed_quality ? (
              <span className="flex items-center gap-1.5 rounded-full bg-emerald-500/90 px-2.5 py-1 text-xs font-semibold text-white shadow-sm backdrop-blur-md">
                <CheckCircle2 className="h-3.5 w-3.5" />
                Passed
              </span>
            ) : (
              <span
                className="flex items-center gap-1.5 rounded-full bg-amber-500/90 px-2.5 py-1 text-xs font-semibold text-white shadow-sm backdrop-blur-md"
                title={image.failure_reasons.join(" • ")}
              >
                <AlertTriangle className="h-3.5 w-3.5" />
                Quality Alert
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between p-4">
          <div>
            <h4 className="font-bold capitalize text-neutral-800 dark:text-neutral-200">
              {image.expression}
            </h4>
            {!image.passed_quality && image.failure_reasons.length > 0 && (
              <p className="mt-0.5 line-clamp-1 text-xs text-amber-600 dark:text-amber-400">
                {image.failure_reasons.join(", ")}
              </p>
            )}
          </div>

          <a
            href={fullImageUrl}
            download={`${image.expression}.png`}
            className="flex items-center justify-center rounded-xl bg-purple-100 p-2.5 text-purple-700 transition-colors hover:bg-purple-600 hover:text-white dark:bg-purple-950/60 dark:text-purple-300 dark:hover:bg-purple-600 dark:hover:text-white"
            title="Download PNG"
          >
            <Download className="h-4 w-4" />
          </a>
        </div>
      </div>

      {modalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-md"
          onClick={() => setModalOpen(false)}
        >
          <div
            className="relative max-h-[90vh] max-w-4xl overflow-hidden rounded-2xl border border-neutral-800 bg-neutral-900 p-2 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setModalOpen(false)}
              className="absolute right-4 top-4 rounded-full bg-black/60 p-2 text-white hover:bg-black"
            >
              <X className="h-5 w-5" />
            </button>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={fullImageUrl}
              alt={image.expression}
              className="max-h-[80vh] w-auto rounded-xl object-contain"
            />
            <div className="flex items-center justify-between p-4">
              <div>
                <span className="text-lg font-bold capitalize text-white">{image.expression}</span>
                {!image.passed_quality && (
                  <p className="text-xs text-amber-400">
                    Quality warnings: {image.failure_reasons.join("; ")}
                  </p>
                )}
              </div>
              <a
                href={fullImageUrl}
                download={`${image.expression}.png`}
                className="flex items-center gap-2 rounded-xl bg-purple-600 px-4 py-2 text-sm font-semibold text-white hover:bg-purple-500"
              >
                <Download className="h-4 w-4" />
                Download PNG
              </a>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
