import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';

/**
 * Página 404 do cliente Angular (qualquer rota que não existe).
 */
@Component({
  selector: 'app-not-found',
  standalone: true,
  imports: [RouterModule],
  template: `
    <section class="container text-center my-5">
      <p class="display-1 fw-bold text-warning mb-0">404</p>
      <h1 class="h3">Página não encontrada</h1>
      <p class="text-muted">O endereço que abriu não existe ou foi mudado.</p>
      <a routerLink="/" class="btn btn-primary">Voltar ao início</a>
    </section>
  `,
})
export class NotFoundComponent {}
