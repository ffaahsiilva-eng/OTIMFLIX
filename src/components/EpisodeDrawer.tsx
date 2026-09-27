import React from 'react';
import { X, Play, Tv, Flame, Check } from 'lucide-react';
import { M3UItem } from '../types/m3u';
import { parseEpisodeInfo } from '../utils/seriesUtils';

interface EpisodeDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  currentItem: M3UItem;
  episodes: M3UItem[];
  onSelectEpisode: (item: M3UItem) => void;
  autoPlayEnabled: boolean;
  onToggleAutoPlay: () => void;
}

export const EpisodeDrawer: React.FC<EpisodeDrawerProps> = ({
  isOpen,
  onClose,
  currentItem,
  episodes,
  onSelectEpisode,
  autoPlayEnabled,
  onToggleAutoPlay,
}) => {
  if (!isOpen) return null;

  const currentInfo = parseEpisodeInfo(currentItem);
  const seriesTitle = currentInfo?.seriesName || currentItem.title;

  return (
    <div
      className="absolute inset-0 z-50 bg-black/60 backdrop-blur-xs flex justify-end animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md h-full bg-zinc-900 border-l border-zinc-800 flex flex-col shadow-2xl animate-in slide-in-from-right duration-300 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drawer Header */}
        <div className="p-5 border-b border-zinc-800 bg-zinc-950/80 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#e50914]/20 border border-[#e50914]/40 flex items-center justify-center text-[#e50914]">
              <Tv className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-white text-base line-clamp-1">
                {seriesTitle}
              </h3>
              <p className="text-xs text-zinc-400">
                {episodes.length} episódios na lista
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer border border-zinc-700"
            title="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Marathon Auto-Play Toggle Option */}
        <div className="p-4 bg-zinc-950/40 border-b border-zinc-800/80">
          <div className="flex items-center justify-between p-3 rounded-xl bg-zinc-800/60 border border-zinc-700/60">
            <div className="flex items-center gap-3">
              <div
                className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
                  autoPlayEnabled
                    ? 'bg-[#e50914] text-white'
                    : 'bg-zinc-700 text-zinc-400'
                }`}
              >
                <Flame className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs font-bold text-white">
                  Modo Maratona (Auto-play)
                </p>
                <p className="text-[11px] text-zinc-400">
                  {autoPlayEnabled
                    ? 'Inicia o próximo episódio automaticamente'
                    : 'Reprodução automática pausada'}
                </p>
              </div>
            </div>
            <button
              onClick={onToggleAutoPlay}
              className={`w-12 h-6 rounded-full transition-colors relative cursor-pointer ${
                autoPlayEnabled ? 'bg-[#e50914]' : 'bg-zinc-700'
              }`}
              title="Ativar/Desativar reprodução automática de maratona"
            >
              <div
                className={`w-5 h-5 rounded-full bg-white transition-transform transform shadow-md absolute top-0.5 ${
                  autoPlayEnabled ? 'left-6.5' : 'left-0.5'
                }`}
              />
            </button>
          </div>
        </div>

        {/* Episodes List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {episodes.map((ep, idx) => {
            const isCurrent = ep.id === currentItem.id || ep.url === currentItem.url;
            const epInfo = parseEpisodeInfo(ep);
            const thumb = ep.backdrop || ep.poster || ep.logo;

            return (
              <div
                key={ep.id || idx}
                onClick={() => {
                  if (!isCurrent) {
                    onSelectEpisode(ep);
                    onClose();
                  }
                }}
                className={`group flex items-center gap-3 p-3 rounded-xl transition-all cursor-pointer border ${
                  isCurrent
                    ? 'bg-[#e50914]/15 border-[#e50914]/50 shadow-md ring-1 ring-[#e50914]/40'
                    : 'bg-zinc-800/40 hover:bg-zinc-800 border-zinc-800 hover:border-zinc-700'
                }`}
              >
                {/* Thumbnail */}
                <div className="relative w-20 h-14 rounded-lg overflow-hidden shrink-0 bg-zinc-800 border border-white/10">
                  {thumb ? (
                    <img
                      src={thumb}
                      alt={ep.title}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-zinc-500">
                      <Tv className="w-5 h-5" />
                    </div>
                  )}

                  {isCurrent ? (
                    <div className="absolute inset-0 bg-[#e50914]/50 flex items-center justify-center">
                      <div className="flex items-center gap-0.5">
                        <span className="w-1 h-3 bg-white animate-pulse" />
                        <span className="w-1 h-4 bg-white animate-pulse delay-75" />
                        <span className="w-1 h-2 bg-white animate-pulse delay-150" />
                      </div>
                    </div>
                  ) : (
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                      <Play className="w-5 h-5 fill-white text-white" />
                    </div>
                  )}
                </div>

                {/* Details */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-[11px] font-bold uppercase tracking-wider ${
                        isCurrent ? 'text-[#ff5a5f]' : 'text-zinc-400'
                      }`}
                    >
                      {epInfo ? epInfo.formattedTag : `Episódio ${idx + 1}`}
                    </span>
                    {isCurrent && (
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded bg-[#e50914] text-[10px] font-bold text-white">
                        <Check className="w-2.5 h-2.5" />
                        <span>Assistindo</span>
                      </span>
                    )}
                  </div>
                  <h4
                    className={`text-xs sm:text-sm font-semibold line-clamp-1 mt-0.5 ${
                      isCurrent ? 'text-white' : 'text-zinc-200 group-hover:text-white'
                    }`}
                  >
                    {epInfo?.episodeTitle || ep.title}
                  </h4>
                  <p className="text-[11px] text-zinc-500 line-clamp-1 mt-0.5">
                    {ep.group}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
