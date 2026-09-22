import { Routes } from '@angular/router';
import { RestaurantsComponent } from './components/restaurants/restaurants.component';
import { MenuListComponent } from './components/menus/menu-list.component';
import { DishListComponent } from './components/dishes/dish-list.component';
import { CartComponent } from './components/cart/cart.component';
import { CustomerDashboardComponent } from './components/customer-dashboard/customer-dashboard.component';
import { LoginComponent } from './components/login/login.component';
import { CheckoutComponent } from './components/checkout/checkout.component';
import { ProfileComponent } from './components/profile/profile.component';
import { UpdateProfileComponent } from './components/profile/update-profile/update-profile.component';
import { ValidateRestaurantsComponent } from './components/profile/validate-restaurants/validate-restaurants.component';
import { CreateCategoriesComponent } from './components/profile/create-categories/create-categories.component';
import { NoAuthGuard } from './guards/no-auth.guard';
import { AuthGuard } from './guards/auth.guard';
import { ListCheckedRestaurantsComponent } from './components/profile/list-checked-restaurants/list-checked-restaurants.component';
import { ListCategoriesComponent } from './components/profile/list-categories/list-categories.component';
import { ReviewComponent } from './components/review/review.component';
import { DishSearchComponent } from './components/dish-search/dish-search.component';
import { VouchersComponent } from './components/vouchers/vouchers.component';

export const routes: Routes = [
  { path: 'login', component: LoginComponent, canActivate: [NoAuthGuard] },
  { path: 'user/perfil', component: ProfileComponent, canActivate: [AuthGuard] },
  { path: 'user/perfil/editar', component: UpdateProfileComponent, canActivate: [AuthGuard] },
  { path: 'user/perfil/encomendas/:id/avaliar', component: ReviewComponent, canActivate: [AuthGuard] },
  { path: 'user/perfil/validar-restaurantes', component: ValidateRestaurantsComponent, canActivate: [AuthGuard] },
  { path: 'user/perfil/listar-restaurantes-validados', component: ListCheckedRestaurantsComponent, canActivate: [AuthGuard] },
  { path: 'user/perfil/criar-categoria', component: CreateCategoriesComponent, canActivate: [AuthGuard] },
  { path : 'user/perfil/listar-categorias', component : ListCategoriesComponent, canActivate: [AuthGuard] },
  {
    path: 'cliente',
    canActivate: [AuthGuard],
    children: [
      { path: 'dashboard', component: CustomerDashboardComponent },
      { path: 'restaurantes', component: RestaurantsComponent },
      { path: 'pratos', component: DishSearchComponent },
      { path: 'vales', component: VouchersComponent },
      { path: 'restaurantes/:id/menus', component: MenuListComponent },
      { path: 'menus/:id/pratos', component: DishListComponent },
      { path: 'carrinho', component: CartComponent },
      { path: 'carrinho/checkout/:id', component: CheckoutComponent }
    ]
  },
  { path: '', redirectTo: 'login', pathMatch: 'full' },
  { path: '**', redirectTo: '' }
];