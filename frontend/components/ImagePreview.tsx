interface ImagePreviewProps {
  src: string;
  alt?: string;
  label?: string;
}

export default function ImagePreview({ src, alt = "preview", label }: ImagePreviewProps) {
  return (
    <div className="flex flex-col items-center gap-2">
      {label && <span className="text-sm font-medium text-neutral-500">{label}</span>}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt={alt} className="max-h-96 rounded-xl border border-neutral-200 object-contain dark:border-neutral-800" />
    </div>
  );
}
