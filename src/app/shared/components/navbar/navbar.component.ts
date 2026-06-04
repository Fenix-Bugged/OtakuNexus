import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AppRoute } from '../../../core/models/route.model';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './navbar.component.html',
  styleUrl: './navbar.component.css'
})
export class NavbarComponent {
  @Input({ required: true }) currentRoute!: AppRoute;
  @Input() favoritesCount = 0;
  @Output() navigate = new EventEmitter<AppRoute>();

  onNavigate(path: 'home' | 'search' | 'details' | 'favorites', paramId?: number): void {
    this.navigate.emit({ path, paramId });
  }
}
