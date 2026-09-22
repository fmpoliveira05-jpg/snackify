import { Injectable } from '@angular/core';
import {
  CanActivate,
  Router,
  UrlTree
} from '@angular/router';
import { Observable, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { AuthService } from '../services/auth.service';

/**
 * Só deixa abrir a página se houver sessão; caso contrário, manda para o login.
 */
@Injectable({
  providedIn: 'root'
})
export class AuthGuard implements CanActivate {
  constructor(private authService: AuthService, private router: Router) {}

  canActivate(): Observable<boolean | UrlTree> {
    return this.authService.getUserSession().pipe(
      map(user => {
        if (user) {
          return true;
        } else {
          return this.router.createUrlTree(['/login']);
        }
      }),
      catchError(() => {
        return of(this.router.createUrlTree(['/login']));
      })
    );
  }
}