import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ProfileService } from '../../../services/profile.service';
import { errorMessage } from '../../../utils/http-error';
import { LoadingStateComponent } from '../../../shared/loading-state.component';
import { EmptyStateComponent } from '../../../shared/empty-state.component';
import { ErrorStateComponent } from '../../../shared/error-state.component';

/**
 * Lista de categorias de pratos, com a opção de as remover (administrador).
 */
@Component({
  selector: 'app-list-categories',
  standalone: true,
  imports: [CommonModule, LoadingStateComponent, EmptyStateComponent, ErrorStateComponent],
  templateUrl: './list-categories.component.html',
  styleUrls: ['./list-categories.component.css']
})
export class ListCategoriesComponent implements OnInit {
  categories: any[] = [];
  success = '';
  error = '';
  loadError = '';
  isLoading = true;
  busyId: string | null = null;

  constructor(private profileService: ProfileService) {}

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.isLoading = true;
    this.loadError = '';
    this.profileService.listCategories().subscribe({
      next: data => {
        this.categories = data;
        this.isLoading = false;
      },
      error: err => {
        this.loadError = errorMessage(err, 'Erro ao carregar categorias.');
        this.isLoading = false;
      }
    });
  }

  deleteCategory(id: string) {
    if (this.busyId || !confirm('Tem a certeza de que quer remover esta categoria?')) return;
    this.busyId = id;
    this.error = '';
    this.profileService.deleteCategory(id).subscribe({
      next: () => {
        this.busyId = null;
        this.success = 'Categoria removida com sucesso!';
        this.categories = this.categories.filter(c => c._id !== id);
      },
      error: err => {
        this.busyId = null;
        this.error = errorMessage(err, 'Erro ao remover categoria.');
      }
    });
  }
}
