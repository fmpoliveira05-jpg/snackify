import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { RestaurantsService } from '../../services/restaurants.service';
import { CartService } from '../../services/cart.service';
import { DishCardComponent } from '../dish-card/dish-card.component';

/**
 * Pratos de um menu, cada um com a sua página resumida (imagem, categoria, informação
 * nutricional e preços por dose).
 */
@Component({
  selector: 'app-dish-list',
  standalone: true,
  imports: [CommonModule, MatSnackBarModule, DishCardComponent],
  templateUrl: './dish-list.component.html',
  styleUrls: ['./dish-list.component.css']
})
export class DishListComponent implements OnInit {
  menu: any = null;
  dishes: any[] = [];

  constructor(
    private restaurantsService: RestaurantsService,
    private route: ActivatedRoute,
    private cartService: CartService,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    const menuId = this.route.snapshot.paramMap.get('id') || '';

    this.restaurantsService.getMenuById(menuId).subscribe({
      next: data => this.menu = data,
      error: err => console.error('Erro ao carregar menu', err)
    });

    this.restaurantsService.getDishesByMenu(menuId).subscribe({
      next: data => this.dishes = data,
      error: err => console.error('Erro ao carregar pratos', err)
    });
  }

  /** Junta ao carrinho o prato escolhido num dos cartões. */
  addToCart(event: { dishId: string; amount: number; dose: string }) {
    this.cartService.addToCart(event).subscribe({
      next: () => this.snackBar.open('Prato adicionado ao carrinho.', 'Fechar', { duration: 2500 }),
      error: err => this.snackBar.open(err?.error?.message || 'Erro ao adicionar prato ao carrinho.', 'Fechar', { duration: 4000 })
    });
  }
}
