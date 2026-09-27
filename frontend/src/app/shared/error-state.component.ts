import { Component, EventEmitter, Input, Output } from '@angular/core';

/**
 * Mensagem de erro ao carregar dados, com o botão "Tentar novamente".
 */
@Component({
  selector: 'app-error-state',
  standalone: true,
  template: `
    <div class="alert alert-danger d-flex flex-wrap align-items-center justify-content-between gap-2 my-3" role="alert">
      <span>{{ message }}</span>
      @if (retryable) {
        <button type="button" class="btn btn-outline-danger btn-sm" (click)="retry.emit()">Tentar novamente</button>
      }
    </div>
  `,
})
export class ErrorStateComponent {
  @Input() message = 'Não foi possível carregar os dados.';
  @Input() retryable = true;
  @Output() retry = new EventEmitter<void>();
}
