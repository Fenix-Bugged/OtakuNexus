import { 
  Component, OnInit, inject, signal, Output, EventEmitter,
  AfterViewInit, ElementRef, ViewChild, PLATFORM_ID 
} from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { of, concat, EMPTY } from 'rxjs';
import { delay, switchMap, tap, catchError } from 'rxjs/operators';
import { AnimeService } from '../../core/services/anime.service';
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
export class HomeComponent implements OnInit, AfterViewInit {
  private animeService = inject(AnimeService);
  private platformId = inject(PLATFORM_ID);

  @Output() navigateTo = new EventEmitter<{ path: 'home' | 'search' | 'details' | 'favorites'; paramId?: number }>();
  @Output() favoriteToggled = new EventEmitter<Anime>();

  // ── Data signals ───────────────────────────────────────────────────────────
  topAnime      = signal<Anime[]>([]);
  seasonalAnime = signal<Anime[]>([]);
  catalogAnime  = signal<Anime[]>([]);
  currentPage   = signal<number>(1);

  // ── UI state signals ───────────────────────────────────────────────────────
  loadingTop         = signal(true);
  loadingSeasonal    = signal(true);
  isFetchingNextPage = signal(false);
  apiError           = signal(false);   // true when Jikan is unreachable

  // ── Favorites ──────────────────────────────────────────────────────────────
  favIds = signal<Set<number>>(new Set());

  // ── Skeleton placeholders ──────────────────────────────────────────────────
  skeletons = Array(12).fill(0);

  // ── IntersectionObserver anchor ────────────────────────────────────────────
  @ViewChild('infiniteAnchor') infiniteAnchor!: ElementRef;
  private catalogReady = false;
  private observer: IntersectionObserver | null = null;

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

  ngAfterViewInit(): void {
    // Observer is attached from loadAll() after catalog loads — no-op here
  }

  // ── Core loading logic ─────────────────────────────────────────────────────

  /**
   * Sequential request chain — fires requests 450ms apart to respect Jikan's
   * ~3 req/s rate limit. Uses RxJS concat so each request fully completes
   * (including localStorage cache checks) before the next begins.
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
      ),

      // ── 3. Catalog page 1 (after another 450ms) ───────────────────────────
      of(null).pipe(
        delay(450),
        switchMap(() =>
          this.animeService.getPopularAnimePaged(1).pipe(
            tap(data => {
              if (data.length > 0) {
                this.catalogAnime.set(data);
                this.currentPage.set(2);
              }
              this.isFetchingNextPage.set(false);
              // Activate IntersectionObserver only AFTER catalog data is ready
              this.catalogReady = true;
              this.attachObserver();
            }),
            catchError(err => {
              console.error('Catalog page 1 error:', err);
              this.isFetchingNextPage.set(false);
              return EMPTY;
            })
          )
        )
      )
    ).subscribe();
  }

  // ── IntersectionObserver ───────────────────────────────────────────────────

  private attachObserver(): void {
    if (!isPlatformBrowser(this.platformId) || !this.infiniteAnchor?.nativeElement) return;
    if (this.observer) this.observer.disconnect(); // clean up previous observer

    this.observer = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && !this.isFetchingNextPage() && this.catalogReady) {
        this.loadMoreAnime();
      }
    }, { rootMargin: '200px' });

    this.observer.observe(this.infiniteAnchor.nativeElement);
  }

  // ── Infinite scroll ────────────────────────────────────────────────────────

  loadMoreAnime(): void {
    if (!isPlatformBrowser(this.platformId) || this.isFetchingNextPage()) return;
    this.isFetchingNextPage.set(true);

    this.animeService.getPopularAnimePaged(this.currentPage()).subscribe({
      next: data => {
        if (data.length > 0) {
          this.catalogAnime.set([...this.catalogAnime(), ...data]);
          this.currentPage.update(p => p + 1);
        }
        this.isFetchingNextPage.set(false);
      },
      error: () => this.isFetchingNextPage.set(false)
    });
  }

  // ── Retry button ───────────────────────────────────────────────────────────

  retryLoad(): void {
    this.loadingTop.set(true);
    this.loadingSeasonal.set(true);
    this.topAnime.set([]);
    this.seasonalAnime.set([]);
    this.catalogAnime.set([]);
    this.currentPage.set(1);
    this.catalogReady = false;
    this.loadAll();
  }

  // ── Card interactions ──────────────────────────────────────────────────────

  onCardClicked(id: number): void {
    this.navigateTo.emit({ path: 'details', paramId: id });
  }

  onFavoriteToggled(anime: Anime): void {
    const current = new Set(this.favIds());
    if (current.has(anime.mal_id)) {
      current.delete(anime.mal_id);
    } else {
      current.add(anime.mal_id);
    }
    this.favIds.set(current);
    this.favoriteToggled.emit(anime);
  }

  isFav(id: number): boolean {
    return this.favIds().has(id);
  }
}
