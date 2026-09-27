import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { ProfileService } from '../../../services/profile.service';
import { errorMessage } from '../../../utils/http-error';
import { LoadingStateComponent } from '../../../shared/loading-state.component';
import { EmptyStateComponent } from '../../../shared/empty-state.component';
import { ErrorStateComponent } from '../../../shared/error-state.component';

/**
 * Restaurantes à espera de validação: o administrador aprova ou rejeita cada pedido.
 */
@Component({
  selector: 'app-validate-restaurants',
  standalone: true,
  imports: [CommonModule, RouterModule, LoadingStateComponent, EmptyStateComponent, ErrorStateComponent],
  templateUrl: './validate-restaurants.component.html',
  styleUrls: ['./validate-restaurants.component.css']
})
export class ValidateRestaurantsComponent implements OnInit {
  pendingRestaurants: any[] = [];
  error = '';
  actionError = '';
  isLoading = true;
  busyId: string | null = null;

  constructor(private profileService: ProfileService) {}

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.isLoading = true;
    this.error = '';
    this.profileService.getPendingRestaurants().subscribe({
      next: data => {
        this.pendingRestaurants = data;
        this.isLoading = false;
      },
      error: err => {
        this.error = errorMessage(err, 'Erro ao carregar restaurantes pendentes.');
        this.isLoading = false;
      }
    });
  }

  validate(id: string) {
    this.run(id, this.profileService.validateRestaurant(id), 'Erro ao validar restaurante.');
  }

  reject(id: string) {
    if (!confirm('Tem a certeza de que quer rejeitar este restaurante?')) return;
    this.run(id, this.profileService.rejectRestaurant(id), 'Erro ao rejeitar restaurante.');
  }

  private run(id: string, request: ReturnType<ProfileService['validateRestaurant']>, fallback: string) {
    if (this.busyId) return;
    this.busyId = id;
    this.actionError = '';
    request.subscribe({
      next: () => {
        this.busyId = null;
        this.pendingRestaurants = this.pendingRestaurants.filter(r => r._id !== id);
      },
      error: err => {
        this.busyId = null;
        this.actionError = errorMessage(err, fallback);
      }
    });
  }
}
