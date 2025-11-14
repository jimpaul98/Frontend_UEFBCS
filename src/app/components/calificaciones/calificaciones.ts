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
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatIconModule } from '@angular/material/icon';
import { MatDividerModule } from '@angular/material/divider';
import { MatTableModule } from '@angular/material/table';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatChipsModule } from '@angular/material/chips';

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
    MatSnackBarModule,
    MatIconModule,
    MatDividerModule,
    MatTableModule,
    MatProgressBarModule,
    MatTooltipModule,
    MatChipsModule
  ],
  template: `
  <div class="wrap">
    <mat-card class="card">
      <div class="header">
        <div class="title-block">
          <div class="eyebrow">
            <mat-icon>admin_panel_settings</mat-icon>
            Administración de calificaciones y asistencias
          </div>
          <h2 class="title">Registro Trimestral (Administrador)</h2>
          <p class="sub">
            Seleccione <b>Año Lectivo</b>, <b>Curso</b>, <b>Materia</b> y <b>Trimestre</b>.
            Puede editar la <b>nota trimestral (0–10)</b> y los campos
            <b>Días, FJ, FI</b>. El botón <b>Guardar todo</b> envía <b>notas + asistencias</b>.
          </p>
        </div>
        <div class="actions">
          <button mat-stroked-button (click)="recargarCursos()" [disabled]="cargandoCursos()">
            <mat-icon>refresh</mat-icon>
            Recargar cursos
          </button>
          <button
            mat-flat-button
            color="primary"
            class="btn-primary"
            (click)="guardar()"
            [disabled]="guardando() || !rows().length"
          >
            <mat-icon>save</mat-icon>
            <span>{{ guardando() ? 'Guardando...' : 'Guardar todo' }}</span>
          </button>
        </div>
      </div>

      <mat-divider class="soft-divider"></mat-divider>

      <!-- Filtros -->
      <div class="filters">
        <!-- Año lectivo -->
        <mat-form-field appearance="outline" class="ff dense">
          <mat-label>Año lectivo</mat-label>
          <mat-select [(ngModel)]="anioId" (selectionChange)="onAnioChange()">
            <mat-option *ngFor="let a of aniosLectivos()" [value]="a.id">
              {{ a.nombre }}
              <span *ngIf="a.actual">&nbsp;• (Actual)</span>
            </mat-option>
          </mat-select>
        </mat-form-field>

        <!-- Curso -->
        <mat-form-field appearance="outline" class="ff dense">
          <mat-label>Curso / Grado</mat-label>
          <mat-select
            [(ngModel)]="cursoId"
            (selectionChange)="onCursoChange()"
            [disabled]="!anioId || !cursosFiltrados().length"
          >
            <mat-option *ngFor="let c of cursosFiltrados()" [value]="asId(c._id)">
              {{ c.nombre }}
            </mat-option>
          </mat-select>
        </mat-form-field>

        <!-- Materia -->
        <mat-form-field appearance="outline" class="ff dense">
          <mat-label>Materia / Asignatura</mat-label>
          <mat-select
            [(ngModel)]="materiaId"
            (selectionChange)="cargarTabla()"
            [disabled]="!cursoDetalle() || !materiasCurso().length"
          >
            <mat-option *ngFor="let m of materiasCurso()" [value]="m.materiaId">
              {{ m.materiaNombre }}
            </mat-option>
          </mat-select>
        </mat-form-field>

        <!-- Trimestre -->
        <mat-form-field appearance="outline" class="ff dense">
          <mat-label>Trimestre</mat-label>
          <mat-select [(ngModel)]="trimestre" (selectionChange)="cargarTabla()">
            <mat-option [value]="'T1'">1er Trimestre</mat-option>
            <mat-option [value]="'T2'">2do Trimestre</mat-option>
            <mat-option [value]="'T3'">3er Trimestre</mat-option>
          </mat-select>
        </mat-form-field>
      </div>

      <!-- Chips info -->
      <div class="badges" *ngIf="cursoDetalle()">
        <mat-chip-set>
          <mat-chip appearance="outlined" color="primary">
            Año: {{ etiquetaAnioSeleccionado() }}
          </mat-chip>
          <mat-chip appearance="outlined">
            Curso: {{ cursoDetalle()?.nombre }}
          </mat-chip>
          <mat-chip appearance="outlined">
            {{ cursoDetalle()?.estudiantes?.length || 0 }} estudiantes
          </mat-chip>
          <mat-chip appearance="outlined">
            Trimestre: {{ etiquetaTrimestre(trimestre) }}
          </mat-chip>
        </mat-chip-set>
      </div>

      <mat-progress-bar *ngIf="cargandoDetalle()" mode="indeterminate"></mat-progress-bar>

      <!-- Tabla -->
      <div class="table-wrap" *ngIf="rows().length; else noRows">
        <table mat-table [dataSource]="rows()" class="modern-table compact mat-elevation-z1">
          <!-- # -->
          <ng-container matColumnDef="n">
            <th mat-header-cell *matHeaderCellDef class="sticky center">#</th>
            <td mat-cell *matCellDef="let r; let i = index" class="muted center">
              {{ i + 1 }}
            </td>
          </ng-container>

          <!-- Estudiante -->
          <ng-container matColumnDef="est">
            <th mat-header-cell *matHeaderCellDef class="sticky">Estudiante</th>
            <td mat-cell *matCellDef="let r">
              <div class="student-cell">
                <div class="avatar">{{ r.estudianteNombre?.[0] || 'E' }}</div>
                <div class="student-name" [matTooltip]="r.estudianteNombre">
                  {{ r.estudianteNombre }}
                </div>
              </div>
            </td>
          </ng-container>

          <!-- Nota -->
          <ng-container matColumnDef="nota">
            <th mat-header-cell *matHeaderCellDef class="sticky center">Nota</th>
            <td mat-cell *matCellDef="let r" class="center">
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

          <!-- Días laborables -->
          <ng-container matColumnDef="dias">
            <th mat-header-cell *matHeaderCellDef class="sticky center">Días de Clase</th>
            <td mat-cell *matCellDef="let r" class="center">
              <mat-form-field appearance="outline" class="cell-ff dense">
                <mat-label>Días</mat-label>
                <input
                  matInput
                  type="number"
                  min="0"
                  [(ngModel)]="r.diasLaborables"
                  (ngModelChange)="recalcularAsistidos(r)"
                />
              </mat-form-field>
            </td>
          </ng-container>

          <!-- FJ -->
          <ng-container matColumnDef="fj">
            <th mat-header-cell *matHeaderCellDef class="sticky center">FJ</th>
            <td mat-cell *matCellDef="let r" class="center">
              <mat-form-field appearance="outline" class="cell-ff dense">
                <mat-label>FJ</mat-label>
                <input
                  matInput
                  type="number"
                  min="0"
                  [(ngModel)]="r.faltasJustificadas"
                  (ngModelChange)="normalizarFaltas(r)"
                />
              </mat-form-field>
            </td>
          </ng-container>

          <!-- FI -->
          <ng-container matColumnDef="fi">
            <th mat-header-cell *matHeaderCellDef class="sticky center">FI</th>
            <td mat-cell *matCellDef="let r" class="center">
              <mat-form-field appearance="outline" class="cell-ff dense">
                <mat-label>FI</mat-label>
                <input
                  matInput
                  type="number"
                  min="0"
                  [(ngModel)]="r.faltasInjustificadas"
                  (ngModelChange)="recalcularAsistidos(r)"
                />
              </mat-form-field>
            </td>
          </ng-container>

          <!-- Asistidos -->
          <ng-container matColumnDef="asist">
            <th mat-header-cell *matHeaderCellDef class="sticky center">Asistidos</th>
            <td mat-cell *matCellDef="let r" class="center">
              <span class="pill">
                {{ r.asistidos == null ? '—' : r.asistidos }}
              </span>
            </td>
          </ng-container>

          <tr mat-header-row *matHeaderRowDef="cols"></tr>
          <tr mat-row *matRowDef="let row; columns: cols" class="row"></tr>
        </table>
      </div>

      <ng-template #noRows>
        <div class="empty">
          <div class="empty-icon">📋</div>
          <div class="empty-title">No hay estudiantes para mostrar</div>
          <div class="empty-sub">
            Seleccione <b>Año lectivo</b>, <b>Curso</b>, <b>Materia</b> y <b>Trimestre</b>.
          </div>
        </div>
      </ng-template>
    </mat-card>
  </div>
  `,
  styles: [`
    .wrap { padding: 16px; max-width: 1200px; margin: 0 auto; }
    .card { padding: 16px; border-radius: 16px; display: grid; gap: 12px; }
    .header { display: grid; grid-template-columns: 1fr auto; gap: 10px; align-items: center; }
    .eyebrow { display: inline-flex; gap: 6px; align-items: center; font-size: 12px; opacity: .8; }
    .title { margin: 0; font-size: 20px; font-weight: 700; }
    .sub { margin: 0; opacity: .8; font-size: 12.5px; }
    .actions { display: inline-flex; gap: 8px; align-items: center; }
    .btn-primary mat-icon { margin-right: 6px; }
    .soft-divider { opacity: .5; }

    .filters {
      display: grid;
      grid-template-columns: repeat(4, minmax(210px, 1fr));
      gap: 10px;
      align-items: end;
    }
    .ff { width: 100%; }
    .dense .mat-mdc-form-field-infix {
      padding-top: 6px !important;
      padding-bottom: 6px !important;
    }

    .badges { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; }

    .table-wrap {
      margin-top: 6px;
      overflow: auto;
      border-radius: 12px;
      border: 1px solid #EAEAEA;
    }
    table { width: 100%; font-size: 13px; border-collapse: separate; border-spacing: 0; }
    .modern-table th { background: #F9FAFB; font-weight: 600; color: #2f2f2f; }
    .modern-table th, .modern-table td { padding: 6px 8px; }
    .modern-table .sticky { position: sticky; top: 0; z-index: 1; }
    .modern-table .row:nth-child(odd) td { background: #FFFFFF; }
    .modern-table .row:nth-child(even) td { background: #FBFBFD; }

    .student-cell { display: flex; align-items: center; gap: 8px; min-width: 200px; }
    .avatar { width: 24px; height: 24px; border-radius: 50%; display: grid; place-items: center;
              background: #EEF2FF; font-weight: 700; font-size: 11px; }

    .cell-ff { width: 90px; }
    .cell-ff .mat-mdc-form-field-infix {
      padding-top: 0 !important; padding-bottom: 0 !important;
    }

    .center { text-align: center; }
    .muted { opacity: .7; }

    .pill {
      display: inline-block;
      min-width: 40px;
      padding: 2px 8px;
      border-radius: 999px;
      background: #EEE;
      font-variant-numeric: tabular-nums;
    }

    .empty { padding: 28px 14px; text-align: center; color: #555; }
    .empty-icon { font-size: 40px; }
    .empty-title { font-weight: 700; }

    @media (max-width: 1100px) {
      .filters { grid-template-columns: repeat(3, minmax(210px, 1fr)); }
    }
    @media (max-width: 800px) {
      .filters { grid-template-columns: repeat(2, minmax(210px, 1fr)); }
      .header { grid-template-columns: 1fr; }
      .actions { justify-content: flex-start; }
    }
    @media (max-width: 600px) {
      .filters { grid-template-columns: 1fr; }
    }
  `]
})
export class CalificacionesComponent implements OnInit {
  private sb = inject(MatSnackBar);
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
        this.sb.open('No se pudieron cargar los cursos', 'Cerrar', { duration: 3000 });
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
        this.sb.open('No se pudo cargar el detalle del curso', 'Cerrar', { duration: 3000 });
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
      this.sb.open('No se pudo determinar el año lectivo.', 'Cerrar', { duration: 2500 });
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
        this.sb.open('Error al cargar notas', 'Cerrar', { duration: 3000 });
      }
    });
  }

  // ========= Helpers fila =========
  onNotaChange(r: RowVM): void {
    if (r.promedioTrimestral == null) return;
    const v = Number(r.promedioTrimestral);
    if (isNaN(v)) r.promedioTrimestral = null;
    else r.promedioTrimestral = Math.min(10, Math.max(0, v));
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
      this.sb.open('Seleccione curso, materia y trimestre.', 'Cerrar', { duration: 2500 });
      return;
    }
    const anioId = this.anioId ||
      this.asId(this.cursoDetalle()?.anioLectivo || this.cursoSel()?.anioLectivo);
    if (!anioId) {
      this.sb.open('No se pudo determinar el año lectivo.', 'Cerrar', { duration: 2500 });
      return;
    }

    if (!this.rows().length) {
      this.sb.open('No hay filas para guardar.', 'Cerrar', { duration: 2500 });
      return;
    }

    // Validar notas
    const invalNota = this.rows().some((r) => {
      const n = r.promedioTrimestral;
      return n != null && (isNaN(Number(n)) || Number(n) < 0 || Number(n) > 10);
    });
    if (invalNota) {
      this.sb.open('Cada nota debe estar entre 0 y 10.', 'Cerrar', { duration: 3000 });
      return;
    }

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
              this.sb.open(
                respFaltas?.message ?? respNotas?.message ?? 'Notas y asistencias guardadas correctamente',
                'Cerrar',
                { duration: 3500 }
              );
              this.cargarTabla();
            },
            error: (e2) => {
              this.guardando.set(false);
              this.sb.open(
                e2?.error?.message ?? 'Notas guardadas, pero hubo un error al guardar faltas',
                'Cerrar',
                { duration: 4000 }
              );
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
              this.sb.open(
                e1?.error?.message ?? 'Error al guardar días laborables, se intentará guardar faltas',
                'Cerrar',
                { duration: 3500 }
              );
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
        this.sb.open(
          eNotas?.error?.message ?? 'Error al guardar notas y asistencias',
          'Cerrar',
          { duration: 3500 }
        );
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
