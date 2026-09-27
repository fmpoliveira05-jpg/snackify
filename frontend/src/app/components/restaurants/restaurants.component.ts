import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { RestaurantFilters, RestaurantsService } from '../../services/restaurants.service';
import { assetUrl } from '../../utils/asset-url';
import { errorMessage } from '../../utils/http-error';
import { LoadingStateComponent } from '../../shared/loading-state.component';
import { EmptyStateComponent } from '../../shared/empty-state.component';
import { ErrorStateComponent } from '../../shared/error-state.component';

/**
 * Lista de restaurantes validados, com pesquisa pelo nome, filtro por localidade/distrito,
 * ordenação e paginação ("Mostrar mais").
 */
@Component({
  selector: 'app-restaurants',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, LoadingStateComponent, EmptyStateComponent, ErrorStateComponent],
  templateUrl: './restaurants.component.html',
  styleUrls: ['./restaurants.component.css']
})
export class RestaurantsComponent implements OnInit {
  restaurants: any[] = [];
  total = 0;
  page = 1;
  filters: RestaurantFilters = { q: '', location: '', sort: 'nome' };
  isLoading = false;
  isLoadingMore = false;
  error = '';
  readonly assetUrl = assetUrl;

  constructor(private restaurantsService: RestaurantsService) {}

  ngOnInit(): void {
    this.search();
  }

  get hasMore(): boolean {
    return this.restaurants.length < this.total;
  }

  /** Volta a pedir a lista ao servidor com os filtros atuais (primeira página). */
  search(): void {
    this.isLoading = true;
    this.error = '';
    this.page = 1;
    this.restaurantsService.getRestaurants(this.filters, 1).subscribe({
      next: (page) => {
        this.restaurants = page.items;
        this.total = page.total;
        this.isLoading = false;
      },
      error: (err) => {
        this.error = errorMessage(err, 'Não foi possível carregar os restaurantes.');
        this.isLoading = false;
      }
    });
  }

  /** Acrescenta a página seguinte à lista. */
  loadMore(): void {
    if (this.isLoadingMore || !this.hasMore) return;
    this.isLoadingMore = true;
    this.restaurantsService.getRestaurants(this.filters, this.page + 1).subscribe({
      next: (page) => {
        this.page += 1;
        this.restaurants = [...this.restaurants, ...page.items];
        this.total = page.total;
        this.isLoadingMore = false;
      },
      error: (err) => {
        this.error = errorMessage(err, 'Não foi possível carregar mais restaurantes.');
        this.isLoadingMore = false;
      }
    });
  }

  /** Limpa os filtros e mostra todos os restaurantes. */
  clear(): void {
    this.filters = { q: '', location: '', sort: 'nome' };
    this.search();
  }
}
