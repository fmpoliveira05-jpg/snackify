import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CartService } from '../../services/cart.service';
import { Router } from '@angular/router';
import { switchMap } from 'rxjs/operators';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatSnackBarModule } from '@angular/material/snack-bar';

@Component({
  selector: 'app-cart',
  standalone: true,
  imports: [CommonModule, MatSnackBarModule],
  templateUrl: './cart.component.html',
  styleUrls: ['./cart.component.css']
})
export class CartComponent implements OnInit, OnDestroy {
  cart: any = null;
  isLoading = true;

  cartTimeout: Date | null = null;
  minutes: string = '00';
  seconds: string = '00';
  expired: boolean = false;
  private timerInterval: any;

  constructor(
    private cartService: CartService,
    private router: Router,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.loadCartAndStartTimer();

    this.cartService.cart$.subscribe(cart => {
      this.cart = cart;
      if (cart?.timeout) {
        this.startTimer(new Date(cart.timeout));
      }
    });
  }

  ngOnDestroy(): void {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
    }
  }

  loadCartAndStartTimer() {
    this.cartService.loadCart().subscribe({
      next: cart => {
        this.cart = cart;
        this.isLoading = false;

        if (!cart?.items || cart.items.length === 0) {
          this.resetTimer();
        } else if (cart?.timeout) {
          this.startTimer(new Date(cart.timeout));
        }
      },
      error: err => {
        console.error('Erro ao carregar carrinho:', err);
        this.isLoading = false;
      }
    });
  }

  startTimer(timeout: Date) {
    this.cartTimeout = timeout;
    this.expired = false;

    if (this.timerInterval) {
      clearInterval(this.timerInterval);
    }

    this.updateTimer();
    this.timerInterval = setInterval(() => {
      this.updateTimer();
    }, 1000);
  }

  updateTimer() {
    if (!this.cartTimeout) return;

    const now = new Date();
    const diff = this.cartTimeout.getTime() - now.getTime();

    if (diff <= 0) {
      this.minutes = '00';
      this.seconds = '00';
      clearInterval(this.timerInterval);
      this.timerInterval = null;
      this.expired = true;

      this.cartService.clearCart().subscribe({
        next: () => {
          this.cart = { items: [], total: 0 };
          this.isLoading = false;
        },
        error: (err) => {
          console.error('Erro ao limpar carrinho após expiração:', err);
          this.isLoading = false;
          alert('O tempo expirou, mas ocorreu um erro ao limpar o carrinho.');
        }
      });

      return;
    }

    const mins = Math.floor(diff / 60000);
    const secs = Math.floor((diff % 60000) / 1000);

    this.minutes = mins.toString().padStart(2, '0');
    this.seconds = secs.toString().padStart(2, '0');
  }

  finalizeOrder(): void {
    if (this.expired) {
      alert('O tempo para concluir a encomenda expirou. Por favor, adicione itens novamente.');
      return;
    }

    this.cartService.finalizeOrder().subscribe({
      next: (res: any) => {
        const orderId = res.orderId || this.extractOrderIdFromRedirect(res);

        sessionStorage.setItem('showSuccessToast', 'true');

        if (orderId) {
          this.cartService.getOrderDetails(orderId).subscribe({
            next: (order: any) => {
              this.router.navigate([`/cliente/carrinho/checkout/${orderId}`], { state: { order } });
            },
            error: err => console.error('Erro ao obter detalhes da encomenda:', err)
          });
        } else {
          console.error('Não foi possível obter o orderId');
        }
      },
      error: (err) => {
        console.error('Erro ao finalizar encomenda:', err);
        alert('Erro ao finalizar a encomenda.');
      }
    });
  }

  private extractOrderIdFromRedirect(res: any): string {
    const match = res?.url?.match(/orderId=([^&]+)/);
    return match ? match[1] : '';
  }

  getDosePrice(item: any): number | null {
    const match = item?.dishId?.pricePerDose?.find((p: any) => p.dose === item.dose);
    return match ? match.price : null;
  }

  removeItem(item: any) {
    if (this.expired) {
      alert('O tempo para concluir a encomenda expirou. Por favor, adicione itens novamente.');
      return;
    }

    this.isLoading = true;
    this.cartService.removeItemFromCart(item.dishId._id, item.dose).pipe(
      switchMap(() => this.cartService.loadCart())
    ).subscribe({
      next: (cart) => {
        this.cart = cart;
        this.isLoading = false;

        if (!cart?.items || cart.items.length === 0) {
          this.resetTimer();
        } else if (cart?.timeout) {
          this.startTimer(new Date(cart.timeout));
        }
      },
      error: (err) => {
        console.error('Erro ao remover item do carrinho ou carregar carrinho', err);
        this.isLoading = false;
      }
    });
  }

  resetTimer() {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
    this.cartTimeout = null;
    this.minutes = '00';
    this.seconds = '00';
    this.expired = false;
  }
}