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

  // Data signals for existing home sections
  topAnime = signal<Anime[]>([]);
  seasonalAnime = signal<Anime[]>([]);

  // Signals for infinite scroll catalog
  catalogAnime = signal<Anime[]>([]);
  currentPage = signal<number>(1);
  isFetchingNextPage = signal<boolean>(false);

  // Loading states for existing home sections
  loadingTop = signal(true);
  loadingSeasonal = signal(true);

  // IntersectionObserver anchor
  @ViewChild('infiniteAnchor') infiniteAnchor!: ElementRef;

  // Computed hero: the highest-scored anime from topAnime
  get heroAnime(): Anime | null {
    const list = this.topAnime();
    if (!list.length) return null;
    return list.reduce((best, a) =>
      (a.score ?? 0) > (best.score ?? 0) ? a : best
    , list[0]);
  }

  // Favorite IDs set
  favIds = signal<Set<number>>(new Set());

  // Skeleton placeholder array
  skeletons = Array(12).fill(0);

  ngOnInit(): void {
    if (isPlatformBrowser(this.platformId)) {
      // REQUEST 1: Top anime fires immediately
      this.animeService.getTopAnime().subscribe({
        next: (data) => {
          this.topAnime.set(data);
          this.loadingTop.set(false);
        },
        error: () => this.loadingTop.set(false),
      });

      // REQUEST 2: Seasonal fires 600ms later — Jikan allows ~3 req/s
      setTimeout(() => {
        this.animeService.getSeasonalAnime().subscribe({
          next: (data) => {
            this.seasonalAnime.set(data);
            this.loadingSeasonal.set(false);
          },
          error: () => this.loadingSeasonal.set(false),
        });
      }, 600);

      // REQUEST 3: Infinite catalog fires 1200ms later
      setTimeout(() => {
        this.loadMoreAnime();
      }, 1200);
    } else {
      this.loadingTop.set(false);
      this.loadingSeasonal.set(false);
    }
  }

  ngAfterViewInit(): void {
    // SSR safety check: only run IntersectionObserver on the client-side
    if (isPlatformBrowser(this.platformId)) {
      this.initInfiniteScroll();
    }
  }

  private initInfiniteScroll(): void {
    const observer = new IntersectionObserver((entries) => {
      // If anchor is in viewport and we are not fetching already
      if (entries[0].isIntersecting && !this.isFetchingNextPage()) {
        this.loadMoreAnime();
      }
    }, {
      rootMargin: '200px' // Fetch 200px before reaching bottom
    });

    if (this.infiniteAnchor) {
      observer.observe(this.infiniteAnchor.nativeElement);
    }
  }

  loadMoreAnime(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    this.isFetchingNextPage.set(true);

    this.animeService.getPopularAnimePaged(this.currentPage()).subscribe({
      next: (data) => {
        if (data.length > 0) {
          // Immutability: Concat previous results with new ones using spread operator
          this.catalogAnime.set([...this.catalogAnime(), ...data]);
          // Advance to next page reactively
          this.currentPage.update(p => p + 1);
        }
        this.isFetchingNextPage.set(false);
      },
      error: (err) => {
        console.error('Error loading catalogue page:', err);
        this.isFetchingNextPage.set(false);
      }
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
