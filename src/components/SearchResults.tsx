import React from 'react';
import { Search } from 'lucide-react';
import { M3UItem } from '../types/m3u';
import { MovieCard } from './MovieCard';

interface SearchResultsProps {
  title: string;
  items: M3UItem[];
  searchQuery: string;
  onPlay: (item: M3UItem) => void;
  onOpenModal: (item: M3UItem) => void;
  favorites: number[];
  onToggleFavorite: (item: M3UItem) => void;
  likes: number[];
  onToggleLike: (item: M3UItem) => void;
  onClear: () => void;
}

export const SearchResults: React.FC<SearchResultsProps> = ({
  title,
  items,
  searchQuery,
  onPlay,
  onOpenModal,
  favorites,
  onToggleFavorite,
  likes,
  onToggleLike,
  onClear,
}) => {
  return (
    <div className="pt-24 sm:pt-28 pb-16 px-4 sm:px-8 md:px-12 max-w-[1700px] mx-auto min-h-[75vh]">
      <div className="flex items-center justify-between mb-6 pb-3 border-b border-zinc-800">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
            {title}
          </h1>
          <p className="text-xs text-zinc-400 mt-0.5">
            {items.length} {items.length === 1 ? 'título' : 'títulos encontrados'}
          </p>
        </div>

        {(searchQuery || title !== 'Resultados') && (
          <button
            onClick={onClear}
            className="text-xs text-[#e50914] hover:underline"
          >
            Limpar filtros
          </button>
        )}
      </div>

      {items.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4">
          {items.map((item) => (
            <div key={item.id} className="w-full">
              <MovieCard
                item={item}
                onPlay={onPlay}
                onOpenModal={onOpenModal}
                isFavorite={favorites.includes(item.id)}
                onToggleFavorite={onToggleFavorite}
                isLiked={likes.includes(item.id)}
                onToggleLike={onToggleLike}
              />
            </div>
          ))}
        </div>
      ) : (
        <div className="py-20 text-center max-w-sm mx-auto">
          <div className="w-14 h-14 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center mx-auto mb-3 text-zinc-500">
            <Search className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-white mb-1">Nenhum título encontrado</h3>
          <p className="text-xs text-zinc-400 mb-4">
            Tente pesquisar por outros termos ou verifique a categoria selecionada.
          </p>
          <button
            onClick={onClear}
            className="px-5 py-2 bg-zinc-800 hover:bg-zinc-700 text-white font-bold text-xs rounded"
          >
            Ver Todo o Catálogo
          </button>
        </div>
      )}
    </div>
  );
};
