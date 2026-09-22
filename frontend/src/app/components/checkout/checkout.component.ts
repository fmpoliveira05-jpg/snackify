import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { CartService } from '../../services/cart.service';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatSnackBarModule } from '@angular/material/snack-bar';

/**
 * Resumo da encomenda acabada de criar: código, pratos, estado, horas estimadas e instruções
 * de pagamento. Mostra o aviso (toast) de encomenda concluída.
 */
@Component({
  selector: 'app-checkout',
  standalone: true,
  imports: [CommonModule, MatSnackBarModule],
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
    const showToast = sessionStorage.getItem('showSuccessToast');
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

    this.cartService.getOrderDetails(orderId).subscribe({
      next: (order: any) => {
        this.order = order;
        this.isLoading = false;
      },
      error: (err: any) => {
        console.error('Erro ao buscar encomenda:', err);
        this.errorMessage = 'Erro ao carregar a encomenda.';
        this.isLoading = false;
      }
    });
  }
}