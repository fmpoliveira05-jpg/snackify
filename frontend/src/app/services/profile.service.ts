import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

/**
 * Perfil, histórico e estado das encomendas, e operações de administração (restaurantes e categorias).
 */
@Injectable({ providedIn: 'root' })
export class ProfileService {
  private baseUrl = `${environment.apiUrl}/user/perfil`;

  constructor(private http: HttpClient) {}

  getProfile(): Observable<any> {
    return this.http.get(`${this.baseUrl}/dados`, { withCredentials: true });
  }

  updateProfile(data: any): Observable<any> {
    return this.http.put(`${this.baseUrl}/editar`, data, { withCredentials: true });
  }

  getOrderHistory(): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/encomendas`, { withCredentials: true });
  }

  cancelOrder(orderId: string): Observable<any> {
    return this.http.post(`${this.baseUrl}/encomendas/${orderId}/cancelar`, {}, { withCredentials: true });
  }

  createCategory(category: any): Observable<any> {
    return this.http.post(`${environment.apiUrl}/admin/editar-categorias`, category, { withCredentials: true });
  }

  listCategories(): Observable<any[]> {
    return this.http.get<any[]>(`${environment.apiUrl}/admin/listar-categorias`, { withCredentials: true });
  }

  payNow(orderId: string, orderCode: string, dishes: any[]): Observable<any> {
    return this.http.post(`${environment.apiUrl}/cliente/api/carrinho/create-checkout-session`, {
      orderId,
      orderCode,
      dishes
    }, { withCredentials: true });
  }

  getPendingRestaurants(): Observable<any[]> {
    return this.http.get<any[]>(`${environment.apiUrl}/admin/validar-restaurantes`, { withCredentials: true });
  }

  getCheckedRestaurants(): Observable<any[]> {
    return this.http.get<any[]>(`${environment.apiUrl}/admin/listar-restaurantes-validados`, { withCredentials: true });
  }

  validateRestaurant(id: string): Observable<any> {
    return this.http.post(`${environment.apiUrl}/admin/validar-restaurante/${id}`, {}, { withCredentials: true });
  }

  rejectRestaurant(id: string): Observable<any> {
    return this.http.post(`${environment.apiUrl}/admin/rejeitar-restaurante/${id}`, {}, { withCredentials: true });
  }

  updateOrderState(orderId: string, newState: string) {
    return this.http.patch(`${environment.apiUrl}/user/api/orders/${orderId}/state`, { state: newState });
  }

  deleteCategory(id: string): Observable<any> {
    return this.http.delete(`${environment.apiUrl}/admin/remover-categoria/${id}`, { withCredentials: true });
  }

  deleteRestaurant(id: string): Observable<any> {
    return this.http.delete(`${environment.apiUrl}/admin/remover-restaurante/${id}`, { withCredentials: true });
  }

  disableRestaurant(id: string): Observable<any> {
    return this.http.post(`${environment.apiUrl}/admin/desativar-restaurante/${id}`, {}, { withCredentials: true });
  }
}