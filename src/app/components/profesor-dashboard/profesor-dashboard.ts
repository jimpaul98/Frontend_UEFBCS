// src/app/pages/profesor/profesor-dashboard.component.ts
import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';

import { MatCardModule } from '@angular/material/card';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatChipsModule } from '@angular/material/chips';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';

import { AuthService } from '../../services/auth.service';
import { CursoService } from '../../services/curso.service';

@Component({
  standalone: true,
  selector: 'app-profesor-dashboard',
  imports: [
    CommonModule,
    RouterModule,
    MatCardModule,
    MatSnackBarModule,
    MatChipsModule,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule
  ],
  template: `
    <div class="dashboard-container fade-in">
      
      <div class="welcome-header">
        <div class="welcome-text">
          <h1>👋 ¡Hola, Profe!</h1>
          <p>Aquí tienes tus cursos asignados. Selecciona una materia para gestionar notas y asistencias.</p>
        </div>
        <div class="header-decoration">
          </div>
      </div>

      <div class="course-grid" *ngIf="cursosFiltrados()?.length; else emptyState">
        
        <mat-card class="course-card" *ngFor="let c of cursosFiltrados()">
          <div class="card-top-accent"></div>
          
          <div class="card-content">
            <div class="course-header">
              <div class="course-title">
                <h2>{{ c.nombre }}</h2>
                <span class="year-badge">
                  {{ c.anioLectivo?.nombre ?? c.anioLectivo ?? 'N/A' }}
                </span>
              </div>
              <div class="student-count" matTooltip="Total de estudiantes">
                <mat-icon>groups</mat-icon>
                <span>{{ c.estudiantes?.length ?? 0 }}</span>
              </div>
            </div>

            <div class="divider"></div>

            <div class="subjects-list">
              <div class="subject-label">Tus Materias:</div>
              
              <div class="subject-row" *ngFor="let m of materiasDelProfesor(c)">
                <div class="subject-info">
                  <div class="subject-icon">
                    <mat-icon>menu_book</mat-icon>
                  </div>
                  <span class="subject-name">{{ m.materia?.nombre ?? m.materia }}</span>
                </div>
                
                <button 
                  mat-stroked-button 
                  color="primary" 
                  class="action-btn"
                  (click)="irAResumen(c, m)"
                >
                  Gestionar
                  <mat-icon iconPositionEnd>arrow_forward</mat-icon>
                </button>
              </div>
            </div>
          </div>
        </mat-card>

      </div>

      <ng-template #emptyState>
        <div class="empty-state">
          <div class="illustration">🏫</div>
          <h3>No tienes cursos asignados</h3>
          <p>Parece que aún no se te han asignado materias para este periodo lectivo.</p>
        </div>
      </ng-template>

    </div>
  `,
  styles: [`
    /* Animaciones */
    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(10px); }
      to { opacity: 1; transform: translateY(0); }
    }
    .fade-in { animation: fadeIn 0.5s ease-out; }

    :host {
      --primary: #3f51b5;
      --accent: #eef2ff;
      --text-main: #1f2937;
      --text-light: #6b7280;
      --card-radius: 20px;
    }

    .dashboard-container {
      max-width: 1200px;
      margin: 0 auto;
      padding: 32px 24px;
      font-family: 'Roboto', sans-serif;
    }

    /* Header */
    .welcome-header {
      margin-bottom: 40px;
    }
    .welcome-text h1 {
      font-size: 32px;
      font-weight: 800;
      color: var(--text-main);
      margin: 0 0 8px 0;
      letter-spacing: -0.5px;
    }
    .welcome-text p {
      font-size: 16px;
      color: var(--text-light);
      margin: 0;
      max-width: 600px;
      line-height: 1.5;
    }

    /* Grid */
    .course-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
      gap: 24px;
    }

    /* Tarjeta */
    .course-card {
      border-radius: var(--card-radius);
      border: none;
      box-shadow: 0 4px 20px rgba(0,0,0,0.04);
      transition: transform 0.2s ease, box-shadow 0.2s ease;
      overflow: hidden;
      background: white;
      position: relative;
    }
    .course-card:hover {
      transform: translateY(-5px);
      box-shadow: 0 12px 28px rgba(63, 81, 181, 0.15);
    }
    
    /* Acento decorativo superior */
    .card-top-accent {
      height: 6px;
      background: linear-gradient(90deg, #3f51b5, #6366f1);
      width: 100%;
    }

    .card-content {
      padding: 24px;
    }

    /* Header de la Tarjeta */
    .course-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 16px;
    }
    .course-title h2 {
      margin: 0;
      font-size: 20px;
      font-weight: 700;
      color: var(--text-main);
    }
    .year-badge {
      display: inline-block;
      margin-top: 4px;
      font-size: 12px;
      background: var(--accent);
      color: var(--primary);
      padding: 2px 8px;
      border-radius: 6px;
      font-weight: 600;
    }
    .student-count {
      display: flex;
      align-items: center;
      gap: 4px;
      color: var(--text-light);
      font-size: 14px;
      background: #f9fafb;
      padding: 4px 8px;
      border-radius: 8px;
    }
    .student-count mat-icon { font-size: 18px; width: 18px; height: 18px; }

    .divider {
      height: 1px;
      background: #f3f4f6;
      margin: 16px 0;
    }

    /* Lista de Materias */
    .subject-label {
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.8px;
      color: var(--text-light);
      font-weight: 700;
      margin-bottom: 12px;
    }

    .subject-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      background: #f8fafc;
      padding: 10px 14px;
      border-radius: 12px;
      margin-bottom: 10px;
      border: 1px solid transparent;
      transition: background 0.2s;
    }
    .subject-row:hover {
      background: #fff;
      border-color: #e2e8f0;
      box-shadow: 0 2px 4px rgba(0,0,0,0.02);
    }
    .subject-row:last-child { margin-bottom: 0; }

    .subject-info {
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .subject-icon {
      width: 32px;
      height: 32px;
      background: white;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      color: var(--primary);
      box-shadow: 0 1px 3px rgba(0,0,0,0.05);
    }
    .subject-icon mat-icon { font-size: 16px; width: 16px; height: 16px; }
    
    .subject-name {
      font-weight: 600;
      font-size: 14px;
      color: var(--text-main);
    }

    .action-btn {
      border-radius: 8px;
      font-size: 12px;
      line-height: 28px;
      height: 32px;
      padding: 0 12px;
    }

    /* Empty State */
    .empty-state {
      text-align: center;
      padding: 80px 20px;
      background: white;
      border-radius: var(--card-radius);
      border: 2px dashed #e5e7eb;
    }
    .illustration { font-size: 64px; margin-bottom: 16px; }
    .empty-state h3 { font-size: 20px; margin: 0 0 8px; color: var(--text-main); font-weight: 700; }
    .empty-state p { color: var(--text-light); margin: 0; }

    @media (max-width: 600px) {
      .course-grid { grid-template-columns: 1fr; }
      .welcome-text h1 { font-size: 26px; }
    }
  `]
})
export class ProfesorDashboardComponent implements OnInit {
  private sb = inject(MatSnackBar);
  private auth = inject(AuthService);
  private cursoSvc = inject(CursoService);
  private router = inject(Router);

  cursos = signal<any[]>([]);
  meId = signal<string>('');

  ngOnInit() {
    this.auth.ensureUserLoaded().subscribe(() => {
      this.meId.set(this.auth.getuser()?.id ?? '');
      this.cargarCursos();
    });
  }

  cargarCursos() {
    this.cursoSvc.listar().subscribe({
      next: (res: any) => this.cursos.set(res?.data ?? res ?? []),
      error: () => this.sb.open('No se pudieron cargar los cursos', 'Cerrar', { duration: 3000 }),
    });
  }

  cursosFiltrados = computed(() => {
    const me = this.meId();
    if (!me) return [];
    return (this.cursos() ?? []).filter((c: any) =>
      (c.materias ?? []).some((m: any) => this.asId(m?.profesor) === me)
    );
  });

  materiasDelProfesor(curso: any) {
    const me = this.meId();
    return (curso.materias ?? []).filter((m: any) => this.asId(m?.profesor) === me);
  }

  // Navegación directa al Resumen (o donde necesites)
  irAResumen(curso: any, m: any): void {
    const cursoId = this.asId(curso?._id);
    const anioId = this.asId(curso?.anioLectivo);
    const materiaId = this.asId(m?.materia);

    if (!cursoId || !anioId || !materiaId) {
      this.sb.open('IDs inválidos o datos incompletos', 'Cerrar', { duration: 2500 });
      return;
    }

    // Navega a la ruta de resumen pasando los queryParams necesarios
    this.router.navigate(['/app/resumen'], {
      queryParams: { curso: cursoId, anioLectivo: anioId, materia: materiaId }
    });
  }

  private asId(val: any): string {
    if (!val) return '';
    if (typeof val === 'string') return val;
    if (typeof val === 'object' && val._id) return String(val._id);
    return '';
  }
}