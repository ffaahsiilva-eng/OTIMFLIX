import React, { useState } from 'react';
import { Play, Plus, Check, ThumbsUp, Film } from 'lucide-react';
import { M3UItem } from '../types/m3u';

interface MovieCardProps {
  item: M3UItem;
  onPlay: (item: M3UItem) => void;
  onOpenModal: (item: M3UItem) => void;
  isFavorite: boolean;
  onToggleFavorite: (item: M3UItem) => void;
  isLiked: boolean;
  onToggleLike: (item: M3UItem) => void;
}

export const MovieCard: React.FC<MovieCardProps> = ({
  item,
  onPlay,
  onOpenModal,
  isFavorite,
  onToggleFavorite,
  isLiked,
  onToggleLike,
}) => {
  const [imgError, setImgError] = useState(false);

  // Gradient seeds based on title hash for consistent fallback styling
  const hash = item.title.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const gradients = [
    'from-red-950 via-zinc-900 to-black',
    'from-blue-950 via-slate-900 to-black',
    'from-purple-950 via-neutral-900 to-black',
    'from-amber-950 via-zinc-900 to-black',
    'from-emerald-950 via-stone-900 to-black',
  ];
  const bgGradient = gradients[hash % gradients.length];

  const posterSrc = item.poster || item.logo;

  return (
    <div
      onClick={() => onOpenModal(item)}
      className="group relative flex-none w-[150px] sm:w-[175px] md:w-[195px] h-[225px] sm:h-[263px] md:h-[290px] rounded-md overflow-hidden bg-zinc-800 shadow-md cursor-pointer transition-all duration-300 hover:scale-105 hover:z-30 hover:shadow-2xl border border-zinc-800 hover:border-zinc-600"
    >
      {/* Poster Image or Fallback Card */}
      {posterSrc && !imgError ? (
        <img
          src={posterSrc}
          alt={item.title}
          loading="lazy"
          referrerPolicy="no-referrer"
          onError={() => setImgError(true)}
          className="w-full h-full object-cover group-hover:brightness-50 transition-all duration-300"
        />
      ) : (
        <div className={`w-full h-full bg-gradient-to-br ${bgGradient} p-3 flex flex-col justify-between select-none`}>
          <div className="flex items-center justify-between text-[10px] text-zinc-400">
            <span className="font-bold text-[#e50914] uppercase">OtimFlix</span>
            {item.year && <span>{item.year}</span>}
          </div>
          <div className="text-center my-auto px-1">
            <Film className="w-6 h-6 mx-auto text-zinc-500 mb-2 opacity-70" />
            <h4 className="font-bold text-xs sm:text-sm text-white line-clamp-2 leading-tight">
              {item.title}
            </h4>
            <p className="text-[10px] text-zinc-400 mt-1 line-clamp-1">{item.group}</p>
          </div>
          <div className="flex justify-between items-center text-[9px] text-zinc-500">
            <span>{item.isSeries ? 'SÉRIE' : 'FILME'}</span>
            <span className="border border-zinc-700 px-1 py-0.2 rounded">HD</span>
          </div>
        </div>
      )}

      {/* Hover Information Layer */}
      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-3 text-white">
        <div className="flex items-center gap-1.5 mb-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onPlay(item);
            }}
            className="w-7 h-7 rounded-full bg-white text-black flex items-center justify-center hover:bg-white/80 transition-colors shadow"
            title="Assistir agora"
          >
            <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
          </button>

          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleFavorite(item);
            }}
            className="w-7 h-7 rounded-full border border-zinc-400 bg-black/60 hover:border-white flex items-center justify-center transition-colors text-white"
            title={isFavorite ? "Remover da Minha Lista" : "Adicionar à Minha Lista"}
          >
            {isFavorite ? <Check className="w-3.5 h-3.5 text-[#e50914]" /> : <Plus className="w-3.5 h-3.5" />}
          </button>

          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleLike(item);
            }}
            className={`w-7 h-7 rounded-full border border-zinc-400 bg-black/60 hover:border-white flex items-center justify-center transition-colors ${
              isLiked ? 'text-red-500 border-red-500' : 'text-white'
            }`}
            title={isLiked ? "Curtido" : "Gostei"}
          >
            <ThumbsUp className="w-3 h-3" />
          </button>
        </div>

        <h3 className="font-bold text-xs line-clamp-1 text-white">
          {item.title}
        </h3>

        <div className="flex items-center gap-1.5 text-[10px] text-zinc-300 mt-1">
          {item.rating > 0 && (
            <span className="text-[#46d369] font-bold">⭐ {item.rating}</span>
          )}
          {item.year && <span>{item.year}</span>}
          <span className="text-zinc-400">·</span>
          <span className="text-zinc-400">{item.isSeries ? 'Série' : 'Filme'}</span>
        </div>
      </div>
    </div>
  );
};
