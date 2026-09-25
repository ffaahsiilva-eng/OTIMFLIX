import { M3UItem } from '../types/m3u';

// Pre-compiled regexes
const REGEX_YEAR = /(?:19|20)\d{2}/;
const REGEX_SERIES_TAG = /\b(?:s\d{1,2}[\s.]?e\d{1,2}|t\d{1,2}[\s.]?e\d{1,2}|temporada[\s.]?\d+|season[\s.]?\d+|epis[oó]dio[\s.]?\d+|ep\.?[\s.]?\d+|cap[ií]tulo[\s.]?\d+)\b/i;
const REGEX_TITLE_EXTINF = /,(.+)$/;
const REGEX_GROUP = /group-title="([^"]*)"/i;
const REGEX_LOGO = /tvg-logo="([^"]*)"/i;
const REGEX_CLEAN_TAGS = /\b(?:dublado|legendado|dual|nacional|4k|uhd|hdr|1080p?|720p?|480p?|cam|hdtv|webrip|bluray|bdrip|dvdrip|x264|x265|hevc|aac|mp4|mkv|avi|fhd|sd|hd)\b/gi;
const REGEX_BRACKETS = /[\[\](){}|._-]+/g;

// Linear TV Channels that should ALWAYS be treated as live TV channels (never movies/series)
const LINEAR_CHANNELS = [
  'tnt series', 'tnt novelas', 'tnt hd', 'tnt sd', 'tnt 2', 'tnt',
  'warner channel', 'warner tv', 'warner hd', 'warner sd', 'warner',
  'telecine premium', 'telecine action', 'telecine touch', 'telecine fun', 'telecine pipoca', 'telecine cult', 'telecine',
  'megapix', 'cinemax', 'paramount network', 'paramount channel',
  'sony channel', 'sony movies', 'universal tv', 'studio universal', 'syfy',
  'axn', 'a&e', 'lifetime', 'canal brasil', 'e! entertainment',
  'hbo 2', 'hbo plus', 'hbo family', 'hbo signature', 'hbo mundi', 'hbo pop', 'hbo xtreme', 'hbo hd', 'hbo',
  'globo', 'sbt', 'record', 'band', 'rede tv', 'cultura', 'tv brasil',
  'sportv 2', 'sportv 3', 'sportv', 'espn 2', 'espn 3', 'espn 4', 'espn',
  'fox sports', 'premiere', 'combate', 'bandsports', 'woohoo',
  'discovery channel', 'discovery kids', 'discovery home & health', 'discovery turbo', 'discovery science', 'discovery world', 'discovery theater', 'discovery id', 'discovery',
  'history channel', 'history 2', 'history', 'nat geo', 'natgeo', 'national geographic',
  'cartoon network', 'cartoonito', 'nickelodeon', 'nick jr', 'disney channel', 'disney jr', 'gloob', 'gloobinho', 'tooncast', 'boomerang',
  'cnn brasil', 'cnn', 'bbc', 'globonews', 'bandnews', 'record news', 'jovem pan news',
  'mtv', 'multishow', 'gnt', 'viva', 'bis', 'modo viagem', 'off', 'curta!', 'arte 1',
  'animal planet', 'tlc', 'food network', 'hgtv', 'investigação discovery'
];

// Groups strictly associated with Live TV Channels
const LIVE_GROUP_TERMS = [
  'canal', 'canais', 'channel', 'channels', 'aberto', 'abertos', 'ao vivo', 'live',
  'esporte', 'esportes', 'sports', 'noticia', 'noticias', 'notícia', 'notícias',
  'variedade', 'variedades', '24h', '24 h', '24hrs', '24 horas', 'radios', 'rádios',
  'religioso', 'religiosos', 'futebol', 'premiere', 'combate', 'telecine canais',
  'hbo canais', 'pay per view', 'ppv', 'tv aberta', 'tv por assinatura', 'abertas',
  'estados', 'regional', 'locais', 'legendados canais', 'dublados canais', 'pluto tv'
];

// Groups strictly associated with VOD Movies
const MOVIE_GROUP_TERMS = [
  'filme', 'filmes', 'movie', 'movies', 'vod', 'cinema', 'cinemas',
  'lançamento', 'lancamento', 'lançamentos', 'lancamentos',
  'ação', 'acao', 'comédia', 'comedia', 'drama', 'dramas',
  'terror', 'suspense', 'ficção', 'ficcao', 'romance', 'aventura',
  'animação', 'animacao', 'infantil vod', 'documentário', 'documentario',
  'netflix filmes', 'prime video filmes', 'disney+ filmes', 'hbo max filmes',
  '4k filmes', 'filmes 4k', 'filmes fhd', 'filmes hd'
];

// Groups strictly associated with TV Series VOD
const SERIES_GROUP_TERMS = [
  'serie', 'series', 'série', 'séries', 'seriado', 'seriados',
  'novela', 'novelas', 'anime', 'animes', 'dorama', 'doramas',
  'desenhos vod', 'desenho vod', 'netflix series', 'prime series',
  'hbo series', 'disney+ series', 'apple tv+'
];

export function cleanName(title: string): string {
  if (!title) return '';
  return title
    .replace(/\(?\d{4}\)?/g, '')
    .replace(REGEX_SERIES_TAG, '')
    .replace(REGEX_CLEAN_TAGS, '')
    .replace(REGEX_BRACKETS, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

/**
 * Classifies an M3U entry into 'movie', 'series', or 'live'.
 */
export function classifyEntry(
  rawTitle: string,
  group: string,
  url: string
): 'movie' | 'series' | 'live' {
  const lowerUrl = url.toLowerCase();
  const lowerGroup = group.toLowerCase().trim();
  const lowerTitle = rawTitle.toLowerCase().trim();

  // 1. URL pattern check (Xtream Codes / standard IPTV architecture)
  if (lowerUrl.includes('/movie/')) {
    return 'movie';
  }
  if (lowerUrl.includes('/series/')) {
    return 'series';
  }
  if (lowerUrl.includes('/live/')) {
    return 'live';
  }

  // 2. Strict Linear TV Channel detection by name
  for (let i = 0; i < LINEAR_CHANNELS.length; i++) {
    const ch = LINEAR_CHANNELS[i];
    // Exact match or channel suffix match (e.g. "TNT Series FHD", "Warner Channel SD", "Globo SP HD")
    if (
      lowerTitle === ch ||
      lowerTitle.startsWith(`${ch} `) ||
      lowerTitle.startsWith(`[${ch}]`) ||
      lowerTitle.startsWith(`(${ch})`) ||
      lowerTitle.includes(` ${ch} `) ||
      lowerTitle.endsWith(` ${ch}`)
    ) {
      return 'live';
    }
  }

  // 3. Series episode / season tag detection
  if (REGEX_SERIES_TAG.test(lowerTitle) || REGEX_SERIES_TAG.test(lowerGroup)) {
    return 'series';
  }

  // 4. Group terms check
  const isSeriesGroup = SERIES_GROUP_TERMS.some((t) => lowerGroup.includes(t));
  if (isSeriesGroup) {
    return 'series';
  }

  const isLiveGroup = LIVE_GROUP_TERMS.some((t) => lowerGroup.includes(t));
  if (isLiveGroup) {
    return 'live';
  }

  const isMovieGroup = MOVIE_GROUP_TERMS.some((t) => lowerGroup.includes(t));
  if (isMovieGroup) {
    return 'movie';
  }

  // 5. Video file extensions typical of VOD
  if (
    lowerUrl.endsWith('.mp4') ||
    lowerUrl.endsWith('.mkv') ||
    lowerUrl.endsWith('.avi') ||
    lowerUrl.includes('.mp4?') ||
    lowerUrl.includes('.mkv?')
  ) {
    return 'movie';
  }

  // 6. Year in title check (e.g. "Matrix (1999)", "Duna 2024")
  if (REGEX_YEAR.test(lowerTitle) && !lowerTitle.includes('24h') && !lowerTitle.includes('24 horas')) {
    return 'movie';
  }

  // 7. Live TV stream extensions
  if (lowerUrl.endsWith('.m3u8') || lowerUrl.endsWith('.ts')) {
    // If it ends with .m3u8 or .ts and has no movie/series indication, it is almost certainly a live channel
    return 'live';
  }

  // Default fallback
  return 'live';
}

/**
 * Fast chunked parser that scans the playlist, filters out live TV channels,
 * and extracts only actual Movies and Series VOD.
 */
export async function parseM3UAsync(
  text: string,
  onProgress?: (linesProcessed: number, itemsFound: number) => void
): Promise<{ items: M3UItem[]; totalParsed: number; ignoredLiveCount: number }> {
  const movieAndSeriesItems: M3UItem[] = [];
  const allParsedRawItems: M3UItem[] = [];
  let ignoredLiveCount = 0;
  let totalParsed = 0;

  const lines = text.split(/\r?\n/);
  const totalLines = lines.length;

  let currentTitle = '';
  let currentGroup = '';
  let currentLogo = '';

  const CHUNK_SIZE = 2500;

  for (let i = 0; i < totalLines; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    if (line.startsWith('#EXTINF')) {
      const titleMatch = line.match(REGEX_TITLE_EXTINF);
      currentTitle = titleMatch ? titleMatch[1].trim() : '';

      const groupMatch = line.match(REGEX_GROUP);
      currentGroup = groupMatch ? groupMatch[1].trim() : '';

      const logoMatch = line.match(REGEX_LOGO);
      currentLogo = logoMatch ? logoMatch[1].trim() : '';
    } else if (!line.startsWith('#') && currentTitle) {
      totalParsed++;
      const url = line;

      // Classify whether this item is a movie, a series, or live TV
      const classification = classifyEntry(currentTitle, currentGroup, url);

      const isSeries = classification === 'series';
      const isMovie = classification === 'movie';
      const isLive = classification === 'live';

      const yearMatch = currentTitle.match(REGEX_YEAR);
      const year = yearMatch ? yearMatch[0] : undefined;
      const cleaned = cleanName(currentTitle);

      let groupName = currentGroup;
      if (!groupName) {
        groupName = isSeries ? 'Séries' : isMovie ? 'Filmes' : 'Canais';
      }

      const item: M3UItem = {
        id: totalParsed,
        rawTitle: currentTitle,
        title: cleaned || currentTitle,
        year,
        group: groupName,
        logo: currentLogo,
        url,
        isSeries,
        poster: currentLogo || '',
        backdrop: '',
        overview: '',
        rating: 0,
        quality: currentTitle.includes('4K') || currentTitle.includes('UHD') ? '4K Ultra HD' : 'HD',
        ageRating: isSeries ? '16' : '14',
        genres: [groupName],
        tmdbId: null,
        mediaType: isSeries ? 'tv' : 'movie'
      };

      allParsedRawItems.push(item);

      if (isLive) {
        ignoredLiveCount++;
      } else {
        movieAndSeriesItems.push(item);
      }

      currentTitle = '';
    }

    if (i % CHUNK_SIZE === 0 && i > 0) {
      if (onProgress) {
        onProgress(i, movieAndSeriesItems.length);
      }
      await new Promise((resolve) => setTimeout(resolve, 0));
    }
  }

  // If the playlist has movies/series, return ONLY movies and series!
  // If (and only if) the playlist contained strictly 0 VOD items, fallback to all items with a clear note.
  const finalItems = movieAndSeriesItems.length > 0 ? movieAndSeriesItems : allParsedRawItems;

  return {
    items: finalItems,
    totalParsed,
    ignoredLiveCount
  };
}
