import { Component, OnDestroy, OnInit } from '@angular/core';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { ProfileService } from '../../services/profile.service';
import { AuthService } from '../../services/auth.service';
import { FormsModule } from '@angular/forms';
import { fieldLabels, fieldValueFormat } from '../../utils/field-formatters';
import { errorMessage } from '../../utils/http-error';
import { LoadingStateComponent } from '../../shared/loading-state.component';
import { EmptyStateComponent } from '../../shared/empty-state.component';
import { ErrorStateComponent } from '../../shared/error-state.component';

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
 * - Todos: descarregar os dados pessoais (RGPD) e apagar a conta.
 */
@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, RouterModule, MatSnackBarModule, FormsModule, LoadingStateComponent, EmptyStateComponent, ErrorStateComponent],
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.css']
})

export class ProfileComponent implements OnInit, OnDestroy {
  /** Intervalo entre atualizações da lista de encomendas de um restaurante. */
  static readonly POLL_SECONDS = 20;

  user: User = {};
  orders: any[] = [];
  ordersTotal = 0;
  ordersPage = 1;
  isAdmin = false;
  error: string = '';
  userType: string = '';

  isLoadingProfile = true;
  isLoadingOrders = true;
  isLoadingMore = false;
  ordersError = '';
  /** Encomenda com uma ação em curso (cancelar, pagar ou mudar de estado): botões desativados. */
  busyOrderId: string | null = null;

  // RGPD: exportação e apagamento da conta.
  isExporting = false;
  showDeleteForm = false;
  deletePassword = '';
  deleteError = '';
  isDeleting = false;

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
    this.isLoadingProfile = true;
    this.error = '';
    this.profileService.getProfile().subscribe({
      next: data => {
        this.user = data;
        this.userType = data.userType;
        this.isAdmin = data.userType === 'admin';
        this.isLoadingProfile = false;
        if (this.isRestaurant && !this.pollTimer) {
          this.pollTimer = setInterval(() => this.refreshFirstPage(), ProfileComponent.POLL_SECONDS * 1000);
        }
      },
      error: err => {
        this.error = errorMessage(err, 'Erro ao carregar perfil.');
        this.isLoadingProfile = false;
      }
    });
  }

  get isRestaurant(): boolean {
    return this.user?.userType === 'restaurant';
  }

  get hasMoreOrders(): boolean {
    return this.orders.length < this.ordersTotal;
  }

  /** Primeira página do histórico. */
  loadOrders() {
    this.isLoadingOrders = true;
    this.ordersError = '';
    this.ordersPage = 1;
    this.profileService.getOrderHistory(1).subscribe({
      next: page => {
        this.notifyNewOrders(page.items);
        this.orders = page.items;
        this.ordersTotal = page.total;
        this.isLoadingOrders = false;
      },
      error: err => {
        // Os administradores não têm histórico (403): não é um erro para mostrar.
        this.ordersError = err?.status === 403 ? '' : errorMessage(err, 'Não foi possível carregar as encomendas.');
        this.isLoadingOrders = false;
      }
    });
  }

  loadMoreOrders() {
    if (this.isLoadingMore || !this.hasMoreOrders) return;
    this.isLoadingMore = true;
    this.profileService.getOrderHistory(this.ordersPage + 1).subscribe({
      next: page => {
        this.ordersPage += 1;
        const known = new Set(this.orders.map(o => String(o._id)));
        this.orders = [...this.orders, ...page.items.filter(o => !known.has(String(o._id)))];
        this.ordersTotal = page.total;
        this.isLoadingMore = false;
      },
      error: err => {
        this.snackBar.open(errorMessage(err, 'Não foi possível carregar mais encomendas.'), 'Fechar', { duration: 4000 });
        this.isLoadingMore = false;
      }
    });
  }

  /** Atualização periódica (restaurante): junta as encomendas novas sem perder as páginas já abertas. */
  private refreshFirstPage() {
    this.profileService.getOrderHistory(1).subscribe({
      next: page => {
        this.notifyNewOrders(page.items);
        const fresh = new Set(page.items.map(o => String(o._id)));
        this.orders = [...page.items, ...this.orders.filter(o => !fresh.has(String(o._id)))];
        this.ordersTotal = page.total;
      },
      // Uma falha pontual na atualização não apaga a lista; tenta-se na volta seguinte.
      error: () => {}
    });
  }

  /**
   * Mostra uma notificação por cada encomenda que não existia na última atualização.
   * Na primeira carga não há aviso (são encomendas antigas).
   */
  private notifyNewOrders(orders: any[]): void {
    const ids = orders.map(o => String(o._id));
    if (this.knownOrderIds && this.isRestaurant) {
      const fresh = orders.filter(o => !this.knownOrderIds!.has(String(o._id)));
      if (fresh.length === 1) {
        this.snackBar.open(`Nova encomenda ${fresh[0].orderCode || ''} recebida.`, 'Ver', { duration: 8000, verticalPosition: 'top' });
      } else if (fresh.length > 1) {
        this.snackBar.open(`${fresh.length} novas encomendas recebidas.`, 'Ver', { duration: 8000, verticalPosition: 'top' });
      }
    }
    this.knownOrderIds = new Set([...(this.knownOrderIds ?? []), ...ids]);
  }

  cancelOrder(orderId: string) {
    if (this.busyOrderId || !confirm("Tem a certeza de que quer cancelar esta encomenda?")) return;
    this.busyOrderId = orderId;
    this.profileService.cancelOrder(orderId).subscribe({
      next: () => {
        this.busyOrderId = null;
        this.snackBar.open('Encomenda cancelada.', 'Fechar', { duration: 4000 });
        this.loadOrders();
      },
      error: err => {
        this.busyOrderId = null;
        this.snackBar.open(errorMessage(err, 'Erro ao cancelar a encomenda.'), 'Fechar', { duration: 5000 });
      }
    });
  }

  pay(orderId: string, orderCode: string, dishes: any[]) {
    if (this.busyOrderId) return;
    this.busyOrderId = orderId;
    this.profileService.payNow(orderId, orderCode, dishes).subscribe({
      next: (res) => {
        // Fica "ocupado" até o browser sair para o Stripe.
        if (res.url) window.location.href = res.url;
        else this.busyOrderId = null;
      },
      error: err => {
        this.busyOrderId = null;
        this.snackBar.open(errorMessage(err, 'Erro ao iniciar o pagamento.'), 'Fechar', { duration: 5000 });
        if (err?.status === 409) this.loadOrders();
      }
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
    if (this.busyOrderId || !confirm(`Tem a certeza que quer alterar o estado para "${newState}"?`)) return;
    this.busyOrderId = orderId;
    this.profileService.updateOrderState(orderId, newState).subscribe({
      next: () => {
        this.busyOrderId = null;
        this.snackBar.open(`Estado atualizado para "${newState}".`, 'Fechar', { duration: 4000 });
        this.loadOrders();
      },
      error: err => {
        this.busyOrderId = null;
        this.snackBar.open(errorMessage(err, 'Erro ao atualizar o estado da encomenda.'), 'Fechar', { duration: 5000 });
        if (err?.status === 409) this.loadOrders();
      }
    });
  }

  /** Descarrega um ficheiro JSON com todos os dados pessoais da conta (RGPD, art. 15.º e 20.º). */
  exportData() {
    if (this.isExporting) return;
    this.isExporting = true;
    this.profileService.exportData().subscribe({
      next: blob => {
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `snackify-dados-${new Date().toISOString().slice(0, 10)}.json`;
        link.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
        this.isExporting = false;
      },
      error: err => {
        this.isExporting = false;
        this.snackBar.open(errorMessage(err, 'Não foi possível exportar os dados.'), 'Fechar', { duration: 5000 });
      }
    });
  }

  /** Apaga a conta depois de confirmar a password (RGPD, art. 17.º). */
  deleteAccount() {
    if (this.isDeleting || !this.deletePassword) return;
    this.isDeleting = true;
    this.deleteError = '';
    this.profileService.deleteAccount(this.deletePassword).subscribe({
      next: () => {
        this.deletePassword = '';
        this.authService.clearClientState();
        this.snackBar.open('A sua conta foi apagada.', 'Fechar', { duration: 6000 });
        this.router.navigate(['/login']);
      },
      error: err => {
        this.isDeleting = false;
        this.deleteError = errorMessage(err, 'Não foi possível apagar a conta.');
      }
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
