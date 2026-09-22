import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { RestaurantsService } from '../../services/restaurants.service';
import { CartService } from '../../services/cart.service';

@Component({
  selector: 'app-dish-list',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './dish-list.component.html',
  styleUrls: ['./dish-list.component.css']
})
export class DishListComponent implements OnInit {
  menu: any = null;
  dishes: any[] = [];
  cart: any = null;

  constructor(
    private restaurantsService: RestaurantsService,
    private route: ActivatedRoute,
    private cartService: CartService
  ) {}

  ngOnInit(): void {
    const menuId = this.route.snapshot.paramMap.get('id') || '';

    this.restaurantsService.getMenuById(menuId).subscribe({
      next: data => this.menu = data,
      error: err => console.error('Erro ao carregar menu', err)
    });

    this.restaurantsService.getDishesByMenu(menuId).subscribe({
      next: data => {
        this.dishes = data.map(dish => ({
          ...dish,
          selectedAmount: 1,
          selectedDose: dish.pricePerDose?.[0]?.dose || null
        }));
      },
      error: err => console.error('Erro ao carregar pratos', err)
    });

    this.cartService.loadCart().subscribe({
      next: cart => this.cart = cart,
      error: err => console.error('Erro ao carregar carrinho', err)
    });

    this.cartService.cart$.subscribe(cart => this.cart = cart);
  }

  addToCart(dish: any) {
    const payload = {
      dishId: dish._id,
      amount: dish.selectedAmount,
      dose: dish.selectedDose
    };

    this.cartService.addToCart(payload).subscribe({
      next: cart => {
        console.log('Carrinho atualizado:', cart);
        alert('Prato adicionado ao carrinho.');
      },
      error: err => {
        console.error(err);
        alert('Erro ao adicionar prato ao carrinho.');
      }
    });
  }
}