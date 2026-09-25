import React, { useState } from 'react';
import { Film } from 'lucide-react';

interface MovieImageProps {
  src: string;
  alt: string;
  className?: string;
  fallbackTitle: string;
  fallbackGenre?: string;
  fallbackYear?: number;
  aspect?: 'poster' | 'backdrop';
}

export const MovieImage: React.FC<MovieImageProps> = ({
  src,
  alt,
  className = '',
  fallbackTitle,
  fallbackGenre,
  fallbackYear,
  aspect = 'poster',
}) => {
  const [error, setError] = useState(false);
  const [loaded, setLoaded] = useState(false);

  // Gradient seeds based on title hash for consistent unique fallback cards
  const hash = fallbackTitle.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const gradients = [
    'from-red-950 via-zinc-900 to-black',
    'from-blue-950 via-slate-900 to-black',
    'from-amber-950 via-neutral-900 to-black',
    'from-purple-950 via-stone-900 to-black',
    'from-emerald-950 via-zinc-900 to-black',
    'from-cyan-950 via-slate-900 to-black',
  ];
  const bgGradient = gradients[hash % gradients.length];

  if (error) {
    return (
      <div
        className={`w-full h-full bg-gradient-to-br ${bgGradient} flex flex-col justify-between p-4 text-white relative overflow-hidden select-none border border-white/10 ${className}`}
      >
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.08),transparent_70%)]" />
        <div className="flex items-center justify-between text-xs text-zinc-400 z-10">
          <span className="font-bold tracking-wider text-red-500 uppercase text-[10px]">OtimFlix</span>
          {fallbackYear && <span>{fallbackYear}</span>}
        </div>
        <div className="z-10 my-auto text-center py-2">
          <Film className="w-8 h-8 mx-auto text-zinc-500 mb-2 opacity-60" />
          <h4 className="font-extrabold text-sm sm:text-base leading-tight drop-shadow-md text-white line-clamp-2">
            {fallbackTitle}
          </h4>
          {fallbackGenre && (
            <p className="text-[11px] text-zinc-400 mt-1">{fallbackGenre}</p>
          )}
        </div>
        <div className="z-10 text-[10px] text-zinc-500 flex justify-between items-center">
          <span>ORIGINAL</span>
          <span className="border border-zinc-700 px-1 py-0.5 rounded text-[9px]">HD</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`relative w-full h-full bg-zinc-900 overflow-hidden ${className}`}>
      {!loaded && (
        <div className="absolute inset-0 bg-zinc-800/80 animate-pulse flex items-center justify-center">
          <Film className="w-6 h-6 text-zinc-600 animate-spin" />
        </div>
      )}
      <img
        src={src}
        alt={alt}
        referrerPolicy="no-referrer"
        onLoad={() => setLoaded(true)}
        onError={() => setError(true)}
        className={`w-full h-full object-cover transition-opacity duration-300 ${
          loaded ? 'opacity-100' : 'opacity-0'
        }`}
      />
    </div>
  );
};
