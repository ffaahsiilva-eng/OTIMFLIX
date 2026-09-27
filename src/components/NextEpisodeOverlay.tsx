import React, { useEffect, useState } from 'react';
import { Play, X, List, Sparkles } from 'lucide-react';
import { M3UItem } from '../types/m3u';
import { parseEpisodeInfo } from '../utils/seriesUtils';

interface NextEpisodeOverlayProps {
  nextItem: M3UItem;
  countdownSeconds?: number;
  onPlayNext: () => void;
  onCancel: () => void;
  onOpenEpisodesList?: () => void;
}

export const NextEpisodeOverlay: React.FC<NextEpisodeOverlayProps> = ({
  nextItem,
  countdownSeconds = 5,
  onPlayNext,
  onCancel,
  onOpenEpisodesList,
}) => {
  const [timeLeft, setTimeLeft] = useState(countdownSeconds);
  const info = parseEpisodeInfo(nextItem);
  const posterImage = nextItem.backdrop || nextItem.poster || nextItem.logo;

  useEffect(() => {
    setTimeLeft(countdownSeconds);
    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          onPlayNext();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [nextItem, countdownSeconds, onPlayNext]);

  // Calculate circular progress percentage
  const progressRatio = timeLeft / countdownSeconds;
  const strokeDashoffset = 126 * (1 - progressRatio);

  return (
    <div
      className="absolute inset-0 z-40 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-300"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="relative max-w-lg w-full bg-gradient-to-b from-zinc-900 to-zinc-950 border border-zinc-700/80 rounded-2xl p-6 sm:p-8 shadow-2xl overflow-hidden text-center">
        {/* Glow backdrop */}
        <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-72 h-72 bg-[#e50914]/20 rounded-full blur-3xl pointer-events-none" />

        {/* Close / Cancel Button */}
        <button
          onClick={onCancel}
          className="absolute top-4 right-4 w-9 h-9 rounded-full bg-zinc-800/80 hover:bg-zinc-700 text-zinc-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer border border-zinc-700"
          title="Cancelar reprodução automática"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Circular Countdown Progress */}
        <div className="relative w-20 h-20 mx-auto mb-4 flex items-center justify-center">
          <svg className="w-full h-full -rotate-90" viewBox="0 0 48 48">
            <circle
              cx="24"
              cy="24"
              r="20"
              className="stroke-zinc-800"
              strokeWidth="3.5"
              fill="transparent"
            />
            <circle
              cx="24"
              cy="24"
              r="20"
              className="stroke-[#e50914] transition-all duration-1000 ease-linear"
              strokeWidth="3.5"
              strokeDasharray={126}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              fill="transparent"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-2xl font-black text-white tabular-nums tracking-tighter">
              {timeLeft}
            </span>
          </div>
        </div>

        {/* Label */}
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#e50914]/15 border border-[#e50914]/30 text-xs font-semibold text-[#ff5a5f] mb-3">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Próximo Episódio em {timeLeft}s</span>
        </div>

        {/* Next Episode Card */}
        <div className="relative w-full bg-zinc-800/60 border border-zinc-700/60 rounded-xl p-3 sm:p-4 mb-6 flex items-center gap-4 text-left overflow-hidden">
          {posterImage ? (
            <img
              src={posterImage}
              alt={nextItem.title}
              referrerPolicy="no-referrer"
              className="w-20 h-20 sm:w-24 sm:h-24 object-cover rounded-lg shrink-0 shadow-md border border-white/10"
            />
          ) : (
            <div className="w-20 h-20 sm:w-24 sm:h-24 bg-zinc-700 rounded-lg shrink-0 flex items-center justify-center">
              <Play className="w-8 h-8 text-zinc-400" />
            </div>
          )}

          <div className="flex-1 min-w-0">
            {info && (
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#46d369]">
                {info.formattedTag}
                {info.episodeTitle && ` • ${info.episodeTitle}`}
              </span>
            )}
            <h4 className="text-white font-bold text-sm sm:text-base line-clamp-2 mt-0.5">
              {nextItem.title}
            </h4>
            <p className="text-zinc-400 text-xs line-clamp-1 mt-1">
              {nextItem.group || 'Série na lista de reprodução'}
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            onClick={onPlayNext}
            className="w-full sm:w-auto flex-1 inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-white hover:bg-zinc-200 text-black font-extrabold text-sm uppercase tracking-wider shadow-lg hover:shadow-xl transition-all active:scale-95 cursor-pointer"
          >
            <Play className="w-4 h-4 fill-black" />
            <span>Assistir Agora</span>
          </button>

          <button
            onClick={onCancel}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 hover:text-white font-bold text-xs uppercase tracking-wider border border-zinc-700 transition-all cursor-pointer"
          >
            <span>Cancelar</span>
          </button>

          {onOpenEpisodesList && (
            <button
              onClick={onOpenEpisodesList}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-4 py-3 rounded-xl bg-zinc-800/80 hover:bg-zinc-700 text-zinc-300 hover:text-white font-semibold text-xs border border-zinc-700/80 transition-all cursor-pointer"
              title="Ver todos os episódios"
            >
              <List className="w-4 h-4" />
              <span className="hidden sm:inline">Episódios</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
