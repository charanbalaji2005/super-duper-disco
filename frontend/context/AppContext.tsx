"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import {
  api,
  listLoras,
  type ClassifyResponse,
  type DetectResponse,
  type GenerateResponse,
} from "@/services/api";

export interface GenerationSettings {
  loraName: string | null;
  loraWeight: number;
  guidanceScale: number;
  steps: number;
  seed: number | null;
  strength: number;
}

export interface ToastMessage {
  id: string;
  type: "success" | "error" | "info";
  message: string;
}

interface AppContextType {
  backendHealth: boolean | null;
  checkHealth: () => Promise<void>;

  uploadFilename: string | null;
  setUploadFilename: (filename: string | null) => void;

  classification: ClassifyResponse | null;
  setClassification: (cls: ClassifyResponse | null) => void;

  detection: DetectResponse | null;
  setDetection: (det: DetectResponse | null) => void;

  selectedExpressions: string[];
  setSelectedExpressions: (expressions: string[]) => void;

  expressionIntensities: Record<string, number>;
  setExpressionIntensity: (expression: string, intensity: number) => void;

  settings: GenerationSettings;
  updateSettings: (newSettings: Partial<GenerationSettings>) => void;

  availableLoras: string[];
  refreshLoras: () => Promise<void>;

  latestResult: GenerateResponse | null;
  setLatestResult: (result: GenerateResponse | null) => void;

  favorites: string[];
  toggleFavorite: (url: string) => void;

  toasts: ToastMessage[];
  addToast: (message: string, type?: "success" | "error" | "info") => void;
  removeToast: (id: string) => void;

  resetAll: () => void;
}

const defaultSettings: GenerationSettings = {
  loraName: null,
  loraWeight: 0.8,
  guidanceScale: 7.5,
  steps: 30,
  seed: null,
  strength: 0.45,
};

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [backendHealth, setBackendHealth] = useState<boolean | null>(null);
  const [uploadFilename, setUploadFilename] = useState<string | null>(null);
  const [classification, setClassification] = useState<ClassifyResponse | null>(null);
  const [detection, setDetection] = useState<DetectResponse | null>(null);

  const [selectedExpressions, setSelectedExpressions] = useState<string[]>([
    "happy",
    "sad",
    "angry",
    "surprise",
    "fear",
    "disgust",
    "neutral",
  ]);

  const [expressionIntensities, setExpressionIntensitiesState] = useState<Record<string, number>>({
    happy: 80,
    sad: 80,
    angry: 80,
    surprise: 80,
    fear: 80,
    disgust: 80,
    neutral: 80,
  });

  const [settings, setSettings] = useState<GenerationSettings>(defaultSettings);
  const [availableLoras, setAvailableLoras] = useState<string[]>([]);
  const [latestResult, setLatestResult] = useState<GenerateResponse | null>(null);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  useEffect(() => {
    checkHealth();
    refreshLoras();
    const interval = setInterval(checkHealth, 8000);
    return () => clearInterval(interval);
  }, []);

  async function checkHealth() {
    try {
      const res = await api.get("/health", { timeout: 4000 });
      if (res.status === 200 && res.data?.status === "ok") {
        setBackendHealth(true);
        return;
      }
      setBackendHealth(false);
    } catch {
      // Direct native fetch fallback to 127.0.0.1:8000/health
      try {
        const raw = await fetch("http://127.0.0.1:8000/health", { cache: "no-store" });
        if (raw.ok) {
          setBackendHealth(true);
          return;
        }
      } catch {}
      setBackendHealth(false);
    }
  }

  async function refreshLoras() {
    try {
      const res = await listLoras();
      setAvailableLoras(res.available || []);
    } catch {
      setAvailableLoras([]);
    }
  }

  function setExpressionIntensity(expression: string, intensity: number) {
    setExpressionIntensitiesState((prev) => ({
      ...prev,
      [expression]: intensity,
    }));
  }

  function updateSettings(newSettings: Partial<GenerationSettings>) {
    setSettings((prev) => ({ ...prev, ...newSettings }));
  }

  function toggleFavorite(url: string) {
    setFavorites((prev) =>
      prev.includes(url) ? prev.filter((item) => item !== url) : [...prev, url]
    );
  }

  function addToast(message: string, type: "success" | "error" | "info" = "info") {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, type, message }]);
    setTimeout(() => {
      removeToast(id);
    }, 4000);
  }

  function removeToast(id: string) {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }

  function resetAll() {
    setUploadFilename(null);
    setClassification(null);
    setDetection(null);
    setLatestResult(null);
  }

  return (
    <AppContext.Provider
      value={{
        backendHealth,
        checkHealth,
        uploadFilename,
        setUploadFilename,
        classification,
        setClassification,
        detection,
        setDetection,
        selectedExpressions,
        setSelectedExpressions,
        expressionIntensities,
        setExpressionIntensity,
        settings,
        updateSettings,
        availableLoras,
        refreshLoras,
        latestResult,
        setLatestResult,
        favorites,
        toggleFavorite,
        toasts,
        addToast,
        removeToast,
        resetAll,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error("useApp must be used within an AppProvider");
  }
  return context;
}
