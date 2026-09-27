import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DashboardService } from '../../services/dashboard.service';
import { AuthService } from '../../services/auth.service';
import { Router } from '@angular/router';
import { OrderChartComponent } from '../charts/order-chart/order-chart.component';
import { errorMessage } from '../../utils/http-error';
import { LoadingStateComponent } from '../../shared/loading-state.component';
import { ErrorStateComponent } from '../../shared/error-state.component';
import { EmptyStateComponent } from '../../shared/empty-state.component';

/**
 * Página inicial do cliente: gráfico das últimas encomendas e aviso de bloqueio por cancelamentos.
 */
@Component({
  selector: 'app-customer-dashboard',
  standalone: true,
  imports: [CommonModule, OrderChartComponent, LoadingStateComponent, ErrorStateComponent, EmptyStateComponent],
  templateUrl: './customer-dashboard.component.html',
  styleUrls: ['./customer-dashboard.component.css']
})
export class CustomerDashboardComponent implements OnInit {
  orderTotals: any = null;
  isBlocked = false;
  blockedUntil: string | null = null;
  isLoading = true;
  error = '';
  user: any = null;

  constructor(
    private dashboardService: DashboardService,
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit(): void {
    // A sessão já foi confirmada pelo AuthGuard; o utilizador vem do AuthService (em memória).
    this.authService.currentUser$.subscribe((user) => this.user = user);
    this.loadDashboardData();
  }

  loadDashboardData() {
    this.isLoading = true;
    this.error = '';
    this.dashboardService.getDashboardData().subscribe({
      next: (data) => {
        this.orderTotals = data.orderTotals;
        this.isBlocked = data.isBlocked;
        this.blockedUntil = data.blockedUntil;
        this.isLoading = false;
      },
      error: (err) => {
        this.error = errorMessage(err, 'Não foi possível carregar a sua área pessoal.');
        this.isLoading = false;
      }
    });
  }

  goToRestaurants() {
    this.router.navigate(['/cliente/restaurantes']);
  }
}