import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { MatCardModule } from '@angular/material/card';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatIconModule } from '@angular/material/icon';
import { MatDividerModule } from '@angular/material/divider';
import { MatTableModule } from '@angular/material/table';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatChipsModule } from '@angular/material/chips';

import { AuthService } from '../../services/auth.service';
import { CursoService } from '../../services/curso.service';
import { AsistenciaService, Trimestre } from '../../services/asistencia.service';

type MateriaAsignada = { materiaId: string; materiaNombre: string };

type TriResumen = {
  diasLaborables: number | null;
  fj: number | null;
  fi: number | null;
  asistidos: number | null;  // diasLaborables - fi
};

type RowVM = {
  estudianteId: string;
  estudianteNombre: string;
  T1: TriResumen;
  T2: TriResumen;
  T3: TriResumen;
};

@Component({
  standalone: true,
  selector: 'app-profesor-asistencias-resumen',
  imports: [
    CommonModule, FormsModule,
    MatCardModule, MatSelectModule, MatFormFieldModule, MatInputModule,
    MatButtonModule, MatSnackBarModule, MatIconModule, MatDividerModule,
    MatTableModule, MatProgressBarModule, MatTooltipModule, MatChipsModule,
  ],
  template: `
    <div class="page-container fade-in">
      
      <div class="page-header">
        <div>
          <h1 class="main-title">Resumen de Asistencias</h1>
          <p class="subtitle">Visualiza faltas justificadas (FJ), injustificadas (FI) y asistencia real por trimestre.</p>
        </div>
        <button mat-icon-button class="refresh-btn" (click)="recargar()" [disabled]="cargando()" matTooltip="Actualizar datos">
          <mat-icon [class.spin]="cargando()">sync</mat-icon>
        </button>
      </div>

      <div class="control-panel mat-elevation-z0">
        <div class="filters-grid">
          <mat-form-field appearance="outline" class="custom-field">
            <mat-label>Curso</mat-label>
            <mat-icon matPrefix class="field-icon">school</mat-icon>
            <mat-select [(ngModel)]="cursoId" (selectionChange)="onCursoChange()">
              <mat-option *ngFor="let c of cursos()" [value]="asId(c._id)">
                {{ c.nombre }}
              </mat-option>
            </mat-select>
          </mat-form-field>

          <mat-form-field appearance="outline" class="custom-field">
            <mat-label>Materia</mat-label>
            <mat-icon matPrefix class="field-icon">menu_book</mat-icon>
            <mat-select
              [(ngModel)]="materiaId"
              (selectionChange)="cargarTabla()"
              [disabled]="!materiasAsignadas().length"
            >
              <mat-option *ngFor="let m of materiasAsignadas()" [value]="m.materiaId">
                {{ m.materiaNombre }}
              </mat-option>
            </mat-select>
          </mat-form-field>

          <mat-form-field appearance="outline" class="custom-field search-field">
            <mat-label>Buscar estudiante...</mat-label>
            <mat-icon matPrefix class="field-icon">search</mat-icon>
            <input matInput [(ngModel)]="q" (ngModelChange)="onSearchChange()" placeholder="Ej. Juan Pérez" />
            <button *ngIf="q()" matSuffix mat-icon-button (click)="clearSearch()">
              <mat-icon>close</mat-icon>
            </button>
          </mat-form-field>
        </div>

        <div class="info-badges" *ngIf="cursoDetalle()">
          <div class="badge-item">
            <mat-icon>calendar_today</mat-icon>
            <span>Año: <strong>{{ cursoDetalle()?.anioLectivo?.nombre ?? cursoDetalle()?.anioLectivo }}</strong></span>
          </div>
          <div class="badge-item">
            <mat-icon>supervisor_account</mat-icon>
            <span>Tutor: <strong>{{ cursoDetalle()?.profesorTutor?.nombre ?? cursoDetalle()?.profesorTutor }}</strong></span>
          </div>
          <div class="badge-item">
            <mat-icon>groups</mat-icon>
            <span>Estudiantes: <strong>{{ cursoDetalle()?.estudiantes?.length || 0 }}</strong></span>
          </div>
        </div>
      </div>

      <mat-progress-bar *ngIf="cargando()" mode="indeterminate" class="custom-loader"></mat-progress-bar>

      <div class="data-container mat-elevation-z2" *ngIf="viewRows().length; else noRows">
        <table mat-table [dataSource]="viewRows()" class="friendly-table">
          
          <ng-container matColumnDef="n">
            <th mat-header-cell *matHeaderCellDef class="w-50 center-header">#</th>
            <td mat-cell *matCellDef="let r; let i = index" class="w-50 center-cell text-muted">
              {{ i + 1 }}
            </td>
          </ng-container>

          <ng-container matColumnDef="est">
            <th mat-header-cell *matHeaderCellDef>Estudiante</th>
            <td mat-cell *matCellDef="let r">
              <div class="student-row">
                <div class="avatar-circle">
                  {{ r.estudianteNombre?.[0] || 'E' }}
                </div>
                <div class="student-info">
                  <span class="student-name">{{ r.estudianteNombre }}</span>
                </div>
              </div>
            </td>
          </ng-container>

          <ng-container matColumnDef="t1">
            <th mat-header-cell *matHeaderCellDef class="center-header">Trimestre 1</th>
            <td mat-cell *matCellDef="let r">
              <ng-container *ngTemplateOutlet="triCell; context: { $implicit: r.T1 }"></ng-container>
            </td>
          </ng-container>

          <ng-container matColumnDef="t2">
            <th mat-header-cell *matHeaderCellDef class="center-header">Trimestre 2</th>
            <td mat-cell *matCellDef="let r">
              <ng-container *ngTemplateOutlet="triCell; context: { $implicit: r.T2 }"></ng-container>
            </td>
          </ng-container>

          <ng-container matColumnDef="t3">
            <th mat-header-cell *matHeaderCellDef class="center-header">Trimestre 3</th>
            <td mat-cell *matCellDef="let r">
              <ng-container *ngTemplateOutlet="triCell; context: { $implicit: r.T3 }"></ng-container>
            </td>
          </ng-container>

          <tr mat-header-row *matHeaderRowDef="cols"></tr>
          <tr mat-row *matRowDef="let row; columns: cols" class="hover-row"></tr>
        </table>
      </div>

      <ng-template #triCell let-data>
        <div class="tri-grid">
          <div class="stat-row">
             <span class="stat-pill neutral" matTooltip="Días Laborables">
               📅 {{ show(data.diasLaborables) }}
             </span>
             <span class="stat-pill success" matTooltip="Días Asistidos">
               ✅ {{ show(data.asistidos) }}
             </span>
          </div>
          <div class="stat-row">
             <span class="stat-pill warning" matTooltip="Faltas Justificadas">
               ⚠️ FJ: {{ show(data.fj) }}
             </span>
             <span class="stat-pill danger" matTooltip="Faltas Injustificadas">
               ❌ FI: {{ show(data.fi) }}
             </span>
          </div>
        </div>
      </ng-template>

      <ng-template #noRows>
        <div class="empty-state">
          <div class="illustration">🗓️</div>
          <h3>Sin datos visibles</h3>
          <p>Selecciona un <b>Curso</b> y una <b>Materia</b>, o ajusta tu búsqueda.</p>
        </div>
      </ng-template>

    </div>
  `,
  styles: [`
    /* Animaciones y Variables */
    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(10px); }
      to { opacity: 1; transform: translateY(0); }
    }
    .fade-in { animation: fadeIn 0.4s ease-out; }
    .spin { animation: spin 1s linear infinite; }
    @keyframes spin { 100% { transform: rotate(360deg); } }

    :host {
      --primary-color: #3f51b5;
      --text-main: #1f2937;
      --text-secondary: #6b7280;
      --bg-neutral: #f3f4f6;
      --bg-success: #dcfce7; --text-success: #166534;
      --bg-warning: #fef3c7; --text-warning: #92400e;
      --bg-danger: #fee2e2; --text-danger: #991b1b;
      --radius: 16px;
    }

    .page-container {
      max-width: 1200px;
      margin: 0 auto;
      padding: 24px;
      font-family: 'Roboto', sans-serif;
    }

    /* Header */
    .page-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 24px;
    }
    .main-title {
      font-size: 26px;
      font-weight: 800;
      margin: 0;
      color: var(--text-main);
      letter-spacing: -0.5px;
    }
    .subtitle {
      margin: 4px 0 0;
      color: var(--text-secondary);
      font-size: 14px;
    }
    .refresh-btn { color: var(--text-secondary); }

    /* Panel de Control */
    .control-panel {
      background: #fff;
      border-radius: var(--radius);
      padding: 24px;
      border: 1px solid #e5e7eb;
      margin-bottom: 16px;
    }
    .filters-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
      gap: 16px;
      align-items: center;
    }
    .custom-field { width: 100%; }
    .field-icon { color: var(--text-secondary); margin-right: 8px; }
    ::ng-deep .custom-field .mat-mdc-form-field-subscript-wrapper { display: none; }
    
    /* Search specific */
    .search-field input { color: var(--text-main); }

    /* Badges Info */
    .info-badges {
      display: flex;
      flex-wrap: wrap;
      gap: 12px;
      margin-top: 20px;
      padding-top: 16px;
      border-top: 1px dashed #e5e7eb;
    }
    .badge-item {
      display: flex;
      align-items: center;
      gap: 6px;
      background: var(--bg-neutral);
      padding: 6px 12px;
      border-radius: 20px;
      font-size: 13px;
      color: var(--text-secondary);
    }
    .badge-item mat-icon { font-size: 18px; width: 18px; height: 18px; opacity: 0.7; }
    .badge-item strong { color: var(--text-main); }

    /* Tabla */
    .data-container {
      background: #fff;
      border-radius: var(--radius);
      overflow: hidden;
      border: 1px solid #e5e7eb;
    }
    .friendly-table { width: 100%; }
    .friendly-table th {
      background: #f9fafb;
      color: var(--text-secondary);
      font-weight: 600;
      font-size: 13px;
      padding: 16px;
      border-bottom: 1px solid #e5e7eb;
      white-space: nowrap;
    }
    .friendly-table td {
      padding: 10px 16px;
      border-bottom: 1px solid #f3f4f6;
      color: var(--text-main);
      font-size: 14px;
      vertical-align: middle;
    }
    .hover-row:hover { background-color: #f9fafb; }
    .center-header { text-align: center; }
    .center-cell { text-align: center; }

    /* Estudiante Avatar */
    .student-row { display: flex; align-items: center; gap: 12px; }
    .avatar-circle {
      width: 36px; height: 36px;
      background: linear-gradient(135deg, #6366f1, #8b5cf6);
      color: white; border-radius: 50%;
      display: flex; align-items: center; justify-content: center;
      font-weight: 700; font-size: 14px;
      flex-shrink: 0;
    }
    .student-name { font-weight: 500; line-height: 1.2; display: block; }
    .w-50 { width: 50px; min-width: 50px; }
    .text-muted { color: var(--text-secondary); }

    /* Grilla dentro de celda (TriGrid) */
    .tri-grid {
      display: flex;
      flex-direction: column;
      gap: 4px;
      align-items: center;
    }
    .stat-row {
      display: flex;
      gap: 6px;
    }
    .stat-pill {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      font-size: 11px;
      padding: 2px 8px;
      border-radius: 6px;
      font-weight: 600;
      min-width: 65px;
      border: 1px solid transparent;
    }
    .stat-pill.neutral { background: #f3f4f6; color: #4b5563; border-color: #e5e7eb; }
    .stat-pill.success { background: var(--bg-success); color: var(--text-success); }
    .stat-pill.warning { background: var(--bg-warning); color: var(--text-warning); }
    .stat-pill.danger  { background: var(--bg-danger);  color: var(--text-danger); }

    /* Empty State */
    .empty-state {
      text-align: center; padding: 60px 20px;
      background: #fff; border-radius: var(--radius);
      border: 2px dashed #e5e7eb; color: var(--text-secondary);
    }
    .illustration { font-size: 48px; margin-bottom: 16px; opacity: 0.8; }
    .empty-state h3 { margin: 0 0 8px; color: var(--text-main); font-weight: 700; }
    .custom-loader { height: 4px; }

    @media (max-width: 900px) {
      .filters-grid { grid-template-columns: 1fr 1fr; }
    }
    @media (max-width: 600px) {
      .filters-grid { grid-template-columns: 1fr; }
      .page-header { flex-direction: column; gap: 16px; }
      .stat-row { flex-wrap: wrap; justify-content: center; }
    }
  `]
})
export class ProfesorAsistenciasResumenComponent implements OnInit {
  private sb = inject(MatSnackBar);
  private auth = inject(AuthService);
  private cursoSrv = inject(CursoService);
  private asisSrv = inject(AsistenciaService);

  cursos = signal<any[]>([]);
  cursoId = '';
  materiaId = '';
  cursoDetalle = signal<any | null>(null);
  cargando = signal<boolean>(false);

  cols = ['n','est','t1','t2','t3'];
  rows = signal<RowVM[]>([]);
  q = signal<string>('');
  
  // Ocultamos IDs para limpiar la vista
  showIds = false;

  // ===== Ciclo =====
  ngOnInit(): void {
    this.auth.ensureUserLoaded().subscribe(() => {
      const me = this.auth.getuser()?.id ?? '';
      this.cursoSrv.listar().subscribe({
        next: (res: any) => {
          const all = res?.data ?? res ?? [];
          const mios = all.filter((c: any) =>
            (c.materias ?? []).some((m: any) => this.asId(m?.profesor) === me)
          );
          this.cursos.set(mios);
          if (mios.length === 1) {
            this.cursoId = this.asId(mios[0]._id);
            this.onCursoChange();
          }
        },
        error: () => this.sb.open('No se pudieron cargar los cursos', 'Cerrar', { duration: 3000 })
      });
    });
  }

  // ===== Derivados =====
  cursoSel = computed(() => (this.cursos() ?? []).find(c => this.asId(c._id) === this.cursoId));
  anioLectivoId = computed(() => this.asId(this.cursoDetalle()?.anioLectivo || this.cursoSel()?.anioLectivo));

  materiasAsignadas = computed<MateriaAsignada[]>(() => {
    const me = this.auth.getuser()?.id ?? '';
    return (this.cursoDetalle()?.materias ?? this.cursoSel()?.materias ?? [])
      .filter((m: any) => this.asId(m?.profesor) === me)
      .map((m: any) => ({
        materiaId: this.asId(m?.materia),
        materiaNombre: m?.materia?.nombre ?? m?.materia ?? '—'
      }));
  });

  filteredRows = computed<RowVM[]>(() => {
    const term = (this.q() || '').trim().toLowerCase();
    if (!term) return this.rows();
    return this.rows().filter((r: RowVM) => (r.estudianteNombre || '').toLowerCase().includes(term));
  });
  viewRows = computed(() => this.filteredRows());

  // ===== Eventos =====
  onCursoChange(): void {
    this.cursoDetalle.set(null);
    this.rows.set([]);
    this.materiaId = '';
    if (!this.cursoId) return;

    this.cargando.set(true);
    this.cursoSrv.obtener(this.cursoId).subscribe({
      next: (res: any) => {
        const c = res?.data ?? res ?? null;
        this.cursoDetalle.set(c);

        const mats = this.materiasAsignadas();
        // Si solo tiene 1 materia, la preseleccionamos
        this.materiaId = mats.length === 1 ? mats[0].materiaId : '';

        if (this.materiaId) {
          this.cargarTabla();
        }
        this.cargando.set(false);
      },
      error: () => {
        this.cargando.set(false);
        this.sb.open('No se pudo cargar el detalle del curso', 'Cerrar', { duration: 3000 });
      }
    });
  }

  recargar(): void {
    if (!this.cursoId) return;
    this.onCursoChange();
  }

  onSearchChange(): void {}
  clearSearch(): void { this.q.set(''); }

  // ===== Normalizadores robustos =====
  private pickId(val: any): string {
    if (!val) return '';
    if (typeof val === 'string') return val;
    if (typeof val === 'object') {
      if (val._id || val.id || val.uid) return String(val._id ?? val.id ?? val.uid);
      const nested = val.estudiante ?? val.alumno ?? val.usuario ?? val.user ?? val.persona;
      if (nested) return this.pickId(nested);
    }
    return '';
  }
  private pickName(val: any): string {
    if (!val) return '—';
    if (typeof val === 'string') return val;
    const tryName = (o: any) => o?.nombre ?? o?.fullname ?? o?.email ?? null;
    let n = tryName(val);
    if (n) return String(n);
    const nested = val.estudiante ?? val.alumno ?? val.usuario ?? val.user ?? val.persona;
    n = tryName(nested);
    return n ? String(n) : '—';
  }

  private buildTri(dias: number | null, fj: number | null, fi: number | null): TriResumen {
    const asistidos = (dias != null && fi != null) ? Math.max(0, dias - fi) : null;
    return { diasLaborables: dias, fj, fi, asistidos };
    // asistidos = laborables - faltas INJUSTIFICADAS
  }

  // ===== Carga de tabla =====
  cargarTabla(): void {
    this.rows.set([]);
    if (!this.cursoDetalle()) return;

    const mats = this.materiasAsignadas();
    if (!this.materiaId) {
      if (mats.length) {
        this.sb.open('Seleccione una materia asignada.', 'Cerrar', { duration: 2500 });
      } else {
        this.sb.open('El curso no tiene materias asignadas a este profesor.', 'Cerrar', { duration: 3000 });
      }
      return;
    }

    // Base estudiantes
    const estudiantes: any[] = this.cursoDetalle()?.estudiantes ?? [];
    const base: RowVM[] = (estudiantes ?? [])
      .map((e: any): RowVM => ({
        estudianteId: this.pickId(e),
        estudianteNombre: this.pickName(e),
        T1: { diasLaborables: null, fj: null, fi: null, asistidos: null },
        T2: { diasLaborables: null, fj: null, fi: null, asistidos: null },
        T3: { diasLaborables: null, fj: null, fi: null, asistidos: null }
      }))
      .sort((a: RowVM, b: RowVM) => a.estudianteNombre.localeCompare(b.estudianteNombre));

    if (!base.length) { this.rows.set([]); return; }

    const cursoId = this.asId(this.cursoDetalle()?._id);
    const anioId = this.anioLectivoId();
    const materiaId = this.materiaId;

    if (!cursoId || !anioId || !materiaId) {
      this.rows.set(base);
      this.sb.open('IDs incompletos (curso/año/materia).', 'Cerrar', { duration: 2500 });
      return;
    }

    this.cargando.set(true);

    const loadPorTrimestre = (tri: Trimestre) => new Promise<{
      diasLaborables: number | null;
      faltasIdx: Map<string, { fj: number; fi: number }>;
    }>((resolve) => {
      // 1) días laborables
      this.asisSrv.getDiasLaborables({ cursoId, anioLectivoId: anioId, materiaId, trimestre: tri })
        .subscribe({
          next: (d) => {
            const diasLab = (typeof d?.diasLaborables === 'number') ? d.diasLaborables : null;

            // 2) faltas
            this.asisSrv.obtenerFaltas({ cursoId, anioLectivoId: anioId, materiaId, trimestre: tri })
              .subscribe({
                next: (res) => {
                  const idx = new Map<string, { fj: number; fi: number }>();
                  const arr: any[] = res?.estudiantes ?? res ?? [];
                  for (const it of arr) {
                    const sid = this.pickId(it?.estudianteId ?? it?.estudiante);
                    const fj = Number(it?.faltasJustificadas ?? 0) || 0;
                    const fi = Number(it?.faltasInjustificadas ?? 0) || 0;
                    if (sid) idx.set(sid, { fj, fi });
                  }
                  resolve({ diasLaborables: diasLab, faltasIdx: idx });
                },
                error: () => resolve({ diasLaborables: diasLab, faltasIdx: new Map() })
              });
          },
          error: () => resolve({ diasLaborables: null, faltasIdx: new Map() })
        });
    });

    Promise.all([loadPorTrimestre('T1'), loadPorTrimestre('T2'), loadPorTrimestre('T3')])
      .then(([t1, t2, t3]) => {
        const merged = base.map((r: RowVM) => {
          const sid = r.estudianteId;

          const a1 = t1.faltasIdx.get(sid) ?? { fj: 0, fi: 0 };
          const a2 = t2.faltasIdx.get(sid) ?? { fj: 0, fi: 0 };
          const a3 = t3.faltasIdx.get(sid) ?? { fj: 0, fi: 0 };

          return {
            ...r,
            T1: this.buildTri(t1.diasLaborables, a1.fj, a1.fi),
            T2: this.buildTri(t2.diasLaborables, a2.fj, a2.fi),
            T3: this.buildTri(t3.diasLaborables, a3.fj, a3.fi),
          };
        });

        this.rows.set(merged);
        this.cargando.set(false);
      })
      .catch((e) => {
        console.error('[AsistenciasResumen] Error Promise.all:', e);
        this.rows.set(base);
        this.cargando.set(false);
      });
  }

  // ===== Helpers UI =====
  show(n: number | null): string { return n == null ? '—' : String(n); }

  // ===== Helper genérico =====
  asId(val: any): string {
    if (!val) return '';
    if (typeof val === 'string') return val;
    if (typeof val === 'object' && (val as any)._id) return String((val as any)._id);
    return String(val);
  }
}