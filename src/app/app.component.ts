import { Component, OnInit, inject, signal, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser, Location } from '@angular/common';
import { RouterOutlet, Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs';
import { AnimeService } from './core/services/anime.service';
import { AppRoute } from './core/models/route.model';
import { NavbarComponent } from './shared/components/navbar/navbar.component';
import { NotFoundComponent } from './features/not-found/not-found.component';
import { HomeComponent } from './features/home/home.component';
import { SearchComponent } from './features/search/search.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, NavbarComponent, NotFoundComponent, HomeComponent, SearchComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent implements OnInit {
  title = 'OtakuNexus';
  private animeService = inject(AnimeService);
  private platformId = inject(PLATFORM_ID);
  private location = inject(Location);
  private router = inject(Router);

  // Virtual routing signals
  currentRoute = signal<AppRoute>({ path: 'home' });
  favoritesCount = signal<number>(0);

  ngOnInit(): void {
    // Listen to router navigation events to synchronize the virtual router
    this.router.events.pipe(
      filter((event): event is NavigationEnd => event instanceof NavigationEnd)
    ).subscribe((event) => {
      this.syncRouteFromUrl(event.urlAfterRedirects);
    });

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
   * Synchronizes the virtual route from the given URL path.
   */
  private syncRouteFromUrl(url: string): void {
    // Clean URL path (e.g. "/details/123" -> "details/123", "/" -> "")
    const path = url.split('?')[0].split('#')[0].replace(/^\/+/g, '');

    if (path === '' || path === 'home') {
      this.currentRoute.set({ path: 'home' });
    } else if (path === 'search') {
      this.currentRoute.set({ path: 'search' });
    } else if (path === 'favorites') {
      this.currentRoute.set({ path: 'favorites' });
    } else if (path.startsWith('details')) {
      const segments = path.split('/');
      const id = segments[1] ? parseInt(segments[1], 10) : undefined;
      this.currentRoute.set({ path: 'details', paramId: id });
    } else {
      // Non-existent route triggers the 404 page
      this.currentRoute.set({ path: 'not-found' });
    }
  }

  /**
   * Updates the virtual route reactively and scrolls to top if in browser.
   */
  navigateTo(path: AppRoute['path'], paramId?: number): void {
    // Update the signal directly for instant reaction
    this.currentRoute.set({ path, paramId });

    // Update URL path in browser address bar
    let targetUrl = `/${path}`;
    if (path === 'home') {
      targetUrl = '/';
    } else if (path === 'details' && paramId !== undefined) {
      targetUrl = `/details/${paramId}`;
    }

    // Keep the wrong URL in the address bar if it's not-found (standard 404 behavior)
    if (path !== 'not-found') {
      this.router.navigateByUrl(targetUrl);
    }

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

  /**
   * Handles favorite toggle from child screens and increments/decrements the badge counter.
   */
  onFavoriteToggled(anime: { mal_id: number }): void {
    // We delegate the actual tracking to each screen; this just syncs the navbar badge
    // For now, toggle logic increments count (full state management comes in a future day)
    const current = this.favoritesCount();
    this.favoritesCount.set(current > 0 ? current - 1 : current + 1);
  }
}
