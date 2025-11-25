import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

// Angular Material
import { MatCardModule } from '@angular/material/card';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatTooltipModule } from '@angular/material/tooltip';

import { firstValueFrom } from 'rxjs';

// Servicios (Asumiendo que las rutas son correctas)
import { CursoService } from '../../services/curso.service';
import { EstudianteService, Estudiante } from '../../services/estudiante.service';
import { CalificacionService, Trimestre as TriNotas } from '../../services/calificacion.service';
import { environment } from '../../environments/environment';

// pdfmake
import pdfMake from 'pdfmake/build/pdfmake';
import * as pdfFonts from 'pdfmake/build/vfs_fonts';
(pdfMake as any).vfs = (pdfFonts as any).vfs || (pdfFonts as any).pdfMake?.vfs;

type Trimestre = 'T1' | 'T2' | 'T3';

type AnioLectivoVM = {
  id: string;
  nombre: string;
};

type RowVM = {
  materiaNombre: string;
  t1: number | null;
  t2: number | null;
  t3: number | null;
  final: number | null;
};

@Component({
  standalone: true,
  selector: 'app-reporte-final-anio',
  imports: [
    CommonModule,
    FormsModule,
    MatCardModule,
    MatSelectModule,
    MatFormFieldModule,
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatSnackBarModule,
    MatProgressBarModule,
    MatTooltipModule,
  ],
  template: `
    <div class="main-container animate__animated animate__fadeIn">
      
      <div class="header-section">
        <div>
          <h1 class="page-title">
            <mat-icon class="title-icon">analytics</mat-icon>
            Reporte Final Anual
          </h1>
          <p class="page-subtitle">Consulta y descarga el consolidado de notas por estudiante.</p>
        </div>
        
        <button
          mat-flat-button
          class="btn-print"
          (click)="imprimirPdf()"
          [disabled]="!rows().length || cargando() || !estId"
        >
          <mat-icon>print</mat-icon>
          Generar PDF
        </button>
      </div>

      <mat-card class="content-card">
        
        <div class="filter-bar">
          <div class="filter-grid">
            <mat-form-field appearance="outline" class="custom-field">
              <mat-label>📅 Año Lectivo</mat-label>
              <mat-select [(ngModel)]="anioId" (selectionChange)="onAnioChange()">
                <mat-option *ngFor="let a of aniosLectivos()" [value]="a.id">
                  {{ a.nombre }}
                </mat-option>
              </mat-select>
            </mat-form-field>

            <mat-form-field appearance="outline" class="custom-field" *ngIf="anioId">
              <mat-label>🎓 Estudiante</mat-label>
              <mat-select
                [(ngModel)]="estId"
                (selectionChange)="onEstudianteChange()"
                panelClass="estudiante-panel-custom"
                placeholder="Seleccione un estudiante"
              >
                <mat-option class="search-option">
                  <div class="search-box">
                    <mat-icon>search</mat-icon>
                    <input
                      type="text"
                      placeholder="Buscar por nombre o cédula..."
                      [ngModel]="estSearch()"
                      (ngModelChange)="estSearch.set($event || '')"
                      (click)="$event.stopPropagation()"
                      (keydown)="$event.stopPropagation()"
                    />
                  </div>
                </mat-option>

                <mat-option
                  *ngFor="let e of estudiantesFiltrados()"
                  [value]="asId(e._id ?? e.uid)"
                >
                  <div class="student-option">
                    <span class="st-name">{{ e.nombre }}</span>
                    <span class="st-cedula">{{ e.cedula }}</span>
                  </div>
                </mat-option>
              </mat-select>
            </mat-form-field>
          </div>
        </div>

        <mat-progress-bar *ngIf="cargando()" mode="indeterminate" class="loader-top"></mat-progress-bar>

        <div class="table-container" *ngIf="rows().length; else noData">
          <table mat-table [dataSource]="rows()" class="modern-table">

            <ng-container matColumnDef="materia">
              <th mat-header-cell *matHeaderCellDef class="col-materia"> ASIGNATURA </th>
              <td mat-cell *matCellDef="let r" class="cell-materia">
                <span class="materia-text">{{ r.materiaNombre }}</span>
              </td>
            </ng-container>

            <ng-container matColumnDef="t1">
              <th mat-header-cell *matHeaderCellDef class="col-num"> T1 </th>
              <td mat-cell *matCellDef="let r" class="col-num text-secondary"> {{ fmt(r.t1) }} </td>
            </ng-container>

            <ng-container matColumnDef="t2">
              <th mat-header-cell *matHeaderCellDef class="col-num"> T2 </th>
              <td mat-cell *matCellDef="let r" class="col-num text-secondary"> {{ fmt(r.t2) }} </td>
            </ng-container>

            <ng-container matColumnDef="t3">
              <th mat-header-cell *matHeaderCellDef class="col-num"> T3 </th>
              <td mat-cell *matCellDef="let r" class="col-num text-secondary"> {{ fmt(r.t3) }} </td>
            </ng-container>

            <ng-container matColumnDef="final">
              <th mat-header-cell *matHeaderCellDef class="col-num"> PROMEDIO </th>
              <td mat-cell *matCellDef="let r" class="col-num">
                <span class="grade-badge" [class.pass]="isOK(r.final)" [class.fail]="isBad(r.final)">
                  {{ fmt(r.final) }}
                </span>
              </td>
            </ng-container>

            <tr mat-header-row *matHeaderRowDef="cols"></tr>
            <tr mat-row *matRowDef="let row; columns: cols" class="hover-row"></tr>
          </table>

          <div class="summary-footer">
            <span class="summary-label">Promedio General Anual:</span>
            <span
              class="summary-value"
              [class.pass-text]="isOK(promedioGeneral())"
              [class.fail-text]="isBad(promedioGeneral())"
            >
              {{ fmt(promedioGeneral()) }}
            </span>
          </div>
        </div>

        <ng-template #noData>
          <div class="empty-state" *ngIf="!cargando()">
            <ng-container *ngIf="!anioId || !estId; else noResults">
              <div class="empty-img">👆</div>
              <h3>Comience seleccionando los filtros</h3>
              <p>Elija un año lectivo y un estudiante para visualizar sus calificaciones.</p>
            </ng-container>
            <ng-template #noResults>
              <div class="empty-img">📭</div>
              <h3>Sin registros encontrados</h3>
              <p>No hay notas registradas para este estudiante en el periodo seleccionado.</p>
            </ng-template>
          </div>
        </ng-template>

      </mat-card>
    </div>
  `,
  styles: [`
    /* --- Layout General --- */
    .main-container {
      max-width: 1000px;
      margin: 20px auto;
      padding: 0 16px;
      font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
    }

    /* --- Header --- */
    .header-section {
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      margin-bottom: 24px;
      flex-wrap: wrap;
      gap: 16px;
    }
    .page-title {
      font-size: 26px;
      font-weight: 700;
      color: #1f2937;
      margin: 0;
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .title-icon {
      color: #4f46e5; /* Índigo */
      transform: scale(1.2);
    }
    .page-subtitle {
      margin: 4px 0 0 0;
      color: #6b7280;
      font-size: 14px;
    }
    .btn-print {
      background-color: #4f46e5; /* Color primario moderno */
      color: white;
      border-radius: 8px;
      padding: 0 24px;
      height: 42px;
      box-shadow: 0 4px 6px -1px rgba(79, 70, 229, 0.2);
      transition: all 0.2s;
    }
    .btn-print:hover:not([disabled]) {
      background-color: #4338ca;
      transform: translateY(-1px);
    }

    /* --- Tarjeta Contenedora --- */
    .content-card {
      border-radius: 16px;
      padding: 0 !important; /* Reset padding para controlar hijos */
      overflow: hidden;
      box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.05), 0 4px 6px -2px rgba(0, 0, 0, 0.025);
      background: white;
      border: 1px solid #f3f4f6;
    }

    /* --- Filtros --- */
    .filter-bar {
      background-color: #f9fafb;
      padding: 24px 24px 8px 24px;
      border-bottom: 1px solid #e5e7eb;
    }
    .filter-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
      gap: 16px;
    }
    .custom-field {
      width: 100%;
    }
    /* Overrides para inputs más limpios */
    ::ng-deep .mat-mdc-form-field-subscript-wrapper { display: none; } /* Ocultar espacio extra si no hay error */

    /* --- Tabla --- */
    .table-container {
      padding: 0;
    }
    .modern-table {
      width: 100%;
    }
    .modern-table th {
      background-color: #ffffff;
      color: #6b7280;
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      font-weight: 600;
      padding: 16px;
      border-bottom: 1px solid #f3f4f6;
    }
    .modern-table td {
      padding: 16px;
      font-size: 14px;
      color: #111827;
      border-bottom: 1px solid #f3f4f6;
    }
    .hover-row:hover {
      background-color: #f9fafb;
    }
    
    .col-materia { text-align: left; width: 40%; }
    .cell-materia { font-weight: 500; }
    .col-num { text-align: center; width: 15%; }
    .text-secondary { color: #6b7280; }

    /* --- Badges de Notas --- */
    .grade-badge {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      padding: 4px 12px;
      border-radius: 99px;
      font-weight: 700;
      font-size: 13px;
      min-width: 40px;
    }
    .grade-badge.pass {
      background-color: #dcfce7;
      color: #166534;
    }
    .grade-badge.fail {
      background-color: #fee2e2;
      color: #991b1b;
    }

    /* --- Footer Resumen --- */
    .summary-footer {
      background-color: #f8fafc;
      padding: 16px 24px;
      display: flex;
      justify-content: flex-end;
      align-items: center;
      gap: 12px;
      border-top: 1px solid #e2e8f0;
    }
    .summary-label {
      font-size: 14px;
      color: #64748b;
      font-weight: 500;
    }
    .summary-value {
      font-size: 20px;
      font-weight: 800;
    }
    .pass-text { color: #166534; }
    .fail-text { color: #dc2626; }

    /* --- Empty State --- */
    .empty-state {
      padding: 60px 20px;
      text-align: center;
      color: #9ca3af;
    }
    .empty-img {
      font-size: 48px;
      margin-bottom: 16px;
      opacity: 0.8;
    }
    .empty-state h3 {
      font-size: 18px;
      color: #374151;
      margin: 0 0 8px 0;
      font-weight: 600;
    }
    .empty-state p {
      margin: 0;
      font-size: 14px;
    }

    /* --- Estilos para el Buscador dentro del Select --- */
    .search-option {
      height: 50px !important;
      padding: 0 8px !important;
      position: sticky;
      top: 0;
      background: white;
      z-index: 10;
      border-bottom: 1px solid #eee;
    }
    .search-box {
      display: flex;
      align-items: center;
      background: #f3f4f6;
      border-radius: 6px;
      padding: 0 8px;
      height: 36px;
      margin-top: 7px;
    }
    .search-box mat-icon { font-size: 20px; width: 20px; height: 20px; color: #9ca3af; margin-right: 8px;}
    .search-box input {
      border: none;
      background: transparent;
      outline: none;
      width: 100%;
      font-size: 13px;
      color: #374151;
    }
    
    .student-option {
      display: flex;
      flex-direction: column;
      line-height: 1.2;
      padding: 4px 0;
    }
    .st-name { font-size: 14px; font-weight: 500; }
    .st-cedula { font-size: 11px; color: #9ca3af; }
    
    .loader-top {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      border-radius: 16px 16px 0 0;
    }

    /* Media query basico */
    @media (max-width: 600px) {
      .header-section { flex-direction: column; align-items: flex-start; }
      .btn-print { width: 100%; }
      .modern-table th, .modern-table td { padding: 12px 8px; }
    }
  `]
})
export class ReporteFinalAnioComponent implements OnInit {
  private sb = inject(MatSnackBar);
  private cursoSrv = inject(CursoService);
  private estSrv = inject(EstudianteService);
  private caliSrv = inject(CalificacionService);

  // Datos base
  cursos = signal<any[]>([]);
  aniosLectivos = signal<AnioLectivoVM[]>([]);
  estudiantesTodos = signal<Estudiante[]>([]);

  // Selecciones
  anioId = '';
  estId = '';

  // Texto de búsqueda dentro del select
  estSearch = signal<string>('');

  // Curso del estudiante en ese año (para mostrar en PDF)
  cursoSeleccionado = signal<any | null>(null);

  // UI
  cargando = signal<boolean>(false);

  // Tabla
  cols: string[] = ['materia', 't1', 't2', 't3', 'final'];
  rows = signal<RowVM[]>([]);

  // logos pdf
  private logoIzqB64: string | null = null;
  private logoDerB64: string | null = null;

  // ==== Ciclo ====
  async ngOnInit() {
    try {
      this.cargando.set(true);

      const cursosResp = await firstValueFrom(this.cursoSrv.listar());
      let allCursos: any[] = [];
      if (Array.isArray(cursosResp)) {
        allCursos = cursosResp;
      } else if (
        cursosResp &&
        typeof cursosResp === 'object' &&
        'data' in cursosResp &&
        Array.isArray((cursosResp as any).data)
      ) {
        allCursos = (cursosResp as any).data;
      }
      this.cursos.set(allCursos);

      // Armar lista de años lectivos desde cursos
      const mapAnios = new Map<string, string>();
      for (const c of allCursos) {
        const raw = c?.anioLectivo;
        const id = this.asId(raw);
        if (!id) continue;
        let nombre = '';
        if (raw && typeof raw === 'object') {
          nombre = raw.nombre ?? raw.descripcion ?? id;
        } else {
          nombre = String(raw);
        }
        if (!mapAnios.has(id)) {
          mapAnios.set(id, nombre);
        }
      }
      const anios: AnioLectivoVM[] =
        Array.from(mapAnios.entries()).map(([id, nombre]) => ({ id, nombre }));
      this.aniosLectivos.set(anios);

      // Cargar todos los estudiantes una sola vez
      const ests = await firstValueFrom(this.estSrv.getAll());
      this.estudiantesTodos.set(ests);
    } catch (e) {
      console.error(e);
      this.sb.open('Error al cargar datos iniciales', 'Cerrar', { duration: 3000 });
    } finally {
      this.cargando.set(false);
    }
  }

  // ==== Derivados ====
  estudiantesFiltrados = computed(() => {
    if (!this.anioId) return [];

    // Estudiantes que pertenecen a cursos de ese año
    const cursosAnio = (this.cursos() ?? []).filter(
      c => this.asId(c.anioLectivo) === this.anioId
    );

    const idsSet = new Set<string>();
    for (const c of cursosAnio) {
      const ests = c?.estudiantes ?? [];
      for (const e of ests) {
        const id = this.asId(e);
        if (id) idsSet.add(id);
      }
    }

    const all = this.estudiantesTodos() ?? [];
    let res = all.filter(e =>
      idsSet.has(this.asId((e as any)._id ?? (e as any).uid))
    );

    // Filtro por nombre o cédula usando estSearch
    const term = (this.estSearch() || '').trim().toLowerCase();
    if (term) {
      res = res.filter(e => {
        const nom = (e.nombre || '').toLowerCase();
        const ced = (e.cedula || '').toLowerCase();
        return nom.includes(term) || ced.includes(term);
      });
    }

    res.sort((a, b) => (a.nombre ?? '').localeCompare(b.nombre ?? ''));
    return res;
  });

  promedioGeneral = computed(() => {
    const arr = this.rows();
    if (!arr.length) return null;
    const vals = arr.map(r => r.final).filter(v => v != null) as number[];
    if (!vals.length) return null;
    const sum = vals.reduce((a, b) => a + b, 0);
    return sum / vals.length;
  });

  // ==== Eventos ====
  onAnioChange() {
    this.estId = '';
    this.estSearch.set('');
    this.rows.set([]);
    this.cursoSeleccionado.set(null);
  }

  async onEstudianteChange() {
    this.rows.set([]);
    this.cursoSeleccionado.set(null);
    if (!this.anioId || !this.estId) return;

    this.cargando.set(true);
    try {
      // 1) Buscar el curso de este estudiante para ese año
      const cursosAnio = (this.cursos() ?? []).filter(
        c => this.asId(c.anioLectivo) === this.anioId
      );

      let cursoSel: any | null = null;
      for (const c of cursosAnio) {
        const ests = c?.estudiantes ?? [];
        const contiene = (ests as any[]).some(e => this.asId(e) === this.estId);
        if (contiene) { cursoSel = c; break; }
      }

      if (!cursoSel) {
        this.sb.open('El estudiante no tiene curso asignado en ese año lectivo.', 'Cerrar', {
          duration: 3500,
        });
        return;
      }
      this.cursoSeleccionado.set(cursoSel);

      // 2) Materias del curso
      const materias = ((cursoSel.materias ?? []) as any[]).map(m => {
        const id = this.asId(m.materia);
        const nombre =
          typeof m.materia === 'string'
            ? m.materia
            : (m.materia?.nombre ?? '—');
        return { id, nombre };
      }).filter(m => m.id);

      if (!materias.length) {
        this.sb.open('El curso no tiene materias asignadas.', 'Cerrar', { duration: 3000 });
        return;
      }

      const cursoId = this.asId(cursoSel._id);
      const anioLectivoId = this.anioId;

      // 3) Cargar T1, T2, T3 para cada materia y calcular final
      const loadTri = async (tri: TriNotas) => {
        const map = new Map<string, number | null>(); // materiaId -> nota
        await Promise.all(
          materias.map(async (m) => {
            try {
              const resp: any = await firstValueFrom(
                this.caliSrv.obtenerNotas({
                  cursoId,
                  anioLectivoId,
                  materiaId: m.id,
                  trimestre: tri,
                })
              );
              const arr = resp?.estudiantes ?? [];
              const found = arr.find((x: any) => this.asId(x.estudianteId) === this.estId);
              const raw = typeof found?.promedioTrimestral === 'number'
                ? found.promedioTrimestral
                : null;
              map.set(m.id, raw == null ? null : Number(raw));
            } catch (err) {
              console.warn('[ReporteFinalAnio] obtenerNotas error', { tri, materia: m.id, err });
              map.set(m.id, null);
            }
          })
        );
        return map;
      };

      const [m1, m2, m3] = await Promise.all([
        loadTri('T1'),
        loadTri('T2'),
        loadTri('T3'),
      ]);

      const resultado: RowVM[] = materias.map(m => {
        const t1 = m1.get(m.id) ?? null;
        const t2 = m2.get(m.id) ?? null;
        const t3 = m3.get(m.id) ?? null;

        let final: number | null = null;
        const notas = [t1, t2, t3].filter(v => v != null) as number[];
        if (notas.length) {
          final = Number((notas.reduce((a, b) => a + b, 0) / notas.length).toFixed(2));
        }

        return {
          materiaNombre: m.nombre,
          t1,
          t2,
          t3,
          final,
        };
      });

      this.rows.set(resultado);
    } catch (e) {
      console.error(e);
      this.sb.open('Error al cargar notas finales', 'Cerrar', { duration: 3000 });
    } finally {
      this.cargando.set(false);
    }
  }

  // ==== Helpers UI ====
  fmt(n: number | null): string {
    return n == null || isNaN(Number(n)) ? '—' : Number(n).toFixed(2);
  }
  isOK(n: number | null): boolean {
    return n != null && n >= 7;
  }
  isBad(n: number | null): boolean {
    return n != null && n < 7;
  }

  // ==== Helper genérico de id ====
  asId(val: any): string {
    if (!val) return '';
    if (typeof val === 'string') return val;
    if (typeof val === 'object' && (val as any)._id) return String((val as any)._id);
    if (typeof val === 'object' && (val as any).uid) return String((val as any).uid);
    return String(val);
  }

  // =========================
  // PDF helpers (logos + formato)
  // =========================
  private async getBase64ImageFromURL(url: string): Promise<string> {
    const res = await fetch(url);
    const blob = await res.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  private async ensureLogos() {
    try {
      if (!this.logoIzqB64) {
        this.logoIzqB64 = await this.getBase64ImageFromURL('assets/img/logo_ministerio.png');
      }
    } catch {
      console.warn('No se pudo cargar logo izquierdo');
      this.logoIzqB64 = '';
    }
    try {
      if (!this.logoDerB64) {
        this.logoDerB64 = await this.getBase64ImageFromURL('assets/img/logo_unidad.png');
      }
    } catch {
      console.warn('No se pudo cargar logo derecho');
      this.logoDerB64 = '';
    }
  }

  // =========================
  // Generación PDF
  // =========================
  async imprimirPdf() {
    if (!this.estId || !this.anioId || !this.rows().length) {
      this.sb.open('Seleccione año, estudiante y espere que se carguen las notas.', 'Cerrar', {
        duration: 3000,
      });
      return;
    }

    const est = this.estudiantesFiltrados().find(
      e => this.asId((e as any)._id ?? (e as any).uid) === this.estId
    );
    if (!est) {
      this.sb.open('No se encontró el estudiante seleccionado.', 'Cerrar', { duration: 3000 });
      return;
    }

    await this.ensureLogos();

    const anioNombre =
      this.aniosLectivos().find(a => a.id === this.anioId)?.nombre ?? this.anioId ?? '—';
    const curso = this.cursoSeleccionado();
    const cursoNombre = curso?.nombre ?? '—';
    const nivel = curso?.nivel ?? '—';
    const tutor = curso?.profesorTutor?.nombre ?? curso?.profesorTutor ?? '—';

    const institucion = {
      nombreL1: environment.school?.titleLine1 ?? 'UNIDAD EDUCATIVA',
      nombreL2: environment.school?.titleLine2 ?? '“FRAY BARTOLOMÉ DE LAS CASAS - SALASACA”',
      lema: environment.school?.motto ?? '¡Buenos Cristianos, Buenos Ciudadanos!',
      jornada: environment.school?.jornada ?? 'MATUTINA',
      amie: String(environment.school?.amie ?? '—'),
    };

    // Tabla de notas
    const bodyNotas: any[] = [
      [
        { text: 'ASIGNATURA', bold: true },
        { text: 'T1', bold: true, alignment: 'center' },
        { text: 'T2', bold: true, alignment: 'center' },
        { text: 'T3', bold: true, alignment: 'center' },
        { text: 'FINAL', bold: true, alignment: 'center' },
      ],
    ];

    this.rows().forEach(r => {
      bodyNotas.push([
        r.materiaNombre,
        { text: this.fmt(r.t1), alignment: 'center' },
        { text: this.fmt(r.t2), alignment: 'center' },
        { text: this.fmt(r.t3), alignment: 'center' },
        {
          text: this.fmt(r.final),
          alignment: 'center',
        },
      ]);
    });

    const promGen = this.promedioGeneral();
    bodyNotas.push([
      { text: 'PROMEDIO GENERAL', bold: true },
      '',
      '',
      '',
      { text: this.fmt(promGen), alignment: 'center', bold: true },
    ]);

    const docDef: any = {
      pageSize: 'A4',
      pageMargins: [32, 32, 32, 40],
      content: [
        {
          columns: [
            this.logoIzqB64 ? { image: this.logoIzqB64, width: 90 } : { text: '', width: 90 },
            {
              width: '*',
              alignment: 'center',
              stack: [
                { text: institucion.nombreL1, bold: true, fontSize: 11 },
                { text: institucion.nombreL2, margin: [0, 2, 0, 2] },
                { text: institucion.lema, italics: true, fontSize: 9, margin: [0, 0, 0, 2] },
                { text: `AMIE: ${institucion.amie}`, fontSize: 9, margin: [0, 0, 0, 4] },
                { text: 'REPORTE FINAL DE NOTAS', bold: true, fontSize: 12 },
              ],
            },
            this.logoDerB64 ? { image: this.logoDerB64, width: 50, alignment: 'right' } : { text: '', width: 50 },
          ],
          columnGap: 10,
          margin: [0, 0, 0, 12],
        },

        { text: `JORNADA: ${institucion.jornada}`, alignment: 'center', fontSize: 10 },
        { text: `AÑO LECTIVO: ${anioNombre}`, alignment: 'center', fontSize: 10 },
        { text: `GRADO/CURSO: ${cursoNombre}`, alignment: 'center', fontSize: 10 },
        { text: `NIVEL/SUBNIVEL: ${nivel}`, alignment: 'center', fontSize: 10 },

        {
          text: `FECHA: ${new Date().toLocaleDateString('es-EC', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          })}`,
          fontSize: 9,
          alignment: 'center',
          italics: true,
          margin: [0, 4, 0, 2],
        },

        { text: `TUTOR: ${tutor}`, alignment: 'center', fontSize: 10 },
        {
          text: `ESTUDIANTE: ${est.nombre}   (C.I.: ${est.cedula ?? '—'})`,
          alignment: 'center',
          fontSize: 10,
          margin: [0, 4, 0, 10],
        },

        {
          table: {
            headerRows: 1,
            widths: ['*', 40, 40, 40, 50],
            body: bodyNotas,
          },
          layout: 'lightHorizontalLines',
          fontSize: 10,
          margin: [0, 0, 0, 30],
        },

        { text: '_____________________________', margin: [0, 20, 0, 0], alignment: 'center' },
        { text: 'TUTOR/A', margin: [0, 4, 0, 0], alignment: 'center' },
      ],
    };

    const pdf = pdfMake.createPdf(docDef);
    pdf.open(); // abre nueva pestaña
  }
}