import { TestBed } from '@angular/core/testing';
import { Router, UrlTree, provideRouter } from '@angular/router';
import { firstValueFrom, of } from 'rxjs';
import { AuthGuard } from './auth.guard';
import { AuthService } from '../services/auth.service';

describe('AuthGuard', () => {
  let session$: any;

  beforeEach(() => {
    session$ = of(null);
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: { getUserSession: () => session$ } },
      ],
    });
  });

  it('deixa passar quem tem sessão', async () => {
    session$ = of({ username: 'ana', userType: 'customer' });
    const result = await firstValueFrom(TestBed.inject(AuthGuard).canActivate());
    expect(result).toBeTrue();
  });

  it('envia para o login quem não tem sessão', async () => {
    const result = await firstValueFrom(TestBed.inject(AuthGuard).canActivate());
    expect(result instanceof UrlTree).toBeTrue();
    expect(TestBed.inject(Router).serializeUrl(result as UrlTree)).toBe('/login');
  });
});
