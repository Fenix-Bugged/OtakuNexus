import { Component, inject, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FavoritesService } from '../../core/services/favorites.service';
import { AnimeCardComponent } from '../../shared/components/anime-card/anime-card.component';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';
import { AppRoute } from '../../core/models/route.model';

@Component({
  selector: 'app-favorites',
  standalone: true,
  imports: [CommonModule, AnimeCardComponent, EmptyStateComponent],
  templateUrl: './favorites.component.html',
  styleUrl: './favorites.component.css'
})
export class FavoritesComponent {
  private favoritesService = inject(FavoritesService);

  @Output() navigateTo = new EventEmitter<AppRoute>();

  /**
   * Obtiene la lista de favoritos reactiva del servicio.
   */
  get favoriteAnimes() {
    return this.favoritesService.favorites();
  }

  /**
   * Emite el evento de navegación al detalle del anime.
   */
  onCardClicked(id: number): void {
    this.navigateTo.emit({ path: 'details', paramId: id });
  }

  /**
   * Redirige al inicio si el usuario decide explorar series.
   */
  onGoToHome(): void {
    this.navigateTo.emit({ path: 'home' });
  }
}
