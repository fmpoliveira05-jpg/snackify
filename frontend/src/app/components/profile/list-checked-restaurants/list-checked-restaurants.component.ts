import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { ProfileService } from '../../../services/profile.service';

/**
 * Lista de restaurantes validados, onde o administrador os pode desativar ou remover.
 */
@Component({
  selector: 'app-list-checked-restaurants',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './list-checked-restaurants.component.html',
  styleUrls: ['./list-checked-restaurants.component.css']
})
export class ListCheckedRestaurantsComponent implements OnInit {
  checkedRestaurants: any[] = [];
  error = '';

  constructor(private profileService: ProfileService) {}

  ngOnInit(): void {
    this.loadRestaurants();
  }

  loadRestaurants() {
    this.profileService.getCheckedRestaurants().subscribe({
      next: data => this.checkedRestaurants = data,
      error: err => this.error = err?.message || 'Erro ao carregar restaurantes validados.'
    });
  }

  disableRestaurant(id: string) {
    if (!confirm('Tens a certeza que queres desativar este restaurante?')) return;

    this.profileService.disableRestaurant(id).subscribe({
      next: () => {
        this.checkedRestaurants = this.checkedRestaurants.filter(r => r._id !== id);
        alert('Restaurante desativado com sucesso!');
      },
      error: err => alert(err?.message || 'Erro ao desativar restaurante.')
    });
  }

  deleteRestaurant(id: string) {
    if (!confirm('Tens a certeza que queres remover este restaurante?')) return;

    this.profileService.deleteRestaurant(id).subscribe({
      next: () => {
        this.checkedRestaurants = this.checkedRestaurants.filter(r => r._id !== id);
        alert('Restaurante removido com sucesso!');
      },
      error: err => alert(err?.message || 'Erro ao remover restaurante.')
    });
  }
}