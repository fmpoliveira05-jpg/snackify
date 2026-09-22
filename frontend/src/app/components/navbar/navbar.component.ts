import { Component, OnInit, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule, NavigationEnd } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { filter } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './navbar.component.html',
  styleUrls: ['./navbar.component.css']
})
export class NavbarComponent implements OnInit {
  @Input() user: any = null;
  @Input() currentPath!: string;

  constructor(private authService: AuthService, private router: Router) {}

  ngOnInit(): void {
    this.authService.currentUser$.subscribe(user => {
      this.user = user;
    });

    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe((event: NavigationEnd) => {
      this.currentPath = event.url;
    });
  }

  getDashboardLink(): string {
    switch (this.user?.userType) {
      case 'customer': return '/cliente/dashboard';
      case 'restaurant': return `${environment.apiUrl}/restaurante/dashboard`;
      case 'admin': return '/user/perfil';
      default: return `${environment.apiUrl}/restaurante/dashboard`;
    }
  }

  goToDashboard() {
    if (!this.user) {
      window.location.href = `${environment.apiUrl}/`;
      return;
    }

    const link = this.getDashboardLink();

    if (link === `${environment.apiUrl}/restaurante/dashboard`) {
      window.location.href = link;
      return;
    }

    if (this.user?.userType === 'restaurant') {
      window.location.href = link;
    } else {
      this.router.navigate([link]);
    }
  }
}