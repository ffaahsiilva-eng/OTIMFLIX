import { M3UItem } from '../types/m3u';

export interface ParsedEpisodeInfo {
  seriesName: string;
  season: number;
  episode: number;
  episodeTitle?: string;
  formattedTag: string; // e.g. "T4:E1" or "S04E01"
}

// Regex patterns to identify series and episode tags
const PATTERN_S_E = /(.*?)\s*[-_:]?\s*(?:[sStT](\d{1,2}))[\s._-]*(?:[eE](\d{1,3}))(?:\s*[-_:]?\s*(.*))?$/i;
const PATTERN_NUM_X_NUM = /(.*?)\s*[-_:]?\s*(\d{1,2})x(\d{1,3})(?:\s*[-_:]?\s*(.*))?$/i;
const PATTERN_SEASON_EPISODE_WORDS = /(.*?)\s*[-_:]?\s*(?:temporada|season)\s*(\d{1,2})[\s._-]*(?:epis[oó]dio|episode|cap[ií]tulo|ep)\s*(\d{1,3})(?:\s*[-_:]?\s*(.*))?$/i;
const PATTERN_EPISODE_ONLY = /(.*?)\s*[-_:]?\s*(?:epis[oó]dio|episode|cap[ií]tulo|ep\.?)\s*(\d{1,3})(?:\s*[-_:]?\s*(.*))?$/i;

// Clean tags like [1080p], (Dublado), 4K UHD, etc.
const CLEAN_TAGS_REGEX = /[\(\[]?(?:dublado|legendado|dual|nacional|4k|uhd|hdr|1080p?|720p?|480p?|cam|hdtv|webrip|bluray|bdrip|dvdrip|x264|x265|hevc|aac|mp4|mkv|avi|fhd|sd|hd)[\)\]]?/gi;

/**
 * Normalizes series name for comparing across items
 */
export function normalizeSeriesName(name: string): string {
  if (!name) return '';
  return name
    .toLowerCase()
    .replace(CLEAN_TAGS_REGEX, '')
    .replace(/[\[\](){}|._-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Cleans episode title from trailing quality tags
 */
function cleanEpisodeTitle(title?: string): string {
  if (!title) return '';
  return title
    .replace(CLEAN_TAGS_REGEX, '')
    .replace(/[\[\]()]+/g, '')
    .trim();
}

/**
 * Parses episode information (series name, season, episode, episode title)
 * from an M3UItem's rawTitle or title.
 */
export function parseEpisodeInfo(item: M3UItem): ParsedEpisodeInfo | null {
  const titlesToTry = [item.rawTitle, item.title].filter(Boolean);

  for (const text of titlesToTry) {
    // 1. Check "S01E02" or "T01E02"
    const matchSE = text.match(PATTERN_S_E);
    if (matchSE) {
      const seriesRaw = matchSE[1].trim();
      const season = parseInt(matchSE[2], 10);
      const episode = parseInt(matchSE[3], 10);
      const epTitle = cleanEpisodeTitle(matchSE[4]);

      const seriesName = cleanEpisodeTitle(seriesRaw);
      return {
        seriesName: seriesName || item.group || 'Série',
        season,
        episode,
        episodeTitle: epTitle,
        formattedTag: `T${season}:E${episode}`
      };
    }

    // 2. Check "1x02"
    const matchX = text.match(PATTERN_NUM_X_NUM);
    if (matchX) {
      const seriesRaw = matchX[1].trim();
      const season = parseInt(matchX[2], 10);
      const episode = parseInt(matchX[3], 10);
      const epTitle = cleanEpisodeTitle(matchX[4]);

      const seriesName = cleanEpisodeTitle(seriesRaw);
      return {
        seriesName: seriesName || item.group || 'Série',
        season,
        episode,
        episodeTitle: epTitle,
        formattedTag: `T${season}:E${episode}`
      };
    }

    // 3. Check "Temporada 1 Episódio 2"
    const matchWords = text.match(PATTERN_SEASON_EPISODE_WORDS);
    if (matchWords) {
      const seriesRaw = matchWords[1].trim();
      const season = parseInt(matchWords[2], 10);
      const episode = parseInt(matchWords[3], 10);
      const epTitle = cleanEpisodeTitle(matchWords[4]);

      const seriesName = cleanEpisodeTitle(seriesRaw);
      return {
        seriesName: seriesName || item.group || 'Série',
        season,
        episode,
        episodeTitle: epTitle,
        formattedTag: `T${season}:E${episode}`
      };
    }

    // 4. Check "Episódio 05" (assumes Season 1)
    const matchEpOnly = text.match(PATTERN_EPISODE_ONLY);
    if (matchEpOnly) {
      const seriesRaw = matchEpOnly[1].trim();
      const episode = parseInt(matchEpOnly[2], 10);
      const epTitle = cleanEpisodeTitle(matchEpOnly[3]);

      const seriesName = cleanEpisodeTitle(seriesRaw);
      return {
        seriesName: seriesName || item.group || 'Série',
        season: 1,
        episode,
        episodeTitle: epTitle,
        formattedTag: `E${episode}`
      };
    }
  }

  // If item is marked as series but without explicit tags
  if (item.isSeries) {
    return {
      seriesName: item.title,
      season: 1,
      episode: 1,
      formattedTag: 'Série'
    };
  }

  return null;
}

/**
 * Returns all episodes belonging to the same series as `item` from the playlist,
 * sorted chronologically by season and episode.
 */
export function getSeriesEpisodes(item: M3UItem, allItems: M3UItem[]): M3UItem[] {
  const currentInfo = parseEpisodeInfo(item);

  if (currentInfo && currentInfo.seriesName) {
    const targetNorm = normalizeSeriesName(currentInfo.seriesName);

    const related = allItems.filter((other) => {
      const otherInfo = parseEpisodeInfo(other);
      if (otherInfo) {
        const otherNorm = normalizeSeriesName(otherInfo.seriesName);
        return (
          otherNorm === targetNorm ||
          otherNorm.includes(targetNorm) ||
          targetNorm.includes(otherNorm)
        );
      }
      // If not parsed, check title match
      const titleNorm = normalizeSeriesName(other.title);
      return titleNorm.includes(targetNorm) || targetNorm.includes(titleNorm);
    });

    if (related.length > 1) {
      // Sort episodes: Season first, then Episode number
      return related.sort((a, b) => {
        const infoA = parseEpisodeInfo(a);
        const infoB = parseEpisodeInfo(b);
        if (infoA && infoB) {
          if (infoA.season !== infoB.season) {
            return infoA.season - infoB.season;
          }
          return infoA.episode - infoB.episode;
        }
        return a.id - b.id;
      });
    }
  }

  // Fallback: If item is in a series group or is marked as series
  if (item.isSeries && item.group) {
    const groupItems = allItems.filter(
      (other) => other.isSeries && other.group === item.group
    );
    if (groupItems.length > 1) {
      return groupItems;
    }
  }

  return [item];
}

/**
 * Finds the NEXT episode in sequence to binge watch.
 * Returns null if this is the final episode or not part of a series.
 */
export function findNextEpisode(item: M3UItem, allItems: M3UItem[]): M3UItem | null {
  const episodes = getSeriesEpisodes(item, allItems);
  if (!episodes || episodes.length <= 1) {
    return null;
  }

  const currentInfo = parseEpisodeInfo(item);

  // If we have parsed Season & Episode numbers
  if (currentInfo) {
    // 1. Same season, episode + 1
    const nextInSeason = episodes.find((ep) => {
      const epInfo = parseEpisodeInfo(ep);
      return (
        epInfo &&
        epInfo.season === currentInfo.season &&
        epInfo.episode === currentInfo.episode + 1
      );
    });
    if (nextInSeason) return nextInSeason;

    // 2. Next season, episode 1 (or lowest episode in season + 1)
    const nextSeasonEpisodes = episodes.filter((ep) => {
      const epInfo = parseEpisodeInfo(ep);
      return epInfo && epInfo.season === currentInfo.season + 1;
    });
    if (nextSeasonEpisodes.length > 0) {
      nextSeasonEpisodes.sort((a, b) => {
        const infoA = parseEpisodeInfo(a);
        const infoB = parseEpisodeInfo(b);
        return (infoA?.episode || 0) - (infoB?.episode || 0);
      });
      return nextSeasonEpisodes[0];
    }

    // 3. Any next episode strictly with higher episode number in the same season
    const higherEpisodes = episodes.filter((ep) => {
      const epInfo = parseEpisodeInfo(ep);
      return (
        epInfo &&
        epInfo.season === currentInfo.season &&
        epInfo.episode > currentInfo.episode
      );
    });
    if (higherEpisodes.length > 0) {
      higherEpisodes.sort((a, b) => {
        const infoA = parseEpisodeInfo(a);
        const infoB = parseEpisodeInfo(b);
        return (infoA?.episode || 0) - (infoB?.episode || 0);
      });
      return higherEpisodes[0];
    }
  }

  // Sequential fallback in playlist order
  const currentIndex = episodes.findIndex((ep) => ep.id === item.id || ep.url === item.url);
  if (currentIndex !== -1 && currentIndex < episodes.length - 1) {
    return episodes[currentIndex + 1];
  }

  return null;
}

/**
 * Finds the PREVIOUS episode in sequence.
 */
export function findPreviousEpisode(item: M3UItem, allItems: M3UItem[]): M3UItem | null {
  const episodes = getSeriesEpisodes(item, allItems);
  if (!episodes || episodes.length <= 1) {
    return null;
  }

  const currentInfo = parseEpisodeInfo(item);

  if (currentInfo) {
    // 1. Same season, episode - 1
    const prevInSeason = episodes.find((ep) => {
      const epInfo = parseEpisodeInfo(ep);
      return (
        epInfo &&
        epInfo.season === currentInfo.season &&
        epInfo.episode === currentInfo.episode - 1
      );
    });
    if (prevInSeason) return prevInSeason;

    // 2. Previous season, highest episode
    const prevSeasonEpisodes = episodes.filter((ep) => {
      const epInfo = parseEpisodeInfo(ep);
      return epInfo && epInfo.season === currentInfo.season - 1;
    });
    if (prevSeasonEpisodes.length > 0) {
      prevSeasonEpisodes.sort((a, b) => {
        const infoA = parseEpisodeInfo(a);
        const infoB = parseEpisodeInfo(b);
        return (infoB?.episode || 0) - (infoA?.episode || 0);
      });
      return prevSeasonEpisodes[0];
    }
  }

  // Sequential fallback in playlist order
  const currentIndex = episodes.findIndex((ep) => ep.id === item.id || ep.url === item.url);
  if (currentIndex > 0) {
    return episodes[currentIndex - 1];
  }

  return null;
}
