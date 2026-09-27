import { Component, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { TurnstileComponent } from '../turnstile/turnstile.component';
import { environment } from '../../../environments/environment';

/**
 * Pedido de recuperação da password. A resposta é sempre a mesma, exista ou não a conta.
 */
@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, TurnstileComponent],
  templateUrl: './forgot-password.component.html',
})
export class ForgotPasswordComponent {
  email = '';
  website = '';
  turnstileToken = '';
  message = '';
  errorMessage = '';
  isSending = false;
  readonly turnstileEnabled = Boolean(environment.turnstileSiteKey);

  @ViewChild(TurnstileComponent) turnstile?: TurnstileComponent;

  constructor(private authService: AuthService) {}

  onSubmit(): void {
    this.isSending = true;
    this.errorMessage = '';
    this.authService.forgotPassword(this.email.trim(), { website: this.website, turnstileToken: this.turnstileToken }).subscribe({
      next: res => {
        this.message = res.message;
        this.isSending = false;
      },
      error: err => {
        this.errorMessage = err?.status === 429
          ? 'Demasiados pedidos. Tente novamente mais tarde.'
          : 'Não foi possível enviar o pedido. Tente novamente.';
        this.isSending = false;
        this.turnstile?.reset();
      }
    });
  }
}
