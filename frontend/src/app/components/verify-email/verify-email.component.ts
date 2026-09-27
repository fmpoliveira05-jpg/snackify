import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { AuthService } from '../../services/auth.service';

/**
 * Confirmação do email a partir do link recebido (?token=...).
 */
@Component({
  selector: 'app-verify-email',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './verify-email.component.html',
})
export class VerifyEmailComponent implements OnInit {
  state: 'loading' | 'success' | 'error' = 'loading';
  message = '';

  constructor(private route: ActivatedRoute, private router: Router, private authService: AuthService) {}

  ngOnInit(): void {
    const token = this.route.snapshot.queryParamMap.get('token') || '';
    if (!token) {
      this.state = 'error';
      this.message = 'O link é inválido ou já expirou.';
      return;
    }
    this.router.navigate([], { relativeTo: this.route, queryParams: {}, replaceUrl: true });
    this.authService.verifyEmail(token).subscribe({
      next: res => {
        this.state = 'success';
        this.message = res.message;
      },
      error: err => {
        this.state = 'error';
        this.message = err?.error?.message || 'O link é inválido ou já expirou.';
      }
    });
  }
}
