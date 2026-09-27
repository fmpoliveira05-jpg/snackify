import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';

/** Rodapé com a ligação para a Política de Privacidade e cookies. */
@Component({
  selector: 'app-footer',
  standalone: true,
  imports: [RouterModule],
  template: `
    <footer class="container border-top mt-5 pt-3 small text-muted d-flex flex-wrap gap-3 justify-content-between">
      <span>Snackify</span>
      <nav aria-label="Informação legal" class="d-flex gap-3">
        <a routerLink="/privacidade">Política de Privacidade</a>
        <a routerLink="/privacidade" fragment="cookies">Cookies</a>
      </nav>
    </footer>
  `,
})
export class FooterComponent {}
