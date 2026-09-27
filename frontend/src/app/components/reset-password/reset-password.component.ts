import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { PASSWORD_MAX_LENGTH, PASSWORD_MESSAGE, PASSWORD_MIN_LENGTH, isStrongPassword } from '../../utils/password-policy';

/**
 * Nova password a partir do link recebido por email (?token=...). O link só serve uma vez;
 * depois de mudar a password, todas as sessões abertas são terminadas.
 */
@Component({
  selector: 'app-reset-password',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './reset-password.component.html',
})
export class ResetPasswordComponent implements OnInit {
  token = '';
  password = '';
  confirmPassword = '';
  message = '';
  errorMessage = '';
  isSaving = false;
  readonly passwordMessage = PASSWORD_MESSAGE;
  readonly minLength = PASSWORD_MIN_LENGTH;
  readonly maxLength = PASSWORD_MAX_LENGTH;

  constructor(private route: ActivatedRoute, private router: Router, private authService: AuthService) {}

  ngOnInit(): void {
    this.token = this.route.snapshot.queryParamMap.get('token') || '';
    // Retira o token da barra de endereço (e do histórico) assim que é lido.
    if (this.token) {
      this.router.navigate([], { relativeTo: this.route, queryParams: {}, replaceUrl: true });
    }
  }

  get isStrong(): boolean {
    return isStrongPassword(this.password);
  }

  get matches(): boolean {
    return this.password === this.confirmPassword;
  }

  onSubmit(): void {
    if (!this.token || !this.isStrong || !this.matches) return;
    this.isSaving = true;
    this.errorMessage = '';
    this.authService.resetPassword(this.token, this.password).subscribe({
      next: res => {
        this.message = res.message;
        this.password = '';
        this.confirmPassword = '';
        this.isSaving = false;
      },
      error: err => {
        this.errorMessage = err?.error?.message || 'Não foi possível alterar a palavra-passe.';
        this.isSaving = false;
      }
    });
  }
}
