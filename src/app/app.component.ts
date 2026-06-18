import { Component, OnInit, inject, signal, computed, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { RouterOutlet, Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs';
import { AppRoute } from './core/models/route.model';
import { NavbarComponent } from './shared/components/navbar/navbar.component';
import { NotFoundComponent } from './features/not-found/not-found.component';
import { HomeComponent } from './features/home/home.component';
import { SearchComponent } from './features/search/search.component';
import { DetailsComponent } from './features/details/details.component';
import { FavoritesComponent } from './features/favorites/favorites.component';
import { FavoritesService } from './core/services/favorites.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    RouterOutlet, NavbarComponent, NotFoundComponent, HomeComponent,
    SearchComponent, DetailsComponent, FavoritesComponent
  ],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent implements OnInit {
  title = 'OtakuNexus';
  private platformId = inject(PLATFORM_ID);
  private router = inject(Router);
  private favoritesService = inject(FavoritesService);

  // Virtual routing signals
  currentRoute = signal<AppRoute>({ path: 'home' });
  favoritesCount = computed(() => this.favoritesService.favorites().length);

  /**
   * Flag to distinguish programmatic navigation (from navigateTo()) from
   * real browser-initiated navigation (back/forward/direct URL).
   * When true, the NavigationEnd handler is skipped to prevent the
   * double-render that caused the perceived "double-click" requirement.
   */
  private _navigatingInternally = false;

  ngOnInit(): void {
    // Sync virtual route ONLY on real browser-initiated navigation events
    // (back/forward button, direct URL entry) — NOT on our own navigateByUrl calls.
    this.router.events.pipe(
      filter((event): event is NavigationEnd => event instanceof NavigationEnd)
    ).subscribe((event) => {
      if (this._navigatingInternally) {
        this._navigatingInternally = false;
        return; // signal was already set in navigateTo() — skip the double-set
      }
      this.syncRouteFromUrl(event.urlAfterRedirects);
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
    const changeState = () => {
      // Update the signal directly for instant reaction
      this.currentRoute.set({ path, paramId });

      // Build the target URL
      let targetUrl = `/${path}`;
      if (path === 'home') {
        targetUrl = '/';
      } else if (path === 'details' && paramId !== undefined) {
        targetUrl = `/details/${paramId}`;
      }

      // Mark as internal so NavigationEnd handler skips the redundant sync
      if (path !== 'not-found') {
        this._navigatingInternally = true;
        this.router.navigateByUrl(targetUrl);
      }

      if (isPlatformBrowser(this.platformId)) {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    };

    if (isPlatformBrowser(this.platformId) && (document as any).startViewTransition) {
      (document as any).startViewTransition(() => changeState());
    } else {
      changeState();
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
  onFavoriteToggled(anime: any): void {
    // No-op: FavoritesService gestiona el estado de forma reactiva en toda la app.
  }
}
