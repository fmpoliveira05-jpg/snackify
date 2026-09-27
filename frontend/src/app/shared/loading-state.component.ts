import { Component, Input } from '@angular/core';

/**
 * Indicador de carregamento (spinner do Bootstrap) com texto para leitores de ecrã.
 * Uso: <app-loading message="A carregar restaurantes…"></app-loading>
 */
@Component({
  selector: 'app-loading',
  standalone: true,
  template: `
    <div class="d-flex align-items-center gap-2 text-muted my-4" role="status" aria-live="polite">
      <span class="spinner-border spinner-border-sm" aria-hidden="true"></span>
      <span>{{ message }}</span>
    </div>
  `,
})
export class LoadingStateComponent {
  @Input() message = 'A carregar…';
}
