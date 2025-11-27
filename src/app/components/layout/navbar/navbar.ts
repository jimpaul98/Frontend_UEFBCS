// src/app/components/layout/navbar/navbar.component.ts
import { Component, EventEmitter, Output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';

import { AuthService } from '../../../services/auth.service';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, MatToolbarModule, MatIconModule, MatButtonModule, MatTooltipModule],
  template: `
    <mat-toolbar color="primary" class="mat-elevation-z4">
      <button mat-icon-button (click)="toggleSidebar.emit()" matTooltip="Mostrar/Ocultar Menú">
        <mat-icon>menu</mat-icon>
      </button>
      <span class="title">Sistema de Gestión Escolar</span>
      
      <span class="spacer"></span>
      
      <button mat-button color="accent" (click)="logout()" matTooltip="Cerrar Sesión" class="logout-btn">
        <mat-icon>exit_to_app</mat-icon>
        <span class="logout-text">Cerrar Sesión</span>
      </button>
    </mat-toolbar>
  `,
  styles: [`
    .spacer { 
      flex: 1 1 auto; 
    }
    
    .title {
      font-size: 18px;
      font-weight: 500;
    }
    
    .logout-btn {
      display: flex;
      align-items: center;
      gap: 4px;
    }
    
    /* Responsive styles */
    @media (max-width: 768px) {
      .title {
        font-size: 16px;
      }
    }
    
    @media (max-width: 599px) {
      .title {
        font-size: 14px;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      
      .logout-text {
        display: none;
      }
      
      .logout-btn {
        min-width: 40px;
        padding: 0 8px;
      }
    }
  `]
})
export class NavbarComponent {
  @Output() toggleSidebar = new EventEmitter<void>();

  private authService = inject(AuthService);

  logout() {
    this.authService.logout();
  }
}