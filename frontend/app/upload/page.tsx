"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import UploadBox from "@/components/UploadBox";
import LandmarkViewer from "@/components/LandmarkViewer";
import ProgressBar from "@/components/ProgressBar";
import {
  alignedPreviewUrl,
  classifyImage,
  detectFace,
  uploadImage,
} from "@/services/api";
import { useApp } from "@/context/AppContext";
import { ArrowRight, RefreshCw, AlertCircle, Sparkles, CheckCircle2 } from "lucide-react";

export default function UploadPage() {
  const router = useRouter();
  const {
    uploadFilename,
    setUploadFilename,
    classification,
    setClassification,
    detection,
    setDetection,
    addToast,
  } = useApp();

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  async function handleFileSelected(file: File) {
    setLoading(true);
    setErrorMsg(null);

    try {
      const up = await uploadImage(file);
      const [cls, det] = await Promise.all([
        classifyImage(up.filename),
        detectFace(up.filename).catch(() => null),
      ]);

      // Only commit state if classification succeeded
      setUploadFilename(up.filename);
      setClassification(cls);
      setDetection(det);
      addToast("Subject photo uploaded and face detected successfully!", "success");
    } catch (err: any) {
      console.error("Upload failed:", err);
      setUploadFilename(null);
      setClassification(null);
      setDetection(null);

      const msg =
        err?.response?.data?.detail ??
        (err?.message ? `Upload Error: ${err.message}` : "Failed to process uploaded image. Please select an image with a clear face.");
      setErrorMsg(msg);
      addToast(msg, "error");
    } finally {
      setLoading(false);
    }
  }

  function handleRemove() {
    setUploadFilename(null);
    setClassification(null);
    setDetection(null);
    setErrorMsg(null);
    addToast("Uploaded photo removed.", "info");
  }

  return (
    <div className="mx-auto max-w-4xl flex flex-col gap-8 py-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-2">
          <Sparkles className="h-6 w-6 text-purple-400" />
          Upload Subject Photo
        </h1>
        <p className="text-xs text-slate-400">
          Upload a high-resolution photo of a human or animal subject. Facial landmarks are extracted and normalized for expression editing.
        </p>
      </div>

      {errorMsg && (
        <div className="flex items-start gap-3 rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-400">
          <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-bold">Upload Failed</p>
            <p className="text-xs text-red-300 mt-1">{errorMsg}</p>
          </div>
        </div>
      )}

      {loading && <ProgressBar label="Uploading image & running face detection..." progress={65} />}

      {!uploadFilename || !classification ? (
        <UploadBox onFileSelected={handleFileSelected} />
      ) : (
        <div className="flex flex-col gap-6">
          <div className="flex items-center justify-between rounded-2xl border border-slate-800 bg-slate-900/60 p-4 backdrop-blur-md">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-950/80 text-purple-400">
                <CheckCircle2 className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-200">Active Subject Image</p>
                <p className="font-mono text-xs text-slate-400">{uploadFilename}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleRemove}
              className="flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800 px-3.5 py-2 text-xs font-semibold text-slate-200 transition-colors hover:bg-slate-700 hover:text-white"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Remove / Replace Photo
            </button>
          </div>

          <div className="grid gap-6 sm:grid-cols-1 md:grid-cols-2">
            <LandmarkViewer
              imageSrc={alignedPreviewUrl(uploadFilename)}
              bbox={detection?.bbox}
              confidence={detection?.confidence ?? classification.category_confidence}
              category={classification.category}
              subtype={classification.subtype}
            />

            <div className="flex flex-col justify-between rounded-2xl border border-slate-800 bg-slate-900/60 p-6 backdrop-blur-md">
              <div>
                <h3 className="text-lg font-bold text-slate-100">Detection & Pipeline Routing</h3>
                <p className="mt-1 text-xs text-slate-400">
                  Automated face localization and model classification
                </p>

                <div className="mt-4 flex flex-col gap-3">
                  <div className="flex items-center justify-between rounded-xl bg-slate-950/60 p-3 text-xs">
                    <span className="text-slate-400">Category:</span>
                    <span className="font-semibold capitalize text-purple-400">
                      {classification.category} ({(classification.category_confidence * 100).toFixed(0)}%)
                    </span>
                  </div>

                  {classification.subtype !== "unspecified" && (
                    <div className="flex items-center justify-between rounded-xl bg-slate-950/60 p-3 text-xs">
                      <span className="text-slate-400">Subtype:</span>
                      <span className="font-semibold capitalize text-slate-200">
                        {classification.subtype} ({(classification.subtype_confidence * 100).toFixed(0)}%)
                      </span>
                    </div>
                  )}

                  <div className="flex items-center justify-between rounded-xl bg-slate-950/60 p-3 text-xs">
                    <span className="text-slate-400">Pipeline Route:</span>
                    <span className="font-semibold text-emerald-400">
                      {classification.category === "animal" ? "Animal Expression Model" : "Human Expression Model"}
                    </span>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => router.push("/generate")}
                className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 py-3.5 text-sm font-bold text-white shadow-xl shadow-purple-600/30 transition-all hover:from-purple-500 hover:to-indigo-500"
              >
                Proceed to Expression Studio
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
