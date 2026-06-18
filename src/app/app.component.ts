import { Component, OnInit, inject, signal, computed, PLATFORM_ID, NgZone } from '@angular/core';
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
  private ngZone = inject(NgZone);

  // Virtual routing signals
  currentRoute = signal<AppRoute>({ path: 'home' });
  favoritesCount = computed(() => this.favoritesService.favorites().length);

  // Controls CSS transition classes on the route container
  routeTransitionState = signal<'idle' | 'exit' | 'enter'>('idle');

  /** Prevents overlapping transitions */
  private _transitioning = false;

  /**
   * Flag to distinguish programmatic navigation (from navigateTo()) from
   * real browser-initiated navigation (back/forward/direct URL).
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
        return;
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
   * Updates the virtual route with a smooth CSS transition (exit → swap → enter).
   * Total minimum duration: ~1 second (500ms exit + 500ms enter).
   */
  navigateTo(path: AppRoute['path'], paramId?: number): void {
    // Prevent overlapping transitions
    if (this._transitioning) return;

    if (!isPlatformBrowser(this.platformId)) {
      // SSR: just swap immediately
      this.currentRoute.set({ path, paramId });
      this._updateUrl(path, paramId);
      return;
    }

    this._transitioning = true;

    // Phase 1 — play exit animation (500ms)
    this.routeTransitionState.set('exit');

    this.ngZone.runOutsideAngular(() => {
      setTimeout(() => {
        this.ngZone.run(() => {
          // Phase 2 — swap content (Angular re-renders synchronously here)
          this.currentRoute.set({ path, paramId });
          this._updateUrl(path, paramId);
          window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });

          // Phase 3 — play enter animation (500ms)
          this.routeTransitionState.set('enter');

          this.ngZone.runOutsideAngular(() => {
            setTimeout(() => {
              this.ngZone.run(() => {
                this.routeTransitionState.set('idle');
                this._transitioning = false;
              });
            }, 520);
          });
        });
      }, 500);
    });
  }

  /** Syncs the Angular Router URL without triggering virtual-route re-sync. */
  private _updateUrl(path: AppRoute['path'], paramId?: number): void {
    let targetUrl = `/${path}`;
    if (path === 'home') targetUrl = '/';
    else if (path === 'details' && paramId !== undefined) targetUrl = `/details/${paramId}`;

    if (path !== 'not-found') {
      this._navigatingInternally = true;
      this.router.navigateByUrl(targetUrl);
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
