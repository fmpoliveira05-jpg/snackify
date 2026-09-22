import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private apiUrl = `${environment.apiUrl}/auth`;

  private currentUserSubject = new BehaviorSubject<any>(null);
  currentUser$ = this.currentUserSubject.asObservable();

  constructor(private http: HttpClient, private router: Router) {
    this.loadUser();
  }

  login(username: string, password: string): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/login`, { username, password }, { withCredentials: true }).pipe(
      tap(user => this.currentUserSubject.next(user))
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
      tap(user => !!user),
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