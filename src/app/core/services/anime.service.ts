import { Injectable, inject, signal, PLATFORM_ID } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, of, throwError, timer } from 'rxjs';
import { map, tap, retry, timeout, catchError } from 'rxjs/operators';
import { isPlatformBrowser } from '@angular/common';
import { environment } from '../../../environments/environment';
import { Anime, AnimeResponse, AnimeDetailResponse, Character, CharacterResponse } from '../models/anime.model';

const CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes
const HTTP_TIMEOUT_MS = 10_000;       // 10 seconds max per request

@Injectable({
  providedIn: 'root'
})
export class AnimeService {
  private http = inject(HttpClient);
  private platformId = inject(PLATFORM_ID);
  private baseUrl = environment.baseUrl;

  // In-memory Signal cache (survives component destroy within same session)
  private topAnimeCache    = signal<Anime[] | null>(null);
  private seasonalAnimeCache = signal<Anime[] | null>(null);

  // In-memory details cache to prevent hitting Jikan API on detail page navigation
  private animeDetailsCache = new Map<number, Anime>();

  // ─── LocalStorage helpers ─────────────────────────────────────────────────

  private lsGet<T>(key: string): T | null {
    if (!isPlatformBrowser(this.platformId)) return null;
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return null;
      const { data, ts } = JSON.parse(raw);
      if (Date.now() - ts < CACHE_TTL_MS) return data as T;
    } catch {}
    return null;
  }

  private lsSet<T>(key: string, data: T): void {
    if (!isPlatformBrowser(this.platformId)) return;
    try {
      localStorage.setItem(key, JSON.stringify({ data, ts: Date.now() }));
    } catch {}
  }

  private cacheAnimeList(list: Anime[]): void {
    if (!list) return;
    list.forEach(anime => {
      if (anime && anime.mal_id) {
        this.animeDetailsCache.set(anime.mal_id, anime);
      }
    });
  }

  // ─── Retry operator ──────────────────────────────────────────────────────
  // Retries up to 2 times on:
  //   - 429 (rate limit)  → wait 1.5s, then 3s
  //   - 504 / 503 (gateway/server errors) → wait 2s, then 4s
  //   - status 0 (network offline / CORS timeout) → wait 2s
  // All other errors pass through immediately.

  private retryOnTransient<T>() {
    return retry<T>({
      count: 2,
      delay: (err, attempt) => {
        const retryable = [0, 429, 503, 504];
        if (retryable.includes(err?.status)) {
          const wait = err?.status === 429
            ? attempt === 1 ? 1500 : 3000   // 429: 1.5s → 3s
            : attempt === 1 ? 2000 : 4000;  // 504/503/0: 2s → 4s
          console.warn(`⚠️ Jikan ${err?.status ?? 'network'} — retry ${attempt} in ${wait}ms`);
          return timer(wait);
        }
        return throwError(() => err); // don't retry 400, 404, 500, etc.
      }
    });
  }

  // ─── API Methods ──────────────────────────────────────────────────────────

  /**
   * Top anime — memory cache → localStorage cache → HTTP
   */
  getTopAnime(): Observable<Anime[]> {
    const mem = this.topAnimeCache();
    if (mem) return of(mem);

    const ls = this.lsGet<Anime[]>('otaku_top_anime');
    if (ls) {
      this.topAnimeCache.set(ls);
      this.cacheAnimeList(ls);
      return of(ls);
    }

    return this.http.get<AnimeResponse>(`${this.baseUrl}/top/anime`).pipe(
      timeout(HTTP_TIMEOUT_MS),
      this.retryOnTransient(),
      map(res => res.data || []),
      tap(data => {
        this.topAnimeCache.set(data);
        this.cacheAnimeList(data);
        this.lsSet('otaku_top_anime', data);
      })
    );
  }

  /**
   * Seasonal anime — memory cache → localStorage cache → HTTP
   */
  getSeasonalAnime(): Observable<Anime[]> {
    const mem = this.seasonalAnimeCache();
    if (mem) return of(mem);

    const ls = this.lsGet<Anime[]>('otaku_seasonal_anime');
    if (ls) {
      this.seasonalAnimeCache.set(ls);
      this.cacheAnimeList(ls);
      return of(ls);
    }

    return this.http.get<AnimeResponse>(`${this.baseUrl}/seasons/now?limit=12`).pipe(
      timeout(HTTP_TIMEOUT_MS),
      this.retryOnTransient(),
      map(res => res.data || []),
      tap(data => {
        this.seasonalAnimeCache.set(data);
        this.cacheAnimeList(data);
        this.lsSet('otaku_seasonal_anime', data);
      })
    );
  }

  /**
   * Anime detail by ID (checks in-memory cache first)
   */
  getAnimeById(id: number): Observable<Anime> {
    const cached = this.animeDetailsCache.get(id);
    if (cached) return of(cached);

    return this.http.get<AnimeDetailResponse>(`${this.baseUrl}/anime/${id}`).pipe(
      timeout(HTTP_TIMEOUT_MS),
      this.retryOnTransient(),
      map(res => {
        const data = res.data;
        if (data) {
          this.animeDetailsCache.set(id, data);
        }
        return data;
      })
    );
  }

  /**
   * Character cast for an Anime
   */
  getAnimeCharacters(id: number): Observable<Character[]> {
    return this.http.get<CharacterResponse>(`${this.baseUrl}/anime/${id}/characters`).pipe(
      timeout(HTTP_TIMEOUT_MS),
      this.retryOnTransient(),
      map(res => res.data || []),
      catchError(err => {
        console.warn(`⚠️ Failed to load characters for anime ${id}:`, err);
        return of([]); // Graceful fallback so UI doesn't break
      })
    );
  }

  /**
   * Search anime by keyword (automatically falls back to Kitsu API on failure)
   */
  searchAnime(query: string): Observable<Anime[]> {
    const lsKey = `otaku_search_${query.toLowerCase().trim()}`;
    const cached = this.lsGet<Anime[]>(lsKey);
    if (cached) return of(cached);

    return this.http.get<AnimeResponse>(`${this.baseUrl}/anime?q=${encodeURIComponent(query)}&limit=24`).pipe(
      timeout(HTTP_TIMEOUT_MS),
      this.retryOnTransient(),
      map(res => res.data || []),
      catchError(err => {
        console.warn('⚠️ Jikan search failed. Falling back to Kitsu API as a robust alternative.', err);
        return this.searchAnimeKitsuFallback(query);
      }),
      tap(data => {
        this.cacheAnimeList(data);
        this.lsSet(lsKey, data);
      })
    );
  }

  /**
   * Fallback search querying Kitsu API, mapping MyAnimeList IDs when available
   */
  private searchAnimeKitsuFallback(query: string): Observable<Anime[]> {
    const headers = new HttpHeaders({
      'Accept': 'application/vnd.api+json',
      'Content-Type': 'application/vnd.api+json'
    });

    return this.http.get<any>(`https://kitsu.io/api/edge/anime?filter[text]=${encodeURIComponent(query)}&include=mappings&page[limit]=20`, { headers }).pipe(
      timeout(HTTP_TIMEOUT_MS),
      map(res => {
        if (!res || !res.data) return [];
        const included = res.included || [];
        return res.data.map((item: any) => {
          const attr = item.attributes || {};
          let score: number | null = null;
          if (attr.averageRating) {
            score = parseFloat(attr.averageRating) / 10;
          }
          let year: number | null = null;
          if (attr.startDate) {
            try {
              year = new Date(attr.startDate).getFullYear();
            } catch {}
          }

          // Try to map to MyAnimeList ID
          const mappingsData = item.relationships?.mappings?.data || [];
          let malId: number | null = null;

          for (const mapRef of mappingsData) {
            const mapping = included.find((inc: any) => inc.type === 'mappings' && inc.id === mapRef.id);
            if (mapping && mapping.attributes && 
                (mapping.attributes.externalSite === 'myanimelist/anime' || mapping.attributes.externalSite === 'myanimelist')) {
              malId = parseInt(mapping.attributes.externalId, 10);
              break;
            }
          }

          // Fallback to kitsu ID if no MAL mapping is found
          if (!malId || isNaN(malId)) {
            malId = parseInt(item.id, 10);
          }

          return {
            mal_id: malId,
            title: attr.canonicalTitle || attr.titles?.en_jp || attr.titles?.en || 'Unknown Title',
            synopsis: attr.synopsis || '',
            images: {
              jpg: {
                image_url: attr.posterImage?.small || attr.posterImage?.medium || attr.posterImage?.original || '',
                small_image_url: attr.posterImage?.tiny || '',
                large_image_url: attr.posterImage?.large || attr.posterImage?.original || ''
              }
            },
            score,
            episodes: attr.episodeCount || null,
            type: attr.subtype || 'TV',
            status: attr.status || 'Unknown',
            genres: [],
            year
          } as Anime;
        });
      }),
      catchError(err => {
        console.error('❌ Kitsu fallback search also failed:', err);
        return throwError(() => err);
      })
    );
  }

  /**
   * Paginated top anime for infinite scroll — localStorage page cache
   */
  getPopularAnimePaged(page: number = 1): Observable<Anime[]> {
    const lsKey = `otaku_catalog_p${page}`;
    const ls = this.lsGet<Anime[]>(lsKey);
    if (ls) return of(ls);

    return this.http.get<AnimeResponse>(`${this.baseUrl}/top/anime?page=${page}&limit=24`).pipe(
      timeout(HTTP_TIMEOUT_MS),
      this.retryOnTransient(),
      map(res => res.data || []),
      tap(data => {
        this.cacheAnimeList(data);
        this.lsSet(lsKey, data);
      })
    );
  }

  /**
   * Clears all caches (in-memory + localStorage)
   */
  clearCache(): void {
    this.topAnimeCache.set(null);
    this.seasonalAnimeCache.set(null);
    this.animeDetailsCache.clear();
    if (isPlatformBrowser(this.platformId)) {
      try {
        Object.keys(localStorage)
          .filter(k => k.startsWith('otaku_'))
          .forEach(k => localStorage.removeItem(k));
      } catch {}
    }
  }
}
