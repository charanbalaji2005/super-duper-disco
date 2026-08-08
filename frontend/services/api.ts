import axios from "axios";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

export const api = axios.create({
  baseURL: API_URL,
});

export interface UploadResponse {
  upload_id: string;
  filename: string;
  size_bytes: number;
}

export interface ClassifyResponse {
  category: "human" | "animal";
  subtype: string;
  category_confidence: number;
  subtype_confidence: number;
}

export interface DetectResponse {
  face_found: boolean;
  bbox: [number, number, number, number] | null;
  confidence: number | null;
}

export interface GeneratedImageOut {
  expression: string;
  passed_quality: boolean;
  failure_reasons: string[];
  download_url: string;
}

export interface GenerateResponse {
  request_id: string;
  category: string;
  subtype: string;
  lora_used: string | null;
  images: GeneratedImageOut[];
}

export interface LoraListResponse {
  available: string[];
  active: string | null;
}

export interface HistoryImageOut {
  expression: string;
  passed_quality: boolean;
}

export interface HistoryItemOut {
  id: string;
  created_at: string;
  category: string;
  subtype: string;
  requested_expressions: string[];
  lora_used: string | null;
  outputs: HistoryImageOut[];
}

export interface QualityOut {
  expression: string;
  passed_quality: boolean;
  failure_reasons: string[];
}

export async function uploadImage(file: File): Promise<UploadResponse> {
  const form = new FormData();
  form.append("file", file);
  const { data } = await api.post<UploadResponse>("/api/upload", form, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data;
}

export async function classifyImage(filename: string): Promise<ClassifyResponse> {
  const { data } = await api.get<ClassifyResponse>(`/api/classify/${filename}`);
  return data;
}

export async function detectFace(filename: string): Promise<DetectResponse> {
  const { data } = await api.get<DetectResponse>(`/api/detect/${filename}`);
  return data;
}

export function alignedPreviewUrl(filename: string): string {
  return `${API_URL}/api/align/${filename}`;
}

export function rawUploadUrl(filename: string): string {
  return `${API_URL}/api/upload/${filename}`;
}

export async function generateExpressions(
  uploadFilename: string,
  expressions: string[],
  loraName?: string | null,
  loraWeight?: number | null,
  requestId?: string | null
): Promise<GenerateResponse> {
  const { data } = await api.post<GenerateResponse>("/api/generate", {
    upload_filename: uploadFilename,
    expressions,
    lora_name: loraName ?? null,
    lora_weight: loraWeight ?? null,
    request_id: requestId ?? null,
  });
  return data;
}

export async function listLoras(): Promise<LoraListResponse> {
  const { data } = await api.get<LoraListResponse>("/api/lora");
  return data;
}

export async function getHistory(limit: number = 50): Promise<HistoryItemOut[]> {
  const { data } = await api.get<HistoryItemOut[]>(`/api/history?limit=${limit}`);
  return data;
}

export async function getQualityReport(requestId: string): Promise<QualityOut[]> {
  const { data } = await api.get<QualityOut[]>(`/api/quality/${requestId}`);
  return data;
}

export function downloadSingleUrl(requestId: string, expression: string): string {
  return `${API_URL}/api/download/${requestId}/${expression}`;
}

export function downloadZipUrl(requestId: string): string {
  return `${API_URL}/api/download/${requestId}/zip`;
}

export interface ProgressResponse {
  request_id: string;
  status: "idle" | "running" | "done" | "failed";
  progress_percent: number;
  current_step: number;
  total_steps: number;
  current_expression: string;
  total_expressions: number;
}

export async function getGenerationProgress(requestId: string): Promise<ProgressResponse> {
  const { data } = await api.get<ProgressResponse>(`/api/generate/progress/${requestId}`);
  return data;
}

export async function cancelGeneration(requestId: string): Promise<{ status: string; request_id: string }> {
  const { data } = await api.post<{ status: string; request_id: string }>(`/api/generate/cancel/${requestId}`);
  return data;
}

export const ALL_EXPRESSIONS = ["happy", "sad", "angry", "surprise", "fear", "disgust", "neutral"];
