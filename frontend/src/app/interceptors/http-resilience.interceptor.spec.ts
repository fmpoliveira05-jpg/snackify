import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { REQUEST_TIMEOUT_MS, RETRY_DELAY_MS, httpResilienceInterceptor } from './http-resilience.interceptor';
import { TIMEOUT_MESSAGE, errorMessage } from '../utils/http-error';

describe('httpResilienceInterceptor', () => {
  let http: HttpClient;
  let backend: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(withInterceptors([httpResilienceInterceptor])), provideHttpClientTesting()],
    });
    http = TestBed.inject(HttpClient);
    backend = TestBed.inject(HttpTestingController);
  });

  afterEach(() => backend.verify());

  it('repete uma vez um GET que falhou por erro de rede', fakeAsync(() => {
    let result: unknown;
    http.get('/api/x').subscribe((r) => (result = r));
    backend.expectOne('/api/x').error(new ProgressEvent('error'), { status: 0 });
    tick(RETRY_DELAY_MS);
    backend.expectOne('/api/x').flush({ ok: true });
    expect(result).toEqual({ ok: true });
  }));

  it('não repete um GET mais do que uma vez', fakeAsync(() => {
    let error: unknown;
    http.get('/api/x').subscribe({ error: (e) => (error = e) });
    backend.expectOne('/api/x').error(new ProgressEvent('error'), { status: 0 });
    tick(RETRY_DELAY_MS);
    backend.expectOne('/api/x').error(new ProgressEvent('error'), { status: 0 });
    expect(errorMessage(error)).toMatch(/Sem ligação/);
  }));

  it('nunca repete um POST (podia criar uma encomenda em duplicado)', fakeAsync(() => {
    let error: unknown;
    http.post('/api/encomenda', {}).subscribe({ error: (e) => (error = e) });
    backend.expectOne('/api/encomenda').error(new ProgressEvent('error'), { status: 0 });
    tick(RETRY_DELAY_MS * 2);
    backend.expectNone('/api/encomenda');
    expect(error).toBeTruthy();
  }));

  it('não repete erros do servidor (4xx/5xx)', fakeAsync(() => {
    http.get('/api/x').subscribe({ error: () => {} });
    backend.expectOne('/api/x').flush({ message: 'x' }, { status: 500, statusText: 'Erro' });
    tick(RETRY_DELAY_MS);
    backend.expectNone('/api/x');
  }));

  it('falha com uma mensagem clara quando o servidor não responde em 15 s', fakeAsync(() => {
    let error: unknown;
    http.get('/api/lento').subscribe({ error: (e) => (error = e) });
    const req = backend.expectOne('/api/lento');
    tick(REQUEST_TIMEOUT_MS);
    expect(req.cancelled).toBeTrue();
    expect(errorMessage(error)).toBe(TIMEOUT_MESSAGE);
    tick(RETRY_DELAY_MS);
    backend.expectNone('/api/lento');
  }));
});
