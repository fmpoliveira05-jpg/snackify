import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { VoucherService } from '../../services/voucher.service';

/** Mensagens mostradas no regresso do Stripe (?pagamento=...). */
const PAYMENT_MESSAGES: Record<string, string> = {
  sucesso: 'Pagamento confirmado: o vale já está ativo.',
  falhou: 'O pagamento não foi confirmado. O vale continua pendente e não pode ser usado.',
  cancelado: 'Pagamento cancelado. O vale não foi ativado.',
};

/**
 * Vales de refeição: compra com o Stripe Checkout, para o próprio ou para oferecer a outro
 * cliente, e lista dos vales (ativos e à espera de pagamento).
 */
@Component({
  selector: 'app-vouchers',
  standalone: true,
  imports: [CommonModule, FormsModule, MatSnackBarModule],
  templateUrl: './vouchers.component.html'
})
export class VouchersComponent implements OnInit {
  values: number[] = [];
  vouchers: any[] = [];
  value: number | null = null;
  giftTo = '';
  message = '';
  isSaving = false;

  constructor(private voucherService: VoucherService, private snackBar: MatSnackBar, private route: ActivatedRoute) {}

  ngOnInit(): void {
    const payment = this.route.snapshot.queryParamMap.get('pagamento');
    if (payment && PAYMENT_MESSAGES[payment]) {
      this.snackBar.open(PAYMENT_MESSAGES[payment], 'Fechar', { duration: 6000 });
    }
    this.load();
  }

  load(): void {
    this.voucherService.getVouchers().subscribe({
      next: data => {
        this.values = data.values;
        this.vouchers = data.vouchers;
        this.value ??= data.values[1] ?? data.values[0] ?? null;
      },
      error: err => console.error('Erro ao carregar vales:', err)
    });
  }

  buy(): void {
    if (!this.value) return;
    this.isSaving = true;
    this.voucherService.buyVoucher(this.value, this.giftTo.trim() || undefined, this.message.trim() || undefined).subscribe({
      next: res => {
        if (res.url) {
          // O vale fica pendente até o Stripe confirmar o pagamento.
          window.location.href = res.url;
          return;
        }
        this.snackBar.open(`${res.message} Código: ${res.code}`, 'Fechar', { duration: 6000 });
        this.giftTo = '';
        this.message = '';
        this.isSaving = false;
        this.load();
      },
      error: err => {
        this.snackBar.open(err?.error?.message || 'Não foi possível comprar o vale.', 'Fechar', { duration: 5000 });
        this.isSaving = false;
      }
    });
  }
}
