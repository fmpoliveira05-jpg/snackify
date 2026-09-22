import { Component, OnDestroy, OnInit } from '@angular/core';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { ProfileService } from '../../services/profile.service';
import { AuthService } from '../../services/auth.service';
import { fieldLabels, fieldValueFormat } from '../../utils/field-formatters';

interface User {
  _id?: string;
  __v?: number;
  password?: string;
  userType?: string;
  profilePicture?: string;
  logo?: string;
  [key: string]: any;
}

/**
 * Perfil do utilizador autenticado e histórico de encomendas.
 *
 * - Cliente: cancelar (5 minutos), pagar online e avaliar encomendas entregues.
 * - Restaurante: avançar o estado das encomendas; a lista é atualizada a cada
 *   {@link ProfileComponent.POLL_SECONDS} segundos e cada encomenda nova gera uma notificação.
 * - Administrador: atalhos para validar restaurantes e gerir categorias.
 */
@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, RouterModule, MatSnackBarModule],
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.css']
})

export class ProfileComponent implements OnInit, OnDestroy {
  /** Intervalo entre atualizações da lista de encomendas de um restaurante. */
  static readonly POLL_SECONDS = 20;

  user: User = {};
  orders: any[] = [];
  isAdmin = false;
  error: string = '';
  userType: string = '';

  constructor(
    private profileService: ProfileService,
    private authService: AuthService,
    private router: Router,
    private snackBar: MatSnackBar
  ) {}

  /** Ids das encomendas já mostradas, para detetar as novas. */
  private knownOrderIds: Set<string> | null = null;
  private pollTimer: ReturnType<typeof setInterval> | null = null;

  ngOnInit(): void {
    this.loadProfile();
    this.loadOrders();
  }

  ngOnDestroy(): void {
    if (this.pollTimer) clearInterval(this.pollTimer);
  }

  loadProfile() {
    this.profileService.getProfile().subscribe({
      next: data => {
        this.user = data;
        this.userType = data.userType;
        this.isAdmin = data.userType === 'admin';
        if (this.isRestaurant && !this.pollTimer) {
          this.pollTimer = setInterval(() => this.loadOrders(), ProfileComponent.POLL_SECONDS * 1000);
        }
      },
      error: err => this.error = err?.message || 'Erro ao carregar perfil.'
    });
  }

  get isRestaurant(): boolean {
    return this.user?.userType === 'restaurant';
  }

  loadOrders() {
    this.profileService.getOrderHistory().subscribe({
      next: orders => {
        this.notifyNewOrders(orders);
        this.orders = orders;
      },
      error: err => console.error('Erro ao carregar histórico:', err)
    });
  }

  /**
   * Mostra uma notificação por cada encomenda que não existia na última atualização.
   * Na primeira carga não há aviso (são encomendas antigas).
   */
  private notifyNewOrders(orders: any[]): void {
    const ids = new Set(orders.map(o => String(o._id)));
    if (this.knownOrderIds && this.isRestaurant) {
      const fresh = orders.filter(o => !this.knownOrderIds!.has(String(o._id)));
      if (fresh.length === 1) {
        this.snackBar.open(`Nova encomenda ${fresh[0].orderCode || ''} recebida.`, 'Ver', { duration: 8000, verticalPosition: 'top' });
      } else if (fresh.length > 1) {
        this.snackBar.open(`${fresh.length} novas encomendas recebidas.`, 'Ver', { duration: 8000, verticalPosition: 'top' });
      }
    }
    this.knownOrderIds = ids;
  }

  cancelOrder(orderId: string) {
    if (!confirm("Tens a certeza que queres cancelar este pedido?")) return;

    this.profileService.cancelOrder(orderId).subscribe({
      next: () => {
        alert("Pedido cancelado com sucesso!");
        this.loadOrders();
      },
      error: err => alert(err?.message || "Erro ao cancelar pedido.")
    });
  }

  pay(orderId: string, orderCode: string, dishes: any[]) {
    this.profileService.payNow(orderId, orderCode, dishes).subscribe({
      next: (res) => {
        if (res.url) window.location.href = res.url;
      },
      error: err => alert("Erro ao iniciar pagamento.")
    });
  }

  reviewOrder(orderId: string) {
    this.router.navigate(['/user', 'perfil', 'encomendas', orderId, 'avaliar']);
  }

  logout() {
    this.authService.logout();
  }

  isOrderPendingAndRecent(order: any): boolean {
    if (!order?.orderDate || order.state !== 'pendente') return false;
    const now = Date.now();
    const orderTime = new Date(order.orderDate).getTime();
    const minutesSinceOrder = (now - orderTime) / 60000;
    return minutesSinceOrder <= 5;
  }

  updateOrderState(orderId: string, newState: string) {
    if (!confirm(`Tem a certeza que quer alterar o estado para "${newState}"?`)) return;

    this.profileService.updateOrderState(orderId, newState).subscribe({
      next: () => {
        alert(`Estado da encomenda atualizado para "${newState}" com sucesso.`);
        this.loadOrders();
      },
      error: err => alert(err?.message || 'Erro ao atualizar o estado da encomenda.')
    });
  }

  get formattedUserFields() {
    if (!this.user) return [];

    return (Object.keys(this.user) as Array<keyof typeof fieldLabels>)
      .filter(key => fieldLabels[key] !== undefined)
      .map(key => ({
        label: fieldLabels[key],
        value: fieldValueFormat(key, this.user[key])
      }));
  }

  get userTypeFormatted(): string {
    return this.user.userType
      ? fieldValueFormat('userType', this.user.userType)
      : 'Restaurante';
  }
}