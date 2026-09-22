import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { ProfileService } from '../../../services/profile.service';

/**
 * Restaurantes à espera de validação: o administrador aprova ou rejeita cada pedido.
 */
@Component({
  selector: 'app-validate-restaurants',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './validate-restaurants.component.html',
  styleUrls: ['./validate-restaurants.component.css']
})
export class ValidateRestaurantsComponent implements OnInit {
  pendingRestaurants: any[] = [];
  error = '';

  constructor(private profileService: ProfileService) {}

  ngOnInit(): void {
    this.profileService.getPendingRestaurants().subscribe({
      next: data => this.pendingRestaurants = data,
      error: err => this.error = err?.message || 'Erro ao carregar restaurantes pendentes.'
    });
  }

  validate(id: string) {
    this.profileService.validateRestaurant(id).subscribe({
      next: () => this.pendingRestaurants = this.pendingRestaurants.filter(r => r._id !== id),
      error: err => alert(err?.message || 'Erro ao validar restaurante.')
    });
  }

  reject(id: string) {
    if (!confirm('Tens a certeza que queres rejeitar este restaurante?')) return;

    this.profileService.rejectRestaurant(id).subscribe({
      next: () => this.pendingRestaurants = this.pendingRestaurants.filter(r => r._id !== id),
      error: err => alert(err?.message || 'Erro ao rejeitar restaurante.')
    });
  }
}