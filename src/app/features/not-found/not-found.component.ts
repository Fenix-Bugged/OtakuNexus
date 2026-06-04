import { Component, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-not-found',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="not-found-container animate-fadeIn">
      <!-- Graphic theme element -->
      <div class="portal-icon animate-float">
        🌀
      </div>
      
      <!-- Error code & Title -->
      <h1 class="error-code gradient-text">
        ERROR 404
      </h1>
      <h2 class="error-subtitle">
        ¡Has caído en un Genjutsu!
      </h2>
      
      <!-- Message -->
      <p class="error-message">
        El portal que buscas ha sido destruido o se encuentra en una dimensión desconocida de la Jikan API. ¡Regresa al camino del ninja antes de perderte!
      </p>
      
      <!-- Action button -->
      <button 
        (click)="goHomeAction()" 
        class="action-btn"
      >
        Disipar Genjutsu (Ir al Inicio)
      </button>
    </div>
  `,
  styles: [`
    :host {
      display: block;
      width: 100%;
    }

    .not-found-container {
      min-height: 70vh;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      text-align: center;
      padding: 2rem 1rem;
      box-sizing: border-box;
    }

    .portal-icon {
      font-size: 6rem;
      margin-bottom: 1.5rem;
      filter: drop-shadow(0 10px 25px rgba(249, 115, 22, 0.4));
      user-select: none;
    }

    .error-code {
      font-family: 'Outfit', sans-serif;
      font-size: 4.5rem;
      font-weight: 900;
      margin: 0 0 0.5rem 0;
      letter-spacing: -1.5px;
      line-height: 1;
    }

    .gradient-text {
      background: linear-gradient(135deg, #f97316 0%, #a855f7 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }

    .error-subtitle {
      font-family: 'Outfit', sans-serif;
      font-size: 1.85rem;
      font-weight: 700;
      color: #ffffff;
      margin: 0 0 1rem 0;
    }

    .error-message {
      color: #9ca3af;
      max-width: 460px;
      margin: 0 0 2.5rem 0;
      line-height: 1.6;
      font-size: 1rem;
    }

    .action-btn {
      background: linear-gradient(135deg, #f97316 0%, #9333ea 100%);
      border: none;
      color: #ffffff;
      font-family: 'Inter', sans-serif;
      font-size: 1rem;
      font-weight: 700;
      padding: 0.875rem 2.25rem;
      border-radius: 16px;
      box-shadow: 0 8px 24px rgba(249, 115, 22, 0.15);
      cursor: pointer;
      transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
    }

    .action-btn:hover {
      transform: translateY(-2px);
      box-shadow: 0 12px 30px rgba(249, 115, 22, 0.3);
      filter: brightness(1.05);
    }

    .action-btn:active {
      transform: translateY(0);
      box-shadow: 0 4px 12px rgba(249, 115, 22, 0.2);
    }

    /* Animations */
    @keyframes fadeIn {
      from { 
        opacity: 0; 
        transform: translateY(15px); 
      }
      to { 
        opacity: 1; 
        transform: translateY(0); 
      }
    }

    @keyframes float {
      0%, 100% { 
        transform: translateY(0) rotate(0deg); 
      }
      50% { 
        transform: translateY(-12px) rotate(180deg); 
      }
    }

    .animate-fadeIn { 
      animation: fadeIn 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards; 
    }

    .animate-float { 
      animation: float 8s ease-in-out infinite; 
    }

    @media (max-width: 640px) {
      .portal-icon {
        font-size: 4.5rem;
      }
      .error-code {
        font-size: 3.25rem;
      }
      .error-subtitle {
        font-size: 1.45rem;
      }
      .error-message {
        font-size: 0.9rem;
        margin-bottom: 2rem;
      }
      .action-btn {
        font-size: 0.95rem;
        padding: 0.8rem 1.75rem;
      }
    }
  `]
})
export class NotFoundComponent {
  @Output() goHome = new EventEmitter<void>();

  goHomeAction() {
    this.goHome.emit();
  }
}
