"use client";

import { UploadCloud, FolderOpen } from "lucide-react";
import { useCallback, useRef, useState } from "react";
import { validateFile } from "@/services/upload";

interface UploadBoxProps {
  onFileSelected: (file: File) => void;
}

export default function UploadBox({ onFileSelected }: UploadBoxProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(
    (file: File) => {
      const validationError = validateFile(file);
      if (validationError) {
        setError(validationError);
        return;
      }
      setError(null);
      onFileSelected(file);
    },
    [onFileSelected]
  );

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setIsDragging(true);
      }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setIsDragging(false);
        const file = e.dataTransfer.files?.[0];
        if (file) handleFile(file);
      }}
      onClick={() => inputRef.current?.click()}
      className={`group flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed p-10 text-center transition-all ${
        isDragging
          ? "border-purple-500 bg-purple-500/10 shadow-lg shadow-purple-500/10"
          : "border-slate-800 bg-slate-900/40 hover:border-purple-500 hover:bg-slate-900/80"
      }`}
    >
      <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-purple-950/80 text-purple-400 border border-purple-800/40 group-hover:scale-110 transition-transform">
        <UploadCloud className="h-7 w-7" />
      </div>
      <p className="font-semibold text-slate-200">Drag & drop a subject image here</p>
      <p className="mt-1 text-xs text-slate-400">Supports JPEG, PNG, WebP · up to 15MB</p>

      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          inputRef.current?.click();
        }}
        className="mt-4 flex items-center gap-2 rounded-xl bg-purple-600 px-4 py-2 text-xs font-semibold text-white shadow-md transition-colors hover:bg-purple-500"
      >
        <FolderOpen className="h-3.5 w-3.5" />
        Browse Image File
      </button>

      {error && (
        <p className="mt-3 rounded-lg bg-red-500/10 px-3 py-1.5 text-xs font-medium text-red-400">
          {error}
        </p>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/jpg"
        className="hidden"
        onClick={(e) => e.stopPropagation()}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
        }}
      />
    </div>
  );
}
