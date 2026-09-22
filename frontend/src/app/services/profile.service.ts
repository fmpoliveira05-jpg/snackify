import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class ProfileService {
  private baseUrl = 'http://localhost:5000/user/perfil';

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
    return this.http.post(`http://localhost:5000/admin/editar-categorias`, category, { withCredentials: true });
  }

  listCategories(): Observable<any[]> {
    return this.http.get<any[]>(`http://localhost:5000/admin/listar-categorias`, { withCredentials: true });
  }

  payNow(orderId: string, orderCode: string, dishes: any[]): Observable<any> {
    return this.http.post(`http://localhost:5000/cliente/api/carrinho/create-checkout-session`, {
      orderId,
      orderCode,
      dishes
    }, { withCredentials: true });
  }

  getPendingRestaurants(): Observable<any[]> {
    return this.http.get<any[]>(`http://localhost:5000/admin/validar-restaurantes`, { withCredentials: true });
  }

  getCheckedRestaurants(): Observable<any[]> {
    return this.http.get<any[]>(`http://localhost:5000/admin/listar-restaurantes-validados`, { withCredentials: true });
  }

  validateRestaurant(id: string): Observable<any> {
    return this.http.post(`http://localhost:5000/admin/validar-restaurante/${id}`, {}, { withCredentials: true });
  }

  rejectRestaurant(id: string): Observable<any> {
    return this.http.post(`http://localhost:5000/admin/rejeitar-restaurante/${id}`, {}, { withCredentials: true });
  }

  updateOrderState(orderId: string, newState: string) {
    return this.http.patch(`http://localhost:5000/user/api/orders/${orderId}/state`, { state: newState });
  }

  deleteCategory(id: string): Observable<any> {
    return this.http.delete(`http://localhost:5000/admin/remover-categoria/${id}`, { withCredentials: true });
  }

  deleteRestaurant(id: string): Observable<any> {
    return this.http.delete(`http://localhost:5000/admin/remover-restaurante/${id}`, { withCredentials: true });
  }

  disableRestaurant(id: string): Observable<any> {
    return this.http.post(`http://localhost:5000/admin/desativar-restaurante/${id}`, {}, { withCredentials: true });
  }
}