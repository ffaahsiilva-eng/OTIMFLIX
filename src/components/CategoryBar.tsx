import React, { useRef, useState } from 'react';
import {
  Film,
  Tv,
  Heart,
  ChevronLeft,
  ChevronRight,
  Layers,
  Sparkles,
  Search,
} from 'lucide-react';

interface CategoryBarProps {
  categories: { name: string; count: number }[];
  activeCategory: string;
  onSelectCategory: (cat: string) => void;
  moviesCount: number;
  seriesCount: number;
  favoritesCount: number;
}

export const CategoryBar: React.FC<CategoryBarProps> = ({
  categories,
  activeCategory,
  onSelectCategory,
  moviesCount,
  seriesCount,
  favoritesCount,
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [showLeftArrow, setShowLeftArrow] = useState(false);
  const [showRightArrow, setShowRightArrow] = useState(true);
  const [categorySearch, setCategorySearch] = useState('');
  const [showAllModal, setShowAllModal] = useState(false);

  const handleScroll = () => {
    if (scrollRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
      setShowLeftArrow(scrollLeft > 20);
      setShowRightArrow(scrollLeft < scrollWidth - clientWidth - 20);
    }
  };

  const scroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const scrollAmount = direction === 'left' ? -350 : 350;
      scrollRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  const filteredCategories = categories.filter((cat) =>
    cat.name.toLowerCase().includes(categorySearch.toLowerCase().trim())
  );

  return (
    <div className="relative z-30 px-4 sm:px-8 md:px-12 py-3 bg-zinc-950/70 backdrop-blur-md border-b border-zinc-800/50">
      <div className="flex items-center justify-between gap-3 max-w-[1700px] mx-auto">
        {/* Left Scroll Button */}
        {showLeftArrow && (
          <button
            onClick={() => scroll('left')}
            className="hidden sm:flex shrink-0 w-8 h-8 rounded-full bg-zinc-800/90 hover:bg-zinc-700 text-white items-center justify-center border border-zinc-700 shadow-md cursor-pointer transition-all"
            aria-label="Rolar categorias para esquerda"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
        )}

        {/* Scrollable Categories List */}
        <div
          ref={scrollRef}
          onScroll={handleScroll}
          className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1 scroll-smooth select-none flex-1"
        >
          {/* Main "Início / Tudo" Pill */}
          <button
            onClick={() => onSelectCategory('all')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all cursor-pointer border ${
              activeCategory === 'all'
                ? 'bg-[#e50914] text-white border-[#e50914] shadow-md shadow-red-900/30 font-bold scale-102'
                : 'bg-zinc-900/80 text-zinc-300 border-zinc-800 hover:bg-zinc-800 hover:text-white'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Início (Tudo)</span>
          </button>

          {/* Filmes Pill */}
          {moviesCount > 0 && (
            <button
              onClick={() => onSelectCategory('__type_movies__')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all cursor-pointer border ${
                activeCategory === '__type_movies__'
                  ? 'bg-[#e50914] text-white border-[#e50914] shadow-md shadow-red-900/30 font-bold scale-102'
                  : 'bg-zinc-900/80 text-zinc-300 border-zinc-800 hover:bg-zinc-800 hover:text-white'
              }`}
            >
              <Film className="w-3.5 h-3.5 text-zinc-400" />
              <span>Filmes</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-black/40 text-zinc-400">
                {moviesCount}
              </span>
            </button>
          )}

          {/* Séries Pill */}
          {seriesCount > 0 && (
            <button
              onClick={() => onSelectCategory('__type_series__')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all cursor-pointer border ${
                activeCategory === '__type_series__'
                  ? 'bg-[#e50914] text-white border-[#e50914] shadow-md shadow-red-900/30 font-bold scale-102'
                  : 'bg-zinc-900/80 text-zinc-300 border-zinc-800 hover:bg-zinc-800 hover:text-white'
              }`}
            >
              <Tv className="w-3.5 h-3.5 text-zinc-400" />
              <span>Séries</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-black/40 text-zinc-400">
                {seriesCount}
              </span>
            </button>
          )}

          {/* Minha Lista Pill */}
          {favoritesCount > 0 && (
            <button
              onClick={() => onSelectCategory('Minha Lista')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all cursor-pointer border ${
                activeCategory === 'Minha Lista'
                  ? 'bg-[#e50914] text-white border-[#e50914] shadow-md shadow-red-900/30 font-bold scale-102'
                  : 'bg-zinc-900/80 text-zinc-300 border-zinc-800 hover:bg-zinc-800 hover:text-white'
              }`}
            >
              <Heart className="w-3.5 h-3.5 text-red-500 fill-red-500" />
              <span>Minha Lista</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-black/40 text-zinc-400">
                {favoritesCount}
              </span>
            </button>
          )}

          {/* Separator */}
          <div className="w-[1px] h-5 bg-zinc-800 mx-1 shrink-0" />

          {/* Dynamic Categories Chips */}
          {categories.slice(0, 15).map((cat) => (
            <button
              key={cat.name}
              onClick={() => onSelectCategory(cat.name)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all cursor-pointer border ${
                activeCategory === cat.name
                  ? 'bg-[#e50914] text-white border-[#e50914] shadow-md shadow-red-900/30 font-bold scale-102'
                  : 'bg-zinc-900/80 text-zinc-300 border-zinc-800 hover:bg-zinc-800 hover:text-white'
              }`}
            >
              <span>{cat.name}</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-black/40 text-zinc-400">
                {cat.count}
              </span>
            </button>
          ))}
        </div>

        {/* Right Scroll Button */}
        {showRightArrow && (
          <button
            onClick={() => scroll('right')}
            className="hidden sm:flex shrink-0 w-8 h-8 rounded-full bg-zinc-800/90 hover:bg-zinc-700 text-white items-center justify-center border border-zinc-700 shadow-md cursor-pointer transition-all"
            aria-label="Rolar categorias para direita"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        )}

        {/* "Ver Todas as Categorias" Button */}
        {categories.length > 5 && (
          <button
            onClick={() => setShowAllModal(true)}
            className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-medium border border-zinc-700 transition-colors cursor-pointer shadow"
            title="Ver todas as categorias organizadas"
          >
            <Layers className="w-3.5 h-3.5 text-zinc-400" />
            <span className="hidden md:inline">Todas as Categorias</span>
            <span className="text-[10px] font-bold text-[#e50914]">({categories.length})</span>
          </button>
        )}
      </div>

      {/* Modal with all categories organized */}
      {showAllModal && (
        <div
          className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in"
          onClick={() => setShowAllModal(false)}
        >
          <div
            className="w-full max-w-3xl bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-2xl max-h-[85vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-4 border-b border-zinc-800">
              <div className="flex items-center gap-2">
                <Layers className="w-5 h-5 text-[#e50914]" />
                <h3 className="text-lg font-bold text-white">Categorias do Catálogo</h3>
                <span className="text-xs text-zinc-400 font-mono">({categories.length} categorias)</span>
              </div>
              <button
                onClick={() => setShowAllModal(false)}
                className="w-8 h-8 rounded-full bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white flex items-center justify-center text-sm font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Filter categories input */}
            <div className="my-4 relative">
              <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Buscar categoria..."
                value={categorySearch}
                onChange={(e) => setCategorySearch(e.target.value)}
                className="w-full bg-zinc-800/80 border border-zinc-700 rounded-xl pl-9 pr-4 py-2.5 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-[#e50914] transition-colors"
                autoFocus
              />
            </div>

            {/* Categories Grid */}
            <div className="flex-1 overflow-y-auto pr-2 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
              {filteredCategories.map((cat) => (
                <button
                  key={cat.name}
                  onClick={() => {
                    onSelectCategory(cat.name);
                    setShowAllModal(false);
                  }}
                  className={`flex items-center justify-between p-3 rounded-xl border text-left transition-all cursor-pointer ${
                    activeCategory === cat.name
                      ? 'bg-[#e50914] border-[#e50914] text-white shadow-lg shadow-red-900/40 font-bold'
                      : 'bg-zinc-800/60 border-zinc-800 hover:bg-zinc-800 hover:border-zinc-700 text-zinc-200'
                  }`}
                >
                  <span className="text-xs truncate pr-2">{cat.name}</span>
                  <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-black/40 text-zinc-400 shrink-0">
                    {cat.count}
                  </span>
                </button>
              ))}
              {filteredCategories.length === 0 && (
                <div className="col-span-full py-8 text-center text-zinc-500 text-xs">
                  Nenhuma categoria encontrada com esse nome.
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
