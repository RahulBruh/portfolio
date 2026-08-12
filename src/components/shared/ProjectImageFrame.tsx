import Image from "next/image";

type ProjectImageFrameProps = {
  images: string[];
  alt: string;
  className?: string;
  sizes?: string;
};

export default function ProjectImageFrame({ images, alt, className = "", sizes }: ProjectImageFrameProps) {
  const fit = images.length > 1 ? "object-contain" : "object-cover";
  return (
    <div className={`relative flex gap-2 overflow-hidden bg-frame ${className}`}>
      {images.map((src, i) => (
        <div key={src} className="relative min-w-0 flex-1 h-full">
          <Image
            src={src}
            alt={i === 0 ? alt : `${alt} — alternate view`}
            fill
            sizes={sizes ?? "(max-width: 768px) 100vw, 50vw"}
            className={fit}
          />
        </div>
      ))}
    </div>
  );
}
