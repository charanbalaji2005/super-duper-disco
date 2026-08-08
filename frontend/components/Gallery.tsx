import type { GeneratedImageOut } from "@/services/api";
import ImageCard from "./ImageCard";

interface GalleryProps {
  images: GeneratedImageOut[];
  apiUrl: string;
}

export default function Gallery({ images, apiUrl }: GalleryProps) {
  if (images.length === 0) return null;
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
      {images.map((img) => (
        <ImageCard key={img.expression} image={img} apiUrl={apiUrl} />
      ))}
    </div>
  );
}
