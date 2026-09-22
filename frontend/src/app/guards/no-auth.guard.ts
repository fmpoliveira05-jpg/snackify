import { Injectable } from '@angular/core';
import {
  CanActivate,
  Router,
  UrlTree
} from '@angular/router';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { AuthService } from '../services/auth.service';

@Injectable({
  providedIn: 'root'
})
export class NoAuthGuard implements CanActivate {
  constructor(private authService: AuthService, private router: Router) {}

  canActivate(): Observable<boolean | UrlTree> {
    return this.authService.getUserSession().pipe(
      map(user => {
        if (user) {
          if (user.userType === 'customer') {
            return this.router.createUrlTree(['/cliente/dashboard']);
          } else if (user.userType === 'admin') {
            return this.router.createUrlTree(['/user/perfil']);
          } else {
            window.location.href = 'http://localhost:5000/restaurante/dashboard';
            return false;
          }
        }
        return true;
      })
    );
  }
}