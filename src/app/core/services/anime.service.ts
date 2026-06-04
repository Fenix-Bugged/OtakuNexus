import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { map, tap } from 'rxjs/operators';
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
   * Retrieves the top animes from the Jikan API. Caches the result in a Signal.
   */
  getTopAnime(): Observable<Anime[]> {
    const cached = this.topAnimeCache();
    if (cached) {
      return of(cached);
    }

    return this.http.get<AnimeResponse>(`${this.baseUrl}/top/anime`).pipe(
      map(res => res.data || []),
      tap(data => this.topAnimeCache.set(data))
    );
  }

  /**
   * Retrieves seasonal anime. Caches the result in a Signal.
   */
  getSeasonalAnime(): Observable<Anime[]> {
    const cached = this.seasonalAnimeCache();
    if (cached) {
      return of(cached);
    }

    return this.http.get<AnimeResponse>(`${this.baseUrl}/seasons/now?limit=12`).pipe(
      map(res => res.data || []),
      tap(data => this.seasonalAnimeCache.set(data))
    );
  }

  /**
   * Retrieves detail info for a specific Anime by its ID.
   */
  getAnimeById(id: number): Observable<Anime> {
    return this.http.get<AnimeDetailResponse>(`${this.baseUrl}/anime/${id}`).pipe(
      map(res => res.data)
    );
  }

  /**
   * Retrieves the character cast list for a specific Anime.
   */
  getAnimeCharacters(id: number): Observable<Character[]> {
    return this.http.get<CharacterResponse>(`${this.baseUrl}/anime/${id}/characters`).pipe(
      map(res => res.data || [])
    );
  }

  /**
   * Searches animes by keyword.
   */
  searchAnime(query: string): Observable<Anime[]> {
    return this.http.get<AnimeResponse>(`${this.baseUrl}/anime?q=${encodeURIComponent(query)}&limit=24`).pipe(
      map(res => res.data || [])
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
