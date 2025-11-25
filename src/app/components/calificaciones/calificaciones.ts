// src/app/components/calificaciones/calificaciones.ts
import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

// Material
import { MatCardModule } from '@angular/material/card';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
// Se elimina MatSnackBarModule para usar SweetAlert2
import { MatIconModule } from '@angular/material/icon';
import { MatDividerModule } from '@angular/material/divider';
import { MatTableModule } from '@angular/material/table';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatChipsModule } from '@angular/material/chips';

// SweetAlert2
import Swal from 'sweetalert2';

// Servicios
import { CursoService } from '../../services/curso.service';
import {
  CalificacionService,
  Trimestre,
  BulkTrimestrePayload10
} from '../../services/calificacion.service';
import {
  AsistenciaService,
  GuardarFaltasBulkPayload
} from '../../services/asistencia.service';

type AnioLectivoVM = {
  id: string;
  nombre: string;
  actual?: boolean;
};

type MateriaVM = {
  materiaId: string;
  materiaNombre: string;
};

type RowVM = {
  estudianteId: string;
  estudianteNombre: string;
  // Notas
  promedioTrimestral: number | null;
  // Asistencias
  diasLaborables: number | null;
  faltasJustificadas: number | null;
  faltasInjustificadas: number | null;
  asistidos: number | null;
};

@Component({
  standalone: true,
  selector: 'app-calificaciones',
  imports: [
    CommonModule,
    FormsModule,
    MatCardModule,
    MatSelectModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    // MatSnackBarModule eliminado
    MatIconModule,
    MatDividerModule,
    MatTableModule,
    MatProgressBarModule,
    MatTooltipModule,
    MatChipsModule
  ],
  template: `
  <div class="main-container">
    <div class="content-wrapper">

      <div class="page-header">
        <div class="header-icon">
          <mat-icon>admin_panel_settings</mat-icon>
        </div>
        <div class="header-text">
          <h1 class="page-title">Administración de Calificaciones</h1>
          <p class="page-subtitle">
            Gestión centralizada de notas trimestrales y asistencias por curso.
          </p>
        </div>
        <div class="header-actions">
           <button mat-stroked-button (click)="recargarCursos()" [disabled]="cargandoCursos()" class="refresh-btn">
            <mat-icon>refresh</mat-icon>
            Recargar
          </button>
        </div>
      </div>

      <mat-card class="modern-card">
        
        <div class="controls-section">
          <div class="filters-grid">
            <div class="filter-item">
              <mat-form-field appearance="outline" class="modern-input">
                <mat-label>Año Lectivo</mat-label>
                <mat-select [(ngModel)]="anioId" (selectionChange)="onAnioChange()">
                  <mat-option *ngFor="let a of aniosLectivos()" [value]="a.id">
                    {{ a.nombre }}
                    <span *ngIf="a.actual" class="badge-actual">Actual</span>
                  </mat-option>
                </mat-select>
                <mat-icon matPrefix class="input-icon">calendar_month</mat-icon>
              </mat-form-field>
            </div>

            <div class="filter-item">
              <mat-form-field appearance="outline" class="modern-input">
                <mat-label>Curso</mat-label>
                <mat-select
                  [(ngModel)]="cursoId"
                  (selectionChange)="onCursoChange()"
                  [disabled]="!anioId || !cursosFiltrados().length"
                >
                  <mat-option *ngFor="let c of cursosFiltrados()" [value]="asId(c._id)">
                    {{ c.nombre }}
                  </mat-option>
                </mat-select>
                <mat-icon matPrefix class="input-icon">class</mat-icon>
              </mat-form-field>
            </div>

            <div class="filter-item">
              <mat-form-field appearance="outline" class="modern-input">
                <mat-label>Materia</mat-label>
                <mat-select
                  [(ngModel)]="materiaId"
                  (selectionChange)="cargarTabla()"
                  [disabled]="!cursoDetalle() || !materiasCurso().length"
                >
                  <mat-option *ngFor="let m of materiasCurso()" [value]="m.materiaId">
                    {{ m.materiaNombre }}
                  </mat-option>
                </mat-select>
                <mat-icon matPrefix class="input-icon">menu_book</mat-icon>
              </mat-form-field>
            </div>

            <div class="filter-item">
              <mat-form-field appearance="outline" class="modern-input">
                <mat-label>Trimestre</mat-label>
                <mat-select [(ngModel)]="trimestre" (selectionChange)="cargarTabla()">
                  <mat-option [value]="'T1'">Primer Trimestre</mat-option>
                  <mat-option [value]="'T2'">Segundo Trimestre</mat-option>
                  <mat-option [value]="'T3'">Tercer Trimestre</mat-option>
                </mat-select>
                <mat-icon matPrefix class="input-icon">event_note</mat-icon>
              </mat-form-field>
            </div>
          </div>

          <div class="badges-container" *ngIf="cursoDetalle()">
            <div class="badge-item">
              <mat-icon>school</mat-icon> {{ cursoDetalle()?.nombre }}
            </div>
            <div class="badge-item">
              <mat-icon>group</mat-icon> {{ cursoDetalle()?.estudiantes?.length || 0 }} Estudiantes
            </div>
            <div class="badge-item highlight">
              <mat-icon>date_range</mat-icon> {{ etiquetaTrimestre(trimestre) }}
            </div>
          </div>
        </div>

        <mat-progress-bar *ngIf="cargandoDetalle()" mode="indeterminate" class="loader"></mat-progress-bar>

        <div *ngIf="rows().length; else noRows">
          <div class="table-responsive">
            <table mat-table [dataSource]="rows()" class="modern-table">
              
              <ng-container matColumnDef="n">
                <th mat-header-cell *matHeaderCellDef class="col-xs center">#</th>
                <td mat-cell *matCellDef="let r; let i = index" class="col-xs center text-muted">
                  {{ i + 1 }}
                </td>
              </ng-container>

              <ng-container matColumnDef="est">
                <th mat-header-cell *matHeaderCellDef class="col-main">Estudiante</th>
                <td mat-cell *matCellDef="let r" class="col-main">
                  <div class="student-info">
                    <div class="avatar gradient-avatar">{{ r.estudianteNombre?.[0] || 'E' }}</div>
                    <div class="name-col">
                      <span class="student-name">{{ r.estudianteNombre }}</span>
                    </div>
                  </div>
                </td>
              </ng-container>

              <ng-container matColumnDef="nota">
                <th mat-header-cell *matHeaderCellDef class="col-input center header-highlight">Nota (0-10)</th>
                <td mat-cell *matCellDef="let r" class="col-input center cell-highlight">
                  <div class="input-wrapper">
                    <input
                      type="number"
                      class="grid-input"
                      min="0"
                      step="0.01"
                      placeholder="-"
                      [(ngModel)]="r.promedioTrimestral"
                      (ngModelChange)="onNotaChange(r)"
                      [class.filled]="r.promedioTrimestral !== null"
                      [class.input-error]="r.promedioTrimestral != null && (r.promedioTrimestral > 10 || r.promedioTrimestral < 0)"
                    />
                  </div>
                </td>
              </ng-container>

              <ng-container matColumnDef="dias">
                <th mat-header-cell *matHeaderCellDef class="col-input center">Días Clase</th>
                <td mat-cell *matCellDef="let r" class="col-input center">
                  <div class="input-wrapper">
                    <input
                      type="number"
                      class="grid-input"
                      min="0"
                      placeholder="-"
                      [(ngModel)]="r.diasLaborables"
                      (ngModelChange)="recalcularAsistidos(r)"
                    />
                  </div>
                </td>
              </ng-container>

              <ng-container matColumnDef="fj">
                <th mat-header-cell *matHeaderCellDef class="col-input center">F. Justif.</th>
                <td mat-cell *matCellDef="let r" class="col-input center">
                  <div class="input-wrapper">
                    <input
                      type="number"
                      class="grid-input"
                      min="0"
                      placeholder="0"
                      [(ngModel)]="r.faltasJustificadas"
                      (ngModelChange)="normalizarFaltas(r)"
                    />
                  </div>
                </td>
              </ng-container>

              <ng-container matColumnDef="fi">
                <th mat-header-cell *matHeaderCellDef class="col-input center">F. Injust.</th>
                <td mat-cell *matCellDef="let r" class="col-input center">
                  <div class="input-wrapper">
                    <input
                      type="number"
                      class="grid-input"
                      min="0"
                      placeholder="0"
                      [(ngModel)]="r.faltasInjustificadas"
                      (ngModelChange)="recalcularAsistidos(r)"
                    />
                  </div>
                </td>
              </ng-container>

              <ng-container matColumnDef="asist">
                <th mat-header-cell *matHeaderCellDef class="col-xs center">Asist.</th>
                <td mat-cell *matCellDef="let r" class="col-xs center">
                  <span class="pill" [class.muted]="r.asistidos == null">
                    {{ r.asistidos == null ? '—' : r.asistidos }}
                  </span>
                </td>
              </ng-container>

              <tr mat-header-row *matHeaderRowDef="cols; sticky: true"></tr>
              <tr mat-row *matRowDef="let row; columns: cols" class="hover-row"></tr>
            </table>
          </div>

          <div class="table-footer">
            <div class="pagination-info">
               <span class="text-muted">Total: <strong>{{ rows().length }}</strong> estudiantes</span>
            </div>
            <div class="action-area">
              <button
                mat-flat-button
                color="primary"
                class="save-btn"
                (click)="guardar()"
                [disabled]="guardando() || !rows().length"
              >
                <mat-icon>save</mat-icon>
                {{ guardando() ? 'Guardando...' : 'Guardar Todo' }}
              </button>
            </div>
          </div>
        </div>

        <ng-template #noRows>
          <div class="empty-state">
            <div class="empty-illustration">📊</div>
            <h3>Seleccione los datos requeridos</h3>
            <p>Elija un <b>Año Lectivo</b>, <b>Curso</b>, <b>Materia</b> y <b>Trimestre</b> para comenzar.</p>
          </div>
        </ng-template>

      </mat-card>
    </div>
  </div>
  `,
  styles: [`
    :host {
      --primary: #3f51b5;
      --primary-light: #e8eaf6;
      --text-dark: #1f2937;
      --text-muted: #6b7280;
      --border-color: #e5e7eb;
      --bg-page: #f3f4f6;
      --bg-card: #ffffff;
      --error-color: #ef4444;
      --error-bg: #fef2f2;
    }

    /* Layout */
    .main-container {
      background-color: var(--bg-page);
      min-height: 100%;
      padding: 24px;
      box-sizing: border-box;
    }
    .content-wrapper { max-width: 1200px; margin: 0 auto; }

    /* Header */
    .page-header {
      display: flex;
      align-items: center;
      gap: 16px;
      margin-bottom: 24px;
      flex-wrap: wrap;
    }
    .header-icon {
      width: 48px; height: 48px;
      background: linear-gradient(135deg, var(--primary), #5c6bc0);
      color: white; border-radius: 12px;
      display: grid; place-items: center;
      box-shadow: 0 4px 6px rgba(63, 81, 181, 0.2);
    }
    .header-icon mat-icon { font-size: 28px; width: 28px; height: 28px; }
    
    .header-text { flex: 1; min-width: 250px; }
    .header-text h1.page-title { margin: 0; font-size: 1.5rem; font-weight: 700; color: var(--text-dark); }
    .header-text p.page-subtitle { margin: 4px 0 0; color: var(--text-muted); font-size: 0.95rem; }

    /* Card */
    .modern-card {
      border-radius: 16px; border: none;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.05);
      background: var(--bg-card); padding: 0; overflow: hidden;
    }

    /* Filters */
    .controls-section { padding: 24px 24px 16px; }
    .filters-grid {
      display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 16px; align-items: center; margin-bottom: 16px;
    }

    /* Inputs */
    .modern-input { width: 100%; }
    .input-icon { color: var(--text-muted); margin-right: 8px; }
    ::ng-deep .modern-input .mat-mdc-form-field-subscript-wrapper { display: none; }
    .badge-actual {
       background: #d1fae5; color: #065f46; padding: 2px 6px; 
       border-radius: 4px; font-size: 10px; margin-left: 6px; font-weight: 600;
    }

    /* Badges */
    .badges-container {
      display: flex; gap: 12px; flex-wrap: wrap;
      padding-top: 8px; border-top: 1px solid #f3f4f6;
    }
    .badge-item {
      display: inline-flex; align-items: center; gap: 6px;
      background: #f1f5f9; padding: 6px 12px; border-radius: 20px;
      font-size: 0.85rem; color: var(--text-dark); font-weight: 500;
    }
    .badge-item mat-icon { font-size: 18px; width: 18px; height: 18px; color: var(--text-muted); }
    .badge-item.highlight { background: #eef2ff; color: var(--primary); }
    .badge-item.highlight mat-icon { color: var(--primary); }

    /* Table */
    .table-responsive { overflow-x: auto; border-top: 1px solid var(--border-color); }
    .modern-table { width: 100%; box-shadow: none; }
    
    .modern-table th {
      background-color: #f9fafb; color: var(--text-muted); font-weight: 600;
      text-transform: uppercase; font-size: 0.75rem; padding: 12px 16px;
      border-bottom: 1px solid var(--border-color);
    }
    .modern-table td {
      padding: 10px 16px; border-bottom: 1px solid var(--border-color); font-size: 0.9rem;
    }
    .hover-row:hover { background-color: #f8fafc; }

    /* Columns */
    .col-xs { width: 50px; }
    .col-main { min-width: 220px; }
    .col-input { width: 100px; }
    .center { text-align: center; }
    .text-muted { color: var(--text-muted); }
    .header-highlight { background-color: #eef2ff !important; color: var(--primary) !important; }
    .cell-highlight { background-color: #f8faff; }

    /* Student Info */
    .student-info { display: flex; align-items: center; gap: 12px; }
    .gradient-avatar {
      width: 32px; height: 32px; border-radius: 50%;
      background: linear-gradient(135deg, #e0e7ff, #c7d2fe);
      color: var(--primary); font-weight: 700; display: grid; place-items: center;
      font-size: 0.8rem; border: 1px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.05);
    }
    .student-name { font-weight: 500; color: var(--text-dark); }

    /* Inputs in table */
    .input-wrapper { display: flex; justify-content: center; }
    .grid-input {
      width: 60px; padding: 6px; border: 1px solid #e2e8f0; border-radius: 6px;
      text-align: center; font-size: 0.9rem; outline: none; transition: all 0.2s;
    }
    .grid-input:focus { border-color: var(--primary); box-shadow: 0 0 0 3px rgba(63, 81, 181, 0.1); }
    .grid-input.filled { font-weight: 600; color: var(--text-dark); border-color: #cbd5e1; }
    
    /* ERROR STYLE */
    .grid-input.input-error {
       border-color: var(--error-color) !important; color: var(--error-color) !important;
       background-color: var(--error-bg) !important; box-shadow: 0 0 0 2px rgba(239, 68, 68, 0.2) !important;
    }

    .pill {
      display: inline-block; padding: 2px 8px; border-radius: 12px;
      background: #f1f5f9; font-size: 0.85rem; font-weight: 500; color: var(--text-dark);
    }
    .pill.muted { background: transparent; color: #9ca3af; }

    /* Footer */
    .table-footer {
      display: flex; align-items: center; justify-content: space-between;
      padding: 16px 24px; background: #fff; gap: 16px; flex-wrap: wrap;
    }
    .save-btn { padding: 0 24px; height: 44px; font-size: 0.95rem; border-radius: 8px; }

    /* Empty State */
    .empty-state { padding: 60px 20px; text-align: center; color: var(--text-muted); }
    .empty-illustration { font-size: 48px; margin-bottom: 16px; opacity: 0.5; }
    .empty-state h3 { margin: 0 0 8px; color: var(--text-dark); font-weight: 600; }
    .empty-state p { margin: 0 0 24px; font-size: 0.95rem; }

    /* Loader */
    .loader { position: absolute; top: 0; left: 0; right: 0; z-index: 10; }

    @media (max-width: 700px) {
      .filters-grid { grid-template-columns: 1fr; }
      .page-header { flex-direction: column; text-align: center; }
      .table-footer { justify-content: center; }
      .action-area { width: 100%; }
      .save-btn { width: 100%; }
    }
  `]
})
export class CalificacionesComponent implements OnInit {
  // MatSnackBar eliminado
  private cursoSrv = inject(CursoService);
  private caliSrv = inject(CalificacionService);
  private asisSrv = inject(AsistenciaService);

  cursos = signal<any[]>([]);
  cursoDetalle = signal<any | null>(null);

  cargandoCursos = signal<boolean>(false);
  cargandoDetalle = signal<boolean>(false);
  guardando = signal<boolean>(false);

  anioId = '';
  cursoId = '';
  materiaId = '';
  trimestre: Trimestre = 'T1';

  cols: string[] = ['n', 'est', 'nota', 'dias', 'fj', 'fi', 'asist'];
  rows = signal<RowVM[]>([]);

  ngOnInit(): void {
    this.cargarCursos();
  }

  // ========= Carga cursos / años =========
  private cargarCursos(): void {
    this.cargandoCursos.set(true);
    this.cursoSrv.listar().subscribe({
      next: (res: any) => {
        const all = res?.data ?? res ?? [];
        this.cursos.set(all);

        const anios = this.aniosLectivos();
        const actual = anios.find(a => a.actual);
        if (actual) this.anioId = actual.id;
        else if (anios.length === 1) this.anioId = anios[0].id;

        this.cargandoCursos.set(false);
      },
      error: () => {
        this.cargandoCursos.set(false);
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: 'No se pudieron cargar los cursos'
        });
      }
    });
  }

  recargarCursos(): void {
    this.anioId = '';
    this.cursoId = '';
    this.materiaId = '';
    this.cursoDetalle.set(null);
    this.rows.set([]);
    this.cargarCursos();
  }

  // ========= Derivados =========
  aniosLectivos = computed<AnioLectivoVM[]>(() => {
    const mapa = new Map<string, AnioLectivoVM>();
    for (const c of this.cursos() ?? []) {
      const raw = c?.anioLectivo;
      if (!raw) continue;
      const id = this.asId(typeof raw === 'object' ? raw._id ?? raw.id ?? raw.uid ?? '' : raw);
      if (!id) continue;
      if (!mapa.has(id)) {
        const nombre =
          typeof raw === 'object'
            ? (raw.nombre ?? raw.descripcion ?? String(raw))
            : String(raw);
        const actual = typeof raw === 'object' ? !!raw.actual : false;
        mapa.set(id, { id, nombre, actual });
      }
    }
    return Array.from(mapa.values()).sort((a, b) => a.nombre.localeCompare(b.nombre));
  });

  cursosFiltrados = computed(() => {
    if (!this.anioId) return this.cursos();
    return (this.cursos() ?? []).filter(c => {
      const raw = c?.anioLectivo;
      if (!raw) return false;
      const id = this.asId(typeof raw === 'object' ? raw._id ?? raw.id ?? raw.uid ?? '' : raw);
      return id === this.anioId;
    });
  });

  cursoSel = computed(() =>
    (this.cursosFiltrados() ?? []).find(c => this.asId(c._id) === this.cursoId)
  );

  materiasCurso = computed<MateriaVM[]>(() => {
    const mats: any[] = this.cursoDetalle()?.materias ?? this.cursoSel()?.materias ?? [];
    return mats.map((m: any) => ({
      materiaId: this.asId(m?.materia),
      materiaNombre: m?.materia?.nombre ?? m?.materia ?? '—'
    }));
  });

  etiquetaAnioSeleccionado(): string {
    const a = this.aniosLectivos().find(x => x.id === this.anioId);
    return a?.nombre ?? '—';
  }

  // ========= Filtros =========
  onAnioChange(): void {
    this.cursoId = '';
    this.materiaId = '';
    this.cursoDetalle.set(null);
    this.rows.set([]);
  }

  onCursoChange(): void {
    this.cursoDetalle.set(null);
    this.rows.set([]);
    this.materiaId = '';
    if (!this.cursoId) return;

    this.cargandoDetalle.set(true);
    this.cursoSrv.obtener(this.cursoId).subscribe({
      next: (res: any) => {
        const c = res?.data ?? res ?? null;
        this.cursoDetalle.set(c);

        const mats = this.materiasCurso();
        if (mats.length === 1) this.materiaId = mats[0].materiaId;

        this.cargandoDetalle.set(false);
        if (this.materiaId) this.cargarTabla();
      },
      error: () => {
        this.cargandoDetalle.set(false);
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: 'No se pudo cargar el detalle del curso'
        });
      }
    });
  }

  // ========= Normalizadores =========
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

  private notaFrom(item: any): number | null {
    const raw = item?.promedioTrimestral ?? item?.promedio10 ?? item?.promedio ?? item?.nota ?? null;
    if (raw == null) return null;
    const v = Number(raw);
    if (isNaN(v)) return null;
    return v > 10 ? Number((v / 10).toFixed(2)) : Number(v.toFixed(2));
  }

  // ========= Tabla =========
  cargarTabla(): void {
    this.rows.set([]);

    if (!this.cursoDetalle() || !this.cursoId || !this.materiaId || !this.trimestre) return;

    const anioId = this.anioId ||
      this.asId(this.cursoDetalle()?.anioLectivo || this.cursoSel()?.anioLectivo);
    if (!anioId) {
      Swal.fire({
        icon: 'warning',
        title: 'Atención',
        text: 'No se pudo determinar el año lectivo.'
      });
      return;
    }

    const estudiantes: any[] = this.cursoDetalle()?.estudiantes ?? [];
    const baseMap = new Map<string, RowVM>();

    for (const e of estudiantes) {
      const sid = this.pickId(e);
      const nombre = this.pickName(e);
      if (!sid) continue;
      baseMap.set(sid, {
        estudianteId: sid,
        estudianteNombre: nombre,
        promedioTrimestral: null,
        diasLaborables: null,
        faltasJustificadas: null,
        faltasInjustificadas: null,
        asistidos: null
      });
    }

    if (!baseMap.size) {
      this.rows.set([]);
      return;
    }

    this.cargandoDetalle.set(true);

    const cursoId = this.asId(this.cursoDetalle()?._id);
    const materiaId = this.materiaId;
    const tri = this.trimestre;

    // 1) Notas
    this.caliSrv.obtenerNotas({
      cursoId,
      anioLectivoId: anioId,
      materiaId,
      trimestre: tri
    }).subscribe({
      next: (res: any) => {
        const arr: any[] = res?.estudiantes ?? res ?? [];
        for (const it of arr) {
          const sid = this.pickId(it?.estudianteId ?? it?.estudiante);
          if (!sid) continue;
          const nota = this.notaFrom(it);
          const prev = baseMap.get(sid);
          if (prev) prev.promedioTrimestral = nota;
        }

        // 2) Días laborables
        this.asisSrv.getDiasLaborables({
          cursoId,
          anioLectivoId: anioId,
          materiaId,
          trimestre: tri
        }).subscribe({
          next: (d: any) => {
            const dias = typeof d?.diasLaborables === 'number' ? d.diasLaborables : null;
            if (dias != null) {
              baseMap.forEach((row) => {
                row.diasLaborables = dias;
                this.recalcularAsistidos(row);
              });
            }

            // 3) Faltas
            this.asisSrv.obtenerFaltas({
              cursoId,
              anioLectivoId: anioId,
              materiaId,
              trimestre: tri
            }).subscribe({
              next: (faltas: any) => {
                const arrF: any[] = faltas?.estudiantes ?? [];
                for (const it of arrF) {
                  const sid = this.pickId(it?.estudianteId ?? it?.estudiante);
                  if (!sid) continue;
                  const fj = Number(it?.faltasJustificadas ?? 0) || 0;
                  const fi = Number(it?.faltasInjustificadas ?? 0) || 0;
                  const prev = baseMap.get(sid);
                  if (prev) {
                    prev.faltasJustificadas = fj;
                    prev.faltasInjustificadas = fi;
                    this.recalcularAsistidos(prev);
                  }
                }

                const lista = Array.from(baseMap.values()).sort((a, b) =>
                  a.estudianteNombre.localeCompare(b.estudianteNombre)
                );
                this.rows.set(lista);
                this.cargandoDetalle.set(false);
              },
              error: () => {
                const lista = Array.from(baseMap.values()).sort((a, b) =>
                  a.estudianteNombre.localeCompare(b.estudianteNombre)
                );
                this.rows.set(lista);
                this.cargandoDetalle.set(false);
              }
            });
          },
          error: () => {
            const lista = Array.from(baseMap.values()).sort((a, b) =>
              a.estudianteNombre.localeCompare(b.estudianteNombre)
            );
            this.rows.set(lista);
            this.cargandoDetalle.set(false);
          }
        });
      },
      error: () => {
        this.cargandoDetalle.set(false);
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: 'Error al cargar las notas'
        });
      }
    });
  }

  // ========= Helpers fila =========
  onNotaChange(r: RowVM): void {
    if (r.promedioTrimestral == null) return;
    const v = Number(r.promedioTrimestral);
    if (isNaN(v)) {
      r.promedioTrimestral = null;
      return;
    }
    // Redondeo a 2 decimales, SIN clamping (permitimos > 10 para validación)
    const conDosDecimales = Math.round(v * 100) / 100;
    if (v !== conDosDecimales) {
      r.promedioTrimestral = conDosDecimales;
    }
  }

  normalizarFaltas(r: RowVM): void {
    const fj = r.faltasJustificadas == null ? null : Math.max(0, Number(r.faltasJustificadas) || 0);
    const fi = r.faltasInjustificadas == null ? null : Math.max(0, Number(r.faltasInjustificadas) || 0);
    r.faltasJustificadas = fj;
    r.faltasInjustificadas = fi;
    this.recalcularAsistidos(r);
  }

  recalcularAsistidos(r: RowVM): void {
    const dias = r.diasLaborables == null ? null : Number(r.diasLaborables);
    const fi = r.faltasInjustificadas == null ? 0 : Number(r.faltasInjustificadas);
    if (dias == null || isNaN(dias)) {
      r.asistidos = null;
      return;
    }
    const asist = Math.max(0, dias - (isNaN(fi) ? 0 : fi));
    r.asistidos = asist;
  }

  // ========= Guardar: un solo botón =========
  guardar(): void {
    if (!this.cursoId || !this.materiaId || !this.trimestre) {
      Swal.fire({
        icon: 'warning',
        title: 'Faltan datos',
        text: 'Seleccione curso, materia y trimestre.'
      });
      return;
    }
    const anioId = this.anioId ||
      this.asId(this.cursoDetalle()?.anioLectivo || this.cursoSel()?.anioLectivo);
    if (!anioId) {
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'No se pudo determinar el año lectivo.'
      });
      return;
    }

    if (!this.rows().length) {
      Swal.fire({
        icon: 'info',
        title: 'Vacío',
        text: 'No hay filas para guardar.'
      });
      return;
    }

    // --- VALIDACIÓN DE RANGO 0 a 10 ---
    const invalNota = this.rows().some((r) => {
      const n = r.promedioTrimestral;
      return n != null && (isNaN(Number(n)) || Number(n) < 0 || Number(n) > 10);
    });
    if (invalNota) {
      Swal.fire({
        icon: 'error',
        title: 'Nota incorrecta',
        text: 'Nota incorrecta: ingrese una nota entre 0 a 10'
      });
      return;
    }
    // ----------------------------------

    // ====== Payload NOTAS ======
    const tableRows = this.rows().map((r: RowVM) => ({
      estudianteId: r.estudianteId,
      promedioTrimestral: r.promedioTrimestral == null ? null : Number(r.promedioTrimestral)
    }));

    const payloadNotas: BulkTrimestrePayload10 = this.caliSrv.buildBulkPayload({
      cursoId: this.cursoId,
      anioLectivoId: anioId,
      materiaId: this.materiaId,
      trimestre: this.trimestre,
      tableRows
    });

    // ====== Payload FALTAS ======
    const payloadFaltas: GuardarFaltasBulkPayload = {
      cursoId: this.cursoId,
      anioLectivoId: anioId,
      materiaId: this.materiaId,
      trimestre: this.trimestre,
      rows: this.rows().map((r) => ({
        estudianteId: r.estudianteId,
        faltasJustificadas: Number(r.faltasJustificadas ?? 0) || 0,
        faltasInjustificadas: Number(r.faltasInjustificadas ?? 0) || 0
      }))
    };

    // Días laborables: tomo el primero que tenga valor
    const diasRow = this.rows().find(r => r.diasLaborables != null);
    const diasLaborables = diasRow ? Number(diasRow.diasLaborables) : null;

    this.guardando.set(true);

    // Primero guardamos NOTAS
    this.caliSrv.cargarTrimestreBulk(payloadNotas).subscribe({
      next: (respNotas) => {
        // Luego guardamos DÍAS LABORABLES (si hay) y FALTAS
        const guardarFaltas = () => {
          this.asisSrv.guardarFaltasBulk(payloadFaltas).subscribe({
            next: (respFaltas) => {
              this.guardando.set(false);
              Swal.fire({
                icon: 'success',
                title: '¡Guardado!',
                text: respFaltas?.message ?? respNotas?.message ?? 'Notas y asistencias guardadas correctamente',
                timer: 2000,
                showConfirmButton: false
              });
              this.cargarTabla();
            },
            error: (e2) => {
              this.guardando.set(false);
              Swal.fire({
                icon: 'warning',
                title: 'Parcialmente guardado',
                text: e2?.error?.message ?? 'Notas guardadas, pero hubo un error al guardar faltas'
              });
              this.cargarTabla();
            }
          });
        };

        if (diasLaborables != null && !isNaN(diasLaborables)) {
          this.asisSrv.setDiasLaborables({
            cursoId: this.cursoId,
            anioLectivoId: anioId,
            materiaId: this.materiaId,
            trimestre: this.trimestre,
            diasLaborables
          }).subscribe({
            next: () => guardarFaltas(),
            error: (e1) => {
              // Si falla días laborables, igual intento guardar faltas
              Swal.fire({
                icon: 'warning',
                title: 'Advertencia',
                text: e1?.error?.message ?? 'Error al guardar días laborables, se intentará guardar faltas'
              });
              guardarFaltas();
            }
          });
        } else {
          // No hay días laborables -> solo guardamos faltas
          guardarFaltas();
        }
      },
      error: (eNotas) => {
        this.guardando.set(false);
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: eNotas?.error?.message ?? 'Error al guardar notas y asistencias'
        });
      }
    });
  }

  // ========= Helpers varios =========
  etiquetaTrimestre(t: Trimestre): string {
    if (t === 'T1') return '1er Trimestre';
    if (t === 'T2') return '2do Trimestre';
    return '3er Trimestre';
  }

  asId(val: any): string {
    if (!val) return '';
    if (typeof val === 'string') return val;
    if (typeof val === 'object' && (val as any)._id) return String((val as any)._id);
    if (typeof val === 'object' && (val as any).uid) return String((val as any).uid);
    return String(val);
  }
}