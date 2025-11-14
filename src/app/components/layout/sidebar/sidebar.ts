// src/app/components/layout/sidebar/sidebar.component.ts
import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';
import { AuthService } from '../../../services/auth.service';
import { Observable, map } from 'rxjs';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatSidenavModule,
    MatListModule,
    MatIconModule,
    FormsModule,
  ],
  template: `
    <mat-nav-list *ngIf="role$ | async as role">
            <ng-container *ngIf="role === 'profesor'; else adminMenu">
        <a mat-list-item routerLink="/app/mis-cursos" routerLinkActive="active-link">
          <mat-icon matListItemIcon>library_books</mat-icon>
          <span matListItemTitle>Mis Cursos</span>
        </a>

        <a mat-list-item routerLink="/app/resumen" routerLinkActive="active-link">
          <mat-icon matListItemIcon>assignment</mat-icon>
          <span matListItemTitle>Ver Notas</span>
        </a>

        <a mat-list-item routerLink="/app/ver-asistencia" routerLinkActive="active-link">
          <mat-icon matListItemIcon>checklist</mat-icon>
          <span matListItemTitle>Ver Asistencias</span>
        </a>

        <a mat-list-item routerLink="/app/profesor-notas" routerLinkActive="active-link">
          <mat-icon matListItemIcon>rate_review</mat-icon>
          <span matListItemTitle>Asignar Notas y Asistencias</span>
        </a>

        <a mat-list-item routerLink="/app/profesor-reporte" routerLinkActive="active-link">
          <mat-icon matListItemIcon>description</mat-icon>
          <span matListItemTitle>Boletines</span>
        </a>
      </ng-container>

            <ng-template #adminMenu>
        <a mat-list-item routerLink="/app/dashboard-admin" routerLinkActive="active-link">
          <mat-icon matListItemIcon>dashboard</mat-icon>
          <span matListItemTitle>Dashboard</span>
        </a>
        <a mat-list-item routerLink="/app/usuarios" routerLinkActive="active-link">
          <mat-icon matListItemIcon>people</mat-icon>
          <span matListItemTitle>Usuarios</span>
        </a>

        <a mat-list-item routerLink="/app/anio-lectivo" routerLinkActive="active-link">
          <mat-icon matListItemIcon>calendar_today</mat-icon>
          <span matListItemTitle>Año Lectivo</span>
        </a>
        <a mat-list-item routerLink="/app/estudiantes" routerLinkActive="active-link">
          <mat-icon matListItemIcon>school</mat-icon>
          <span matListItemTitle>Estudiantes</span>
        </a>
        <a mat-list-item routerLink="/app/materias" routerLinkActive="active-link">
          <mat-icon matListItemIcon>menu_book</mat-icon>
          <span matListItemTitle>Materias</span>
        </a>

        <a mat-list-item routerLink="/app/cursos" routerLinkActive="active-link">
          <mat-icon matListItemIcon>auto_stories</mat-icon>
          <span matListItemTitle>Cursos</span>
        </a>

        <a mat-list-item routerLink="/app/calificaciones" routerLinkActive="active-link">
          <mat-icon matListItemIcon>edit_note</mat-icon>
          <span matListItemTitle>Agregar Notas y Asistencias</span>
        </a>

        <a mat-list-item routerLink="/app/boletin" routerLinkActive="active-link">
          <mat-icon matListItemIcon>assignment_turned_in</mat-icon>
          <span matListItemTitle>Boletines</span>
        </a>
      </ng-template>
    </mat-nav-list>
  `,
  styles: [
    `
      .mat-nav-list {
        padding-top: 0;
      }
      .active-link {
        background-color: rgba(0, 0, 0, 0.08);
      }
      mat-icon {
        margin-right: 16px;
      }
    `,
  ],
})
export class SidebarComponent implements OnInit {
  private authService = inject(AuthService);

  // Observable que emite el rol actual ('admin' o 'profesor')
  role$!: Observable<string>;

  ngOnInit(): void {
    this.role$ = this.authService.user$.pipe(map((user) => (user?.rol ?? '').toLowerCase()));
  }
}