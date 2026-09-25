export interface Movie {
  id: number;
  title: string;
  originalTitle?: string;
  year: number;
  rating: string; // e.g. "97%"
  ageRating: string; // e.g. "12", "14", "16", "18", "L"
  duration: string;
  quality: 'HD' | '4K Ultra HD';
  genre: string[];
  poster: string;
  backdrop: string;
  desc: string;
  director?: string;
  cast?: string[];
  videoUrl: string;
  featured?: boolean;
  top10?: number;
  tags?: string[];
  type?: 'movie' | 'series';
  seasons?: number;
}

export type CategoryFilter = 'all' | 'Ação' | 'Drama' | 'Comédia' | 'Ficção Científica' | 'Terror' | 'Animação' | 'Minha Lista';
