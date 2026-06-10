import { 
  Component, 
  OnInit, 
  inject, 
  signal, 
  Output, 
  EventEmitter, 
  AfterViewInit, 
  ElementRef, 
  ViewChild, 
  PLATFORM_ID 
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

  // Data signals for all home sections
  topAnime    = signal<Anime[]>([]);
  seasonalAnime = signal<Anime[]>([]);
  catalogAnime  = signal<Anime[]>([]);
  currentPage   = signal<number>(1);

  // Loading / fetching states
  loadingTop        = signal(true);
  loadingSeasonal   = signal(true);
  isFetchingNextPage = signal(false);

  // IntersectionObserver anchor (catalog section)
  @ViewChild('infiniteAnchor') infiniteAnchor!: ElementRef;

  // Guard: prevents IntersectionObserver from firing before initial catalog load
  private catalogInitialized = false;
  private observer: IntersectionObserver | null = null;

  // Computed hero from topAnime list
  get heroAnime(): Anime | null {
    const list = this.topAnime();
    if (!list.length) return null;
    return list.reduce((best, a) =>
      (a.score ?? 0) > (best.score ?? 0) ? a : best
    , list[0]);
  }

  // Favorites tracking
  favIds = signal<Set<number>>(new Set());

  // Skeleton placeholder array
  skeletons = Array(12).fill(0);

  ngOnInit(): void {
    // Skip ALL HTTP calls during SSR / prerender — only runs in browser
    if (!isPlatformBrowser(this.platformId)) {
      this.loadingTop.set(false);
      this.loadingSeasonal.set(false);
      return;
    }

    /*
     * SEQUENTIAL REQUEST CHAIN using RxJS concat + delay
     * Jikan API allows max ~3 req/s. We fire them 450ms apart to stay safe.
     *
     * Order: getTopAnime → (450ms) → getSeasonalAnime → (450ms) → getPopularAnimePaged(1)
     *
     * concat() ensures each observable completes before the next one starts.
     * of(null).pipe(delay(X)) acts as a 450ms pause between requests.
     */
    concat(
      // Step 1 — Top anime
      this.animeService.getTopAnime().pipe(
        tap(data => {
          this.topAnime.set(data);
          this.loadingTop.set(false);
        }),
        catchError(() => { this.loadingTop.set(false); return EMPTY; })
      ),

      // Step 2 — 450ms pause then seasonal
      of(null).pipe(delay(450), switchMap(() =>
        this.animeService.getSeasonalAnime().pipe(
          tap(data => {
            this.seasonalAnime.set(data);
            this.loadingSeasonal.set(false);
          }),
          catchError(() => { this.loadingSeasonal.set(false); return EMPTY; })
        )
      )),

      // Step 3 — 450ms pause then first catalog page
      of(null).pipe(delay(450), switchMap(() =>
        this.animeService.getPopularAnimePaged(1).pipe(
          tap(data => {
            if (data.length > 0) {
              this.catalogAnime.set(data);
              this.currentPage.set(2);
            }
            this.isFetchingNextPage.set(false);
            // NOW it is safe to activate the IntersectionObserver
            this.catalogInitialized = true;
            this.attachObserver();
          }),
          catchError(() => { this.isFetchingNextPage.set(false); return EMPTY; })
        )
      ))
    ).subscribe();
  }

  ngAfterViewInit(): void {
    // Observer attachment is deferred until catalogInitialized = true
    // (done inside the Step 3 tap above). This method is a no-op here.
  }

  /** Attaches the IntersectionObserver ONLY after catalog is initialized */
  private attachObserver(): void {
    if (!isPlatformBrowser(this.platformId) || !this.infiniteAnchor) return;

    this.observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting && !this.isFetchingNextPage() && this.catalogInitialized) {
        this.loadMoreAnime();
      }
    }, { rootMargin: '200px' });

    this.observer.observe(this.infiniteAnchor.nativeElement);
  }

  /** Loads the next page of the infinite catalog */
  loadMoreAnime(): void {
    if (!isPlatformBrowser(this.platformId) || this.isFetchingNextPage()) return;

    this.isFetchingNextPage.set(true);

    this.animeService.getPopularAnimePaged(this.currentPage()).subscribe({
      next: (data) => {
        if (data.length > 0) {
          this.catalogAnime.set([...this.catalogAnime(), ...data]);
          this.currentPage.update(p => p + 1);
        }
        this.isFetchingNextPage.set(false);
      },
      error: () => this.isFetchingNextPage.set(false)
    });
  }

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
