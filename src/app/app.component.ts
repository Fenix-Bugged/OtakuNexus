import { Component, OnInit, inject, signal, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { RouterOutlet } from '@angular/router';
import { AnimeService } from './core/services/anime.service';
import { AppRoute } from './core/models/route.model';
import { NavbarComponent } from './shared/components/navbar/navbar.component';
import { NotFoundComponent } from './features/not-found/not-found.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, NavbarComponent, NotFoundComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent implements OnInit {
  title = 'OtakuNexus';
  private animeService = inject(AnimeService);
  private platformId = inject(PLATFORM_ID);

  // Virtual routing signals
  currentRoute = signal<AppRoute>({ path: 'home' });
  favoritesCount = signal<number>(0);

  ngOnInit(): void {
    // Basic connectivity check log
    this.animeService.getTopAnime().subscribe({
      next: (animes) => {
        console.log('🔥 Anime en Tendencia (MAL Top):', animes);
      },
      error: (err) => {
        console.error('❌ Error fetching top anime:', err);
      }
    });
  }

  /**
   * Updates the virtual route reactively and scrolls to top if in browser.
   */
  navigateTo(path: 'home' | 'search' | 'details' | 'favorites', paramId?: number): void {
    this.currentRoute.set({ path, paramId });

    if (isPlatformBrowser(this.platformId)) {
      window.scrollTo({
        top: 0,
        behavior: 'smooth'
      });
    }
  }

  /**
   * Navigates using an AppRoute object emitted from the Navbar.
   */
  onNavigate(route: AppRoute): void {
    this.navigateTo(route.path, route.paramId);
  }
}
