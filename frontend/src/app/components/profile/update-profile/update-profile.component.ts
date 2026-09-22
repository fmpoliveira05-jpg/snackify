import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { ProfileService } from '../../../services/profile.service';
import { fieldLabels } from '../../../utils/field-formatters';

@Component({
  selector: 'app-update-profile',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './update-profile.component.html',
  styleUrls: ['./update-profile.component.css']
})
export class UpdateProfileComponent implements OnInit {
  profileForm!: FormGroup;
  user: any;
  userType: string = 'customer';
  fieldLabels = fieldLabels;
  error = '';
  success = '';
  selectedFile: File | null = null;
  previewUrl: string | null = null;

  constructor(
    private fb: FormBuilder,
    private profileService: ProfileService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.profileService.getProfile().subscribe({
      next: data => {
        this.user = data;
        this.userType = data.userType || 'customer';
        this.createForm(data);
      },
      error: err => this.error = err?.message || 'Erro ao carregar dados.'
    });
  }

  createForm(data: any) {
    this.profileForm = this.fb.group({
      name: [data.name || '', Validators.required],
      username: [{ value: data.username, disabled: true }],
      email: [{ value: data.email, disabled: true }],
      phone: [data.phone || '', Validators.required],
      nif: [data.nif || ''],
      birthDate: [data.birthDate ? new Date(data.birthDate).toISOString().split('T')[0] : ''],
      foundedAt: [data.foundedAt ? new Date(data.foundedAt).toISOString().split('T')[0] : ''],
      address: this.fb.group({
        street: [data.address?.street || '', Validators.required],
        number: [data.address?.number || '', Validators.required],
        floor: [data.address?.floor || ''],
        zipCode: [data.address?.zipCode || '', Validators.required],
        place: [data.address?.place || '', Validators.required],
        district: [data.address?.district || '', Validators.required],
        country: [data.address?.country || '', Validators.required],
      })
    });
  }

  onSubmit() {
    if (this.profileForm.invalid) return;

    const rawForm = this.profileForm.getRawValue();
    const formData = new FormData();
    formData.append('name', rawForm.name);
    formData.append('phone', rawForm.phone);
    formData.append('nif', rawForm.nif || '');
    formData.append('birthDate', rawForm.birthDate || '');
    formData.append('foundedAt', rawForm.foundedAt || '');

    const address = rawForm.address;
    Object.keys(address).forEach(key => {
      formData.append(`address[${key}]`, address[key]);
    });

    if (this.selectedFile) {
      formData.append('image', this.selectedFile);
    }

    this.profileService.updateProfile(formData).subscribe({
      next: () => {
        this.success = 'Perfil atualizado com sucesso!';
        setTimeout(() => this.router.navigate(['/user/perfil']), 1500);
      },
      error: err => this.error = err?.message || 'Erro ao atualizar perfil.'
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
    }
  }

  cancel() {
    this.router.navigate(['/user/perfil']);
  }
}