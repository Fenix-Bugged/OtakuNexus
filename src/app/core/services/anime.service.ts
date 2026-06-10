import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, throwError, timer } from 'rxjs';
import { map, tap, catchError, retryWhen, mergeMap, take } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { Anime, AnimeResponse, AnimeDetailResponse, Character, CharacterResponse } from '../models/anime.model';

@Injectable({
  providedIn: 'root'
})
export class AnimeService {
  private http = inject(HttpClient);
  private baseUrl = environment.baseUrl;

  // Cache using Angular Signals to avoid flickering and redundant requests
  private topAnimeCache = signal<Anime[] | null>(null);
  private seasonalAnimeCache = signal<Anime[] | null>(null);

  /**
   * Returns an operator that retries once after 1.5s on 429 errors.
   * This protects every endpoint against transient rate-limit bursts.
   */
  private retryOn429<T>() {
    return retryWhen<T>(errors =>
      errors.pipe(
        mergeMap((err, attempt) => {
          // Only retry on 429, only once
          if (attempt < 1 && err?.status === 429) {
            console.warn(`⚠️ Jikan 429 — retrying in 1.5s (attempt ${attempt + 1})`);
            return timer(1500);
          }
          return throwError(() => err);
        }),
        take(2)
      )
    );
  }

  /**
   * Retrieves the top animes from the Jikan API. Caches the result in a Signal.
   */
  getTopAnime(): Observable<Anime[]> {
    const cached = this.topAnimeCache();
    if (cached) return of(cached);

    return this.http.get<AnimeResponse>(`${this.baseUrl}/top/anime`).pipe(
      this.retryOn429(),
      map(res => res.data || []),
      tap(data => this.topAnimeCache.set(data)),
      catchError(err => {
        console.error('❌ Error loading top anime:', err);
        return of([]);
      })
    );
  }

  /**
   * Retrieves seasonal anime. Caches the result in a Signal.
   */
  getSeasonalAnime(): Observable<Anime[]> {
    const cached = this.seasonalAnimeCache();
    if (cached) return of(cached);

    return this.http.get<AnimeResponse>(`${this.baseUrl}/seasons/now?limit=12`).pipe(
      this.retryOn429(),
      map(res => res.data || []),
      tap(data => this.seasonalAnimeCache.set(data)),
      catchError(err => {
        console.error('❌ Error loading seasonal anime:', err);
        return of([]);
      })
    );
  }

  /**
   * Retrieves detail info for a specific Anime by its ID.
   */
  getAnimeById(id: number): Observable<Anime> {
    return this.http.get<AnimeDetailResponse>(`${this.baseUrl}/anime/${id}`).pipe(
      this.retryOn429(),
      map(res => res.data)
    );
  }

  /**
   * Retrieves the character cast list for a specific Anime.
   */
  getAnimeCharacters(id: number): Observable<Character[]> {
    return this.http.get<CharacterResponse>(`${this.baseUrl}/anime/${id}/characters`).pipe(
      this.retryOn429(),
      map(res => res.data || [])
    );
  }

  /**
   * Searches animes by keyword.
   */
  searchAnime(query: string): Observable<Anime[]> {
    return this.http.get<AnimeResponse>(`${this.baseUrl}/anime?q=${encodeURIComponent(query)}&limit=24`).pipe(
      this.retryOn429(),
      map(res => res.data || []),
      catchError(err => {
        console.error('❌ Error searching anime:', err);
        return of([]);
      })
    );
  }

  /**
   * Obtiene una lista paginada de animes populares para el catálogo infinito.
   * @param page Número de página a consultar
   */
  getPopularAnimePaged(page: number = 1): Observable<Anime[]> {
    return this.http.get<AnimeResponse>(`${this.baseUrl}/top/anime?page=${page}&limit=24`).pipe(
      this.retryOn429(),
      map(res => res.data || []),
      catchError(err => {
        console.error(`❌ Error loading catalog page ${page}:`, err);
        return of([]);
      })
    );
  }

  /**
   * Clears the in-memory Signal cache.
   */
  clearCache(): void {
    this.topAnimeCache.set(null);
    this.seasonalAnimeCache.set(null);
  }
}
