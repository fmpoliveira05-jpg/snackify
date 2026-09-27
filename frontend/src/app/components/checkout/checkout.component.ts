import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { CartService } from '../../services/cart.service';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { RouterModule } from '@angular/router';
import { errorMessage } from '../../utils/http-error';
import { LoadingStateComponent } from '../../shared/loading-state.component';
import { ErrorStateComponent } from '../../shared/error-state.component';

/**
 * Resumo da encomenda acabada de criar: código, pratos, estado, horas estimadas e instruções
 * de pagamento. Mostra o aviso (toast) de encomenda concluída.
 */
@Component({
  selector: 'app-checkout',
  standalone: true,
  imports: [CommonModule, MatSnackBarModule, RouterModule, LoadingStateComponent, ErrorStateComponent],
  templateUrl: './checkout.component.html',
  styleUrls: ['./checkout.component.css']
})
export class CheckoutComponent implements OnInit {
  order: any = null;
  isLoading = true;
  errorMessage: string | null = null;

  constructor(
    private route: ActivatedRoute,
    private cartService: CartService,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    let showToast: string | null = null;
    try {
      showToast = sessionStorage.getItem('showSuccessToast');
    } catch {
      // sem sessionStorage
    }
    if (showToast === 'true') {
      this.snackBar.open('Encomenda concluída com sucesso!', 'Fechar', {
        duration: 3000,
        verticalPosition: 'top',
      });
      sessionStorage.removeItem('showSuccessToast');
    }

    const orderId = this.route.snapshot.paramMap.get('id');
    if (!orderId) {
      this.errorMessage = 'ID da encomenda não fornecido.';
      this.isLoading = false;
      return;
    }

    this.load(orderId);
  }

  load(orderId = this.route.snapshot.paramMap.get('id') || ''): void {
    this.isLoading = true;
    this.errorMessage = null;
    this.cartService.getOrderDetails(orderId).subscribe({
      next: (order: any) => {
        this.order = order;
        this.isLoading = false;
      },
      error: (err: any) => {
        this.errorMessage = err?.status === 404 || err?.status === 400
          ? 'Esta encomenda não existe ou não é sua.'
          : errorMessage(err, 'Erro ao carregar a encomenda.');
        this.isLoading = false;
      }
    });
  }
}