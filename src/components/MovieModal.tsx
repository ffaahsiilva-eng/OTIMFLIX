import React, { useEffect, useState } from 'react';
import { X, Play, Plus, Check, ThumbsUp, Film, ExternalLink, Copy } from 'lucide-react';
import { M3UItem } from '../types/m3u';
import { openInVlc } from '../utils/playerUtils';

interface MovieModalProps {
  item: M3UItem | null;
  onClose: () => void;
  onPlay: (item: M3UItem) => void;
  isFavorite: boolean;
  onToggleFavorite: (item: M3UItem) => void;
  isLiked: boolean;
  onToggleLike: (item: M3UItem) => void;
}

export const MovieModal: React.FC<MovieModalProps> = ({
  item,
  onClose,
  onPlay,
  isFavorite,
  onToggleFavorite,
  isLiked,
  onToggleLike,
}) => {
  const [copied, setCopied] = useState(false);

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
            <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-white mb-4 drop-shadow-lg">
              {item.title}
            </h2>

            <div className="flex items-center gap-2.5 flex-wrap">
              <button
                onClick={() => onPlay(item)}
                className="px-5 py-2.5 rounded bg-white text-black font-bold flex items-center gap-2 hover:bg-white/80 active:scale-95 transition-all shadow-lg cursor-pointer text-sm"
              >
                <Play className="w-4 h-4 fill-current" />
                <span>Assistir no Navegador</span>
              </button>

              <button
                onClick={() => openInVlc(item.url, item.title)}
                className="px-4 py-2.5 rounded bg-zinc-800/90 hover:bg-zinc-700 text-white font-semibold flex items-center gap-2 border border-zinc-700 text-xs sm:text-sm cursor-pointer transition-colors shadow"
                title="Abre o filme diretamente no aplicativo VLC ou reprodutor do sistema (suporte total a áudio Dolby e MKV)"
              >
                <ExternalLink className="w-4 h-4 text-amber-400" />
                <span>Abrir no VLC / Player</span>
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
          </div>

          <p className="text-sm sm:text-base text-zinc-200 leading-relaxed">
            {item.overview || 'Informações e metadados detalhados do item importado. A reprodução é transmitida diretamente através do link da lista M3U.'}
          </p>

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
