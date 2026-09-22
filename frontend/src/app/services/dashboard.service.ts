import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

interface DashboardData {
  orderTotals: any;
  isBlocked: boolean;
  blockedUntil: string | null;
}

/**
 * Dados do painel do cliente (totais das últimas encomendas e estado de bloqueio).
 */
@Injectable({
  providedIn: 'root'
})
export class DashboardService {
  private apiUrl = `${environment.apiUrl}/cliente/api/dashboard`;

  constructor(private http: HttpClient) {}

  getDashboardData(): Observable<DashboardData> {
    return this.http.get<DashboardData>(this.apiUrl, { withCredentials: true });
  }
}