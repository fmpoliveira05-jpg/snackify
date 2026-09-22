import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, tap } from 'rxjs';
import { environment } from '../../environments/environment';

/** Escolhas do cliente ao finalizar a encomenda. */
export interface CheckoutOptions {
  fulfilment?: 'entrega' | 'levantamento' | 'no local';
  paymentMethod?: 'online' | 'local';
  identityDoc?: string;
  voucherCode?: string;
}

/**
 * Estado do carrinho do cliente (partilhado entre componentes através de `cart$`) e criação
 * da encomenda.
 */
@Injectable({
  providedIn: 'root'
})
export class CartService {
  private apiUrl = `${environment.apiUrl}/cliente/api/carrinho`;

  private cartSubject = new BehaviorSubject<any>(null);
  cart$ = this.cartSubject.asObservable();

  constructor(private http: HttpClient) {}

  loadCart(): Observable<any> {
    return this.http.get<any>(this.apiUrl).pipe(
      tap(cart => this.cartSubject.next(cart))
    );
  }

  getCart(): any {
    return this.cartSubject.getValue();
  }

  addToCart(payload: { dishId: string; amount: number; dose: string }): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/adicionar`, payload).pipe(
      tap(cart => this.cartSubject.next(cart))
    );
  }

  clearCart(): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/limpar`).pipe(
      tap(() => this.cartSubject.next({ items: [], total: 0 }))
    );
  }

  removeItemFromCart(dishId: string, dose: string): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/remover`, {
      params: { dishId, dose }
    }).pipe(
      tap(cart => this.cartSubject.next(cart))
    );
  }

  /**
   * Cria a encomenda a partir do carrinho.
   *
   * @param options tipo de entrega, forma de pagamento, documento de identificação (pagamento no
   *        local) e código de um vale de refeição
   */
  finalizeOrder(options: CheckoutOptions = {}): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/finalizar`, options);
  }

  getOrderDetails(orderId: string): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/checkout?orderId=${orderId}`);
  }

  createCheckoutSession(orderId: string, orderCode: string, dishes: any[]): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/create-checkout-session`, {
      orderId,
      orderCode,
      dishes
    });
  }
}