import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute } from '@angular/router';
import { forkJoin } from 'rxjs';
import { RestaurantsService } from '../../services/restaurants.service';
import { errorMessage } from '../../utils/http-error';
import { LoadingStateComponent } from '../../shared/loading-state.component';
import { EmptyStateComponent } from '../../shared/empty-state.component';
import { ErrorStateComponent } from '../../shared/error-state.component';

/**
 * Menus de um restaurante, com ligação para os pratos de cada um.
 */
@Component({
  selector: 'app-menu-list',
  standalone: true,
  imports: [CommonModule, RouterModule, LoadingStateComponent, EmptyStateComponent, ErrorStateComponent],
  templateUrl: './menu-list.component.html',
  styleUrls: ['./menu-list.component.css']
})
export class MenuListComponent implements OnInit {
  restaurant: any = null;
  menus: any[] = [];
  isLoading = true;
  error = '';
  notFound = false;

  constructor(
    private restaurantsService: RestaurantsService,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    const restaurantId = this.route.snapshot.paramMap.get('id') || '';
    this.isLoading = true;
    this.error = '';
    this.notFound = false;
    forkJoin({
      restaurant: this.restaurantsService.getRestaurantById(restaurantId),
      menus: this.restaurantsService.getMenusByRestaurant(restaurantId),
    }).subscribe({
      next: ({ restaurant, menus }) => {
        this.restaurant = restaurant;
        this.menus = menus;
        this.isLoading = false;
      },
      error: (err) => {
        this.notFound = err?.status === 404 || err?.status === 400;
        this.error = this.notFound ? 'Este restaurante não existe ou deixou de estar disponível.' : errorMessage(err, 'Não foi possível carregar os menus.');
        this.isLoading = false;
      }
    });
  }
}
