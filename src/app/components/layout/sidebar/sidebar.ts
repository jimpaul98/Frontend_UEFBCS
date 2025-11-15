// src/app/components/layout/sidebar/sidebar.component.ts
import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
// No necesitas MatSidenavModule aquí, ya que no estás definiendo el sidenav en este componente.
import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';
import { AuthService } from '../../../services/auth.service';
import { Observable, map } from 'rxjs';
// FormsModule no es necesario si solo estás mostrando enlaces.

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatListModule, // Componentes de lista
    MatIconModule, // Componentes de ícono
    // MatSidenavModule (Removido: No se usa directamente aquí)
    // FormsModule (Removido: No se usa)
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

        <a mat-list-item routerLink="/app/historial" routerLinkActive="active-link">
          <mat-icon matListItemIcon>history_toggle_off</mat-icon> <span matListItemTitle>Historial Academico</span>
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
      /* Se recomienda usar CSS para el espaciado en lugar de margin-right en el mat-icon */
      /* El uso de matListItemIcon ya maneja el layout internamente */
    `,
  ],
})
export class SidebarComponent implements OnInit {
  private authService = inject(AuthService);

  // El tipo debe ser Observable<string>, no Observable<string | undefined> si el map lo resuelve
  role$!: Observable<string>;

  ngOnInit(): void {
    // 1. Obtiene el rol del usuario (user?.rol).
    // 2. Si es null/undefined, usa un string vacío ('').
    // 3. Convierte a minúsculas para una comparación uniforme.
    this.role$ = this.authService.user$.pipe(
      map((user) => (user?.rol ?? '').toLowerCase())
    );
  }
}