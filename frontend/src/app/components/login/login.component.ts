import { Component, ViewChild } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { environment } from '../../../environments/environment';
import { TurnstileComponent } from '../turnstile/turnstile.component';
import { errorMessage } from '../../utils/http-error';

/**
 * Login; depois de entrar, cada tipo de conta segue para a sua página inicial (o restaurante vai para o back-office EJS).
 */
@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule, CommonModule, RouterModule, TurnstileComponent],
  templateUrl: './login.component.html',
})
export class LoginComponent {
  username = '';
  password = '';
  /** Campo honeypot: escondido, tem de ficar vazio. */
  website = '';
  turnstileToken = '';
  errorMessage = '';
  emailNotVerified = false;
  /** Pedido de login em curso: o botão fica desativado. */
  isSubmitting = false;
  readonly turnstileEnabled = Boolean(environment.turnstileSiteKey);

  @ViewChild(TurnstileComponent) turnstile?: TurnstileComponent;

  constructor(private authService: AuthService, private router: Router) {}

  onSubmit() {
    if (this.isSubmitting) return;
    this.isSubmitting = true;
    this.errorMessage = '';
    this.emailNotVerified = false;
    this.authService.login(this.username, this.password, { website: this.website, turnstileToken: this.turnstileToken }).subscribe({
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
        this.isSubmitting = false;
        this.emailNotVerified = err?.error?.code === 'EMAIL_NOT_VERIFIED';
        this.errorMessage = errorMessage(err, 'Erro ao fazer login.');
        // Cada token do Turnstile só serve uma vez.
        this.turnstile?.reset();
      }
    });
  }
}
