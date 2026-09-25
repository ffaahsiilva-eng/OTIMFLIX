import React, { useState } from 'react';
import { Play, Info, Plus, Check } from 'lucide-react';
import { M3UItem } from '../types/m3u';

interface HeroProps {
  item: M3UItem;
  onPlay: (item: M3UItem) => void;
  onOpenModal: (item: M3UItem) => void;
  isFavorite: boolean;
  onToggleFavorite: (item: M3UItem) => void;
}

export const Hero: React.FC<HeroProps> = ({
  item,
  onPlay,
  onOpenModal,
  isFavorite,
  onToggleFavorite,
}) => {
  const [imgError, setImgError] = useState(false);
  const heroImage = item.backdrop || item.poster || item.logo;

  return (
    <section className="relative w-full h-[70vh] sm:h-[82vh] min-h-[460px] max-h-[850px] select-none overflow-hidden bg-black flex items-end">
      {/* Background with Dark Overlays */}
      <div className="absolute inset-0 z-0">
        {heroImage && !imgError ? (
          <img
            src={heroImage}
            alt={item.title}
            referrerPolicy="no-referrer"
            onError={() => setImgError(true)}
            className="w-full h-full object-cover object-top filter brightness-[0.5] scale-105 transition-transform duration-1000 ease-out"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-r from-zinc-950 via-red-950/40 to-zinc-900 flex items-center justify-center">
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(229,9,20,0.15),transparent_70%)]" />
          </div>
        )}

        <div className="absolute inset-0 bg-gradient-to-r from-[#141414] via-[#141414]/70 to-transparent w-full md:w-3/4 z-1" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#141414] via-[#141414]/40 to-transparent z-1" />
        <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-b from-black/80 to-transparent z-1" />
      </div>

      {/* Hero Content */}
      <div className="relative z-10 max-w-[1700px] w-full mx-auto px-4 sm:px-8 md:px-12 pb-16 sm:pb-24">
        <div className="max-w-2xl">
          <div className="flex items-center gap-2 mb-3">
            <span className="font-extrabold text-[12px] tracking-widest text-[#e50914] uppercase">
              OtimFlix Destaque
            </span>
            <span className="text-xs text-zinc-400 font-medium">
              · {item.group}
            </span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-white drop-shadow-2xl leading-[1.1] mb-4">
            {item.rawTitle || item.title}
          </h1>

          <div className="flex items-center gap-3 text-xs sm:text-sm text-zinc-300 font-medium mb-4">
            {item.rating > 0 && (
              <span className="text-[#46d369] font-bold">⭐ {item.rating} avaliação</span>
            )}
            {item.year && (
              <>
                <span aria-hidden="true" className="text-zinc-600">·</span>
                <span>{item.year}</span>
              </>
            )}
            <span aria-hidden="true" className="text-zinc-600">·</span>
            <span className="border border-zinc-600 px-1 py-0.2 rounded text-[10px] text-zinc-300 font-bold uppercase">
              {item.isSeries ? 'Série' : 'Filme'}
            </span>
          </div>

          <p className="text-sm sm:text-base text-zinc-300 line-clamp-3 leading-relaxed mb-6 drop-shadow">
            {item.overview || 'Título carregado a partir da sua lista M3U. Clique em Assistir para iniciar a reprodução imediata com o player nativo.'}
          </p>

          <div className="flex items-center gap-3 flex-wrap">
            <button
              onClick={() => onPlay(item)}
              className="px-6 py-2.5 sm:px-8 sm:py-3 rounded bg-white text-black font-bold text-sm sm:text-base flex items-center gap-2 hover:bg-white/85 active:scale-95 transition-all shadow-lg cursor-pointer"
            >
              <Play className="w-5 h-5 fill-current" />
              <span>Assistir</span>
            </button>

            <button
              onClick={() => onOpenModal(item)}
              className="px-5 py-2.5 sm:px-7 sm:py-3 rounded bg-zinc-600/70 hover:bg-zinc-600/90 text-white font-bold text-sm sm:text-base flex items-center gap-2 backdrop-blur-sm active:scale-95 transition-all cursor-pointer"
            >
              <Info className="w-5 h-5" />
              <span>Mais Informações</span>
            </button>

            <button
              onClick={() => onToggleFavorite(item)}
              title={isFavorite ? "Remover da Minha Lista" : "Adicionar à Minha Lista"}
              className={`p-2.5 sm:p-3 rounded-full border border-white/40 backdrop-blur-md active:scale-95 transition-all ${
                isFavorite
                  ? 'bg-zinc-800 text-[#e50914] border-[#e50914]'
                  : 'bg-black/40 text-white hover:border-white'
              }`}
            >
              {isFavorite ? <Check className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};
