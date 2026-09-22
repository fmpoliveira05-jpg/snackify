import { TestBed } from '@angular/core/testing';
import { HttpTestingController } from '@angular/common/http/testing';
import { CartService } from './cart.service';
import { environment } from '../../environments/environment';
import { testProviders } from '../../testing/test-providers';

describe('CartService', () => {
  const base = `${environment.apiUrl}/cliente/api/carrinho`;
  let service: CartService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: testProviders });
    service = TestBed.inject(CartService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('carrega o carrinho e guarda-o no estado local', () => {
    service.loadCart().subscribe();
    http.expectOne(base).flush({ items: [{ dose: '1', amount: 2 }], total: 17.8 });
    expect(service.getCart().total).toBe(17.8);
  });

  it('adiciona pratos com o payload esperado pela API', () => {
    service.addToCart({ dishId: 'd1', amount: 2, dose: '1/2' }).subscribe();
    const req = http.expectOne(`${base}/adicionar`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ dishId: 'd1', amount: 2, dose: '1/2' });
    req.flush({ items: [], total: 0 });
  });

  it('remove um item indicando prato e dose na query string', () => {
    service.removeItemFromCart('d1', '1').subscribe();
    const req = http.expectOne((r) => r.url === `${base}/remover`);
    expect(req.request.method).toBe('DELETE');
    expect(req.request.params.get('dishId')).toBe('d1');
    expect(req.request.params.get('dose')).toBe('1');
    req.flush({ items: [], total: 0 });
  });

  it('esvazia o estado local ao limpar o carrinho', () => {
    service.clearCart().subscribe();
    http.expectOne(`${base}/limpar`).flush({});
    expect(service.getCart()).toEqual({ items: [], total: 0 });
  });
});
