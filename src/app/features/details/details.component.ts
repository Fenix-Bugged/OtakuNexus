import { Component, Input, Output, EventEmitter, OnDestroy, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { forkJoin, Subscription } from 'rxjs';
import { AnimeService } from '../../core/services/anime.service';
import { FavoritesService } from '../../core/services/favorites.service';
import { Anime, Character } from '../../core/models/anime.model';
import { AppRoute } from '../../core/models/route.model';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';

@Component({
  selector: 'app-details',
  standalone: true,
  imports: [CommonModule, EmptyStateComponent],
  templateUrl: './details.component.html',
  styleUrl: './details.component.css'
})
export class DetailsComponent implements OnDestroy {
  private animeService = inject(AnimeService);
  private favoritesService = inject(FavoritesService);

  @Output() navigateTo = new EventEmitter<AppRoute>();
  @Output() favoriteToggled = new EventEmitter<Anime>();

  // State Signals
  selectedAnime = signal<Anime | null>(null);
  selectedAnimeCharacters = signal<Character[]>([]);
  isLoading = signal<boolean>(true);
  error = signal<boolean>(false);
  
  isFavorite = computed(() => {
    const anime = this.selectedAnime();
    return anime ? this.favoritesService.isFavorite(anime.mal_id) : false;
  });

  private detailsSubscription?: Subscription;

  @Input() set animeId(id: number | undefined) {
    if (id !== undefined) {
      this.loadAnimeDetails(id);
    } else {
      this.selectedAnime.set(null);
      this.selectedAnimeCharacters.set([]);
      this.isLoading.set(false);
      this.error.set(true);
    }
  }

  /**
   * Concurrently requests the anime details and its character list using forkJoin.
   */
  private loadAnimeDetails(id: number): void {
    this.isLoading.set(true);
    this.error.set(false);

    // Cancel any previous request still in flight to avoid race conditions
    if (this.detailsSubscription) {
      this.detailsSubscription.unsubscribe();
    }

    this.detailsSubscription = forkJoin({
      anime: this.animeService.getAnimeById(id),
      characters: this.animeService.getAnimeCharacters(id)
    }).subscribe({
      next: ({ anime, characters }) => {
        this.selectedAnime.set(anime);
        
        // Store only the first 12 characters
        const top12 = (characters || []).slice(0, 12);
        this.selectedAnimeCharacters.set(top12);
        
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error('❌ Error fetching anime details concurrently:', err);
        this.error.set(true);
        this.isLoading.set(false);
      }
    });
  }

  toggleFavorite(): void {
    const anime = this.selectedAnime();
    if (anime) {
      this.favoritesService.toggleFavorite(anime);
      this.favoriteToggled.emit(anime);
    }
  }

  /**
   * Triggers navigation back to the home view.
   */
  goBack(): void {
    this.navigateTo.emit({ path: 'home' });
  }

  ngOnDestroy(): void {
    if (this.detailsSubscription) {
      this.detailsSubscription.unsubscribe();
    }
  }
}
