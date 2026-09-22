import {
  HttpInterceptorFn,
  HttpRequest,
  HttpHandlerFn,
} from '@angular/common/http';

/**
 * Envia o cookie da sessão em todos os pedidos à API (withCredentials).
 */
export const authInterceptor: HttpInterceptorFn = (
  req: HttpRequest<any>,
  next: HttpHandlerFn
) => {
  const modifiedReq = req.clone({
    withCredentials: true
  });

  return next(modifiedReq);
};