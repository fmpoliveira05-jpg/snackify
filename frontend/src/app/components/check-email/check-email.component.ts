import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { AuthService } from '../../services/auth.service';

/**
 * Página mostrada depois do registo: pede para confirmar o email e permite reenviar o link.
 */
@Component({
  selector: 'app-check-email',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './check-email.component.html',
})
export class CheckEmailComponent {
  email = '';
  website = '';
  message = '';
  errorMessage = '';
  isSending = false;

  constructor(private authService: AuthService) {}

  resend(): void {
    this.isSending = true;
    this.errorMessage = '';
    this.authService.resendVerification(this.email.trim(), { website: this.website }).subscribe({
      next: res => {
        this.message = res.message;
        this.isSending = false;
      },
      error: err => {
        this.errorMessage = err?.status === 429
          ? 'Demasiados pedidos. Tente novamente mais tarde.'
          : 'Não foi possível enviar o pedido. Tente novamente.';
        this.isSending = false;
      }
    });
  }
}
