import { Component, inject, signal, effect, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
import { AnimeService } from '../../core/services/anime.service';
import { Anime } from '../../core/models/anime.model';
import { AppRoute } from '../../core/models/route.model';
import { AnimeCardComponent } from '../../shared/components/anime-card/anime-card.component';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';

@Component({
  selector: 'app-search',
  standalone: true,
  imports: [CommonModule, AnimeCardComponent, EmptyStateComponent],
  templateUrl: './search.component.html',
  styleUrl: './search.component.css'
})
export class SearchComponent {
  private animeService = inject(AnimeService);

  @Output() navigateTo = new EventEmitter<AppRoute>();
  @Output() favoriteToggled = new EventEmitter<Anime>();

  // State Signals
  searchQuery = signal<string>('');
  isSearching = signal<boolean>(false);
  results = signal<Anime[]>([]);
  favIds = signal<Set<number>>(new Set());

  // Store active subscription to unsubscribe and prevent race conditions
  private searchSubscription?: Subscription;

  // Skeletons array for loading animation
  skeletons = Array(12).fill(0);

  constructor() {
    // Configura un effect() en el constructor que escuche los cambios de searchQuery()
    effect((onCleanup) => {
      const query = this.searchQuery();

      // Clear results immediately if the query is empty
      if (!query.trim()) {
        this.results.set([]);
        this.isSearching.set(false);
        if (this.searchSubscription) {
          this.searchSubscription.unsubscribe();
        }
        return;
      }

      // Configure a 400ms setTimeout before calling the search method
      const timeoutId = setTimeout(() => {
        this.isSearching.set(true);

        // Cancel previous pending HTTP request to avoid race conditions
        if (this.searchSubscription) {
          this.searchSubscription.unsubscribe();
        }

        this.searchSubscription = this.animeService.searchAnime(query).subscribe({
          next: (data) => {
            this.results.set(data);
            this.isSearching.set(false);
          },
          error: (err) => {
            console.error('❌ Error searching anime:', err);
            this.results.set([]);
            this.isSearching.set(false);
          }
        });
      }, 400);

      // Cancel the timeout if the user types another key before 400ms
      onCleanup(() => {
        clearTimeout(timeoutId);
        if (this.searchSubscription) {
          this.searchSubscription.unsubscribe();
        }
      });
    });
  }

  /**
   * Updates the search query signal immediately on input event.
   */
  onSearchInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.searchQuery.set(input.value);
  }

  /**
   * Emits navigation event to details screen.
   */
  onCardClicked(id: number): void {
    this.navigateTo.emit({ path: 'details', paramId: id });
  }

  /**
   * Toggles favorite status locally and emits the event.
   */
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

  /**
   * Checks if an anime is marked as favorite.
   */
  isFav(id: number): boolean {
    return this.favIds().has(id);
  }

  /**
   * Clears the current search query.
   */
  clearSearch(): void {
    this.searchQuery.set('');
  }
}
