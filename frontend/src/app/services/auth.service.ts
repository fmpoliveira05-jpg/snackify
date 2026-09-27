import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { tap, catchError, switchMap, map } from 'rxjs/operators';
import { environment } from '../../environments/environment';

/** Campos anti-bot enviados com os formulários públicos. */
export interface BotFields {
  /** Campo "armadilha": uma pessoa nunca o preenche. */
  website?: string;
  /** Token do desafio Cloudflare Turnstile (vazio quando está desligado). */
  turnstileToken?: string;
}

/** Resposta genérica dos pedidos de email (não revela se a conta existe). */
export interface MessageResponse {
  message: string;
}

/**
 * Login, logout e sessão atual.
 *
 * O token fica apenas num cookie httpOnly gerido pelo backend: o Angular nunca o vê e os
 * dados da conta vivem só em memória (nada em localStorage).
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private apiUrl = `${environment.apiUrl}/auth`;

  private currentUserSubject = new BehaviorSubject<any>(null);
  currentUser$ = this.currentUserSubject.asObservable();

  constructor(private http: HttpClient, private router: Router) {
    this.loadUser();
  }

  /** Inicia sessão e, a seguir, carrega os dados da conta a partir do /auth/me. */
  login(username: string, password: string, bot: BotFields = {}): Observable<any> {
    return this.http
      .post<{ message: string; userType: string }>(`${this.apiUrl}/login`, { username, password, ...bot }, { withCredentials: true })
      .pipe(
        switchMap(res => this.getUserSession().pipe(map(user => ({ ...res, user }))))
      );
  }

  logout(): void {
    this.http.post(`${this.apiUrl}/logout`, {}, { withCredentials: true }).subscribe(() => {
      this.currentUserSubject.next(null);
      window.location.href = `${environment.apiUrl}`;
    });
  }

  isLoggedIn(): Observable<boolean> {
    return this.currentUser$.pipe(
      map(user => !!user),
      catchError(() => of(false))
    );
  }

  getUserSession(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/me`, { withCredentials: true }).pipe(
      tap(user => this.currentUserSubject.next(user)),
      catchError(() => {
        this.currentUserSubject.next(null);
        return of(null);
      })
    );
  }

  loadUser(): void {
    this.getUserSession().subscribe();
  }

  /** Pede o email com o link para redefinir a password. */
  forgotPassword(email: string, bot: BotFields = {}): Observable<MessageResponse> {
    return this.http.post<MessageResponse>(`${this.apiUrl}/forgot-password`, { email, ...bot });
  }

  /** Define a nova password com o token do link recebido por email. */
  resetPassword(token: string, password: string): Observable<MessageResponse> {
    return this.http.post<MessageResponse>(`${this.apiUrl}/reset-password`, { token, password });
  }

  /** Confirma o email com o token do link recebido por email. */
  verifyEmail(token: string): Observable<MessageResponse> {
    return this.http.post<MessageResponse>(`${this.apiUrl}/verify-email`, { token });
  }

  /** Pede um novo email de confirmação. */
  resendVerification(email: string, bot: BotFields = {}): Observable<MessageResponse> {
    return this.http.post<MessageResponse>(`${this.apiUrl}/resend-verification`, { email, ...bot });
  }

  navigateToDashboard(userType: string): void {
    switch (userType) {
      case 'customer':
        this.router.navigate(['/cliente/dashboard']);
        break;
      case 'restaurant':
        this.router.navigate(['/restaurante/dashboard']);
        break;
      case 'admin':
        this.router.navigate(['/user/perfil']);
        break;
      default:
        this.router.navigate(['/']);
        break;
    }
  }
}
