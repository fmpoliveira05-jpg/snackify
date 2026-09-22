import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class RestaurantsService {

  constructor(private http: HttpClient) {}

  getRestaurants(): Observable<any> {
    return this.http.get(`${environment.apiUrl}/cliente/api/restaurantes`);
  }

  getRestaurantById(id: string) {
    return this.http.get(`${environment.apiUrl}/cliente/api/restaurantes/${id}`);
  }

  getMenuById(id: string) {
    return this.http.get(`${environment.apiUrl}/cliente/api/menus/${id}`);
  }

  getMenusByRestaurant(id: string): Observable<any> {
    return this.http.get(`${environment.apiUrl}/cliente/api/restaurantes/${id}/menus`);
  }

  getDishesByMenu(menuId: string): Observable<any[]> {
    return this.http.get<any[]>(`${environment.apiUrl}/cliente/api/menus/${menuId}/pratos`);
  }
}
