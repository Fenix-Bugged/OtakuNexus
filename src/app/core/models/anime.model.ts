export interface ImageUrls {
  image_url: string;
  small_image_url?: string;
  large_image_url?: string;
}

export interface Images {
  jpg: ImageUrls;
  webp?: ImageUrls;
}

export interface Genre {
  mal_id: number;
  name: string;
  type?: string;
  url?: string;
}

export interface Anime {
  mal_id: number;
  title: string;
  synopsis: string;
  images: Images;
  score: number | null;
  episodes: number | null;
  type: string;
  status: string;
  genres: Genre[];
  year: number | null;
}

export interface AnimeResponse {
  data: Anime[];
  pagination?: {
    last_visible_page: number;
    has_next_page: boolean;
    current_page: number;
    items: {
      count: number;
      total: number;
      per_page: number;
    };
  };
}

export interface AnimeDetailResponse {
  data: Anime;
}

export interface CharacterInfo {
  mal_id: number;
  url?: string;
  images: Images;
  name: string;
}

export interface Character {
  character: CharacterInfo;
  role: string;
  favorites?: number;
}

export interface CharacterResponse {
  data: Character[];
}
