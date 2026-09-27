import React, { useEffect, useState, useMemo } from 'react';
import { X, Play, Plus, Check, ThumbsUp, Film, ExternalLink, Copy, Flame, Tv } from 'lucide-react';
import { M3UItem } from '../types/m3u';
import { openInVlc } from '../utils/playerUtils';
import { parseEpisodeInfo, getSeriesEpisodes } from '../utils/seriesUtils';

interface MovieModalProps {
  item: M3UItem | null;
  onClose: () => void;
  onPlay: (item: M3UItem) => void;
  isFavorite: boolean;
  onToggleFavorite: (item: M3UItem) => void;
  isLiked: boolean;
  onToggleLike: (item: M3UItem) => void;
  playlist?: M3UItem[];
}

export const MovieModal: React.FC<MovieModalProps> = ({
  item,
  onClose,
  onPlay,
  isFavorite,
  onToggleFavorite,
  isLiked,
  onToggleLike,
  playlist = [],
}) => {
  const [copied, setCopied] = useState(false);

  const seriesInfo = useMemo(() => (item ? parseEpisodeInfo(item) : null), [item]);
  const episodes = useMemo(() => {
    if (!item) return [];
    return playlist.length > 0 ? getSeriesEpisodes(item, playlist) : [item];
  }, [item, playlist]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!item) return null;

  const posterImage = item.backdrop || item.poster || item.logo;

  const handleCopy = () => {
    if (item.url) {
      navigator.clipboard.writeText(item.url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-6 bg-black/80 backdrop-blur-md overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-3xl bg-[#181818] rounded-xl overflow-hidden shadow-2xl border border-zinc-800 my-auto text-white animate-in fade-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-30 w-10 h-10 rounded-full bg-[#181818]/80 hover:bg-[#181818] border border-white/20 text-white flex items-center justify-center transition-colors cursor-pointer"
          title="Fechar"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Banner */}
        <div className="relative w-full h-[260px] sm:h-[360px] bg-zinc-950 overflow-hidden">
          {posterImage ? (
            <img
              src={posterImage}
              alt={item.title}
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover object-top filter brightness-[0.7]"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-tr from-zinc-900 via-zinc-800 to-black flex items-center justify-center">
              <Film className="w-16 h-16 text-zinc-600" />
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-[#181818] via-[#181818]/40 to-transparent" />

          <div className="absolute bottom-6 left-6 sm:left-8 z-20 max-w-xl">
            {seriesInfo && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#e50914] text-[11px] font-black uppercase tracking-wider text-white mb-2 shadow">
                <Flame className="w-3 h-3" />
                <span>{seriesInfo.formattedTag}</span>
              </span>
            )}
            <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-white mb-4 drop-shadow-lg">
              {seriesInfo ? seriesInfo.seriesName : item.title}
            </h2>

            <div className="flex items-center gap-2.5 flex-wrap">
              <button
                onClick={() => onPlay(item)}
                className="px-5 py-2.5 rounded bg-white text-black font-bold flex items-center gap-2 hover:bg-white/80 active:scale-95 transition-all shadow-lg cursor-pointer text-sm"
              >
                <Play className="w-4 h-4 fill-current" />
                <span>{item.isSeries ? 'Assistir Episódio' : 'Assistir no Navegador'}</span>
              </button>

              <button
                onClick={() => openInVlc(item.url, item.title)}
                className="px-4 py-2.5 rounded bg-zinc-800/90 hover:bg-zinc-700 text-white font-semibold flex items-center gap-2 border border-zinc-700 text-xs sm:text-sm cursor-pointer transition-colors shadow"
                title="Abre o filme diretamente no aplicativo VLC ou reprodutor do sistema"
              >
                <ExternalLink className="w-4 h-4 text-amber-400" />
                <span>Abrir no VLC</span>
              </button>

              <button
                onClick={() => onToggleFavorite(item)}
                className={`p-2.5 rounded-full border border-zinc-400 bg-black/50 hover:border-white transition-all ${
                  isFavorite ? 'text-[#e50914] border-[#e50914]' : 'text-white'
                }`}
                title={isFavorite ? "Remover da Minha Lista" : "Adicionar à Minha Lista"}
              >
                {isFavorite ? <Check className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
              </button>

              <button
                onClick={() => onToggleLike(item)}
                className={`p-2.5 rounded-full border border-zinc-400 bg-black/50 hover:border-white transition-all ${
                  isLiked ? 'text-red-500 border-red-500' : 'text-white'
                }`}
                title={isLiked ? "Curtido" : "Gostei"}
              >
                <ThumbsUp className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Modal Info Body */}
        <div className="p-6 sm:p-8 space-y-6">
          <div className="flex items-center gap-3 text-sm text-zinc-300 font-medium flex-wrap">
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
            <span className="border border-zinc-600 px-1 py-0.2 rounded text-xs text-zinc-300 font-bold uppercase">
              {item.isSeries ? 'Série' : 'Filme'}
            </span>
            <span aria-hidden="true" className="text-zinc-600">·</span>
            <span className="text-zinc-400">{item.group}</span>

            {item.isSeries && (
              <>
                <span aria-hidden="true" className="text-zinc-600">·</span>
                <span className="inline-flex items-center gap-1 text-xs text-amber-400 font-semibold">
                  <Flame className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                  <span>Maratona Automática Disponível</span>
                </span>
              </>
            )}
          </div>

          <p className="text-sm sm:text-base text-zinc-200 leading-relaxed">
            {item.overview || 'Informações e metadados detalhados do item importado. A reprodução é transmitida diretamente através do link da lista M3U.'}
          </p>

          {/* Series Episodes List if series has multiple episodes */}
          {episodes.length > 1 && (
            <div className="pt-4 border-t border-zinc-800 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Tv className="w-4 h-4 text-[#e50914]" />
                  <h3 className="font-bold text-sm sm:text-base text-white">
                    Episódios da Série ({episodes.length})
                  </h3>
                </div>
                <span className="text-[11px] text-zinc-400">
                  Próximo episódio inicia automaticamente
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-60 overflow-y-auto pr-1">
                {episodes.map((ep, idx) => {
                  const isCurrent = ep.id === item.id || ep.url === item.url;
                  const epInfo = parseEpisodeInfo(ep);
                  const thumb = ep.backdrop || ep.poster || ep.logo;

                  return (
                    <div
                      key={ep.id || idx}
                      onClick={() => onPlay(ep)}
                      className={`flex items-center gap-3 p-2.5 rounded-lg border cursor-pointer transition-all group ${
                        isCurrent
                          ? 'bg-[#e50914]/20 border-[#e50914]/60 ring-1 ring-[#e50914]/40'
                          : 'bg-zinc-900/60 hover:bg-zinc-800 border-zinc-800 hover:border-zinc-700'
                      }`}
                    >
                      <div className="relative w-16 h-11 rounded overflow-hidden shrink-0 bg-zinc-800 border border-white/10">
                        {thumb ? (
                          <img
                            src={thumb}
                            alt={ep.title}
                            referrerPolicy="no-referrer"
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-zinc-600">
                            <Tv className="w-4 h-4" />
                          </div>
                        )}
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                          <Play className="w-4 h-4 fill-white text-white" />
                        </div>
                      </div>

                      <div className="flex-1 min-w-0">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-[#ff5a5f]">
                          {epInfo ? epInfo.formattedTag : `Ep. ${idx + 1}`}
                        </span>
                        <h4 className="text-xs font-semibold text-white line-clamp-1 group-hover:text-[#e50914] transition-colors">
                          {epInfo?.episodeTitle || ep.title}
                        </h4>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div className="pt-4 border-t border-zinc-800 space-y-2 text-xs text-zinc-400">
            <p>
              <span className="text-zinc-500">Título no M3U:</span> {item.rawTitle}
            </p>
            <p>
              <span className="text-zinc-500">Categoria / Grupo:</span> {item.group}
            </p>
            <div className="flex items-center gap-2 pt-1">
              <span className="text-zinc-500">Link direto:</span>
              <button
                onClick={handleCopy}
                className="text-zinc-300 hover:text-white inline-flex items-center gap-1 font-mono text-[11px] bg-zinc-800 px-2 py-0.5 rounded cursor-pointer"
              >
                {copied ? <Check className="w-3 h-3 text-[#46d369]" /> : <Copy className="w-3 h-3" />}
                <span>{copied ? 'Link Copiado!' : 'Copiar URL do Stream'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
