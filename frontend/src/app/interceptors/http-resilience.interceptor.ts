import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { retry, throwError, timeout, timer } from 'rxjs';
import { TIMEOUT_MESSAGE } from '../utils/http-error';

/** Tempo máximo à espera de uma resposta da API. */
export const REQUEST_TIMEOUT_MS = 15000;
/** Pausa antes de repetir um GET que falhou por falta de rede. */
export const RETRY_DELAY_MS = 500;

const SAFE_METHODS = new Set(['GET', 'HEAD']);

/**
 * Pedidos que não ficam pendurados e uma segunda tentativa só quando é seguro:
 *  - qualquer pedido sem resposta em 15 s falha com uma mensagem clara (TIMEOUT);
 *  - um GET/HEAD que falhe por erro de rede (status 0) é repetido UMA vez;
 *  - POST/PUT/PATCH/DELETE nunca são repetidos automaticamente (podiam criar encomendas ou
 *    pagamentos em duplicado); a repetição destes é feita pelo utilizador, com Idempotency-Key.
 */
export const httpResilienceInterceptor: HttpInterceptorFn = (req, next) => {
  const canRetry = SAFE_METHODS.has(req.method);
  return next(req).pipe(
    timeout({
      each: REQUEST_TIMEOUT_MS,
      with: () => throwError(() => new HttpErrorResponse({
        status: 0,
        statusText: 'Timeout',
        url: req.urlWithParams,
        error: { code: 'TIMEOUT', message: TIMEOUT_MESSAGE },
      })),
    }),
    retry({
      count: canRetry ? 1 : 0,
      delay: (err) => {
        const networkError = err instanceof HttpErrorResponse && err.status === 0 && err.error?.code !== 'TIMEOUT';
        return networkError ? timer(RETRY_DELAY_MS) : throwError(() => err);
      },
    }),
  );
};
