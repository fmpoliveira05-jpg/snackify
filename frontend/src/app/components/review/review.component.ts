import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

/**
 * Avaliação de uma encomenda entregue: comentário, classificação e foto opcional.
 */
@Component({
  selector: 'app-review',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './review.component.html'
})
export class ReviewComponent implements OnInit {
  form!: FormGroup;
  orderId!: string;
  order: any;
  error = '';
  isLoading = true;
  selectedFile: File | null = null;
  previewUrl: string | null = null;

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private http: HttpClient,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.orderId = this.route.snapshot.paramMap.get('id')!;
    this.initForm();
    this.fetchOrderDetails();
  }

  initForm(): void {
    this.form = this.fb.group({
      title: ['', Validators.required],
      description: ['', Validators.required],
      image: [null]
    });
  }

  fetchOrderDetails(): void {
    this.isLoading = true;
    this.http.get(`${environment.apiUrl}/user/perfil/encomendas/${this.orderId}`).subscribe({
      next: data => {
        this.order = data;
        this.isLoading = false;
      },  
      error: () => {
        this.error = 'Erro ao carregar encomenda.';
        this.isLoading = false;
      }
    });
  }

  onFileChange(event: any) {
    const file = event.target.files[0];
    if (file) {
      this.selectedFile = file;

      const reader = new FileReader();
      reader.onload = () => {
        this.previewUrl = reader.result as string;
      };
      reader.readAsDataURL(file);

      this.form.patchValue({ image: file });
    }
  }

  submit(): void {
    if (this.form.invalid) return;

    const formData = new FormData();
    formData.append('title', this.form.get('title')?.value);
    formData.append('description', this.form.get('description')?.value);

    const imageFile = this.form.get('image')?.value;
    if (imageFile instanceof File) {
      formData.append('image', imageFile);
    }

    this.http.post(`${environment.apiUrl}/user/perfil/encomendas/${this.orderId}/avaliar`, formData).subscribe({
      next: () => this.router.navigate(['/user/perfil']),
      error: () => this.error = 'Erro ao submeter avaliação.'
    });
  }
}