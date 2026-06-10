import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-empty-state',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './empty-state.component.html',
  styleUrl: './empty-state.component.css'
})
export class EmptyStateComponent {
  @Input() icon = '⛩️';
  @Input() title = 'Búsqueda vacía';
  @Input() message = '';
  @Input() actionLabel = '';

  @Output() actionClicked = new EventEmitter<void>();
}
