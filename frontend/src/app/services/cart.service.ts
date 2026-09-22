import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, tap } from 'rxjs';
import { environment } from '../../environments/environment';

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

  finalizeOrder(): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/finalizar`, {});
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