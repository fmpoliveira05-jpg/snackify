import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { Observable } from 'rxjs';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { ProfileService } from '../../../services/profile.service';
import { errorMessage } from '../../../utils/http-error';
import { LoadingStateComponent } from '../../../shared/loading-state.component';
import { EmptyStateComponent } from '../../../shared/empty-state.component';
import { ErrorStateComponent } from '../../../shared/error-state.component';

/**
 * Lista de restaurantes validados, onde o administrador os pode desativar ou remover.
 */
@Component({
  selector: 'app-list-checked-restaurants',
  standalone: true,
  imports: [CommonModule, RouterModule, MatSnackBarModule, LoadingStateComponent, EmptyStateComponent, ErrorStateComponent],
  templateUrl: './list-checked-restaurants.component.html',
  styleUrls: ['./list-checked-restaurants.component.css']
})
export class ListCheckedRestaurantsComponent implements OnInit {
  checkedRestaurants: any[] = [];
  error = '';
  isLoading = true;
  busyId: string | null = null;

  constructor(private profileService: ProfileService, private snackBar: MatSnackBar) {}

  ngOnInit(): void {
    this.loadRestaurants();
  }

  loadRestaurants() {
    this.isLoading = true;
    this.error = '';
    this.profileService.getCheckedRestaurants().subscribe({
      next: data => {
        this.checkedRestaurants = data;
        this.isLoading = false;
      },
      error: err => {
        this.error = errorMessage(err, 'Erro ao carregar restaurantes validados.');
        this.isLoading = false;
      }
    });
  }

  disableRestaurant(id: string) {
    if (!confirm('Tem a certeza de que quer desativar este restaurante?')) return;
    this.run(id, this.profileService.disableRestaurant(id), 'Restaurante desativado.', 'Erro ao desativar restaurante.');
  }

  deleteRestaurant(id: string) {
    if (!confirm('Tem a certeza de que quer remover este restaurante?')) return;
    this.run(id, this.profileService.deleteRestaurant(id), 'Restaurante removido.', 'Erro ao remover restaurante.');
  }

  private run(id: string, request: Observable<any>, success: string, fallback: string) {
    if (this.busyId) return;
    this.busyId = id;
    request.subscribe({
      next: () => {
        this.busyId = null;
        this.checkedRestaurants = this.checkedRestaurants.filter(r => r._id !== id);
        this.snackBar.open(success, 'Fechar', { duration: 4000 });
      },
      error: err => {
        this.busyId = null;
        this.snackBar.open(errorMessage(err, fallback), 'Fechar', { duration: 5000 });
      }
    });
  }
}
