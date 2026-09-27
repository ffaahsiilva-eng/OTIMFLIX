import React, { useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, ArrowRight } from 'lucide-react';
import { M3UItem } from '../types/m3u';
import { MovieCard } from './MovieCard';

interface MovieRowProps {
  title: string;
  items: M3UItem[];
  onPlay: (item: M3UItem) => void;
  onOpenModal: (item: M3UItem) => void;
  favorites: number[];
  onToggleFavorite: (item: M3UItem) => void;
  likes: number[];
  onToggleLike: (item: M3UItem) => void;
  onSelectCategory?: (category: string) => void;
}

export const MovieRow: React.FC<MovieRowProps> = ({
  title,
  items,
  onPlay,
  onOpenModal,
  favorites,
  onToggleFavorite,
  likes,
  onToggleLike,
  onSelectCategory,
}) => {
  const rowRef = useRef<HTMLDivElement>(null);
  const [showLeftArrow, setShowLeftArrow] = useState(false);
  const [showRightArrow, setShowRightArrow] = useState(true);

  const handleScroll = () => {
    if (rowRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = rowRef.current;
      setShowLeftArrow(scrollLeft > 20);
      setShowRightArrow(scrollLeft < scrollWidth - clientWidth - 20);
    }
  };

  const scroll = (direction: 'left' | 'right') => {
    if (rowRef.current) {
      const { clientWidth } = rowRef.current;
      const scrollAmount = direction === 'left' ? -clientWidth * 0.75 : clientWidth * 0.75;
      rowRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  if (!items.length) return null;

  return (
    <div className="relative py-3 sm:py-5 px-4 sm:px-8 md:px-12 group/row">
      <div className="flex items-baseline justify-between mb-2 sm:mb-3">
        <h2
          onClick={() => onSelectCategory && onSelectCategory(title)}
          className="text-lg sm:text-xl font-bold tracking-tight text-zinc-100 hover:text-white transition-colors cursor-pointer inline-flex items-center gap-2"
          title="Ver todos os filmes desta categoria"
        >
          <span>{title}</span>
          <span className="text-xs text-zinc-500 font-mono font-normal">
            ({items.length})
          </span>
          {onSelectCategory && (
            <span className="text-xs text-[#e50914] font-medium opacity-0 group-hover/row:opacity-100 transition-opacity ml-2 hidden sm:inline-flex items-center gap-1">
              Ver todos <ArrowRight className="w-3.5 h-3.5" />
            </span>
          )}
        </h2>
      </div>

      <div className="relative">
        {showLeftArrow && (
          <button
            onClick={() => scroll('left')}
            className="absolute left-0 top-0 bottom-0 z-40 w-10 bg-black/70 hover:bg-black/90 text-white flex items-center justify-center transition-all opacity-0 group-hover/row:opacity-100 rounded-r cursor-pointer"
            aria-label="Rolar para esquerda"
          >
            <ChevronLeft className="w-8 h-8" />
          </button>
        )}

        <div
          ref={rowRef}
          onScroll={handleScroll}
          className="flex items-center gap-2.5 sm:gap-3 overflow-x-auto no-scrollbar py-2 scroll-smooth select-none"
        >
          {items.slice(0, 30).map((item) => (
            <MovieCard
              key={item.id}
              item={item}
              onPlay={onPlay}
              onOpenModal={onOpenModal}
              isFavorite={favorites.includes(item.id)}
              onToggleFavorite={onToggleFavorite}
              isLiked={likes.includes(item.id)}
              onToggleLike={onToggleLike}
            />
          ))}

          {/* "Ver mais" Card at the end of the row */}
          {items.length > 30 && onSelectCategory && (
            <button
              onClick={() => onSelectCategory(title)}
              className="shrink-0 w-36 sm:w-44 h-[216px] sm:h-[264px] rounded-md bg-zinc-900/90 border border-zinc-800 hover:border-[#e50914] text-zinc-300 hover:text-white flex flex-col items-center justify-center gap-3 p-4 text-center cursor-pointer transition-all hover:scale-102 shadow-lg"
            >
              <div className="w-10 h-10 rounded-full bg-[#e50914]/20 border border-[#e50914]/40 flex items-center justify-center text-[#e50914]">
                <ArrowRight className="w-5 h-5" />
              </div>
              <span className="text-xs font-bold leading-tight">
                Ver todos os {items.length} títulos de {title}
              </span>
            </button>
          )}
        </div>

        {showRightArrow && (
          <button
            onClick={() => scroll('right')}
            className="absolute right-0 top-0 bottom-0 z-40 w-10 bg-black/70 hover:bg-black/90 text-white flex items-center justify-center transition-all opacity-0 group-hover/row:opacity-100 rounded-l cursor-pointer"
            aria-label="Rolar para direita"
          >
            <ChevronRight className="w-8 h-8" />
          </button>
        )}
      </div>
    </div>
  );
};
