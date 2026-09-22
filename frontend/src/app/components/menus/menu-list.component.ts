import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute } from '@angular/router';
import { RestaurantsService } from '../../services/restaurants.service';

/**
 * Menus de um restaurante, com ligação para os pratos de cada um.
 */
@Component({
  selector: 'app-menu-list',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './menu-list.component.html',
  styleUrls: ['./menu-list.component.css']
})
export class MenuListComponent implements OnInit {
  restaurant: any = null;
  menus: any[] = [];

  constructor(
    private restaurantsService: RestaurantsService,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    const restaurantId = this.route.snapshot.paramMap.get('id') || '';

    this.restaurantsService.getRestaurantById(restaurantId).subscribe({
      next: (data) => this.restaurant = data,
      error: (err) => console.error('Erro ao carregar restaurante', err)
    });

    this.restaurantsService.getMenusByRestaurant(restaurantId).subscribe({
      next: (data) => this.menus = data,
      error: (err) => console.error('Erro ao carregar menus', err)
    });
  }
}