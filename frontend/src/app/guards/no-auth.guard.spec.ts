import { TestBed } from '@angular/core/testing';
import { Router, UrlTree, provideRouter } from '@angular/router';
import { firstValueFrom, of } from 'rxjs';
import { NoAuthGuard } from './no-auth.guard';
import { AuthService } from '../services/auth.service';

describe('NoAuthGuard', () => {
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

  const run = () => firstValueFrom(TestBed.inject(NoAuthGuard).canActivate());
  const url = (tree: unknown) => TestBed.inject(Router).serializeUrl(tree as UrlTree);

  it('mostra o login a quem não tem sessão', async () => {
    expect(await run()).toBeTrue();
  });

  it('envia o cliente para o seu dashboard', async () => {
    session$ = of({ userType: 'customer' });
    expect(url(await run())).toBe('/cliente/dashboard');
  });

  it('envia o administrador para o perfil', async () => {
    session$ = of({ userType: 'admin' });
    expect(url(await run())).toBe('/user/perfil');
  });
});
