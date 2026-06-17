import { Injectable, inject, signal, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Anime } from '../models/anime.model';

@Injectable({
  providedIn: 'root'
})
export class FavoritesService {
  private platformId = inject(PLATFORM_ID);
  
  // Fuente única de verdad para la colección de favoritos
  favorites = signal<Anime[]>([]);

  constructor() {
    this.loadFavorites();
  }

  /**
   * Carga los favoritos de localStorage si estamos en el navegador.
   */
  private loadFavorites(): void {
    if (isPlatformBrowser(this.platformId)) {
      try {
        const stored = localStorage.getItem('otakunexus_favorites');
        if (stored) {
          this.favorites.set(JSON.parse(stored));
        }
      } catch (err) {
        console.error('⚠️ Error al cargar favoritos desde localStorage:', err);
      }
    }
  }

  /**
   * Agrega o elimina un anime de la colección de favoritos.
   * Al terminar, persiste la colección actualizada en localStorage de forma segura.
   */
  toggleFavorite(anime: Anime): void {
    const current = this.favorites();
    const exists = current.some(item => item.mal_id === anime.mal_id);
    let updated: Anime[];

    if (exists) {
      // Si ya existe, se remueve
      updated = current.filter(item => item.mal_id !== anime.mal_id);
    } else {
      // Si no existe, se añade al inicio
      updated = [anime, ...current];
    }

    // Actualiza la Signal para propagar reactivamente los cambios
    this.favorites.set(updated);

    // Guarda en localStorage si se está ejecutando en el navegador
    if (isPlatformBrowser(this.platformId)) {
      try {
        localStorage.setItem('otakunexus_favorites', JSON.stringify(updated));
      } catch (err) {
        console.error('⚠️ Error al guardar favoritos en localStorage:', err);
      }
    }
  }

  /**
   * Determina si un ID de anime está en la colección de favoritos actual.
   */
  isFavorite(id: number): boolean {
    return this.favorites().some(item => item.mal_id === id);
  }
}
