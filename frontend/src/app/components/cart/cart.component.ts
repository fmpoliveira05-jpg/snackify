import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CartService, CheckoutOptions } from '../../services/cart.service';
import { VoucherService } from '../../services/voucher.service';
import { Router } from '@angular/router';
import { switchMap } from 'rxjs/operators';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { errorMessage } from '../../utils/http-error';
import { newIdempotencyKey } from '../../utils/idempotency';
import { LoadingStateComponent } from '../../shared/loading-state.component';
import { EmptyStateComponent } from '../../shared/empty-state.component';
import { ErrorStateComponent } from '../../shared/error-state.component';

/**
 * Carrinho do cliente: contador dos 10 minutos, remoção de pratos e finalização da encomenda
 * (tipo de entrega, forma de pagamento, documento de identificação e vale de refeição).
 */
@Component({
  selector: 'app-cart',
  standalone: true,
  imports: [CommonModule, FormsModule, MatSnackBarModule, LoadingStateComponent, EmptyStateComponent, ErrorStateComponent],
  templateUrl: './cart.component.html',
  styleUrls: ['./cart.component.css']
})
export class CartComponent implements OnInit, OnDestroy {
  cart: any = null;
  isLoading = true;
  error = '';
  /** Encomenda a ser criada: o botão fica desativado até haver resposta. */
  isSubmitting = false;
  /** Item a ser removido (evita cliques repetidos). */
  removing: string | null = null;
  /**
   * Chave de idempotência desta tentativa de encomenda: se o pedido for repetido (falha de rede,
   * novo clique depois de um erro de ligação), o servidor devolve a mesma encomenda.
   */
  private idempotencyKey = newIdempotencyKey();

  cartTimeout: Date | null = null;
  minutes: string = '00';
  seconds: string = '00';
  expired: boolean = false;
  private timerInterval: any;

  /** Escolhas feitas no formulário de finalização. */
  options: CheckoutOptions = { fulfilment: 'entrega', paymentMethod: 'online', identityDoc: '', voucherCode: '' };
  /** Vales do cliente com saldo, para usar nesta encomenda. */
  vouchers: any[] = [];

  constructor(
    private cartService: CartService,
    private router: Router,
    private snackBar: MatSnackBar,
    private voucherService: VoucherService
  ) {}

  ngOnInit(): void {
    this.loadCartAndStartTimer();
    this.voucherService.getVouchers().subscribe({
      next: data => this.vouchers = (data?.vouchers || []).filter((v: any) => v.balance > 0),
      // Sem vales, o carrinho funciona na mesma (só não aparece a opção de usar um vale).
      error: () => this.vouchers = []
    });

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
    this.isLoading = true;
    this.error = '';
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
        this.error = errorMessage(err, 'Não foi possível carregar o carrinho.');
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
        error: () => {
          this.isLoading = false;
          this.snackBar.open('O tempo expirou, mas não foi possível limpar o carrinho. Atualize a página.', 'Fechar', { duration: 5000 });
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
    if (this.isSubmitting) return;
    if (this.expired) {
      alert('O tempo para concluir a encomenda expirou. Por favor, adicione itens novamente.');
      return;
    }

    if (this.options.paymentMethod === 'local' && !this.options.identityDoc?.trim()) {
      this.snackBar.open('Para pagar no local indique o número de um documento de identificação.', 'Fechar', { duration: 4000 });
      return;
    }

    const options: CheckoutOptions = {
      fulfilment: this.options.fulfilment,
      paymentMethod: this.options.paymentMethod,
      identityDoc: this.options.paymentMethod === 'local' ? this.options.identityDoc?.trim() : undefined,
      voucherCode: this.options.voucherCode || undefined,
    };

    this.isSubmitting = true;
    this.cartService.finalizeOrder(options, this.idempotencyKey).subscribe({
      next: (res: any) => {
        const orderId = res.orderId || this.extractOrderIdFromRedirect(res);
        // Encomenda criada: a próxima tentativa (outra encomenda) usa uma chave nova.
        this.idempotencyKey = newIdempotencyKey();

        // Só um indicador de interface (sem dados pessoais), lido e apagado na página seguinte.
        try {
          sessionStorage.setItem('showSuccessToast', 'true');
        } catch {
          // sem sessionStorage: não aparece o aviso, nada mais muda
        }

        if (orderId) {
          this.router.navigate([`/cliente/carrinho/checkout/${orderId}`]);
        } else {
          this.isSubmitting = false;
          this.snackBar.open('A encomenda foi criada, mas não foi possível abri-la. Veja-a no seu perfil.', 'Fechar', { duration: 6000 });
        }
      },
      error: (err) => {
        this.isSubmitting = false;
        // Erros definitivos (4xx) encerram a tentativa; falhas de rede mantêm a chave para repetir em segurança.
        if (err?.status >= 400 && err?.status < 500) this.idempotencyKey = newIdempotencyKey();
        this.snackBar.open(errorMessage(err, 'Erro ao finalizar a encomenda.'), 'Fechar', { duration: 5000 });
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

    if (this.removing) return;
    this.removing = `${item.dishId._id}-${item.dose}`;
    this.cartService.removeItemFromCart(item.dishId._id, item.dose).pipe(
      switchMap(() => this.cartService.loadCart())
    ).subscribe({
      next: (cart) => {
        this.cart = cart;
        this.removing = null;

        if (!cart?.items || cart.items.length === 0) {
          this.resetTimer();
        } else if (cart?.timeout) {
          this.startTimer(new Date(cart.timeout));
        }
      },
      error: (err) => {
        this.removing = null;
        this.snackBar.open(errorMessage(err, 'Não foi possível remover o prato.'), 'Fechar', { duration: 4000 });
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