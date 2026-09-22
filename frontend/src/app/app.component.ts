import { Component } from '@angular/core';
import { RouterModule, Router } from '@angular/router';
import { NavbarComponent } from './components/navbar/navbar.component';
import { FormsModule } from '@angular/forms';

/**
 * Componente raiz: barra de navegação e zona onde o router mostra cada página.
 */
@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterModule, NavbarComponent, FormsModule],
  templateUrl: './app.component.html',
})
export class AppComponent {
  user: any = null;
  currentPath: string = '';

  constructor(private router: Router) {
    this.currentPath = this.router.url;
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      this.user = JSON.parse(storedUser);
    }
  }
}