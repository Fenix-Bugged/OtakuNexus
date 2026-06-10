import { Component, inject, PLATFORM_ID, Output, EventEmitter } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';

@Component({
  selector: 'app-not-found',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './not-found.component.html',
  styleUrl: './not-found.component.css'
})
export class NotFoundComponent {
  private platformId = inject(PLATFORM_ID);
  
  @Output() goHome = new EventEmitter<void>();

  onGoHome() {
    if (this.goHome.observed) {
      // Use the SPA route change for smooth transitioning
      this.goHome.emit();
    } else if (isPlatformBrowser(this.platformId)) {
      // Fallback if not handled by parent virtual router
      window.location.href = '/';
    }
  }
}
