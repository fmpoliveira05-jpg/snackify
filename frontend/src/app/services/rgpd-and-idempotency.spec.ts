import { TestBed } from '@angular/core/testing';
import { HttpTestingController } from '@angular/common/http/testing';
import { testProviders } from '../../testing/test-providers';
import { environment } from '../../environments/environment';
import { CartService } from './cart.service';
import { ProfileService } from './profile.service';
import { RestaurantsService } from './restaurants.service';
import { VoucherService } from './voucher.service';
import { AuthService } from './auth.service';
import { newIdempotencyKey } from '../utils/idempotency';

describe('serviços: idempotência, paginação, cache e RGPD', () => {
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: testProviders });
    http = TestBed.inject(HttpTestingController);
    // O AuthService pede /auth/me ao ser criado.
    TestBed.inject(AuthService);
    http.match(`${environment.apiUrl}/auth/me`).forEach((r) => r.flush(null));
  });

  afterEach(() => http.verify());

  it('as chaves de idempotência são diferentes em cada tentativa', () => {
    expect(newIdempotencyKey()).not.toBe(newIdempotencyKey());
    expect(newIdempotencyKey()).toMatch(/^[A-Za-z0-9-]{16,}$/);
  });

  it('finalizar a encomenda envia o cabeçalho Idempotency-Key', () => {
    TestBed.inject(CartService).finalizeOrder({ fulfilment: 'entrega' }, 'chave-123456').subscribe();
    const req = http.expectOne(`${environment.apiUrl}/cliente/api/carrinho/finalizar`);
    expect(req.request.headers.get('Idempotency-Key')).toBe('chave-123456');
    req.flush({});
  });

  it('comprar um vale envia o cabeçalho Idempotency-Key', () => {
    TestBed.inject(VoucherService).buyVoucher(10, undefined, undefined, 'vale-1234567').subscribe();
    const req = http.expectOne(`${environment.apiUrl}/cliente/api/vales`);
    expect(req.request.headers.get('Idempotency-Key')).toBe('vale-1234567');
    req.flush({});
  });

  it('a lista de restaurantes lê o total do cabeçalho X-Total-Count', () => {
    let total = 0;
    TestBed.inject(RestaurantsService).getRestaurants({ q: 'tasca' }, 2).subscribe((page) => (total = page.total));
    const req = http.expectOne((r) => r.url === `${environment.apiUrl}/cliente/api/restaurantes`);
    expect(req.request.params.get('pagina')).toBe('2');
    expect(req.request.params.get('q')).toBe('tasca');
    req.flush([{ name: 'A' }], { headers: { 'X-Total-Count': '37' } });
    expect(total).toBe(37);
  });

  it('as categorias são pedidas uma só vez (shareReplay)', () => {
    const service = TestBed.inject(RestaurantsService);
    let a: any[] = [];
    let b: any[] = [];
    service.getCategories().subscribe((c) => (a = c));
    http.expectOne(`${environment.apiUrl}/cliente/api/categorias`).flush([{ name: 'Peixe' }]);
    service.getCategories().subscribe((c) => (b = c));
    http.expectNone(`${environment.apiUrl}/cliente/api/categorias`);
    expect(b).toEqual(a);
  });

  it('exporta os dados como ficheiro e apaga a conta com a password', () => {
    const profile = TestBed.inject(ProfileService);
    profile.exportData().subscribe();
    const exportReq = http.expectOne(`${environment.apiUrl}/user/perfil/exportar`);
    expect(exportReq.request.responseType).toBe('blob');
    exportReq.flush(new Blob(['{}']));

    profile.deleteAccount('Passw0rd!Forte').subscribe();
    const del = http.expectOne(`${environment.apiUrl}/user/perfil/eliminar`);
    expect(del.request.method).toBe('POST');
    expect(del.request.body).toEqual({ password: 'Passw0rd!Forte' });
    del.flush({ message: 'ok' });
  });

  it('ao terminar a sessão limpa o sessionStorage e o utilizador em memória', () => {
    sessionStorage.setItem('showSuccessToast', 'true');
    const auth = TestBed.inject(AuthService);
    auth.clearClientState();
    expect(sessionStorage.length).toBe(0);
    let user: unknown = 'x';
    auth.currentUser$.subscribe((u) => (user = u));
    expect(user).toBeNull();
  });
});
