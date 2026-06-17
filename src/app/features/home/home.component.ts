import { 
  Component, OnInit, inject, signal, Output, EventEmitter, PLATFORM_ID 
} from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { of, concat, EMPTY } from 'rxjs';
import { delay, switchMap, tap, catchError } from 'rxjs/operators';
import { AnimeService } from '../../core/services/anime.service';
import { FavoritesService } from '../../core/services/favorites.service';
import { Anime } from '../../core/models/anime.model';
import { AnimeCardComponent } from '../../shared/components/anime-card/anime-card.component';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, AnimeCardComponent, EmptyStateComponent],
  templateUrl: './home.component.html',
  styleUrl: './home.component.css'
})
export class HomeComponent implements OnInit {
  private animeService    = inject(AnimeService);
  private favoritesService = inject(FavoritesService);
  private platformId      = inject(PLATFORM_ID);

  @Output() navigateTo      = new EventEmitter<{ path: 'home' | 'search' | 'details' | 'favorites'; paramId?: number }>();
  @Output() favoriteToggled = new EventEmitter<Anime>();

  // ── Data signals ───────────────────────────────────────────────────────────
  topAnime      = signal<Anime[]>([]);
  seasonalAnime = signal<Anime[]>([]);

  // ── UI state signals ───────────────────────────────────────────────────────
  loadingTop      = signal(true);
  loadingSeasonal = signal(true);
  apiError        = signal(false);

  // ── Skeleton placeholders ──────────────────────────────────────────────────
  skeletons = Array(12).fill(0);

  // ── Computed hero (highest scored from topAnime list) ──────────────────────
  get heroAnime(): Anime | null {
    const list = this.topAnime();
    if (!list.length) return null;
    return list.reduce((best, a) =>
      (a.score ?? 0) > (best.score ?? 0) ? a : best
    , list[0]);
  }

  // ── Lifecycle ──────────────────────────────────────────────────────────────

  ngOnInit(): void {
    if (!isPlatformBrowser(this.platformId)) {
      this.loadingTop.set(false);
      this.loadingSeasonal.set(false);
      return;
    }
    this.loadAll();
  }

  // ── Core loading logic ─────────────────────────────────────────────────────

  /**
   * Sequential request chain — fires requests 450ms apart to respect Jikan's
   * ~3 req/s rate limit. Uses RxJS concat so each request fully completes
   * before the next begins.
   */
  loadAll(): void {
    this.apiError.set(false);

    concat(
      // ── 1. Top anime (immediate) ──────────────────────────────────────────
      this.animeService.getTopAnime().pipe(
        tap(data => {
          this.topAnime.set(data);
          this.loadingTop.set(false);
        }),
        catchError(err => {
          console.error('Top anime error:', err);
          this.loadingTop.set(false);
          this.apiError.set(true);
          return EMPTY;
        })
      ),

      // ── 2. Seasonal anime (after 450ms) ───────────────────────────────────
      of(null).pipe(
        delay(450),
        switchMap(() =>
          this.animeService.getSeasonalAnime().pipe(
            tap(data => {
              this.seasonalAnime.set(data);
              this.loadingSeasonal.set(false);
            }),
            catchError(err => {
              console.error('Seasonal anime error:', err);
              this.loadingSeasonal.set(false);
              return EMPTY;
            })
          )
        )
      )
    ).subscribe();
  }

  // ── Retry button ───────────────────────────────────────────────────────────

  retryLoad(): void {
    this.loadingTop.set(true);
    this.loadingSeasonal.set(true);
    this.topAnime.set([]);
    this.seasonalAnime.set([]);
    this.loadAll();
  }

  // ── Card interactions ──────────────────────────────────────────────────────

  onCardClicked(id: number): void {
    this.navigateTo.emit({ path: 'details', paramId: id });
  }

  onFavoriteToggled(anime: Anime): void {
    this.favoritesService.toggleFavorite(anime);
    this.favoriteToggled.emit(anime);
  }

  isFav(id: number): boolean {
    return this.favoritesService.isFavorite(id);
  }
}
