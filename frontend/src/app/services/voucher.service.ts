import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

/**
 * Vales de refeição do cliente: consulta, compra para o próprio e oferta a outro cliente.
 */
@Injectable({ providedIn: 'root' })
export class VoucherService {
  private apiUrl = `${environment.apiUrl}/cliente/api/vales`;

  constructor(private http: HttpClient) {}

  /** Valores à venda e vales do cliente. */
  getVouchers(): Observable<{ values: number[]; vouchers: any[] }> {
    return this.http.get<{ values: number[]; vouchers: any[] }>(this.apiUrl);
  }

  /**
   * Compra um vale (pagamento simulado).
   *
   * @param value valor em euros
   * @param giftTo username do cliente a quem se oferece (vazio = para o próprio)
   * @param message mensagem opcional para quem recebe
   */
  buyVoucher(value: number, giftTo?: string, message?: string): Observable<{ message: string; code: string }> {
    return this.http.post<{ message: string; code: string }>(this.apiUrl, { value, giftTo, message });
  }
}
