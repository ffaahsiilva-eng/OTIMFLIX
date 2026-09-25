export interface M3UItem {
  id: number;
  rawTitle: string;
  title: string;
  year?: string;
  group: string;
  logo?: string;
  url: string;
  isSeries: boolean;
  // TMDb or inferred data
  poster: string;
  backdrop: string;
  overview: string;
  rating: number; // e.g. 8.4
  ageRating?: string;
  quality?: string;
  genres: string[];
  tmdbId?: number | null;
  mediaType: 'movie' | 'tv';
  director?: string;
  cast?: string[];
  isDemo?: boolean;
}

export interface SavedListEntry {
  id: string;
  name: string;
  count: number;
  date: string;
  content?: string; // cached text content if stored
  url?: string;
}
