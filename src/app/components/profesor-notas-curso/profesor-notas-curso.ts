import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { MatCardModule } from '@angular/material/card';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
// Se elimina MatSnackBarModule ya que usaremos SweetAlert2
import { MatIconModule } from '@angular/material/icon';
import { MatDividerModule } from '@angular/material/divider';
import { MatTableModule } from '@angular/material/table';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatTooltipModule } from '@angular/material/tooltip';

import Swal from 'sweetalert2'; // Importamos SweetAlert2

import { AuthService } from '../../services/auth.service';
import { CursoService } from '../../services/curso.service';
import { EstudianteService, Estudiante } from '../../services/estudiante.service';
import {
  CalificacionService,
  Trimestre,
  BulkTrimestrePayload10,
} from '../../services/calificacion.service';
import { AsistenciaService, GuardarFaltasBulkPayload } from '../../services/asistencia.service';

type MateriaAsignada = { materiaId: string; materiaNombre: string };

type RowVM = {
  estudianteId: string;
  estudianteNombre: string;
  /** Nota 0..10 */
  promedioTrimestral: number | null;
  /** Asistencia */
  faltasJustificadas: number | null;
  faltasInjustificadas: number | null;
};

@Component({
  standalone: true,
  selector: 'app-profesor-notas-curso',
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
  ],
  template: `
    <div class="main-container">
      <div class="content-wrapper">
        
        <div class="page-header">
          <div class="header-icon">
            <mat-icon>school</mat-icon>
          </div>
          <div class="header-text">
            <h1 class="page-title">Gestión de Calificaciones</h1>
            <p class="page-subtitle">
              Administra notas trimestrales y asistencias de tus cursos asignados.
            </p>
          </div>
        </div>

        <mat-card class="modern-card">
          <div class="controls-section">
            <div class="filters-grid">
              <div class="filter-item">
                <mat-form-field appearance="outline" class="modern-input">
                  <mat-label>Seleccionar Curso</mat-label>
                  <mat-select
                    [(ngModel)]="cursoId"
                    name="cursoId"
                    (selectionChange)="onCursoChange()"
                    required
                  >
                    <mat-option *ngFor="let c of cursos()" [value]="asId(c._id)">
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
                    name="materiaId"
                    (selectionChange)="cargarTabla()"
                    [disabled]="!materiasAsignadas().length"
                    required
                  >
                    <mat-option *ngFor="let m of materiasAsignadas()" [value]="m.materiaId">
                      {{ m.materiaNombre }}
                    </mat-option>
                  </mat-select>
                  <mat-icon matPrefix class="input-icon">menu_book</mat-icon>
                </mat-form-field>
              </div>

              <div class="filter-item">
                <mat-form-field appearance="outline" class="modern-input">
                  <mat-label>Periodo</mat-label>
                  <mat-select
                    [(ngModel)]="trimestre"
                    name="trimestre"
                    (selectionChange)="cargarTabla()"
                    required
                  >
                    <mat-option [value]="'T1'">Primer Trimestre</mat-option>
                    <mat-option [value]="'T2'">Segundo Trimestre</mat-option>
                    <mat-option [value]="'T3'">Tercer Trimestre</mat-option>
                  </mat-select>
                  <mat-icon matPrefix class="input-icon">calendar_today</mat-icon>
                </mat-form-field>
              </div>

              <div class="filter-item search-item">
                <mat-form-field appearance="outline" class="modern-input search-input">
                  <mat-label>Buscar estudiante...</mat-label>
                  <input
                    matInput
                    [ngModel]="q()"
                    (ngModelChange)="q.set($event); onSearchChange()"
                    placeholder="Nombre..."
                  />
                  <mat-icon matPrefix class="input-icon">search</mat-icon>
                  <button
                    *ngIf="q()"
                    matSuffix
                    mat-icon-button
                    aria-label="Limpiar"
                    (click)="clearSearch()"
                  >
                    <mat-icon>close</mat-icon>
                  </button>
                </mat-form-field>
              </div>
            </div>
          </div>

          <mat-progress-bar *ngIf="cargando()" mode="indeterminate" class="loader"></mat-progress-bar>

          <div *ngIf="viewRows().length; else noRows">
            
            <div class="info-bar">
              <mat-icon class="info-icon">info</mat-icon>
              <span class="info-text">
                Ingrese <strong>Días Laborables</strong> para el cálculo global de asistencia del curso:
              </span>
              <div class="labor-input-wrapper">
                <input 
                  type="number" 
                  class="native-input" 
                  min="0" 
                  placeholder="0"
                  [(ngModel)]="diasLaborables" 
                />
                <span class="suffix">días</span>
              </div>
            </div>

            <div class="table-responsive">
              <table
                mat-table
                [dataSource]="viewRows()"
                class="modern-table"
              >
                <ng-container matColumnDef="n">
                  <th mat-header-cell *matHeaderCellDef class="col-xs center">#</th>
                  <td mat-cell *matCellDef="let r; let i = index" class="col-xs center text-muted">
                    {{ pageStart() + i + 1 }}
                  </td>
                </ng-container>

                <ng-container matColumnDef="est">
                  <th mat-header-cell *matHeaderCellDef class="col-main">Estudiante</th>
                  <td mat-cell *matCellDef="let r" class="col-main">
                    <div class="student-info">
                      <div class="avatar gradient-avatar">
                        {{ r.estudianteNombre?.[0] || 'E' }}
                      </div>
                      <div class="name-col">
                        <span class="student-name">{{ r.estudianteNombre }}</span>
                      </div>
                    </div>
                  </td>
                </ng-container>

                <ng-container matColumnDef="prom">
                  <th mat-header-cell *matHeaderCellDef class="col-input center header-highlight">
                    Nota (0-10)
                  </th>
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
                        (ngModelChange)="onFaltasChange(r)"
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
                        (ngModelChange)="onFaltasChange(r)"
                      />
                    </div>
                  </td>
                </ng-container>

                <tr mat-header-row *matHeaderRowDef="cols; sticky: true"></tr>
                <tr mat-row *matRowDef="let row; columns: cols" class="hover-row"></tr>
              </table>
            </div>

            <div class="table-footer">
              <div class="pagination-info">
                <span class="text-muted">
                  Mostrando {{ pageStart() + 1 }} – {{ pageEnd() }} de <strong>{{ filteredCount() }}</strong>
                </span>
              </div>
              
              <div class="pagination-controls">
                 <button mat-icon-button (click)="firstPage()" [disabled]="pageIndex() === 0">
                   <mat-icon>first_page</mat-icon>
                 </button>
                 <button mat-icon-button (click)="prevPage()" [disabled]="pageIndex() === 0">
                   <mat-icon>chevron_left</mat-icon>
                 </button>
                 <span class="page-number">Página {{ pageIndex() + 1 }}</span>
                 <button mat-icon-button (click)="nextPage()" [disabled]="pageIndex() + 1 >= totalPages()">
                   <mat-icon>chevron_right</mat-icon>
                 </button>
                 <button mat-icon-button (click)="lastPage()" [disabled]="pageIndex() + 1 >= totalPages()">
                   <mat-icon>last_page</mat-icon>
                 </button>
              </div>

              <div class="action-area">
                <button
                  mat-flat-button
                  color="primary"
                  class="save-btn"
                  (click)="guardarTodo()"
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
              <div class="empty-illustration">📝</div>
              <h3>Seleccione los datos requeridos</h3>
              <p>Elija un curso, materia y trimestre para comenzar a registrar calificaciones.</p>
              <button mat-stroked-button color="primary" (click)="recargar()" class="refresh-btn">
                <mat-icon>refresh</mat-icon> Actualizar datos
              </button>
            </div>
          </ng-template>

        </mat-card>
      </div>
    </div>
  `,
  styles: [
    `
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

      /* Layout Containers */
      .main-container {
        background-color: var(--bg-page);
        min-height: 100%;
        padding: 24px;
        box-sizing: border-box;
      }

      .content-wrapper {
        max-width: 1200px;
        margin: 0 auto;
      }

      /* Header */
      .page-header {
        display: flex;
        align-items: center;
        gap: 16px;
        margin-bottom: 24px;
      }

      .header-icon {
        width: 48px;
        height: 48px;
        background: linear-gradient(135deg, var(--primary), #5c6bc0);
        color: white;
        border-radius: 12px;
        display: grid;
        place-items: center;
        box-shadow: 0 4px 6px rgba(63, 81, 181, 0.2);
      }
      .header-icon mat-icon {
        font-size: 28px;
        width: 28px;
        height: 28px;
      }

      .header-text h1.page-title {
        margin: 0;
        font-size: 1.5rem;
        font-weight: 700;
        color: var(--text-dark);
      }
      .header-text p.page-subtitle {
        margin: 4px 0 0;
        color: var(--text-muted);
        font-size: 0.95rem;
      }

      /* Card Styling */
      .modern-card {
        border-radius: 16px;
        border: none;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.05);
        background: var(--bg-card);
        padding: 0;
        overflow: hidden;
      }

      /* Filters Grid */
      .controls-section {
        padding: 24px 24px 16px;
      }

      .filters-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
        gap: 16px;
        align-items: center;
      }

      /* Modern Form Fields Overrides */
      .modern-input {
        width: 100%;
      }
      .input-icon {
        color: var(--text-muted);
        margin-right: 8px;
      }
      ::ng-deep .modern-input .mat-mdc-form-field-subscript-wrapper {
        display: none;
      }
      
      /* Info Bar */
      .info-bar {
        background: #fff8e1;
        border-left: 4px solid #ffc107;
        padding: 12px 16px;
        margin: 0 24px 16px;
        border-radius: 4px;
        display: flex;
        align-items: center;
        gap: 12px;
        font-size: 0.9rem;
        color: #5d4037;
      }
      .info-icon { color: #ffa000; }
      
      .labor-input-wrapper {
        display: flex;
        align-items: center;
        background: white;
        border: 1px solid #ddd;
        border-radius: 6px;
        padding: 4px 8px;
        margin-left: auto;
      }
      .native-input {
        border: none;
        outline: none;
        width: 50px;
        text-align: right;
        font-weight: 600;
        font-size: 1rem;
        color: var(--primary);
      }
      .suffix {
        margin-left: 4px;
        font-size: 0.8rem;
        color: var(--text-muted);
      }

      /* Table Styling */
      .table-responsive {
        overflow-x: auto;
        border-top: 1px solid var(--border-color);
      }

      .modern-table {
        width: 100%;
        box-shadow: none;
      }

      .modern-table th {
        background-color: #f9fafb;
        color: var(--text-muted);
        font-weight: 600;
        text-transform: uppercase;
        font-size: 0.75rem;
        letter-spacing: 0.05em;
        padding: 16px;
        border-bottom: 1px solid var(--border-color);
      }
      
      .header-highlight {
        background-color: #eef2ff !important;
        color: var(--primary) !important;
      }

      .modern-table td {
        padding: 12px 16px;
        border-bottom: 1px solid var(--border-color);
        font-size: 0.9rem;
      }

      .hover-row:hover {
        background-color: #f8fafc;
      }

      /* Cell Specifics */
      .center { text-align: center; }
      .text-muted { color: var(--text-muted); }
      .col-xs { width: 50px; }
      .col-main { min-width: 200px; }
      .col-input { width: 120px; }
      
      .cell-highlight {
        background-color: #f8faff;
      }

      /* Student Avatar */
      .student-info {
        display: flex;
        align-items: center;
        gap: 12px;
      }
      .gradient-avatar {
        width: 36px;
        height: 36px;
        border-radius: 50%;
        background: linear-gradient(135deg, #e0e7ff, #c7d2fe);
        color: var(--primary);
        font-weight: 700;
        display: grid;
        place-items: center;
        font-size: 0.85rem;
        border: 1px solid white;
        box-shadow: 0 2px 4px rgba(0,0,0,0.05);
      }
      .student-name {
        font-weight: 500;
        color: var(--text-dark);
      }

      /* Grid Input System */
      .input-wrapper {
        display: flex;
        justify-content: center;
      }
      .grid-input {
        width: 70px;
        padding: 8px;
        border: 1px solid #e2e8f0;
        border-radius: 6px;
        text-align: center;
        font-size: 0.95rem;
        transition: all 0.2s;
        outline: none;
        background: #fff;
      }
      .grid-input:focus {
        border-color: var(--primary);
        box-shadow: 0 0 0 3px rgba(63, 81, 181, 0.1);
      }
      .grid-input.filled {
        font-weight: 600;
        color: var(--text-dark);
        border-color: #cbd5e1;
      }
      
      /* Estilo ERROR para notas > 10 */
      .grid-input.input-error {
        border-color: var(--error-color) !important;
        color: var(--error-color) !important;
        background-color: var(--error-bg) !important;
        box-shadow: 0 0 0 2px rgba(239, 68, 68, 0.2) !important;
      }

      /* Footer / Pagination */
      .table-footer {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        justify-content: space-between;
        padding: 16px 24px;
        background: #fff;
        gap: 16px;
      }
      
      .pagination-controls {
        display: flex;
        align-items: center;
        background: #f1f5f9;
        border-radius: 24px;
        padding: 2px;
      }
      .page-number {
        font-size: 0.85rem;
        font-weight: 600;
        padding: 0 12px;
        color: var(--text-dark);
      }

      .save-btn {
        padding: 0 24px;
        height: 44px;
        font-size: 0.95rem;
        border-radius: 8px;
      }

      /* Empty State */
      .empty-state {
        padding: 60px 20px;
        text-align: center;
        color: var(--text-muted);
      }
      .empty-illustration {
        font-size: 48px;
        margin-bottom: 16px;
        opacity: 0.5;
      }
      .empty-state h3 {
        margin: 0 0 8px;
        color: var(--text-dark);
        font-weight: 600;
      }
      .empty-state p {
        margin: 0 0 24px;
        font-size: 0.95rem;
      }

      /* Loader */
      .loader {
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        z-index: 10;
        border-top-left-radius: 16px;
        border-top-right-radius: 16px;
      }

      @media (max-width: 600px) {
        .page-header { flex-direction: column; text-align: center; }
        .table-footer { justify-content: center; }
        .pagination-controls { order: 2; width: 100%; justify-content: space-between; }
        .action-area { order: 1; width: 100%; }
        .save-btn { width: 100%; }
        .info-bar { flex-direction: column; text-align: center; }
        .labor-input-wrapper { margin-left: 0; width: 100%; justify-content: center; }
      }
    `,
  ],
})
export class ProfesorNotasCursoComponent implements OnInit {
  // MatSnackBar eliminado
  private auth = inject(AuthService);
  private cursoSrv = inject(CursoService);
  private estuSrv = inject(EstudianteService);
  public caliSrv = inject(CalificacionService);
  private asisSrv = inject(AsistenciaService);

  // Estado base
  cursos = signal<any[]>([]);
  cargando = signal<boolean>(false);
  guardando = signal<boolean>(false);

  // Selección
  cursoId = '';
  materiaId = '';
  trimestre: Trimestre = 'T1';

  // Detalle curso
  cursoDetalle = signal<any | null>(null);

  // Tabla
  cols: string[] = ['n', 'est', 'prom', 'fj', 'fi'];
  rows = signal<RowVM[]>([]);

  // Asistencia general
  diasLaborables: number | null = null;

  // Búsqueda / paginación
  q = signal<string>('');
  pageSize = signal<number>(25);
  pageIndex = signal<number>(0);

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
        error: () => {
          Swal.fire({
            icon: 'error',
            title: 'Error',
            text: 'No se pudieron cargar los cursos',
          });
        },
      });
    });
  }

  // ===== Helpers =====
  private validOid(id: string): boolean {
    return /^[a-fA-F0-9]{24}$/.test(id);
  }

  asId(val: any): string {
    if (!val) return '';
    if (typeof val === 'string') return val;
    if (typeof val === 'object') {
      return String(val._id ?? val.uid ?? val.id ?? val.value ?? '');
    }
    return String(val);
  }

  // ===== Derivados =====
  cursoSel = computed(() => (this.cursos() ?? []).find((c) => this.asId(c._id) === this.cursoId));
  anioLectivoId = computed(() =>
    this.asId(this.cursoDetalle()?.anioLectivo || this.cursoSel()?.anioLectivo)
  );

  // Solo materias que dicta este profesor en ese curso
  materiasAsignadas = computed<MateriaAsignada[]>(() => {
    const me = this.auth.getuser()?.id ?? '';
    const mats = (this.cursoDetalle()?.materias ?? this.cursoSel()?.materias ?? [])
      .filter((m: any) => this.asId(m?.profesor) === me)
      .map((m: any) => ({
        materiaId: this.asId(m?.materia),
        materiaNombre: m?.materia?.nombre ?? m?.materia ?? '—',
      }));
    return mats;
  });

  // Búsqueda + paginación
  filteredRows = computed(() => {
    const term = (this.q() || '').trim().toLowerCase();
    const base = this.rows();
    if (!term) return base;
    return base.filter((r) => (r.estudianteNombre || '').toLowerCase().includes(term));
  });
  totalPages = computed(() => Math.max(1, Math.ceil(this.filteredRows().length / this.pageSize())));
  pageStart = computed(() => this.pageIndex() * this.pageSize());
  pageEnd = computed(() =>
    Math.min(this.filteredRows().length, this.pageStart() + this.pageSize())
  );
  viewRows = computed(() => this.filteredRows().slice(this.pageStart(), this.pageEnd()));
  filteredCount = computed(() => this.filteredRows().length);

  // ===== Handlers =====
  onCursoChange(): void {
    this.cursoDetalle.set(null);
    this.rows.set([]);
    this.materiaId = '';
    this.diasLaborables = null;
    this.resetPaging();
    if (!this.cursoId) return;

    this.cargando.set(true);
    this.cursoSrv.obtener(this.cursoId).subscribe({
      next: (res: any) => {
        const c = res?.data ?? res ?? null;
        this.cursoDetalle.set(c);

        const est = (c?.estudiantes ?? []) as any[];
        const vienenIds = est.length > 0 && typeof est[0] === 'string';

        if (vienenIds) {
          this.estuSrv.getAllMap().subscribe((mapa) => {
            const enriquecidos = est.map((id: string) => {
              const e: Estudiante | undefined = mapa.get(id);
              return e
                ? { _id: id, uid: id, nombre: e.nombre, email: e.email }
                : { _id: id, uid: id, nombre: id };
            });

            const reconstruido = { ...(this.cursoDetalle() ?? {}), estudiantes: enriquecidos };
            this.cursoDetalle.set(reconstruido);

            const mats = this.materiasAsignadas();
            this.materiaId = mats.length === 1 ? mats[0].materiaId : '';
            if (this.materiaId) this.cargarTabla();
            this.cargando.set(false);
          });
        } else {
          const mats = this.materiasAsignadas();
          this.materiaId = mats.length === 1 ? mats[0].materiaId : '';
          if (this.materiaId) this.cargarTabla();
          this.cargando.set(false);
        }
      },
      error: () => {
        this.cargando.set(false);
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: 'No se pudo cargar el detalle del curso',
        });
      },
    });
  }

  recargar(): void {
    if (!this.cursoId) return;
    this.onCursoChange();
  }

  onSearchChange(): void {
    this.pageIndex.set(0);
  }
  clearSearch(): void {
    this.q.set('');
    this.pageIndex.set(0);
  }
  onPageSizeChange(): void {
    this.pageIndex.set(0);
  }
  prevPage(): void {
    if (this.pageIndex() > 0) this.pageIndex.set(this.pageIndex() - 1);
  }
  nextPage(): void {
    if (this.pageIndex() + 1 < this.totalPages()) this.pageIndex.set(this.pageIndex() + 1);
  }
  firstPage(): void {
    this.pageIndex.set(0);
  }
  lastPage(): void {
    this.pageIndex.set(this.totalPages() - 1);
  }
  private resetPaging(): void {
    this.pageIndex.set(0);
    this.pageSize.set(25);
    this.q.set('');
  }

  /** Construye la tabla con estudiantes y prellena notas + asistencias */
  cargarTabla(): void {
    this.rows.set([]);
    this.resetPaging();
    this.diasLaborables = null;

    if (!this.cursoDetalle() || !this.trimestre) return;
    if (!this.materiaId) return; // materia obligatoria

    const estudiantes: any[] = this.cursoDetalle()?.estudiantes ?? [];
    const base: RowVM[] = (estudiantes ?? [])
      .map((e: any, idx: number): RowVM => {
        const id = this.asId(e);
        const nombre =
          typeof e === 'object' && (e?.nombre || e?.fullname || e?.email)
            ? e.nombre ?? e.fullname ?? e.email
            : id || `Estudiante ${idx + 1}`;

        return {
          estudianteId: id,
          estudianteNombre: String(nombre),
          promedioTrimestral: null,
          faltasJustificadas: 0,
          faltasInjustificadas: 0,
        };
      })
      .sort((a: RowVM, b: RowVM) => a.estudianteNombre.localeCompare(b.estudianteNombre));

    if (!base.length) {
      this.rows.set([]);
      return;
    }

    this.cargando.set(true);

    const cursoId = this.asId(this.cursoDetalle()?._id);
    const anioId = this.anioLectivoId();
    const materiaId = this.materiaId;

    // 1) NOTAS
    this.caliSrv
      .obtenerNotas({
        cursoId,
        anioLectivoId: anioId,
        materiaId,
        trimestre: this.trimestre,
      })
      .subscribe({
        next: (res) => {
          const idx = new Map<string, any>();
          (res?.estudiantes ?? []).forEach((it: any) => idx.set(it.estudianteId, it));

          const mergedNotas = base.map((r: RowVM): RowVM => {
            const prev = idx.get(r.estudianteId);
            const prom10 =
              typeof prev?.promedioTrimestral === 'number' ? prev.promedioTrimestral : null;
            return { ...r, promedioTrimestral: prom10 };
          });

          this.rows.set(mergedNotas);
          this.cargando.set(false);
        },
        error: () => {
          this.rows.set(base);
          this.cargando.set(false);
        },
      });

    // 2) DÍAS LABORABLES
    this.asisSrv
      .getDiasLaborables({
        cursoId,
        anioLectivoId: anioId,
        materiaId,
        trimestre: this.trimestre,
      })
      .subscribe({
        next: (d: any) => {
          this.diasLaborables = d && typeof d.diasLaborables === 'number' ? d.diasLaborables : null;
        },
        error: () => {
          this.diasLaborables = null;
        },
      });

    // 3) FALTAS
    this.asisSrv
      .obtenerFaltas({
        cursoId,
        anioLectivoId: anioId,
        materiaId,
        trimestre: this.trimestre,
      })
      .subscribe({
        next: (r: any) => {
          const map = new Map<string, any>();
          (r?.estudiantes ?? []).forEach((it: any) => map.set(this.asId(it.estudianteId), it));

          const withAsis = this.rows().map((row: RowVM): RowVM => {
            const prev = map.get(row.estudianteId);
            return {
              ...row,
              faltasJustificadas:
                typeof prev?.faltasJustificadas === 'number' ? prev.faltasJustificadas : 0,
              faltasInjustificadas:
                typeof prev?.faltasInjustificadas === 'number' ? prev.faltasInjustificadas : 0,
            };
          });

          this.rows.set(withAsis);
        },
        error: () => {
          // dejamos las faltas en 0
        },
      });
  }

  onNotaChange(r: RowVM): void {
    if (r.promedioTrimestral == null) return;
    
    const v = Number(r.promedioTrimestral);
    if (isNaN(v)) {
      r.promedioTrimestral = null;
      return;
    }
    
    // Forzar 2 decimales
    const conDosDecimales = Math.round(v * 100) / 100;
    if (v !== conDosDecimales) {
      r.promedioTrimestral = conDosDecimales;
    }
    // NOTA: Se mantiene el valor para validación posterior
  }

  onFaltasChange(r: RowVM): void {
    const fj = Number(r.faltasJustificadas ?? 0);
    const fi = Number(r.faltasInjustificadas ?? 0);
    r.faltasJustificadas = isNaN(fj) || fj < 0 ? 0 : fj;
    r.faltasInjustificadas = isNaN(fi) || fi < 0 ? 0 : fi;
  }

  // ====== Guardar TODO (notas + asistencia) ======
  guardarTodo(): void {
    const anioId = this.anioLectivoId();
    const materia = this.materiaId;
    const cId = this.cursoId;

    if (!this.validOid(cId) || !this.validOid(anioId) || !this.validOid(materia)) {
      console.warn('[ProfesorNotasCurso] IDs inválidos:', {
        cursoId: cId,
        anioLectivoId: anioId,
        materiaId: materia,
      });
      Swal.fire({
        icon: 'error',
        title: 'Error de Datos',
        text: 'IDs inválidos (curso / año lectivo / materia)',
      });
      return;
    }

    if (!this.rows().length) {
      Swal.fire({
        icon: 'info',
        title: 'Atención',
        text: 'No hay estudiantes para guardar',
      });
      return;
    }

    // --- VALIDACIÓN DE RANGO 0 a 10 ---
    const notasInvalidas = this.rows().filter((r: RowVM) => {
      const n = r.promedioTrimestral;
      // Detecta si hay nota y si es menor a 0 o mayor a 10
      return n != null && (Number(n) < 0 || Number(n) > 10);
    });

    if (notasInvalidas.length > 0) {
      Swal.fire({
        icon: 'error',
        title: 'Nota Incorrecta',
        text: 'Ingrese una nota entre 0 a 10',
      });
      return;
    }
    // ----------------------------------

    // Validar días laborables
    if (
      this.diasLaborables == null ||
      isNaN(Number(this.diasLaborables)) ||
      Number(this.diasLaborables) < 0
    ) {
      Swal.fire({
        icon: 'warning',
        title: 'Faltan datos',
        text: 'Ingrese los días laborables (>= 0).',
      });
      return;
    }

    // Filtrar filas con IDs inválidos
    const filasInvalidas = this.rows().filter((r) => !this.validOid(r.estudianteId));
    if (filasInvalidas.length) {
      console.warn(
        '[ProfesorNotasCurso] Filas ignoradas por ID no válido:',
        filasInvalidas.map((f) => f.estudianteNombre)
      );
      Swal.fire({
        icon: 'warning',
        title: 'Advertencia',
        text: `Se ignoraron ${filasInvalidas.length} estudiante(s) con ID inválido.`,
      });
    }

    const filasValidas = this.rows().filter((r) => this.validOid(r.estudianteId));
    if (!filasValidas.length) {
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Todos los estudiantes tienen ID inválido. Nada que guardar.',
      });
      return;
    }

    // Payload notas
    const tableRows = filasValidas.map((r: RowVM) => ({
      estudianteId: r.estudianteId,
      promedioTrimestral: r.promedioTrimestral == null ? null : Number(r.promedioTrimestral),
    }));
    const payloadNotas: BulkTrimestrePayload10 = this.caliSrv.buildBulkPayload({
      cursoId: cId,
      anioLectivoId: anioId,
      materiaId: materia,
      trimestre: this.trimestre,
      tableRows,
    });

    // Payload asistencias
    const rowsPayload = filasValidas.map((r: RowVM) => ({
      estudianteId: r.estudianteId,
      faltasJustificadas: Math.max(0, Number(r.faltasJustificadas) || 0),
      faltasInjustificadas: Math.max(0, Number(r.faltasInjustificadas) || 0),
    }));
    const payloadAsis: GuardarFaltasBulkPayload = {
      cursoId: cId,
      anioLectivoId: anioId,
      materiaId: materia,
      trimestre: this.trimestre,
      rows: rowsPayload,
    };

    this.guardando.set(true);

    // 1) Guardar notas
    this.caliSrv.cargarTrimestreBulk(payloadNotas).subscribe({
      next: () => {
        // 2) Guardar días laborables
        this.asisSrv
          .setDiasLaborables({
            cursoId: cId,
            anioLectivoId: anioId,
            materiaId: materia,
            trimestre: this.trimestre,
            diasLaborables: Number(this.diasLaborables),
          })
          .subscribe({
            next: () => {
              // 3) Guardar faltas
              this.asisSrv.guardarFaltasBulk(payloadAsis).subscribe({
                next: (r: any) => {
                  this.guardando.set(false);
                  
                  // Mensaje de Éxito
                  Swal.fire({
                    icon: 'success',
                    title: '¡Guardado!',
                    text: r?.message ?? 'Notas y asistencias guardadas correctamente',
                    timer: 2000,
                    showConfirmButton: false
                  });

                  this.cargarTabla();
                },
                error: (e: any) => {
                  this.guardando.set(false);
                  Swal.fire({
                    icon: 'error',
                    title: 'Error',
                    text: e?.error?.message ?? 'Error al guardar asistencias.',
                  });
                },
              });
            },
            error: (e: any) => {
              this.guardando.set(false);
              Swal.fire({
                icon: 'error',
                title: 'Error',
                text: e?.error?.message ?? 'No se pudieron guardar los días laborables.',
              });
            },
          });
      },
      error: (e) => {
        this.guardando.set(false);
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: e?.error?.message ?? 'Error al guardar notas.',
        });
      },
    });
  }
}