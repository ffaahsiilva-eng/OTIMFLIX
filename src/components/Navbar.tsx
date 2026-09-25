import React from 'react';
import { Search, FolderOpen, Film, Tv, Heart } from 'lucide-react';

interface NavbarProps {
  categories: string[];
  activeCategory: string;
  onSelectCategory: (cat: string) => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onSwitchList: () => void;
  myListCount: number;
  totalMoviesCount?: number;
  totalSeriesCount?: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  categories,
  activeCategory,
  onSelectCategory,
  searchQuery,
  onSearchChange,
  onSwitchList,
  myListCount,
  totalMoviesCount = 0,
  totalSeriesCount = 0,
}) => {
  return (
    <header className="fixed top-0 left-0 right-0 z-40 bg-gradient-to-b from-black/95 via-black/80 to-transparent transition-colors duration-300 border-b border-zinc-800/60 backdrop-blur-md">
      <div className="max-w-[1700px] mx-auto px-4 sm:px-8 h-16 sm:h-20 flex items-center justify-between gap-4">
        {/* Brand & Nav */}
        <div className="flex items-center gap-6 overflow-hidden">
          <button
            onClick={() => onSelectCategory('all')}
            className="text-2xl sm:text-3xl font-black tracking-tighter text-[#e50914] hover:opacity-90 transition-opacity select-none focus:outline-none shrink-0"
          >
            OTIMFLIX
          </button>

          <nav className="hidden md:flex items-center gap-5 text-xs sm:text-sm font-medium text-zinc-300 overflow-x-auto no-scrollbar py-1">
            <button
              onClick={() => onSelectCategory('all')}
              className={`hover:text-white transition-colors whitespace-nowrap pb-0.5 ${
                activeCategory === 'all'
                  ? 'text-white font-bold border-b-2 border-[#e50914]'
                  : 'text-zinc-400'
              }`}
            >
              Início
            </button>

            {/* Quick Filter: Filmes */}
            <button
              onClick={() => onSelectCategory('__type_movies__')}
              className={`hover:text-white transition-colors whitespace-nowrap pb-0.5 flex items-center gap-1.5 ${
                activeCategory === '__type_movies__'
                  ? 'text-white font-bold border-b-2 border-[#e50914]'
                  : 'text-zinc-400'
              }`}
            >
              <Film className="w-3.5 h-3.5" />
              <span>Filmes</span>
              {totalMoviesCount > 0 && (
                <span className="text-[10px] text-zinc-500 font-mono font-normal">
                  ({totalMoviesCount})
                </span>
              )}
            </button>

            {/* Quick Filter: Séries */}
            <button
              onClick={() => onSelectCategory('__type_series__')}
              className={`hover:text-white transition-colors whitespace-nowrap pb-0.5 flex items-center gap-1.5 ${
                activeCategory === '__type_series__'
                  ? 'text-white font-bold border-b-2 border-[#e50914]'
                  : 'text-zinc-400'
              }`}
            >
              <Tv className="w-3.5 h-3.5" />
              <span>Séries</span>
              {totalSeriesCount > 0 && (
                <span className="text-[10px] text-zinc-500 font-mono font-normal">
                  ({totalSeriesCount})
                </span>
              )}
            </button>

            {/* Top Categories */}
            {categories.slice(0, 5).map((cat) => (
              <button
                key={cat}
                onClick={() => onSelectCategory(cat)}
                className={`hover:text-white transition-colors whitespace-nowrap pb-0.5 ${
                  activeCategory === cat
                    ? 'text-white font-bold border-b-2 border-[#e50914]'
                    : 'text-zinc-400'
                }`}
              >
                {cat}
              </button>
            ))}

            <button
              onClick={() => onSelectCategory('Minha Lista')}
              className={`hover:text-white transition-colors whitespace-nowrap pb-0.5 flex items-center gap-1.5 ${
                activeCategory === 'Minha Lista'
                  ? 'text-white font-bold border-b-2 border-[#e50914]'
                  : 'text-zinc-400'
              }`}
            >
              Minha Lista
              {myListCount > 0 && (
                <span className="text-[10px] bg-[#e50914] text-white px-1.5 py-0.2 rounded-full">
                  {myListCount}
                </span>
              )}
            </button>
          </nav>
        </div>

        {/* Right Actions: Search & Switch List */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="flex items-center bg-zinc-900/90 border border-zinc-700/80 rounded-md px-2.5 py-1.5">
            <Search className="w-4 h-4 text-zinc-400 shrink-0" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Buscar filmes, séries..."
              className="bg-transparent border-none text-white text-xs sm:text-sm pl-2 w-28 sm:w-52 focus:outline-none placeholder:text-zinc-500"
            />
          </div>

          <button
            onClick={onSwitchList}
            className="flex items-center gap-1.5 px-3 py-1.5 sm:px-3.5 sm:py-2 bg-[#e50914] hover:bg-[#b20710] text-white font-bold text-xs rounded transition-colors whitespace-nowrap shadow cursor-pointer"
          >
            <FolderOpen className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Trocar Lista</span>
            <span className="sm:hidden">M3U</span>
          </button>
        </div>
      </div>
    </header>
  );
};
