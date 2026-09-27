import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, map, shareReplay, catchError, throwError } from 'rxjs';
import { PAGE_SIZE, Page, toPage } from '../utils/page';
import { environment } from '../../environments/environment';

/** Filtros aceites pela pesquisa de restaurantes (GET /cliente/api/restaurantes). */
export interface RestaurantFilters {
  q?: string;
  location?: string;
  sort?: 'nome' | 'recentes';
}

/** Filtros aceites pela pesquisa de pratos (GET /cliente/api/pratos). */
export interface DishFilters {
  q?: string;
  category?: string;
  restaurant?: string;
  location?: string;
  minPrice?: number | null;
  maxPrice?: number | null;
  sort?: 'nome' | 'preco-asc' | 'preco-desc';
}

/** Converte um objeto de filtros em parâmetros de URL, ignorando os campos vazios. */
function toParams(filters: object): HttpParams {
  let params = new HttpParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      params = params.set(key, String(value));
    }
  });
  return params;
}

/**
 * Acesso de leitura ao catálogo: restaurantes, menus, pratos e categorias.
 */
@Injectable({
  providedIn: 'root'
})
export class RestaurantsService {
  /** Categorias (dados de referência): pedidas uma vez e partilhadas por todas as páginas. */
  private categories$?: Observable<any[]>;

  constructor(private http: HttpClient) {}

  /** Restaurantes validados, filtrados, ordenados e paginados no servidor. */
  getRestaurants(filters: RestaurantFilters = {}, page = 1): Observable<Page<any>> {
    const params = toParams({ ...filters, pagina: page, limite: PAGE_SIZE });
    return this.http.get<any[]>(`${environment.apiUrl}/cliente/api/restaurantes`, { params, observe: 'response' }).pipe(map(toPage));
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

  /** Pesquisa de pratos em todos os restaurantes, com filtros e ordenação. */
  searchDishes(filters: DishFilters = {}, page = 1): Observable<Page<any>> {
    const params = toParams({ ...filters, pagina: page, limite: PAGE_SIZE });
    return this.http.get<any[]>(`${environment.apiUrl}/cliente/api/pratos`, { params, observe: 'response' }).pipe(map(toPage));
  }

  /** Categorias de pratos, para o filtro da pesquisa (em cache; um erro permite tentar de novo). */
  getCategories(): Observable<any[]> {
    if (!this.categories$) {
      this.categories$ = this.http.get<any[]>(`${environment.apiUrl}/cliente/api/categorias`).pipe(
        catchError((err) => {
          this.categories$ = undefined;
          return throwError(() => err);
        }),
        shareReplay({ bufferSize: 1, refCount: false }),
      );
    }
    return this.categories$;
  }
}
