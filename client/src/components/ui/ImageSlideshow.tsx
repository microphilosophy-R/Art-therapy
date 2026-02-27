import React, { useState, useEffect } from 'react';

interface ImageSlideshowProps {
  images: string[];
  intervalMs?: number;
  className?: string;
}

export const ImageSlideshow: React.FC<ImageSlideshowProps> = ({
  images,
  intervalMs = 4000,
  className = '',
}) => {
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    if (images.length <= 1) return;
    const id = setInterval(() => setCurrent((i) => (i + 1) % images.length), intervalMs);
    return () => clearInterval(id);
  }, [images.length, intervalMs]);

  if (images.length === 0) return null;

  return (
    <div className={`relative aspect-video rounded-xl overflow-hidden bg-stone-100 ${className}`}>
      {images.map((src, i) => (
        <img
          key={src}
          src={src}
          alt=""
          loading="lazy"
          className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-700 ${
            i === current ? 'opacity-100' : 'opacity-0'
          }`}
        />
      ))}
      {images.length > 1 && (
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5 z-10">
          {images.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrent(i)}
              className={`w-2 h-2 rounded-full transition-colors ${
                i === current ? 'bg-white' : 'bg-white/50'
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
};
