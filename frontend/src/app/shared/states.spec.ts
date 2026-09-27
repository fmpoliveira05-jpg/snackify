import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { LoadingStateComponent } from './loading-state.component';
import { EmptyStateComponent } from './empty-state.component';
import { ErrorStateComponent } from './error-state.component';
import { NotFoundComponent } from '../pages/not-found/not-found.component';
import { PrivacyComponent } from '../pages/privacy/privacy.component';
import { routes } from '../app.routes';
import { errorMessage, OFFLINE_MESSAGE } from '../utils/http-error';

describe('estados de carregamento, vazio e erro', () => {
  beforeEach(() => TestBed.configureTestingModule({ providers: [provideRouter([])] }));

  it('o carregamento tem role="status" e a mensagem indicada', () => {
    const fixture = TestBed.createComponent(LoadingStateComponent);
    fixture.componentInstance.message = 'A carregar restaurantes…';
    fixture.detectChanges();
    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelector('[role="status"]')?.textContent).toContain('A carregar restaurantes…');
  });

  it('o estado vazio mostra a mensagem e a ação', () => {
    const fixture = TestBed.createComponent(EmptyStateComponent);
    Object.assign(fixture.componentInstance, { message: 'Ainda não há vales.', actionLabel: 'Comprar', actionLink: '/cliente/vales' });
    fixture.detectChanges();
    const el: HTMLElement = fixture.nativeElement;
    expect(el.textContent).toContain('Ainda não há vales.');
    expect(el.querySelector('a')?.getAttribute('href')).toBe('/cliente/vales');
  });

  it('o estado de erro emite "tentar novamente"', () => {
    const fixture = TestBed.createComponent(ErrorStateComponent);
    let retried = false;
    fixture.componentInstance.retry.subscribe(() => (retried = true));
    fixture.detectChanges();
    (fixture.nativeElement as HTMLElement).querySelector('button')!.click();
    expect(retried).toBeTrue();
  });

  it('a página 404 tem uma ligação para o início', () => {
    const fixture = TestBed.createComponent(NotFoundComponent);
    fixture.detectChanges();
    const el: HTMLElement = fixture.nativeElement;
    expect(el.textContent).toContain('Página não encontrada');
    expect(el.querySelector('a')?.getAttribute('href')).toBe('/');
  });

  it('a Política de Privacidade descreve direitos, CNPD e cookies', () => {
    const fixture = TestBed.createComponent(PrivacyComponent);
    fixture.detectChanges();
    const text = (fixture.nativeElement as HTMLElement).textContent || '';
    ['Responsável pelo tratamento', 'Stripe', 'CNPD', 'estritamente necessários', '__Host-snackify', 'Apagar conta']
      .forEach((part) => expect(text).toContain(part));
    expect((fixture.nativeElement as HTMLElement).querySelector('#cookies')).toBeTruthy();
  });

  it('as rotas desconhecidas mostram a página 404 e existe /privacidade', () => {
    expect(routes.find((r) => r.path === '**')?.component).toBe(NotFoundComponent);
    expect(routes.find((r) => r.path === 'privacidade')?.component).toBe(PrivacyComponent);
  });
});

describe('errorMessage', () => {
  it('traduz falhas de rede, limites, erros do servidor e mensagens da API', () => {
    expect(errorMessage(new HttpErrorResponse({ status: 0 }))).toBe(OFFLINE_MESSAGE);
    expect(errorMessage(new HttpErrorResponse({ status: 429 }))).toMatch(/Demasiados pedidos/);
    expect(errorMessage(new HttpErrorResponse({ status: 500, error: { message: 'stack interno' } }))).not.toContain('stack');
    expect(errorMessage(new HttpErrorResponse({ status: 400, error: { message: 'Vale inválido.' } }))).toBe('Vale inválido.');
    expect(errorMessage(new HttpErrorResponse({ status: 400 }), 'Falhou.')).toBe('Falhou.');
  });
});
