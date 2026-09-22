import { Component, EventEmitter, Input, OnChanges, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { assetUrl } from '../../utils/asset-url';

/**
 * Cartão de um prato: imagem, categoria, descrição, informação nutricional (OpenFoodFacts),
 * preços por dose e o formulário para o juntar ao carrinho.
 */
@Component({
  selector: 'app-dish-card',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './dish-card.component.html',
  styleUrls: ['./dish-card.component.css']
})
export class DishCardComponent implements OnChanges {
  /** Prato vindo da API (com `category` e, na pesquisa, `restaurantId` preenchidos). */
  @Input({ required: true }) dish: any;
  /** Mostra o nome e a localidade do restaurante (útil na pesquisa global). */
  @Input() showRestaurant = false;
  /** Emitido quando o cliente carrega em "Adicionar ao carrinho". */
  @Output() add = new EventEmitter<{ dishId: string; amount: number; dose: string }>();

  amount = 1;
  dose: string | null = null;

  ngOnChanges(): void {
    this.dose = this.dish?.pricePerDose?.[0]?.dose ?? null;
  }

  /** Endereço completo da imagem (as imagens são servidas pelo backend). */
  get imageUrl(): string | null {
    return assetUrl(this.dish?.image);
  }

  /** Texto da dose ("1/2" → "Meia dose", "1" → "Dose inteira"). */
  doseLabel(dose: string): string {
    return dose === '1/2' ? 'Meia dose' : 'Dose inteira';
  }

  submit(): void {
    if (!this.dose || !Number.isInteger(this.amount) || this.amount < 1) return;
    this.add.emit({ dishId: this.dish._id, amount: this.amount, dose: this.dose });
  }
}
