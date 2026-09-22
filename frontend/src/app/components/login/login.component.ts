import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule, CommonModule],
  templateUrl: './login.component.html',
})
export class LoginComponent {
  username = '';
  password = '';
  errorMessage = '';

  constructor(private authService: AuthService, private router: Router) {}

  onSubmit() {
    this.authService.login(this.username, this.password).subscribe({
      next: (res) => {
        if (res.userType === 'customer') {
          this.router.navigate(['/cliente/dashboard']);
        } else if (res.userType === 'restaurant') {
          window.location.href = `${environment.apiUrl}/restaurante/dashboard`;
        } else if (res.userType === 'admin') {
          this.router.navigate(['/user/perfil']);
        }
      },
      error: (err) => {
        this.errorMessage = err.error.message || 'Erro ao fazer login.';
      }
    });
  }
}