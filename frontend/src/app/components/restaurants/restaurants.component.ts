import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { RestaurantFilters, RestaurantsService } from '../../services/restaurants.service';
import { assetUrl } from '../../utils/asset-url';

/**
 * Lista de restaurantes validados, com pesquisa pelo nome, filtro por localidade/distrito e
 * ordenação.
 */
@Component({
  selector: 'app-restaurants',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './restaurants.component.html',
  styleUrls: ['./restaurants.component.css']
})
export class RestaurantsComponent implements OnInit {
  restaurants: any[] = [];
  filters: RestaurantFilters = { q: '', location: '', sort: 'nome' };
  isLoading = false;
  readonly assetUrl = assetUrl;

  constructor(private restaurantsService: RestaurantsService) {}

  ngOnInit(): void {
    this.search();
  }

  /** Volta a pedir a lista ao servidor com os filtros atuais. */
  search(): void {
    this.isLoading = true;
    this.restaurantsService.getRestaurants(this.filters).subscribe({
      next: (data) => {
        this.restaurants = data;
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Erro ao carregar restaurantes', err);
        this.isLoading = false;
      }
    });
  }

  /** Limpa os filtros e mostra todos os restaurantes. */
  clear(): void {
    this.filters = { q: '', location: '', sort: 'nome' };
    this.search();
  }
}
