import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { of } from 'rxjs';

const params = convertToParamMap({ id: '1', orderId: '1' });

/**
 * Providers comuns aos testes: HTTP falso (nenhum pedido sai do browser), router vazio e
 * uma rota ativa com parâmetros de exemplo.
 */
export const testProviders = [
  provideHttpClient(),
  provideHttpClientTesting(),
  provideRouter([]),
  provideNoopAnimations(),
  {
    provide: ActivatedRoute,
    useValue: {
      snapshot: { paramMap: params, queryParamMap: convertToParamMap({ orderId: '1' }), params: { id: '1', orderId: '1' } },
      paramMap: of(params),
      queryParamMap: of(convertToParamMap({ orderId: '1' })),
      params: of({ id: '1', orderId: '1' }),
      queryParams: of({ orderId: '1' }),
    },
  },
];
