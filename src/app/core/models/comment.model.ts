export interface Comment {
  id?: number;         // Generado automáticamente por el servidor
  appId: string;       // Identificador único de la aplicación ('OtakuNexus-OscarGuacaneme')
  itemId: string;      // ID del elemento que se comenta (ej: 'anime-101')
  author: string;      // Nombre del alumno / usuario
  text: string;        // Contenido del comentario
  rating: number;      // Calificación del 1 al 5
  createdAt?: string;  // Fecha de creación generada por el servidor
}
