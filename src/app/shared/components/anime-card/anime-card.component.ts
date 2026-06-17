import { Component, Output, EventEmitter, inject, computed, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Anime } from '../../../core/models/anime.model';
import { FavoritesService } from '../../../core/services/favorites.service';

@Component({
  selector: 'app-anime-card',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './anime-card.component.html',
  styleUrl: './anime-card.component.css'
})
export class AnimeCardComponent {
  private favoritesService = inject(FavoritesService);

  // Signal-based input (Angular 17.1+): permite que computed() lo rastree reactivamente
  anime = input.required<Anime>();

  @Output() cardClicked     = new EventEmitter<number>();
  @Output() favoriteToggled = new EventEmitter<Anime>();

  /**
   * computed() reactivo: se recalcula automáticamente cuando favorites() o anime() cambia.
   * Esto hace que el ícono del corazón se actualice en TODAS las vistas sin necesidad de
   * escuchar eventos externos ni pasar el estado como @Input().
   */
  isFavorite = computed(() =>
    this.favoritesService.isFavorite(this.anime().mal_id)
  );

  onCardClick(): void {
    this.cardClicked.emit(this.anime().mal_id);
  }

  toggleFavorite(event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    this.favoritesService.toggleFavorite(this.anime());
    this.favoriteToggled.emit(this.anime());
  }
}
