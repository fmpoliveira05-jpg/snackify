import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { DishFilters, RestaurantsService } from '../../services/restaurants.service';
import { CartService } from '../../services/cart.service';
import { DishCardComponent } from '../dish-card/dish-card.component';
import { errorMessage } from '../../utils/http-error';
import { LoadingStateComponent } from '../../shared/loading-state.component';
import { EmptyStateComponent } from '../../shared/empty-state.component';
import { ErrorStateComponent } from '../../shared/error-state.component';

/**
 * Pesquisa de pratos em todos os restaurantes: texto, categoria, restaurante, localização e
 * intervalo de preço, com ordenação por nome ou preço.
 */
@Component({
  selector: 'app-dish-search',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, MatSnackBarModule, DishCardComponent, LoadingStateComponent, EmptyStateComponent, ErrorStateComponent],
  templateUrl: './dish-search.component.html'
})
export class DishSearchComponent implements OnInit {
  dishes: any[] = [];
  categories: any[] = [];
  filters: DishFilters = this.emptyFilters();
  isLoading = false;
  isLoadingMore = false;
  error = '';
  total = 0;
  page = 1;
  /** Pratos a ser adicionados ao carrinho (evita pedidos repetidos com cliques seguidos). */
  adding = new Set<string>();

  constructor(
    private restaurantsService: RestaurantsService,
    private cartService: CartService,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.restaurantsService.getCategories().subscribe({
      next: (data) => this.categories = data,
      // Sem categorias a pesquisa continua a funcionar (só falta esse filtro).
      error: () => this.categories = []
    });
    this.search();
  }

  /** Pede ao servidor os pratos que correspondem aos filtros. */
  search(): void {
    this.isLoading = true;
    this.error = '';
    this.page = 1;
    this.restaurantsService.searchDishes(this.filters, 1).subscribe({
      next: (page) => {
        this.dishes = page.items;
        this.total = page.total;
        this.isLoading = false;
      },
      error: (err) => {
        this.error = errorMessage(err, 'Não foi possível pesquisar os pratos.');
        this.isLoading = false;
      }
    });
  }

  get hasMore(): boolean {
    return this.dishes.length < this.total;
  }

  loadMore(): void {
    if (this.isLoadingMore || !this.hasMore) return;
    this.isLoadingMore = true;
    this.restaurantsService.searchDishes(this.filters, this.page + 1).subscribe({
      next: (page) => {
        this.page += 1;
        this.dishes = [...this.dishes, ...page.items];
        this.total = page.total;
        this.isLoadingMore = false;
      },
      error: (err) => {
        this.error = errorMessage(err, 'Não foi possível carregar mais pratos.');
        this.isLoadingMore = false;
      }
    });
  }

  clear(): void {
    this.filters = this.emptyFilters();
    this.search();
  }

  /** Adiciona ao carrinho o prato escolhido no cartão. */
  addToCart(event: { dishId: string; amount: number; dose: string }): void {
    if (this.adding.has(event.dishId)) return;
    this.adding.add(event.dishId);
    this.cartService.addToCart(event).subscribe({
      next: () => {
        this.adding.delete(event.dishId);
        this.snackBar.open('Prato adicionado ao carrinho.', 'Fechar', { duration: 2500 });
      },
      error: (err) => {
        this.adding.delete(event.dishId);
        this.snackBar.open(errorMessage(err, 'Não foi possível adicionar o prato.'), 'Fechar', { duration: 4000 });
      }
    });
  }

  private emptyFilters(): DishFilters {
    return { q: '', category: '', restaurant: '', location: '', minPrice: null, maxPrice: null, sort: 'nome' };
  }
}
