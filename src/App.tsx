/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { Navbar } from './components/Navbar';
import { Hero } from './components/Hero';
import { MovieRow } from './components/MovieRow';
import { MovieModal } from './components/MovieModal';
import { VideoPlayer } from './components/VideoPlayer';
import { SearchResults } from './components/SearchResults';
import { WelcomeScreen } from './components/WelcomeScreen';
import { LoadingScreen } from './components/LoadingScreen';
import { Toast } from './components/Toast';
import { parseM3UAsync } from './utils/m3uParser';
import { batchEnrichItems, CURATED_DEMO_M3U } from './utils/tmdbService';
import { fetchRemoteM3U } from './utils/fetchPlaylist';
import { M3UItem, SavedListEntry } from './types/m3u';

export default function App() {
  const [viewState, setViewState] = useState<'welcome' | 'loading' | 'app'>('welcome');
  const [loadingText, setLoadingText] = useState('Analisando lista M3U...');
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [loadingTotal, setLoadingTotal] = useState(0);
  const [loadError, setLoadError] = useState<string | null>(null);

  // M3U Catalog Data
  const [allItems, setAllItems] = useState<M3UItem[]>([]);
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedItem, setSelectedItem] = useState<M3UItem | null>(null);
  const [playingItem, setPlayingItem] = useState<M3UItem | null>(null);

  // TMDb API Key (optional, can be saved to localStorage)
  const [tmdbKey, setTmdbKey] = useState<string>(() => {
    return localStorage.getItem('otimflix_tmdb_key') || '';
  });

  // Saved lists
  const [savedLists, setSavedLists] = useState<SavedListEntry[]>(() => {
    try {
      const saved = localStorage.getItem('otimflix_m3u_saved_lists');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Persistent Favorites & Likes
  const [favorites, setFavorites] = useState<number[]>(() => {
    try {
      const saved = localStorage.getItem('otimflix_favorites');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [likes, setLikes] = useState<number[]>(() => {
    try {
      const saved = localStorage.getItem('otimflix_likes');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [toastMessage, setToastMessage] = useState<{ message: string; type: 'success' | 'info' } | null>(null);

  useEffect(() => {
    try {
      localStorage.setItem('otimflix_favorites', JSON.stringify(favorites));
    } catch (e) {
      console.error(e);
    }
  }, [favorites]);

  useEffect(() => {
    try {
      localStorage.setItem('otimflix_likes', JSON.stringify(likes));
    } catch (e) {
      console.error(e);
    }
  }, [likes]);

  const showToast = (message: string, type: 'success' | 'info' = 'success') => {
    setToastMessage({ message, type });
    setTimeout(() => {
      setToastMessage(null);
    }, 3200);
  };

  const handleSaveTmdbKey = (key: string) => {
    setTmdbKey(key);
    localStorage.setItem('otimflix_tmdb_key', key);
    showToast('Chave TMDb salva!', 'success');
  };

  const saveListToHistory = (name: string, count: number, _content?: string, url?: string) => {
    const newEntry: SavedListEntry = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      name,
      count,
      date: new Date().toLocaleDateString('pt-BR'),
      url
    };

    setSavedLists((prev) => {
      const filtered = prev.filter((item) => item.name !== name);
      const updated = [newEntry, ...filtered].slice(0, 8);
      try {
        localStorage.setItem('otimflix_m3u_saved_lists', JSON.stringify(updated));
      } catch (e) {
        console.error(e);
      }
      return updated;
    });
  };

  const handleRemoveSavedList = (id: string) => {
    setSavedLists((prev) => {
      const updated = prev.filter((item) => item.id !== id);
      try {
        localStorage.setItem('otimflix_m3u_saved_lists', JSON.stringify(updated));
      } catch (e) {
        console.error(e);
      }
      return updated;
    });
    showToast('Lista removida do histórico', 'info');
  };

  // Process text M3U content with smooth asynchronous chunking
  const processM3UText = async (text: string, listName: string, url?: string) => {
    setViewState('loading');
    setLoadingText('Processando e filtrando lista M3U...');
    setLoadingProgress(0);
    setLoadingTotal(0);

    try {
      // Yield to let the loading screen render immediately
      await new Promise((resolve) => setTimeout(resolve, 30));

      const { items, totalParsed, ignoredLiveCount } = await parseM3UAsync(
        text,
        (linesProcessed, itemsFound) => {
          setLoadingText(`Analisando linhas (${linesProcessed.toLocaleString('pt-BR')} linhas lidas)...`);
          setLoadingProgress(itemsFound);
          setLoadingTotal(Math.max(itemsFound, 100));
        }
      );

      if (items.length === 0) {
        setViewState('welcome');
        showToast(
          totalParsed > 0
            ? 'Todos os itens foram identificados como canais de TV ao vivo. Apenas filmes e séries VOD são exibidos.'
            : 'Nenhum canal ou vídeo encontrado no arquivo M3U informado.',
          'info'
        );
        return;
      }

      saveListToHistory(listName, items.length, undefined, url);

      setLoadingText(`Organizando ${items.length.toLocaleString('pt-BR')} títulos...`);
      setLoadingProgress(items.length);
      setLoadingTotal(items.length);

      const enriched = await batchEnrichItems(items, tmdbKey, (current, total) => {
        setLoadingText(`Sincronizando capas (${current}/${total})...`);
        setLoadingProgress(current);
        setLoadingTotal(total);
      });

      setAllItems(enriched);
      setActiveCategory('all');
      setSearchQuery('');
      setViewState('app');

      showToast(
        `${enriched.length.toLocaleString('pt-BR')} filmes e séries carregados! (${ignoredLiveCount.toLocaleString('pt-BR')} canais ao vivo ignorados)`,
        'success'
      );
    } catch (err: any) {
      console.error(err);
      setViewState('welcome');
      showToast(`Erro ao ler lista: ${err?.message || 'Arquivo corrompido'}`, 'info');
    }
  };

  // Load from File or Pasted Text
  const handleLoadFile = (content: string, fileName: string) => {
    setLoadError(null);
    processM3UText(content, fileName);
  };

  // Load from URL with robust fallback and proxy
  const handleLoadUrl = async (url: string) => {
    setLoadError(null);
    setViewState('loading');
    setLoadingText('Conectando ao servidor da lista...');
    setLoadingProgress(0);
    setLoadingTotal(0);

    try {
      const text = await fetchRemoteM3U(url, (status) => setLoadingText(status));
      const listName = url.split('/').pop()?.split('?')[0] || 'Lista Remota';
      await processM3UText(text, listName, url);
    } catch (err: any) {
      setViewState('welcome');
      const msg = err?.message || 'Bloqueio de CORS ou o servidor de IPTV não permite acesso direto.';
      setLoadError(msg);
      showToast(`Falha ao baixar lista remota: ${msg}`, 'info');
    }
  };

  // Load Curated Demo
  const handleLoadDemo = () => {
    setLoadError(null);
    processM3UText(CURATED_DEMO_M3U, 'Catálogo Demo OtimFlix');
  };

  // Group items by category / group-title
  const categoriesMap = useMemo(() => {
    const map: Record<string, M3UItem[]> = {};
    allItems.forEach((item) => {
      const group = item.group || (item.isSeries ? 'Séries' : 'Filmes');
      if (!map[group]) map[group] = [];
      map[group].push(item);
    });
    return map;
  }, [allItems]);

  const categoryNames = useMemo(() => {
    return Object.keys(categoriesMap);
  }, [categoriesMap]);

  // Featured Hero Item (pick one with high resolution image or backdrop)
  const heroItem = useMemo(() => {
    if (!allItems.length) return null;
    const withBackdrop = allItems.filter((i) => i.backdrop || (i.poster && !i.poster.includes('example.com')));
    return withBackdrop.length ? withBackdrop[0] : allItems[0];
  }, [allItems]);

  const moviesCount = useMemo(() => allItems.filter((i) => !i.isSeries).length, [allItems]);
  const seriesCount = useMemo(() => allItems.filter((i) => i.isSeries).length, [allItems]);

  // Filtered Items for Search or Category View
  const filteredItems = useMemo(() => {
    let result = [...allItems];

    if (activeCategory === 'Minha Lista') {
      result = result.filter((item) => favorites.includes(item.id));
    } else if (activeCategory === '__type_movies__') {
      result = result.filter((item) => !item.isSeries);
    } else if (activeCategory === '__type_series__') {
      result = result.filter((item) => item.isSeries);
    } else if (activeCategory !== 'all') {
      result = categoriesMap[activeCategory] || [];
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(
        (item) =>
          item.title.toLowerCase().includes(q) ||
          item.rawTitle.toLowerCase().includes(q) ||
          item.group.toLowerCase().includes(q) ||
          (item.year && item.year.includes(q))
      );
    }

    return result;
  }, [allItems, activeCategory, searchQuery, favorites, categoriesMap]);

  const handleToggleFavorite = (item: M3UItem) => {
    setFavorites((prev) => {
      if (prev.includes(item.id)) {
        showToast(`Removido da Minha Lista`, 'info');
        return prev.filter((id) => id !== item.id);
      } else {
        showToast(`Adicionado à Minha Lista`, 'success');
        return [...prev, item.id];
      }
    });
  };

  const handleToggleLike = (item: M3UItem) => {
    setLikes((prev) => {
      if (prev.includes(item.id)) {
        return prev.filter((id) => id !== item.id);
      } else {
        showToast(`Você curtiu "${item.title}"`, 'success');
        return [...prev, item.id];
      }
    });
  };

  const handlePlayItem = (item: M3UItem) => {
    setSelectedItem(null);
    setPlayingItem(item);
  };

  const isSearchOrCategoryActive = searchQuery.trim() !== '' || (activeCategory !== 'all' && activeCategory !== '');

  return (
    <div className="min-h-screen bg-[#141414] text-white flex flex-col font-['Plus_Jakarta_Sans',sans-serif] selection:bg-[#e50914] selection:text-white">
      {/* 1. Welcome Screen */}
      {viewState === 'welcome' && (
        <WelcomeScreen
          onLoadFile={handleLoadFile}
          onLoadUrl={handleLoadUrl}
          savedLists={savedLists}
          onRemoveSaved={handleRemoveSavedList}
          tmdbApiKey={tmdbKey}
          onSaveTmdbKey={handleSaveTmdbKey}
          onLoadDemo={handleLoadDemo}
          errorMessage={loadError}
          onClearError={() => setLoadError(null)}
        />
      )}

      {/* 2. Loading Screen */}
      {viewState === 'loading' && (
        <LoadingScreen
          text={loadingText}
          progress={loadingProgress}
          total={loadingTotal}
          onCancel={() => setViewState('welcome')}
        />
      )}

      {/* 3. Main Netflix Application */}
      {viewState === 'app' && (
        <>
          <Navbar
            categories={categoryNames}
            activeCategory={activeCategory}
            onSelectCategory={(cat) => {
              setActiveCategory(cat);
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            onSwitchList={() => setViewState('welcome')}
            myListCount={favorites.length}
            totalMoviesCount={moviesCount}
            totalSeriesCount={seriesCount}
          />

          <main className="flex-1 pb-16">
            {isSearchOrCategoryActive ? (
              <SearchResults
                title={
                  searchQuery
                    ? `Resultados para "${searchQuery}"`
                    : activeCategory === 'Minha Lista'
                    ? 'Minha Lista'
                    : activeCategory === '__type_movies__'
                    ? 'Todos os Filmes'
                    : activeCategory === '__type_series__'
                    ? 'Todas as Séries'
                    : `Categoria: ${activeCategory}`
                }
                items={filteredItems}
                searchQuery={searchQuery}
                onPlay={handlePlayItem}
                onOpenModal={setSelectedItem}
                favorites={favorites}
                onToggleFavorite={handleToggleFavorite}
                likes={likes}
                onToggleLike={handleToggleLike}
                onClear={() => {
                  setSearchQuery('');
                  setActiveCategory('all');
                }}
              />
            ) : (
              <>
                {/* Hero Feature */}
                {heroItem && (
                  <Hero
                    item={heroItem}
                    onPlay={handlePlayItem}
                    onOpenModal={setSelectedItem}
                    isFavorite={favorites.includes(heroItem.id)}
                    onToggleFavorite={handleToggleFavorite}
                  />
                )}

                {/* Carousels by M3U Group / Category */}
                <div className="relative z-20 -mt-10 sm:-mt-16 space-y-2">
                  {/* Minha Lista Row */}
                  {favorites.length > 0 && (
                    <MovieRow
                      title="Minha Lista"
                      items={allItems.filter((i) => favorites.includes(i.id))}
                      onPlay={handlePlayItem}
                      onOpenModal={setSelectedItem}
                      favorites={favorites}
                      onToggleFavorite={handleToggleFavorite}
                      likes={likes}
                      onToggleLike={handleToggleLike}
                    />
                  )}

                  {/* Dynamic Category Rows */}
                  {categoryNames.map((catName) => {
                    const catItems = categoriesMap[catName];
                    if (!catItems || catItems.length === 0) return null;
                    return (
                      <MovieRow
                        key={catName}
                        title={catName}
                        items={catItems}
                        onPlay={handlePlayItem}
                        onOpenModal={setSelectedItem}
                        favorites={favorites}
                        onToggleFavorite={handleToggleFavorite}
                        likes={likes}
                        onToggleLike={handleToggleLike}
                      />
                    );
                  })}
                </div>
              </>
            )}
          </main>
        </>
      )}

      {/* Full Details Modal */}
      {selectedItem && (
        <MovieModal
          item={selectedItem}
          onClose={() => setSelectedItem(null)}
          onPlay={handlePlayItem}
          isFavorite={favorites.includes(selectedItem.id)}
          onToggleFavorite={handleToggleFavorite}
          isLiked={likes.includes(selectedItem.id)}
          onToggleLike={handleToggleLike}
        />
      )}

      {/* Video Player */}
      {playingItem && (
        <VideoPlayer
          item={playingItem}
          onClose={() => setPlayingItem(null)}
        />
      )}

      {/* Toast Notification */}
      <Toast
        message={toastMessage?.message || null}
        type={toastMessage?.type || 'success'}
      />
    </div>
  );
}
