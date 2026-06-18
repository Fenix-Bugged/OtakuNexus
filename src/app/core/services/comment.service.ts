import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Comment } from '../models/comment.model';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class CommentService {
  private http = inject(HttpClient);

  // URL de la API REST externa del instructor
  private readonly API_URL = 'https://api-comentarios-gm6f.onrender.com/api/comments';

  // Identificador personalizado para no mezclar datos en el dashboard
  private readonly APP_ID = 'OtakuNexus-OscarGuacaneme';

  /**
   * Obtiene los comentarios de un item filtrados por el AppID
   */
  getComments(itemId: string): Observable<Comment[]> {
    return this.http.get<Comment[]>(`${this.API_URL}/${this.APP_ID}/${itemId}`);
  }

  /**
   * Envía un nuevo comentario al servidor centralizado
   */
  addComment(itemId: string, author: string, text: string, rating: number): Observable<Comment> {
    const body: Comment = {
      appId: this.APP_ID,
      itemId,
      author,
      text,
      rating
    };
    return this.http.post<Comment>(this.API_URL, body);
  }
}
