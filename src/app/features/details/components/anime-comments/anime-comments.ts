import { Component, inject, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CommentService } from '../../../../core/services/comment.service';
import { Comment } from '../../../../core/models/comment.model';

@Component({
  selector: 'app-anime-comments',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './anime-comments.html',
  styleUrl: './anime-comments.css'
})
export class AnimeComments implements OnInit {
  private commentService = inject(CommentService);

  @Input() animeId!: number; // Recibe el ID del anime (mal_id) desde la vista de detalles

  comments: Comment[] = [];
  loading = false;
  error = '';
  submitting = false;

  // Campos vinculados al formulario reactivo por plantilla
  authorName = '';
  commentText = '';
  selectedRating = 5;
  showForm = false;
  successMessage = '';

  get itemId(): string {
    return `anime-${this.animeId}`;
  }

  ngOnInit(): void {
    this.loadComments();
  }

  loadComments(): void {
    this.loading = true;
    this.error = '';
    this.commentService.getComments(this.itemId).subscribe({
      next: (data) => {
        // Ordenamos los comentarios de más recientes a más antiguos
        this.comments = data.sort(
          (a, b) => new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime()
        );
        this.loading = false;
      },
      error: () => {
        this.error = 'No se pudieron cargar los comentarios. Asegúrate de que la API está activa.';
        this.loading = false;
      }
    });
  }

  toggleForm(): void {
    this.showForm = !this.showForm;
    this.successMessage = '';
  }

  setRating(value: number): void {
    this.selectedRating = value;
  }

  submitComment(): void {
    if (!this.authorName.trim() || !this.commentText.trim()) return;
    this.submitting = true;

    this.commentService.addComment(
      this.itemId,
      this.authorName.trim(),
      this.commentText.trim(),
      this.selectedRating
    ).subscribe({
      next: (newComment) => {
        // Añadimos el nuevo comentario al inicio de la lista de manera reactiva
        this.comments.unshift(newComment);

        // Reset del formulario
        this.authorName = '';
        this.commentText = '';
        this.selectedRating = 5;
        this.showForm = false;
        this.submitting = false;

        this.successMessage = '¡Comentario publicado exitosamente!';
        setTimeout(() => this.successMessage = '', 3000);
      },
      error: () => {
        this.submitting = false;
        this.error = 'Error al publicar. Reintenta de nuevo.';
      }
    });
  }
}
