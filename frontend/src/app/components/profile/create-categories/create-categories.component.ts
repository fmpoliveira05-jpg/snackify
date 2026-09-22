import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { ProfileService } from '../../../services/profile.service';

/**
 * Formulário do administrador para criar categorias de pratos.
 */
@Component({
  selector: 'app-create-categories',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './create-categories.component.html',
  styleUrls: ['./create-categories.component.css']
})
export class CreateCategoriesComponent implements OnInit {
  categoryForm!: FormGroup;
  success = '';
  error = '';

  constructor(
    private fb: FormBuilder,
    private profileService: ProfileService
  ) {}

  ngOnInit(): void {
    this.categoryForm = this.fb.group({
      name: ['', Validators.required]
    });
  }

  onSubmit() {
    if (this.categoryForm.invalid) return;

    this.profileService.createCategory(this.categoryForm.value).subscribe({
      next: () => {
        this.success = 'Categoria criada com sucesso!';
        this.categoryForm.reset();
      },
      error: err => this.error = err?.message || 'Erro ao criar categoria.'
    });
  }
}