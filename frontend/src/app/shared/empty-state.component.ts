import { Component, Input } from '@angular/core';
import { RouterModule } from '@angular/router';

/**
 * Mensagem para listas vazias ("Ainda não há …"), com uma ligação opcional para a ação seguinte.
 */
@Component({
  selector: 'app-empty-state',
  standalone: true,
  imports: [RouterModule],
  template: `
    <div class="text-center text-muted border rounded p-4 my-3 bg-white" role="status">
      <p class="mb-2">{{ message }}</p>
      @if (actionLink && actionLabel) {
        <a class="btn btn-outline-primary btn-sm" [routerLink]="actionLink">{{ actionLabel }}</a>
      }
    </div>
  `,
})
export class EmptyStateComponent {
  @Input() message = 'Ainda não há nada para mostrar.';
  @Input() actionLabel?: string;
  @Input() actionLink?: string;
}
