import React, { useRef, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
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
        <h2 className="text-lg sm:text-xl font-bold tracking-tight text-zinc-100 hover:text-white transition-colors cursor-pointer inline-flex items-center gap-2">
          <span>{title}</span>
          <span className="text-xs text-zinc-500 font-mono font-normal">
            ({items.length})
          </span>
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
          {items.slice(0, 50).map((item) => (
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
