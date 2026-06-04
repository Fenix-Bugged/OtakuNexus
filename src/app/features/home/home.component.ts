import { Component, OnInit, inject, signal, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AnimeService } from '../../core/services/anime.service';
import { Anime } from '../../core/models/anime.model';
import { AnimeCardComponent } from '../../shared/components/anime-card/anime-card.component';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, AnimeCardComponent],
  templateUrl: './home.component.html',
})
export class HomeComponent implements OnInit {
  private animeService = inject(AnimeService);

  @Output() navigateTo = new EventEmitter<{ path: 'home' | 'search' | 'details' | 'favorites'; paramId?: number }>();
  @Output() favoriteToggled = new EventEmitter<Anime>();

  // Data signals
  topAnime = signal<Anime[]>([]);
  seasonalAnime = signal<Anime[]>([]);

  // Loading states
  loadingTop = signal(true);
  loadingSeasonal = signal(true);

  // Computed hero: the highest-scored anime from topAnime
  get heroAnime(): Anime | null {
    const list = this.topAnime();
    if (!list.length) return null;
    return list.reduce((best, a) =>
      (a.score ?? 0) > (best.score ?? 0) ? a : best
    , list[0]);
  }

  // Favorite IDs set (local in this component; lifted up via output in production)
  favIds = signal<Set<number>>(new Set());

  ngOnInit(): void {
    this.animeService.getTopAnime().subscribe({
      next: (data) => {
        this.topAnime.set(data);
        this.loadingTop.set(false);
      },
      error: () => this.loadingTop.set(false),
    });

    this.animeService.getSeasonalAnime().subscribe({
      next: (data) => {
        this.seasonalAnime.set(data);
        this.loadingSeasonal.set(false);
      },
      error: () => this.loadingSeasonal.set(false),
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

  // Skeleton placeholder array
  skeletons = Array(12).fill(0);
}
