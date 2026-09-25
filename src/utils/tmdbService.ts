import { M3UItem } from '../types/m3u';

const TMDB_IMG = 'https://image.tmdb.org/t/p/';
const TMDB_SEARCH = 'https://api.themoviedb.org/3/search/multi';

// Simple in-memory cache to avoid repeated requests during session
const tmdbCache: Record<string, any> = {};

// Fallback high quality poster gradients and placeholders when no API key or image missing
export const CURATED_DEMO_M3U = `#EXTM3U
#EXTINF:-1 tvg-logo="https://image.tmdb.org/t/p/w500/gEU2QniE6E77NI6lCU6MxlNBvIx.jpg" group-title="Ficção Científica",Interestelar (2014) [1080p Dublado]
https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4
#EXTINF:-1 tvg-logo="https://image.tmdb.org/t/p/w500/3bhkrj58Vtu7enYsRolD1fZdja1.jpg" group-title="Drama / Crime",O Poderoso Chefão (1972) [4K UHD]
https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4
#EXTINF:-1 tvg-logo="https://image.tmdb.org/t/p/w500/f89U3ADr1oiB1s9GkdPOEpXUk5H.jpg" group-title="Ficção Científica",Matrix (1999) [1080p Dual]
https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4
#EXTINF:-1 tvg-logo="https://image.tmdb.org/t/p/w500/or06FN3Dka5tukK1e9sl16pB3iy.jpg" group-title="Ação & Aventura",Vingadores: Ultimato (2019) [4K HDR]
https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4
#EXTINF:-1 tvg-logo="https://image.tmdb.org/t/p/w500/udDclJoHjfjb8Ekgsd4FDteOkCU.jpg" group-title="Drama / Crime",Coringa (2019) [1080p Dublado]
https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4
#EXTINF:-1 tvg-logo="https://image.tmdb.org/t/p/w500/7IiTTgloJzvGI1TAYymCfbfl3vT.jpg" group-title="Drama / Suspense",Parasita (2019) [1080p Legendado]
https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4
#EXTINF:-1 tvg-logo="https://image.tmdb.org/t/p/w500/8b8R8l88Qje9dn9OE8PY05Nez7S.jpg" group-title="Ficção Científica",Duna: Parte 2 (2024) [4K UHD IMAX]
https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4
#EXTINF:-1 tvg-logo="https://image.tmdb.org/t/p/w500/49WJfeN0moxb9IPfGn8AIqMGskD.jpg" group-title="Séries",Stranger Things S04E01 - O Clube Hellfire [1080p]
https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/WeAreGoingOnBullrun.mp4
#EXTINF:-1 tvg-logo="https://image.tmdb.org/t/p/w500/qJ2tW6WMUDux911BTUgMe1I0eit.jpg" group-title="Ação & Aventura",Batman: O Cavaleiro das Trevas (2008) [4K UHD]
https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4
#EXTINF:-1 tvg-logo="https://image.tmdb.org/t/p/w500/w9kR8qbmQ01HwnvK4alvnQ2ca0L.jpg" group-title="Animação",Toy Story 4 (2019) [1080p Dublado]
https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4
#EXTINF:-1 tvg-logo="https://image.tmdb.org/t/p/w500/nRj5511mZdTl4saWEPoj9QroTIu.jpg" group-title="Terror",O Iluminado (1980) [1080p]
https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4
#EXTINF:-1 tvg-logo="https://image.tmdb.org/t/p/w500/8Gxv8gSFCU0XGDykEGv7zR1n2ua.jpg" group-title="Drama / História",Oppenheimer (2023) [4K UHD]
https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4
#EXTINF:-1 tvg-logo="https://image.tmdb.org/t/p/w500/p9fmuz2Oj3HtEJCnMFRLdspp0kq.jpg" group-title="Terror",Hereditário (2018) [1080p Dublado]
https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4
#EXTINF:-1 tvg-logo="https://image.tmdb.org/t/p/w500/oGythE98MYleE6mZlGs5oBGkux1.jpg" group-title="Animação",Divertida Mente 2 (2024) [1080p Dublado]
https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4
#EXTINF:-1 group-title="CANAIS ABERTO AO VIVO",Globo SP Ao Vivo HD 24h
https://example.com/live/globo.m3u8
#EXTINF:-1 group-title="ESPORTES AO VIVO",Sportv 1 Ao Vivo Futebol
https://example.com/live/sportv.m3u8
`;

export async function enrichItemWithTMDb(
  item: M3UItem,
  apiKey: string
): Promise<M3UItem> {
  if (!apiKey || apiKey.trim() === 'SUA_CHAVE_TMDB_AQUI') {
    // If no custom key, fallback to pre-set backdrop or poster if available
    return item;
  }

  const cleanKey = item.title.toLowerCase().trim();
  if (tmdbCache[cleanKey]) {
    return applyTMDbResult(item, tmdbCache[cleanKey]);
  }

  try {
    const params = new URLSearchParams({
      api_key: apiKey.trim(),
      query: item.title,
      language: 'pt-BR',
      include_adult: 'false'
    });
    if (item.year) params.set('year', item.year);

    const res = await fetch(`${TMDB_SEARCH}?${params}`);
    if (!res.ok) return item;
    const data = await res.json();

    if (data.results && data.results.length > 0) {
      const match = data.results[0];
      tmdbCache[cleanKey] = match;
      return applyTMDbResult(item, match);
    }
  } catch (err) {
    // Silently continue with original M3U data
  }

  return item;
}

function applyTMDbResult(item: M3UItem, r: any): M3UItem {
  return {
    ...item,
    tmdbId: r.id,
    mediaType: r.media_type === 'tv' ? 'tv' : 'movie',
    poster: r.poster_path ? `${TMDB_IMG}w500${r.poster_path}` : (item.poster || item.logo || ''),
    backdrop: r.backdrop_path ? `${TMDB_IMG}original${r.backdrop_path}` : item.backdrop,
    overview: r.overview || item.overview,
    rating: r.vote_average ? Number(r.vote_average.toFixed(1)) : item.rating,
    title: r.title || r.name || item.title,
    year: r.release_date
      ? r.release_date.substring(0, 4)
      : r.first_air_date
      ? r.first_air_date.substring(0, 4)
      : item.year
  };
}

export async function batchEnrichItems(
  items: M3UItem[],
  apiKey: string,
  onProgress: (current: number, total: number) => void
): Promise<M3UItem[]> {
  const total = items.length;
  if (!apiKey || apiKey.trim() === '' || apiKey === 'SUA_CHAVE_TMDB_AQUI') {
    onProgress(total, total);
    return items;
  }

  // To ensure lightning-fast UI loading, enrich the top 36 spotlight items first
  const limitToEnrich = Math.min(total, 36);
  const enriched: M3UItem[] = [];
  const BATCH_SIZE = 6;

  for (let i = 0; i < limitToEnrich; i += BATCH_SIZE) {
    const slice = items.slice(i, i + BATCH_SIZE);
    const results = await Promise.all(slice.map(item => enrichItemWithTMDb(item, apiKey)));
    enriched.push(...results);
    onProgress(enriched.length, limitToEnrich);
  }

  // Append remaining items without blocking
  return [...enriched, ...items.slice(limitToEnrich)];
}
