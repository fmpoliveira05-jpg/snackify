import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DashboardService } from '../../services/dashboard.service';
import { AuthService } from '../../services/auth.service';
import { Router } from '@angular/router';
import { OrderChartComponent } from '../charts/order-chart/order-chart.component';

@Component({
  selector: 'app-customer-dashboard',
  standalone: true,
  imports: [CommonModule, OrderChartComponent],
  templateUrl: './customer-dashboard.component.html',
  styleUrls: ['./customer-dashboard.component.css']
})
export class CustomerDashboardComponent implements OnInit {
  orderTotals: any = null;
  isBlocked = false;
  blockedUntil: string | null = null;
  isLoading = true;
  user: any = null;

  constructor(
    private dashboardService: DashboardService,
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.authService.getUserSession().subscribe({
      next: (user) => {
        this.user = user;

        this.loadDashboardData();
      },
      error: (err) => {
        console.error('Erro ao obter sessão do user:', err);
        this.isLoading = false;
        this.router.navigate(['/auth/login']);
      }
    });
  }

  loadDashboardData() {
    this.dashboardService.getDashboardData().subscribe({
      next: (data) => {
        this.orderTotals = data.orderTotals;
        this.isBlocked = data.isBlocked;
        this.blockedUntil = data.blockedUntil;
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Erro ao carregar dashboard:', err);
        this.isLoading = false;
      }
    });
  }

  goToRestaurants() {
    this.router.navigate(['/cliente/restaurantes']);
  }
}