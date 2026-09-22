import { Component, OnInit } from '@angular/core';
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

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.css']
})

export class ProfileComponent implements OnInit {
  user: User = {};
  orders: any[] = [];
  isAdmin = false;
  error: string = '';
  userType: string = '';

  constructor(
    private profileService: ProfileService,
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadProfile();
    this.loadOrders();
  }

  loadProfile() {
    this.profileService.getProfile().subscribe({
      next: data => {
        this.user = data;
        this.userType = data.userType;
        this.isAdmin = data.userType === 'admin';
        console.log('Perfil carregado:', this.user);
      },
      error: err => this.error = err?.message || 'Erro ao carregar perfil.'
    });
  }

  loadOrders() {
    this.profileService.getOrderHistory().subscribe({
      next: orders => this.orders = orders,
      error: err => console.error('Erro ao carregar histórico:', err)
    });
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