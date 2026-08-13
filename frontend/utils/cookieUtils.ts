import { HistoryItemOut, GenerateResponse } from "@/services/api";

const COOKIE_NAME = "expression_tasks_history";
const MAX_AGE_SECONDS = 30 * 24 * 60 * 60; // 30 days
const STORAGE_KEY = "expression_tasks_history_backup";

/**
 * Set a cookie in document.cookie
 */
export function setCookie(name: string, value: string, maxAgeSeconds: number = MAX_AGE_SECONDS): void {
  if (typeof document === "undefined") return;
  const encodedValue = encodeURIComponent(value);
  document.cookie = `${name}=${encodedValue}; path=/; max-age=${maxAgeSeconds}; SameSite=Lax`;
}

/**
 * Get a cookie value from document.cookie
 */
export function getCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const cookies = document.cookie.split(";");
  for (let c of cookies) {
    const [key, ...valParts] = c.trim().split("=");
    if (key === name) {
      try {
        return decodeURIComponent(valParts.join("="));
      } catch {
        return valParts.join("=");
      }
    }
  }
  return null;
}

/**
 * Delete a cookie
 */
export function deleteCookie(name: string): void {
  if (typeof document === "undefined") return;
  document.cookie = `${name}=; path=/; max-age=0; SameSite=Lax`;
}

/**
 * Convert a GenerateResponse object into a HistoryItemOut record for saving in cookie history
 */
export function generateResponseToHistoryItem(res: GenerateResponse): HistoryItemOut {
  return {
    id: res.request_id,
    created_at: new Date().toISOString(),
    category: res.category || "human",
    subtype: res.subtype || "unspecified",
    requested_expressions: res.images.map((img) => img.expression),
    lora_used: res.lora_used || null,
    outputs: res.images.map((img) => ({
      expression: img.expression,
      passed_quality: img.passed_quality,
      download_url: img.download_url || `/api/download/${res.request_id}/${img.expression}`,
      failure_reasons: img.failure_reasons || [],
    })),
  };
}

/**
 * Get all generation tasks stored in cookies (with localStorage fallback)
 */
export function getTasksFromCookies(): HistoryItemOut[] {
  if (typeof window === "undefined") return [];

  // Try reading from cookie first
  const cookieValue = getCookie(COOKIE_NAME);
  if (cookieValue) {
    try {
      const parsed = JSON.parse(cookieValue);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    } catch (e) {
      console.warn("Failed to parse task history from cookies, checking fallback", e);
    }
  }

  // Fallback to localStorage if cookie empty or unavailable
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed)) {
        // Sync back to cookie
        saveTasksToCookies(parsed);
        return parsed;
      }
    }
  } catch (e) {
    console.warn("Failed to parse task history from localStorage", e);
  }

  return [];
}

/**
 * Save tasks array to cookies and localStorage backup
 */
export function saveTasksToCookies(tasks: HistoryItemOut[]): void {
  if (typeof window === "undefined") return;

  // Keep latest 30 tasks
  const trimmed = tasks.slice(0, 30);
  const serialized = JSON.stringify(trimmed);

  // Save to localStorage as permanent backup
  try {
    localStorage.setItem(STORAGE_KEY, serialized);
  } catch (e) {
    console.warn("Failed to save to localStorage backup", e);
  }

  // Try saving to cookie (if string fits within ~3.8KB cookie size limit)
  try {
    if (serialized.length < 3800) {
      setCookie(COOKIE_NAME, serialized);
    } else {
      // Store compact version (recent 10) in cookie
      const compact = JSON.stringify(trimmed.slice(0, 10));
      setCookie(COOKIE_NAME, compact);
    }
  } catch (e) {
    console.warn("Failed to set task history cookie", e);
  }
}

/**
 * Save a single new task into cookies and localStorage
 */
export function saveSingleTaskToCookies(task: HistoryItemOut): void {
  const existing = getTasksFromCookies();
  // Filter out duplicate task IDs if re-saved
  const filtered = existing.filter((item) => item.id !== task.id);
  const updated = [task, ...filtered];
  saveTasksToCookies(updated);
}

/**
 * Clear task history from cookies and localStorage
 */
export function clearTasksFromCookies(): void {
  deleteCookie(COOKIE_NAME);
  if (typeof window !== "undefined") {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {}
  }
}
