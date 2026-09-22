import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ProfileService } from '../../../services/profile.service';

/**
 * Lista de categorias de pratos, com a opção de as remover (administrador).
 */
@Component({
  selector: 'app-list-categories',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './list-categories.component.html',
  styleUrls: ['./list-categories.component.css']
})
export class ListCategoriesComponent implements OnInit {
  categories: any[] = [];
  success = '';
  error = '';

  constructor(private profileService: ProfileService) {}

  ngOnInit(): void {
    this.profileService.listCategories().subscribe({
      next: data => this.categories = data,
      error: err => this.error = err?.message || 'Erro ao carregar categorias.'
    });
  }

  deleteCategory(id: string) {
    if (!confirm('Tens a certeza que queres remover esta categoria?')) return;

    this.profileService.deleteCategory(id).subscribe({
      next: () => {
        this.success = 'Categoria removida com sucesso!';
        this.categories = this.categories.filter(c => c._id !== id);
      },
      error: err => this.error = err?.message || 'Erro ao remover categoria.'
    });
  }
}