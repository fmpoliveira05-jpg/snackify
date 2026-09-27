import { Component } from '@angular/core';
import { RouterModule, Router } from '@angular/router';
import { NavbarComponent } from './components/navbar/navbar.component';
import { FormsModule } from '@angular/forms';

/**
 * Componente raiz: barra de navegação e zona onde o router mostra cada página.
 *
 * Os dados da conta não são guardados no browser (localStorage): a barra de navegação
 * obtém-nos do AuthService, que os pede ao backend (/auth/me) e os mantém só em memória.
 */
@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterModule, NavbarComponent, FormsModule],
  templateUrl: './app.component.html',
})
export class AppComponent {
  currentPath: string = '';

  constructor(private router: Router) {
    this.currentPath = this.router.url;
  }
}
