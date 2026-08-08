import { Download } from "lucide-react";

interface DownloadButtonProps {
  href: string;
  label?: string;
}

export default function DownloadButton({ href, label = "Download all (.zip)" }: DownloadButtonProps) {
  return (
    <a
      href={href}
      download
      className="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2 font-medium text-white hover:bg-brand-500"
    >
      <Download className="h-4 w-4" />
      {label}
    </a>
  );
}
