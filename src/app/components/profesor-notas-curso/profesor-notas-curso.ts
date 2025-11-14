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
    MatSnackBarModule,
    MatIconModule,
    MatDividerModule,
    MatTableModule,
    MatProgressBarModule,
    MatTooltipModule,
  ],
  template: `
    <div class="wrap">
      <mat-card class="card">
        <div class="header">
          <div class="title-block">
            <div class="eyebrow">
              <mat-icon>grading</mat-icon>
              Registro de calificaciones y asistencias
            </div>
            <h2 class="title">Notas y Asistencia por Curso (Trimestral)</h2>
            <p class="sub">
              Ingrese la <b>Nota Trimestral (0–10)</b> y las
              <b>faltas justificadas / injustificadas</b> por estudiante.
            </p>
          </div>
        </div>

        <mat-divider class="soft-divider"></mat-divider>

        <div class="filters">
          <!-- Curso -->
          <mat-form-field appearance="outline" class="ff dense">
            <mat-label>Curso</mat-label>
            <mat-select
              [(ngModel)]="cursoId"
              name="cursoId"
              (selectionChange)="onCursoChange()"
              required
            >
              <mat-option *ngFor="let c of cursos()" [value]="asId(c._id)">{{
                c.nombre
              }}</mat-option>
            </mat-select>
          </mat-form-field>

          <!-- Materia siempre visible -->
          <mat-form-field appearance="outline" class="ff dense">
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
          </mat-form-field>

          <!-- Trimestre -->
          <mat-form-field appearance="outline" class="ff dense">
            <mat-label>Trimestre</mat-label>
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
          </mat-form-field>

          <!-- Búsqueda -->
          <mat-form-field appearance="outline" class="ff dense search">
            <mat-label>Buscar estudiante</mat-label>
            <input
              matInput
              [ngModel]="q()"
              (ngModelChange)="q.set($event); onSearchChange()"
              placeholder="Escriba un nombre…"
            />
            <button
              *ngIf="q()"
              matSuffix
              mat-icon-button
              aria-label="Limpiar búsqueda"
              (click)="clearSearch()"
            >
              <mat-icon>close</mat-icon>
            </button>
            <mat-icon matPrefix>search</mat-icon>
          </mat-form-field>
        </div>

        <mat-progress-bar *ngIf="cargando()" mode="indeterminate"></mat-progress-bar>

        <div class="table-wrap" *ngIf="viewRows().length; else noRows">
          <!-- Días laborables -->
          <div class="asis-bar">
            <mat-form-field appearance="outline" class="size-ff dense">
              <mat-label>Días laborables del trimestre</mat-label>
              <input matInput type="number" min="0" [(ngModel)]="diasLaborables" />
            </mat-form-field>
            <span class="asis-hint">
              Se aplica a todo el curso para esta materia y trimestre.
            </span>
          </div>

          <table
            mat-table
            [dataSource]="viewRows()"
            class="modern-table compact mat-elevation-z1"
            aria-label="Tabla de estudiantes, notas y asistencias"
          >
            <!-- # -->
            <ng-container matColumnDef="n">
              <th mat-header-cell *matHeaderCellDef class="sticky center">#</th>
              <td mat-cell *matCellDef="let r; let i = index" class="muted center">
                {{ pageStart() + i + 1 }}
              </td>
            </ng-container>

            <!-- Estudiante -->
            <ng-container matColumnDef="est">
              <th mat-header-cell *matHeaderCellDef class="sticky">Estudiante</th>
              <td mat-cell *matCellDef="let r">
                <div class="student-cell">
                  <div class="avatar" aria-hidden="true">
                    {{ r.estudianteNombre?.[0] || 'E' }}
                  </div>
                  <div class="student-name" [matTooltip]="r.estudianteNombre">
                    {{ r.estudianteNombre }}
                  </div>
                </div>
              </td>
            </ng-container>

            <!-- Nota -->
            <ng-container matColumnDef="prom">
              <th mat-header-cell *matHeaderCellDef class="sticky">Nota Trimestral</th>
              <td mat-cell *matCellDef="let r">
                <mat-form-field appearance="outline" class="cell-ff dense">
                  <mat-label>0 a 10</mat-label>
                  <input
                    matInput
                    type="number"
                    inputmode="decimal"
                    min="0"
                    max="10"
                    step="0.1"
                    [(ngModel)]="r.promedioTrimestral"
                    (ngModelChange)="onNotaChange(r)"
                  />
                </mat-form-field>
              </td>
            </ng-container>

            <!-- Faltas justificadas -->
            <ng-container matColumnDef="fj">
              <th mat-header-cell *matHeaderCellDef class="sticky center">F. just.</th>
              <td mat-cell *matCellDef="let r" class="center">
                <mat-form-field appearance="outline" class="cell-ff dense">
                  <mat-label>Fj</mat-label>
                  <input
                    matInput
                    type="number"
                    min="0"
                    [(ngModel)]="r.faltasJustificadas"
                    (ngModelChange)="onFaltasChange(r)"
                  />
                </mat-form-field>
              </td>
            </ng-container>

            <!-- Faltas injustificadas -->
            <ng-container matColumnDef="fi">
              <th mat-header-cell *matHeaderCellDef class="sticky center">F. injust.</th>
              <td mat-cell *matCellDef="let r" class="center">
                <mat-form-field appearance="outline" class="cell-ff dense">
                  <mat-label>Fi</mat-label>
                  <input
                    matInput
                    type="number"
                    min="0"
                    [(ngModel)]="r.faltasInjustificadas"
                    (ngModelChange)="onFaltasChange(r)"
                  />
                </mat-form-field>
              </td>
            </ng-container>

            <tr mat-header-row *matHeaderRowDef="cols"></tr>
            <tr mat-row *matRowDef="let row; columns: cols" class="row"></tr>
          </table>

          <div class="table-footer">
            <div class="pager">
              <div class="range">
                Mostrando {{ pageStart() + 1 }}–{{ pageEnd() }} de {{ filteredCount() }}
              </div>
              <div class="pager-controls">
                <mat-form-field appearance="outline" class="size-ff dense">
                  <mat-label>Filas</mat-label>
                  <mat-select [(ngModel)]="pageSize" (selectionChange)="onPageSizeChange()">
                    <mat-option [value]="10">10</mat-option>
                    <mat-option [value]="25">25</mat-option>
                    <mat-option [value]="50">50</mat-option>
                  </mat-select>
                </mat-form-field>
                <button
                  mat-icon-button
                  (click)="firstPage()"
                  [disabled]="pageIndex() === 0"
                  aria-label="Primera página"
                >
                  <mat-icon>first_page</mat-icon>
                </button>
                <button
                  mat-icon-button
                  (click)="prevPage()"
                  [disabled]="pageIndex() === 0"
                  aria-label="Página anterior"
                >
                  <mat-icon>chevron_left</mat-icon>
                </button>
                <button
                  mat-icon-button
                  (click)="nextPage()"
                  [disabled]="pageIndex() + 1 >= totalPages()"
                  aria-label="Página siguiente"
                >
                  <mat-icon>chevron_right</mat-icon>
                </button>
                <button
                  mat-icon-button
                  (click)="lastPage()"
                  [disabled]="pageIndex() + 1 >= totalPages()"
                  aria-label="Última página"
                >
                  <mat-icon>last_page</mat-icon>
                </button>
              </div>
            </div>

            <div class="footer-actions">              
              <button
                mat-flat-button
                color="primary"
                class="btn-primary"
                (click)="guardarTodo()"
                [disabled]="guardando() || !rows().length"
              >
                <mat-icon>save</mat-icon>
                {{ guardando() ? 'Guardando…' : 'Guardar todo' }}
              </button>
            </div>
          </div>
        </div>

        <ng-template #noRows>
          <div class="empty">
            <div class="empty-icon">📋</div>
            <div class="empty-title">No hay estudiantes cargados</div>
            <div class="empty-sub">
              Seleccione <b>Curso</b>, <b>Materia</b> y <b>Trimestre</b> para visualizar la tabla.
            </div>
            <button mat-stroked-button class="btn-outline mt-8" (click)="recargar()">
              <mat-icon>refresh</mat-icon>
              Intentar de nuevo
            </button>
          </div>
        </ng-template>
      </mat-card>
    </div>
  `,
  styles: [
    `
      .wrap {
        padding: 16px;
        max-width: 1100px;
        margin: 0 auto;
      }
      .card {
        padding: 16px;
        border-radius: 16px;
        display: grid;
        gap: 12px;
      }
      .header {
        display: grid;
        grid-template-columns: 1fr auto;
        gap: 10px;
        align-items: center;
      }
      .title-block .eyebrow {
        display: inline-flex;
        gap: 6px;
        align-items: center;
        font-size: 12px;
        letter-spacing: 0.3px;
        opacity: 0.8;
      }
      .title {
        margin: 0;
        font-size: 20px;
        font-weight: 700;
      }
      .sub {
        margin: 0;
        opacity: 0.8;
        font-size: 12.5px;
      }
      .actions {
        display: inline-flex;
        gap: 8px;
        align-items: center;
      }
      .btn-primary mat-icon,
      .btn-outline mat-icon {
        margin-right: 6px;
      }
      .soft-divider {
        opacity: 0.45;
      }
      .filters {
        display: grid;
        grid-template-columns: repeat(4, minmax(210px, 1fr));
        gap: 10px;
        align-items: end;
      }
      .ff {
        width: 100%;
      }
      .dense .mat-mdc-form-field-infix {
        padding-top: 6px !important;
        padding-bottom: 6px !important;
      }
      .dense .mat-mdc-text-field-wrapper {
        --mdc-filled-text-field-container-height: 36px;
      }
      .search .mat-mdc-form-field-infix {
        padding-right: 0;
      }
      .table-wrap {
        margin-top: 4px;
        overflow: auto;
        border-radius: 12px;
        border: 1px solid #eaeaea;
      }
      table {
        width: 100%;
        border-collapse: separate;
        border-spacing: 0;
        font-size: 13px;
      }
      .modern-table th {
        background: #f9fafb;
        font-weight: 600;
        color: #2f2f2f;
      }
      .modern-table th,
      .modern-table td {
        padding: 6px 10px;
      }
      .modern-table.compact .row {
        height: 36px;
      }
      .modern-table .sticky {
        position: sticky;
        top: 0;
        z-index: 1;
      }
      .modern-table .row:nth-child(odd) td {
        background: #ffffff;
      }
      .modern-table .row:nth-child(even) td {
        background: #fbfbfd;
      }
      .center {
        text-align: center;
      }
      .muted {
        opacity: 0.7;
      }
      .student-cell {
        display: flex;
        align-items: center;
        gap: 8px;
        min-width: 200px;
      }
      .avatar {
        width: 24px;
        height: 24px;
        border-radius: 50%;
        display: grid;
        place-items: center;
        background: #eef2ff;
        font-weight: 700;
        font-size: 11px;
      }
      .student-name {
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .cell-ff {
        width: 110px;
      }
      .cell-ff .mat-mdc-form-field-infix {
        padding-top: 0 !important;
        padding-bottom: 0 !important;
      }
      .table-footer {
        display: grid;
        grid-template-columns: 1fr auto;
        align-items: center;
        gap: 10px;
        padding: 10px;
        border-top: 1px solid #eee;
        background: #fff;
      }
      .pager {
        display: flex;
        align-items: center;
        gap: 10px;
      }
      .range {
        font-size: 12px;
        opacity: 0.8;
      }
      .pager-controls {
        display: inline-flex;
        align-items: center;
        gap: 4px;
      }
      .size-ff {
        width: 110px;
      }
      .footer-actions {
        display: inline-flex;
        gap: 8px;
        flex-wrap: wrap;
      }
      .empty {
        padding: 28px 14px;
        display: grid;
        place-items: center;
        text-align: center;
        gap: 6px;
        color: #555;
      }
      .empty-icon {
        font-size: 40px;
      }
      .empty-title {
        font-weight: 700;
      }
      .mt-8 {
        margin-top: 8px;
      }

      .asis-bar {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 10px;
        border-bottom: 1px solid #eee;
        background: #fafaff;
      }
      .asis-hint {
        font-size: 12px;
        opacity: 0.8;
      }

      @media (max-width: 1200px) {
        .filters {
          grid-template-columns: repeat(3, minmax(210px, 1fr));
        }
      }
      @media (max-width: 900px) {
        .filters {
          grid-template-columns: 1fr 1fr;
        }
        .student-cell {
          min-width: 160px;
        }
      }
      @media (max-width: 600px) {
        .header {
          grid-template-columns: 1fr;
        }
        .actions {
          justify-content: flex-start;
        }
        .filters {
          grid-template-columns: 1fr;
        }
        .cell-ff {
          width: 100px;
        }
        .table-footer {
          grid-template-columns: 1fr;
          gap: 8px;
        }
        .pager {
          justify-content: space-between;
          width: 100%;
        }
        .asis-bar {
          flex-direction: column;
          align-items: flex-start;
        }
      }
    `,
  ],
})
export class ProfesorNotasCursoComponent implements OnInit {
  private sb = inject(MatSnackBar);
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
        error: () => this.sb.open('No se pudieron cargar los cursos', 'Cerrar', { duration: 3000 }),
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
        this.sb.open('No se pudo cargar el detalle del curso', 'Cerrar', { duration: 3000 });
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
    if (isNaN(v)) r.promedioTrimestral = null as any;
    else r.promedioTrimestral = Math.min(10, Math.max(0, v));
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
      this.sb.open('IDs inválidos (curso / año lectivo / materia)', 'Cerrar', { duration: 3500 });
      return;
    }

    if (!this.rows().length) {
      this.sb.open('No hay estudiantes para guardar', 'Cerrar', { duration: 2500 });
      return;
    }

    // Validar notas
    const invalNota = this.rows().some((r: RowVM) => {
      const n = r.promedioTrimestral;
      return n != null && (isNaN(Number(n)) || Number(n) < 0 || Number(n) > 10);
    });
    if (invalNota) {
      this.sb.open('Cada nota debe estar entre 0 y 10.', 'Cerrar', { duration: 3000 });
      return;
    }

    // Validar días laborables
    if (
      this.diasLaborables == null ||
      isNaN(Number(this.diasLaborables)) ||
      Number(this.diasLaborables) < 0
    ) {
      this.sb.open('Ingrese los días laborables (>= 0).', 'Cerrar', { duration: 3000 });
      return;
    }

    // Filtrar filas con IDs inválidos
    const filasInvalidas = this.rows().filter((r) => !this.validOid(r.estudianteId));
    if (filasInvalidas.length) {
      console.warn(
        '[ProfesorNotasCurso] Filas ignoradas por ID no válido:',
        filasInvalidas.map((f) => f.estudianteNombre)
      );
      this.sb.open(
        `Se ignoraron ${filasInvalidas.length} estudiante(s) con ID inválido.`,
        'Cerrar',
        { duration: 4000 }
      );
    }

    const filasValidas = this.rows().filter((r) => this.validOid(r.estudianteId));
    if (!filasValidas.length) {
      this.sb.open('Todos los estudiantes tienen ID inválido. Nada que guardar.', 'Cerrar', {
        duration: 3500,
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
                  this.sb.open(
                    r?.message ?? 'Notas y asistencias guardadas correctamente',
                    'Cerrar',
                    { duration: 3000 }
                  );
                  this.cargarTabla();
                },
                error: (e: any) => {
                  this.guardando.set(false);
                  this.sb.open(e?.error?.message ?? 'Error al guardar asistencias.', 'Cerrar', {
                    duration: 3500,
                  });
                },
              });
            },
            error: (e: any) => {
              this.guardando.set(false);
              this.sb.open(
                e?.error?.message ?? 'No se pudieron guardar los días laborables.',
                'Cerrar',
                { duration: 3500 }
              );
            },
          });
      },
      error: (e) => {
        this.guardando.set(false);
        this.sb.open(e?.error?.message ?? 'Error al guardar notas.', 'Cerrar', { duration: 3500 });
      },
    });
  }
}
