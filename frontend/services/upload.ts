export const ACCEPTED_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/pjpeg",
  "image/x-png",
  "",
  "application/octet-stream",
];

export const ALLOWED_EXTENSIONS = [".jpg", ".jpeg", ".png", ".webp"];
export const MAX_SIZE_BYTES = 15 * 1024 * 1024;

export function validateFile(file: File): string | null {
  const ext = file.name ? file.name.substring(file.name.lastIndexOf(".")).toLowerCase() : "";
  const isValidType = ACCEPTED_TYPES.includes(file.type?.toLowerCase() || "");
  const isValidExt = ALLOWED_EXTENSIONS.includes(ext);

  if (!isValidType && !isValidExt) {
    return `Unsupported file format '${file.name}'. Please select a JPEG, PNG, or WebP image.`;
  }
  if (file.size > MAX_SIZE_BYTES) {
    return `File too large (${(file.size / 1024 / 1024).toFixed(1)}MB). Max size is 15MB.`;
  }
  return null;
}
