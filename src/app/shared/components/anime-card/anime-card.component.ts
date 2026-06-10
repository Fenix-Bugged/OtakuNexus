import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Anime } from '../../../core/models/anime.model';

@Component({
  selector: 'app-anime-card',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './anime-card.component.html',
  styleUrl: './anime-card.component.css'
})
export class AnimeCardComponent {
  @Input({ required: true }) anime!: Anime;
  @Input() isFav = false;
  @Output() cardClicked = new EventEmitter<number>();
  @Output() favoriteToggled = new EventEmitter<Anime>();

  onCardClick(): void {
    this.cardClicked.emit(this.anime.mal_id);
  }

  onFavoriteClick(event: MouseEvent): void {
    event.stopPropagation();
    this.favoriteToggled.emit(this.anime);
  }
}
