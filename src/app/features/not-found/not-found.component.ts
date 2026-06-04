import { Component, inject, PLATFORM_ID, Output, EventEmitter } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';

@Component({
  selector: 'app-not-found',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="min-h-[85vh] flex items-center justify-center px-4 py-12 relative overflow-hidden selection:bg-purple-500 selection:text-white select-none">
      
      <!-- Fondo Atmosférico de Luces de Neón Desenfocadas (Aura Mística) -->
      <div class="absolute w-[350px] h-[350px] bg-orange-500/10 rounded-full blur-[120px] top-1/4 left-1/3 animate-pulse-slow"></div>
      <div class="absolute w-[400px] h-[400px] bg-purple-500/10 rounded-full blur-[130px] bottom-1/4 right-1/3 animate-pulse-slow delay-1000"></div>

      <!-- Tarjeta Premium (Deep Glassmorphism) -->
      <div class="relative z-10 w-full max-w-xl bg-slate-950/45 backdrop-blur-2xl border border-white/5 rounded-3xl p-8 sm:p-12 shadow-[0_20px_50px_rgba(0,0,0,0.5)] text-center transition-all duration-300 hover:border-orange-500/15 group">
        
        <!-- Elemento Gráfico: Portal Espiral Animado -->
        <div class="relative w-36 h-36 mx-auto mb-8 flex items-center justify-center">
          <!-- Brillo de fondo del portal -->
          <div class="absolute inset-0 bg-gradient-to-tr from-orange-500 to-purple-600 rounded-full blur-2xl opacity-20 group-hover:opacity-40 transition-opacity duration-500"></div>
          
          <!-- Portal Giratorio y Flotante -->
          <div class="text-8xl select-none filter drop-shadow-[0_0_20px_rgba(249,115,22,0.4)] animate-portal-float-spin">
            🌀
          </div>
        </div>
        
        <!-- Código de Error en Gradiente Metálico -->
        <span class="text-xs uppercase font-extrabold tracking-[0.25em] text-orange-500/80 bg-orange-500/10 border border-orange-500/25 px-4 py-1.5 rounded-full w-fit mx-auto mb-6 block">
          CÓDIGO DE ERROR: 404
        </span>

        <h1 class="text-3xl sm:text-4xl font-black text-white leading-tight mb-4 tracking-tight">
          ¡Has caído en un <span class="bg-gradient-to-r from-orange-500 via-pink-500 to-purple-500 bg-clip-text text-transparent">Genjutsu Espacial</span>!
        </h1>

        <p class="text-gray-400 text-sm sm:text-base leading-relaxed max-w-md mx-auto mb-8">
          El portal interdimensional de la Jikan API que estás buscando se encuentra en otra dimensión o ha sido destruido por un ataque enemigo. ¡Es hora de regresar al camino del ninja!
        </p>

        <!-- Botón de Acción Call To Action -->
        <button 
          (click)="onGoHome()" 
          class="relative overflow-hidden group/btn bg-gradient-to-r from-orange-500 to-purple-600 hover:from-orange-600 hover:to-purple-700 text-white font-bold py-4 px-10 rounded-2xl shadow-lg hover:shadow-orange-500/15 transition-all duration-300 transform hover:-translate-y-0.5 active:scale-95"
        >
          <!-- Efecto de luz interna al pasar el cursor (Shimmer) -->
          <span class="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover/btn:animate-shimmer"></span>
          Deshacer Genjutsu (Ir al Inicio)
        </button>

      </div>
    </div>
  `,
  styles: [`
    /* ANIMACIONES PERSONALIZADAS PREMIUM (Aceleradas por GPU) */
    
    @keyframes portalFloatSpin {
      0% {
        transform: translateY(0) rotate(0deg) scale(1);
      }
      50% {
        transform: translateY(-12px) rotate(180deg) scale(1.05);
      }
      100% {
        transform: translateY(0) rotate(360deg) scale(1);
      }
    }

    @keyframes pulseSlow {
      0%, 100% { opacity: 0.8; transform: scale(1); }
      50% { opacity: 1; transform: scale(1.05); }
    }

    @keyframes shimmer {
      100% { transform: translateX(100%); }
    }

    .animate-portal-float-spin {
      animation: portalFloatSpin 8s cubic-bezier(0.4, 0, 0.2, 1) infinite;
      will-change: transform;
    }

    .animate-pulse-slow {
      animation: pulseSlow 5s ease-in-out infinite;
    }

    .animate-shimmer {
      animation: shimmer 1.5s ease-out infinite;
    }
  `]
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
