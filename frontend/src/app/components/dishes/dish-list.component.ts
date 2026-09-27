import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { forkJoin } from 'rxjs';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { RestaurantsService } from '../../services/restaurants.service';
import { CartService } from '../../services/cart.service';
import { DishCardComponent } from '../dish-card/dish-card.component';
import { errorMessage } from '../../utils/http-error';
import { LoadingStateComponent } from '../../shared/loading-state.component';
import { EmptyStateComponent } from '../../shared/empty-state.component';
import { ErrorStateComponent } from '../../shared/error-state.component';

/**
 * Pratos de um menu, cada um com a sua página resumida (imagem, categoria, informação
 * nutricional e preços por dose).
 */
@Component({
  selector: 'app-dish-list',
  standalone: true,
  imports: [CommonModule, MatSnackBarModule, DishCardComponent, LoadingStateComponent, EmptyStateComponent, ErrorStateComponent],
  templateUrl: './dish-list.component.html',
  styleUrls: ['./dish-list.component.css']
})
export class DishListComponent implements OnInit {
  menu: any = null;
  dishes: any[] = [];
  isLoading = true;
  error = '';
  notFound = false;
  /** Pratos a ser adicionados ao carrinho (sem cliques repetidos). */
  adding = new Set<string>();

  constructor(
    private restaurantsService: RestaurantsService,
    private route: ActivatedRoute,
    private cartService: CartService,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    const menuId = this.route.snapshot.paramMap.get('id') || '';
    this.isLoading = true;
    this.error = '';
    forkJoin({
      menu: this.restaurantsService.getMenuById(menuId),
      dishes: this.restaurantsService.getDishesByMenu(menuId),
    }).subscribe({
      next: ({ menu, dishes }) => {
        this.menu = menu;
        this.dishes = dishes;
        this.isLoading = false;
      },
      error: (err) => {
        this.notFound = err?.status === 404 || err?.status === 400;
        this.error = this.notFound ? 'Este menu não existe ou foi removido.' : errorMessage(err, 'Não foi possível carregar os pratos.');
        this.isLoading = false;
      }
    });
  }

  /** Junta ao carrinho o prato escolhido num dos cartões. */
  addToCart(event: { dishId: string; amount: number; dose: string }) {
    if (this.adding.has(event.dishId)) return;
    this.adding.add(event.dishId);
    this.cartService.addToCart(event).subscribe({
      next: () => {
        this.adding.delete(event.dishId);
        this.snackBar.open('Prato adicionado ao carrinho.', 'Fechar', { duration: 2500 });
      },
      error: err => {
        this.adding.delete(event.dishId);
        this.snackBar.open(errorMessage(err, 'Erro ao adicionar prato ao carrinho.'), 'Fechar', { duration: 4000 });
      }
    });
  }
}
