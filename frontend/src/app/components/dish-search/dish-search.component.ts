import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { DishFilters, RestaurantsService } from '../../services/restaurants.service';
import { CartService } from '../../services/cart.service';
import { DishCardComponent } from '../dish-card/dish-card.component';

/**
 * Pesquisa de pratos em todos os restaurantes: texto, categoria, restaurante, localização e
 * intervalo de preço, com ordenação por nome ou preço.
 */
@Component({
  selector: 'app-dish-search',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, MatSnackBarModule, DishCardComponent],
  templateUrl: './dish-search.component.html'
})
export class DishSearchComponent implements OnInit {
  dishes: any[] = [];
  categories: any[] = [];
  filters: DishFilters = this.emptyFilters();
  isLoading = false;

  constructor(
    private restaurantsService: RestaurantsService,
    private cartService: CartService,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.restaurantsService.getCategories().subscribe({
      next: (data) => this.categories = data,
      error: (err) => console.error('Erro ao carregar categorias', err)
    });
    this.search();
  }

  /** Pede ao servidor os pratos que correspondem aos filtros. */
  search(): void {
    this.isLoading = true;
    this.restaurantsService.searchDishes(this.filters).subscribe({
      next: (data) => {
        this.dishes = data;
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Erro na pesquisa de pratos', err);
        this.isLoading = false;
      }
    });
  }

  clear(): void {
    this.filters = this.emptyFilters();
    this.search();
  }

  /** Adiciona ao carrinho o prato escolhido no cartão. */
  addToCart(event: { dishId: string; amount: number; dose: string }): void {
    this.cartService.addToCart(event).subscribe({
      next: () => this.snackBar.open('Prato adicionado ao carrinho.', 'Fechar', { duration: 2500 }),
      error: (err) => this.snackBar.open(err?.error?.message || 'Não foi possível adicionar o prato.', 'Fechar', { duration: 4000 })
    });
  }

  private emptyFilters(): DishFilters {
    return { q: '', category: '', restaurant: '', location: '', minPrice: null, maxPrice: null, sort: 'nome' };
  }
}
