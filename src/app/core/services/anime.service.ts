import { Injectable, inject, signal, PLATFORM_ID } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, throwError, timer } from 'rxjs';
import { map, tap, catchError, retry, switchMap } from 'rxjs/operators';
import { isPlatformBrowser } from '@angular/common';
import { environment } from '../../../environments/environment';
import { Anime, AnimeResponse, AnimeDetailResponse, Character, CharacterResponse } from '../models/anime.model';

const CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes

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

  // ─── Retry operator ──────────────────────────────────────────────────────
  // Retries once after 1.5s ONLY on 429 errors (rate limit).
  // All other errors (503, network) pass through immediately.

  private retryOn429<T>() {
    return retry<T>({
      count: 1,
      delay: (err) => {
        if (err?.status === 429) {
          console.warn('⚠️ Jikan 429 — retrying in 1.5s');
          return timer(1500);
        }
        return throwError(() => err); // don't retry 503, 500, network errors
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
      return of(ls);
    }

    return this.http.get<AnimeResponse>(`${this.baseUrl}/top/anime`).pipe(
      this.retryOn429(),
      map(res => res.data || []),
      tap(data => {
        this.topAnimeCache.set(data);
        this.lsSet('otaku_top_anime', data);
      })
      // No catchError here — let it propagate to the component for error UI
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
      return of(ls);
    }

    return this.http.get<AnimeResponse>(`${this.baseUrl}/seasons/now?limit=12`).pipe(
      this.retryOn429(),
      map(res => res.data || []),
      tap(data => {
        this.seasonalAnimeCache.set(data);
        this.lsSet('otaku_seasonal_anime', data);
      })
    );
  }

  /**
   * Anime detail by ID
   */
  getAnimeById(id: number): Observable<Anime> {
    return this.http.get<AnimeDetailResponse>(`${this.baseUrl}/anime/${id}`).pipe(
      this.retryOn429(),
      map(res => res.data)
    );
  }

  /**
   * Character cast for an Anime
   */
  getAnimeCharacters(id: number): Observable<Character[]> {
    return this.http.get<CharacterResponse>(`${this.baseUrl}/anime/${id}/characters`).pipe(
      this.retryOn429(),
      map(res => res.data || [])
    );
  }

  /**
   * Search anime by keyword
   */
  searchAnime(query: string): Observable<Anime[]> {
    return this.http.get<AnimeResponse>(`${this.baseUrl}/anime?q=${encodeURIComponent(query)}&limit=24`).pipe(
      this.retryOn429(),
      map(res => res.data || [])
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
      this.retryOn429(),
      map(res => res.data || []),
      tap(data => this.lsSet(lsKey, data))
    );
  }

  /**
   * Clears all caches (in-memory + localStorage)
   */
  clearCache(): void {
    this.topAnimeCache.set(null);
    this.seasonalAnimeCache.set(null);
    if (isPlatformBrowser(this.platformId)) {
      try {
        Object.keys(localStorage)
          .filter(k => k.startsWith('otaku_'))
          .forEach(k => localStorage.removeItem(k));
      } catch {}
    }
  }
}
