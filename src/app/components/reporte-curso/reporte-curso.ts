import { Component, OnInit, inject, signal } from '@angular/core';
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

// Servicios
import { CursoService } from '../../services/curso.service';
import { EstudianteService, Estudiante } from '../../services/estudiante.service';
import { CalificacionService, Trimestre as TriNotas } from '../../services/calificacion.service';
import {
  AsistenciaService,
  Trimestre as TriAsis,
  AsistenciaResumen,
} from '../../services/asistencia.service';
import { environment } from '../../environments/environment';

// pdfmake
import pdfMake from 'pdfmake/build/pdfmake';
import * as pdfFonts from 'pdfmake/build/vfs_fonts';
(pdfMake as any).vfs = (pdfFonts as any).vfs || (pdfFonts as any).pdfMake?.vfs;

// ===== Tipos locales =====
type Trimestre = 'T1' | 'T2' | 'T3';
type TipoReporte = Trimestre | 'FINAL';

type NotaMap = Record<
  string,
  { nombre: string; T1?: number | null; T2?: number | null; T3?: number | null }
>;

interface CalificacionesGetResponse {
  estudiantes: Array<{
    estudianteId: string | { _id?: string } | unknown;
    promedioTrimestral?: number | null;
  }>;
}

interface MateriaCurso {
  materia: { _id: string; nombre: string } | string;
  profesor?: unknown;
}

@Component({
  standalone: true,
  selector: 'app-reporte-curso',
  imports: [
    CommonModule,
    FormsModule,
    MatCardModule,
    MatSelectModule,
    MatFormFieldModule,
    MatTableModule,
    MatButtonModule,
    MatSnackBarModule,
    MatIconModule,
    MatProgressBarModule,
    MatTooltipModule,
  ],
  template: `
    <div class="page-container fade-in">
      
      <div class="page-header">
        <div>
          <h1 class="main-title">Reportes Académicos</h1>
          <p class="subtitle">Genera boletines trimestrales o finales en formato PDF.</p>
        </div>
      </div>

      <div class="control-panel mat-elevation-z0">
        <div class="filters-grid">
          
          <mat-form-field appearance="outline" class="custom-field">
            <mat-label>Seleccionar Curso</mat-label>
            <mat-icon matPrefix class="field-icon">school</mat-icon>
            <mat-select [(ngModel)]="cursoId" (selectionChange)="onCursoChange()">
              <mat-option *ngFor="let c of cursos()" [value]="asId(c._id)">
                {{ c.nombre }}
              </mat-option>
            </mat-select>
          </mat-form-field>

          <mat-form-field appearance="outline" class="custom-field">
            <mat-label>Tipo de Reporte</mat-label>
            <mat-icon matPrefix class="field-icon">description</mat-icon>
            <mat-select [(ngModel)]="tipoReporte">
              <mat-option value="T1">Trimestre I</mat-option>
              <mat-option value="T2">Trimestre II</mat-option>
              <mat-option value="T3">Trimestre III</mat-option>
              <mat-option value="FINAL">Reporte Final</mat-option>
            </mat-select>
          </mat-form-field>

          <button
            mat-flat-button
            color="primary"
            class="action-btn"
            (click)="imprimirTodos()"
            [disabled]="!estudiantes().length || cargando()"
            matTooltip="Descargar todos los reportes en PDF"
          >
            <mat-icon>print</mat-icon>
            Imprimir Lote
          </button>
        </div>
      </div>

      <mat-progress-bar *ngIf="cargando()" mode="indeterminate" class="custom-loader"></mat-progress-bar>

      <div class="data-container mat-elevation-z2" *ngIf="estudiantes().length; else emptyState">
        <table mat-table [dataSource]="estudiantes()" class="friendly-table">
          
          <ng-container matColumnDef="nombre">
            <th mat-header-cell *matHeaderCellDef>Estudiante</th>
            <td mat-cell *matCellDef="let e">
              <div class="student-row">
                <div class="avatar-circle">
                  {{ e.nombre?.charAt(0) ?? 'E' }}
                </div>
                <div class="student-info">
                  <span class="student-name">{{ e.nombre }}</span>
                  <span class="student-id">CI: {{ e.cedula }}</span>
                </div>
              </div>
            </td>
          </ng-container>

          <ng-container matColumnDef="cedula">
            <th mat-header-cell *matHeaderCellDef class="hide-mobile">Identificación</th>
            <td mat-cell *matCellDef="let e" class="hide-mobile text-muted">
              {{ e.cedula }}
            </td>
          </ng-container>

          <ng-container matColumnDef="acciones">
            <th mat-header-cell *matHeaderCellDef class="center-header">Acciones</th>
            <td mat-cell *matCellDef="let e" class="center-cell">
              <button
                mat-icon-button
                class="icon-btn-accent"
                (click)="imprimirIndividual(e)"
                [disabled]="cargando()"
                matTooltip="Ver PDF Individual"
              >
                <mat-icon>picture_as_pdf</mat-icon>
              </button>
            </td>
          </ng-container>

          <tr mat-header-row *matHeaderRowDef="cols"></tr>
          <tr mat-row *matRowDef="let row; columns: cols" class="hover-row"></tr>
        </table>
      </div>

      <ng-template #emptyState>
        <div class="empty-state" *ngIf="!cargando()">
          <div class="illustration">📄</div>
          <h3>Lista de estudiantes vacía</h3>
          <p>Selecciona un <b>Curso</b> para cargar los estudiantes y generar reportes.</p>
        </div>
      </ng-template>

    </div>
  `,
  styles: [
    `
      /* Animaciones */
      @keyframes fadeIn {
        from { opacity: 0; transform: translateY(10px); }
        to { opacity: 1; transform: translateY(0); }
      }
      .fade-in { animation: fadeIn 0.4s ease-out; }

      :host {
        --primary: #3f51b5;
        --text-main: #1f2937;
        --text-secondary: #6b7280;
        --bg-neutral: #f3f4f6;
        --radius: 16px;
      }

      .page-container {
        max-width: 1000px;
        margin: 0 auto;
        padding: 24px;
        font-family: 'Roboto', sans-serif;
      }

      /* Header */
      .page-header {
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
        grid-template-columns: 1fr 1fr auto;
        gap: 16px;
        align-items: center;
      }

      .custom-field { width: 100%; }
      .field-icon { color: var(--text-secondary); margin-right: 8px; }
      ::ng-deep .custom-field .mat-mdc-form-field-subscript-wrapper { display: none; }

      .action-btn {
        height: 56px;
        border-radius: 12px;
        padding: 0 24px;
        font-weight: 600;
      }

      /* Loader */
      .custom-loader { height: 4px; border-radius: 4px; margin-bottom: 16px; }

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
        text-transform: uppercase;
      }
      .friendly-table td {
        padding: 12px 16px;
        border-bottom: 1px solid #f3f4f6;
        color: var(--text-main);
        font-size: 14px;
        vertical-align: middle;
      }
      .hover-row:hover { background-color: #f9fafb; }
      .center-header, .center-cell { text-align: center; }
      .text-muted { color: var(--text-secondary); }

      /* Estudiante Avatar */
      .student-row { display: flex; align-items: center; gap: 12px; }
      .avatar-circle {
        width: 38px; height: 38px;
        background: linear-gradient(135deg, #3b82f6, #2563eb);
        color: white; border-radius: 50%;
        display: flex; align-items: center; justify-content: center;
        font-weight: 700; font-size: 14px;
        flex-shrink: 0;
        box-shadow: 0 2px 4px rgba(0,0,0,0.1);
      }
      .student-info { display: flex; flex-direction: column; }
      .student-name { font-weight: 500; color: var(--text-main); }
      .student-id { font-size: 12px; color: var(--text-secondary); }

      /* Botones Icono */
      .icon-btn-accent {
        color: #6366f1;
        background: #eef2ff;
        border-radius: 8px;
        transition: all 0.2s;
      }
      .icon-btn-accent:hover {
        background: #6366f1;
        color: white;
      }

      /* Empty State */
      .empty-state {
        text-align: center; padding: 60px 20px;
        background: #fff; border-radius: var(--radius);
        border: 2px dashed #e5e7eb; color: var(--text-secondary);
      }
      .illustration { font-size: 48px; margin-bottom: 16px; opacity: 0.8; }
      .empty-state h3 { margin: 0 0 8px; color: var(--text-main); font-weight: 700; }

      @media (max-width: 768px) {
        .filters-grid { grid-template-columns: 1fr; }
        .action-btn { width: 100%; }
        .hide-mobile { display: none; }
      }
    `,
  ],
})
export class ReporteCursoComponent implements OnInit {
  private sb = inject(MatSnackBar);
  private cursoSrv = inject(CursoService);
  private estSrv = inject(EstudianteService);
  private caliSrv = inject(CalificacionService);
  private asisSrv = inject(AsistenciaService);

  cursos = signal<any[]>([]);
  estudiantes = signal<Estudiante[]>([]);
  cargando = signal<boolean>(false);

  cursoId = '';
  anioLectivoId = '';
  anioLectivoNombre = ''; // ← NUEVO: nombre del año lectivo
  tipoReporte: TipoReporte = 'T1';

  cols = ['nombre', 'cedula', 'acciones'];

  // ====== cache logos base64 ======
  private logoIzqB64: string | null = null;
  private logoDerB64: string | null = null;

  // ======== util progresivo (T1 -> I; T2 -> I+II; T3|FINAL -> I+II+III) =========
  private getSelectedTrimestres(): Trimestre[] {
    if (this.tipoReporte === 'FINAL' || this.tipoReporte === 'T3') return ['T1', 'T2', 'T3'];
    if (this.tipoReporte === 'T2') return ['T1', 'T2'];
    return ['T1'];
  }
  private roman(t: Trimestre) {
    return t === 'T1' ? 'I' : t === 'T2' ? 'II' : 'III';
  }

  ngOnInit() {
    this.cursoSrv.listar().subscribe({
      next: (res: any) => this.cursos.set(res?.data ?? res ?? []),
      error: () => this.sb.open('Error al cargar cursos', 'Cerrar', { duration: 3000 }),
    });
  }

  async onCursoChange() {
    this.estudiantes.set([]);
    this.anioLectivoNombre = '';
    if (!this.cursoId) return;
    this.cargando.set(true);
    try {
      const cursoResp = await firstValueFrom(this.cursoSrv.obtener(this.cursoId));
      const c = cursoResp?.data ?? cursoResp;

      // Guardamos id y nombre del año lectivo
      this.anioLectivoId = this.asId(c?.anioLectivo);
      if (c?.anioLectivo) {
        if (typeof c.anioLectivo === 'object') {
          this.anioLectivoNombre = (c.anioLectivo.nombre ??
            c.anioLectivo.descripcion ??
            '') as string;
        } else {
          this.anioLectivoNombre = String(c.anioLectivo);
        }
      } else {
        this.anioLectivoNombre = '';
      }

      const all = await firstValueFrom(this.estSrv.getAll());
      const ids: string[] = (c?.estudiantes ?? []).map((e: unknown) => this.asId(e as any));
      const filtrados = all.filter((e: Estudiante) =>
        ids.includes(this.asId((e as any)._id ?? (e as any).uid))
      );
      filtrados.sort((a: Estudiante, b: Estudiante) =>
        (a.nombre ?? '').localeCompare(b.nombre ?? '')
      );
      this.estudiantes.set(filtrados);
    } catch (e) {
      console.error(e);
      this.sb.open('Error cargando estudiantes del curso', 'Cerrar', { duration: 3000 });
    } finally {
      this.cargando.set(false);
    }
  }

  // =========================
  // Acciones de impresión
  // =========================
  async imprimirIndividual(est: Estudiante) {
    const pdf = await this.generarPdf(est);
    pdf.open();
  }

  async imprimirTodos() {
    if (!this.estudiantes().length) return;
    this.sb.open('Generando reportes...', 'Cerrar', { duration: 1200 });
    for (const est of this.estudiantes()) {
      const pdf = await this.generarPdf(est);
      pdf.download(`${est.nombre}-${this.tipoReporte}.pdf`);
    }
  }

  // =========================
  // Notas
  // =========================
  private async buildNotasMapaPorEstudiante(estId: string): Promise<NotaMap> {
    const c = (await firstValueFrom(this.cursoSrv.obtener(this.cursoId))) as any;
    const curso = c?.data ?? c;

    const mats: { id: string; nombre: string }[] = (curso?.materias ?? []).map(
      (m: MateriaCurso) => {
        const id = this.asId(m.materia as any);
        const nombre =
          typeof m.materia === 'string' ? (m.materia as string) : m.materia?.nombre ?? '—';
        return { id, nombre };
      }
    );

    const map: NotaMap = {};
    for (const m of mats) map[m.id] = { nombre: m.nombre, T1: null, T2: null, T3: null };

    const trimestres = this.getSelectedTrimestres();
    const loadTri = async (tri: TriNotas) => {
      await Promise.all(
        mats.map(async (m) => {
          try {
            const resp = (await firstValueFrom(
              this.caliSrv.obtenerNotas({
                cursoId: this.cursoId,
                anioLectivoId: this.anioLectivoId,
                materiaId: m.id,
                trimestre: tri,
              })
            )) as CalificacionesGetResponse;

            const arr = resp?.estudiantes ?? [];
            const found = arr.find((x) => this.asId((x as any).estudianteId) === estId);
            const raw =
              typeof (found as any)?.promedioTrimestral === 'number'
                ? (found as any).promedioTrimestral
                : null;

            const valor = raw == null ? null : Number(raw);
            map[m.id][tri] = valor;
          } catch (err) {
            console.warn('[reporte-curso] obtenerNotas error', { tri, materia: m.id, err });
            map[m.id][tri] = null;
          }
        })
      );
    };

    for (const t of trimestres) await loadTri(t);
    return map;
  }

  // =========================
  // Asistencia (FJ/FI y Días asistidos)
  // =========================
  private async buildAsistenciaPorTrimestre(
    estId: string
  ): Promise<Record<Trimestre, { fj: number; fi: number; laborables: number; asistidos: number }>> {
    const out: Record<
      Trimestre,
      { fj: number; fi: number; laborables: number; asistidos: number }
    > = {
      T1: { fj: 0, fi: 0, laborables: 0, asistidos: 0 },
      T2: { fj: 0, fi: 0, laborables: 0, asistidos: 0 },
      T3: { fj: 0, fi: 0, laborables: 0, asistidos: 0 },
    };

    const trimestres: TriAsis[] = this.getSelectedTrimestres();

    // materias (para fallback)
    const cursoResp: any = await firstValueFrom(this.cursoSrv.obtener(this.cursoId));
    const curso = cursoResp?.data ?? cursoResp;
    const materias: string[] = (curso?.materias ?? [])
      .map((m: MateriaCurso) => this.asId((m as any).materia))
      .filter(Boolean) as string[];

    for (const t of trimestres) {
      // 1) Resumen directo del backend
      try {
        const r = (await firstValueFrom(
          this.asisSrv.getResumenTrimestre({
            cursoId: this.cursoId,
            anioLectivoId: this.anioLectivoId,
            estudianteId: estId,
            trimestre: t,
          })
        )) as AsistenciaResumen;

        const fj = Number(r?.faltasJustificadas ?? 0) || 0;
        const fi = Number(r?.faltasInjustificadas ?? 0) || 0;
        const laborables = Number(r?.diasLaborables ?? 0) || 0;
        const asistidos = Math.max(0, laborables - fi);

        out[t] = { fj, fi, laborables, asistidos };
        continue;
      } catch (err) {
        console.warn('[reporte-curso] getResumenTrimestre falló, usando fallback por materias', {
          t,
          err,
        });
      }

      // 2) Fallback: sumar por materias
      let fj = 0,
        fi = 0,
        laborables = 0;

      // Días laborables por materia
      await Promise.all(
        materias.map(async (materiaId) => {
          try {
            const dl = await firstValueFrom(
              this.asisSrv.getDiasLaborables({
                cursoId: this.cursoId,
                anioLectivoId: this.anioLectivoId,
                materiaId,
                trimestre: t,
              })
            );
            const v = Number(dl?.diasLaborables ?? 0) || 0;
            laborables += v;
          } catch (err) {
            console.warn('[reporte-curso] getDiasLaborables error', { t, materiaId, err });
          }
        })
      );

      // Faltas por materia
      await Promise.all(
        materias.map(async (materiaId) => {
          try {
            const faltas = await firstValueFrom(
              this.asisSrv.obtenerFaltas({
                cursoId: this.cursoId,
                anioLectivoId: this.anioLectivoId,
                materiaId,
                trimestre: t,
              })
            );
            const arr = faltas?.estudiantes ?? [];
            const mine = arr.find((x) => this.asId((x as any).estudianteId) === estId);
            if (mine) {
              fj += Number((mine as any).faltasJustificadas ?? 0) || 0;
              fi += Number((mine as any).faltasInjustificadas ?? 0) || 0;
            }
          } catch (err) {
            console.warn('[reporte-curso] obtenerFaltas error', { t, materiaId, err });
          }
        })
      );

      const asistidos = Math.max(0, laborables - fi);
      out[t] = { fj, fi, laborables, asistidos };
    }

    console.log('[reporte-curso] asistencia final', out);
    return out;
  }

  // =========================
  // PDF helpers (logos + formatos)
  // =========================
  private format2(n: number | null | undefined): string {
    if (n == null || isNaN(Number(n))) return '—';
    return Number(n).toFixed(2);
  }

  private promedioMateriaSeleccion(
    row: { T1?: number | null; T2?: number | null; T3?: number | null },
    trimestres: Trimestre[]
  ): number | null {
    const vals = trimestres.map((t) => row[t] ?? null).filter((v) => v != null) as number[];
    if (!vals.length) return null;
    return vals.reduce((a, b) => a + b, 0) / vals.length;
  }

  private promedioGeneralSeleccion(
    rows: Array<{ T1?: number | null; T2?: number | null; T3?: number | null }>,
    trimestres: Trimestre[]
  ): number | null {
    const finals = rows
      .map((r) => this.promedioMateriaSeleccion(r, trimestres))
      .filter((v) => v != null) as number[];
    if (!finals.length) return null;
    return finals.reduce((a, b) => a + b, 0) / finals.length;
  }

  private promedioColumnaTrimestre(
    rows: Array<{ T1?: number | null; T2?: number | null; T3?: number | null }>,
    t: Trimestre
  ): number | null {
    const vals = rows.map((r) => r[t] ?? null).filter((v) => v != null) as number[];
    if (!vals.length) return null;
    return vals.reduce((a, b) => a + b, 0) / vals.length;
  }

  private clasificarPromedio(n: number | null): string {
    if (n == null || isNaN(Number(n))) return '—';
    const v = Number(n);
    if (v >= 7) return 'Aprobado';
    if (v >= 4) return 'Supletorio';
    return 'Reprobado';
  }

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
  async generarPdf(est: Estudiante) {
    if (!this.cursoId || !this.anioLectivoId) {
      this.sb.open('Falta seleccionar curso', 'Cerrar', { duration: 2000 });
      throw new Error('Curso/anioLectivo faltante');
    }

    await this.ensureLogos();

    const estId = this.asId((est as any)._id ?? (est as any).uid);
    const curso = (this.cursos().find((c) => this.asId(c._id) === this.cursoId) ?? {
      nombre: '—',
    }) as any;
    const tutor = curso?.profesorTutor?.nombre ?? curso?.profesorTutor ?? '—';

    // si por alguna razón no se llenó antes, tratamos de deducirlo del curso
    const anioNombre =
      this.anioLectivoNombre ||
      (curso?.anioLectivo
        ? typeof curso.anioLectivo === 'object'
          ? curso.anioLectivo.nombre ?? curso.anioLectivo.descripcion ?? '—'
          : String(curso.anioLectivo)
        : '—');

    const notasMap = await this.buildNotasMapaPorEstudiante(estId);
    const asis = await this.buildAsistenciaPorTrimestre(estId);
    const trimestres = this.getSelectedTrimestres();

    // ====== Tabla de notas ======
    const materiaIds = Object.keys(notasMap);

    const incluirPromedio = this.tipoReporte === 'FINAL';
    const incluirObs = incluirPromedio;

    const notasWidths = [
      '*',
      ...trimestres.map(() => 40),
      ...(incluirPromedio ? [60] : []),
      ...(incluirObs ? [90] : []),
    ];

    const bodyNotas: any[] = [
      [
        { text: 'ASIGNATURA', bold: true },
        ...trimestres.map((t) => ({ text: this.roman(t), bold: true })),
        ...(incluirPromedio ? [{ text: 'PROMEDIO', bold: true }] : []),
        ...(incluirObs ? [{ text: 'OBSERVACIÓN', bold: true }] : []),
      ],
    ];

    const filasMateria: {
      nombre: string;
      T1?: number | null;
      T2?: number | null;
      T3?: number | null;
    }[] = [];

    for (const mid of materiaIds) {
      const row = notasMap[mid];
      filasMateria.push({ nombre: row.nombre, T1: row.T1, T2: row.T2, T3: row.T3 });

      const fila: any[] = [
        row.nombre,
        ...trimestres.map((t) => this.format2((row as any)[t] ?? null)),
      ];

      if (incluirPromedio) {
        const promMat = this.promedioMateriaSeleccion(row, trimestres);
        fila.push(this.format2(promMat));
        if (incluirObs) {
          fila.push(this.clasificarPromedio(promMat));
        }
      }

      bodyNotas.push(fila);
    }

    const promsPorTri = trimestres.map((t) => this.promedioColumnaTrimestre(filasMateria, t));
    const filaPromTri: any[] = [
      { text: 'PROMEDIO', bold: true },
      ...promsPorTri.map((v) => this.format2(v)),
    ];

    if (incluirPromedio) {
      const promGeneral = this.promedioGeneralSeleccion(filasMateria, trimestres);
      filaPromTri.push(this.format2(promGeneral));
      if (incluirObs) filaPromTri.push('—');
    }
    bodyNotas.push(filaPromTri);

    // ====== Asistencia ======
    const widthsAsis = ['*', ...trimestres.flatMap(() => [25, 25])];
    const headerRow1: any[] = [{ text: 'ASISTENCIA', bold: true, rowSpan: 2 }];
    const headerRow2: any[] = [''];
    for (const t of trimestres) {
      headerRow1.push({ text: this.roman(t), colSpan: 2, alignment: 'center' });
      headerRow1.push({});
      headerRow2.push({ text: 'FJ', alignment: 'center' });
      headerRow2.push({ text: 'FI', alignment: 'center' });
    }
    const dataRow: any[] = [''];
    for (const t of trimestres) {
      dataRow.push({ text: String(asis[t].fj), alignment: 'center' });
      dataRow.push({ text: String(asis[t].fi), alignment: 'center' });
    }

    const widthsDias = ['*', ...trimestres.map(() => 70)];
    const diasHeader: any[] = [
      { text: 'DÍAS ASISTIDOS', bold: true },
      ...trimestres.map((t) => ({ text: this.roman(t), alignment: 'center', bold: true })),
    ];
    const diasRow: any[] = [
      '',
      ...trimestres.map((t) => ({
        text: `${asis[t].asistidos} / ${asis[t].laborables}`,
        alignment: 'center',
      })),
    ];

    const titulo =
      this.tipoReporte === 'FINAL' ? 'REPORTE FINAL' : `REPORTE TRIMESTRAL (${this.tipoReporte})`;
    const institucion = {
      nombreL1: environment.school?.titleLine1 ?? 'UNIDAD EDUCATIVA',
      nombreL2: environment.school?.titleLine2 ?? '“FRAY BARTOLOMÉ DE LAS CASAS - SALASACA”',
      lema: environment.school?.motto ?? '¡Buenos Cristianos, Buenos Ciudadanos!',
      jornada: environment.school?.jornada ?? 'MATUTINA',
      amie: String(environment.school?.amie ?? '—'),
    };

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
                { text: `AMIE: ${institucion.amie}`, fontSize: 9, margin: [0, 0, 0, 6] },
                { text: titulo, bold: true, fontSize: 12 },
              ],
            },
            this.logoDerB64
              ? { image: this.logoDerB64, width: 50, alignment: 'right' }
              : { text: '', width: 50 },
          ],
          columnGap: 10,
          margin: [0, 0, 0, 12],
        },
        {
          text: `AÑO LECTIVO: ${anioNombre}`,
          alignment: 'center',
          fontSize: 10,
        },

        { text: `JORNADA: ${institucion.jornada}`, alignment: 'center', fontSize: 10 },
        { text: `GRADO/CURSO: ${curso?.nombre ?? '—'}`, alignment: 'center', fontSize: 10 },
        { text: `NIVEL/SUBNIVEL: ${curso?.nivel ?? '—'}`, alignment: 'center', fontSize: 10 },

        {
          text: `FECHA: ${new Date().toLocaleDateString('es-EC', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          })}`,
          fontSize: 9,
          alignment: 'center',
          italics: true,
        },

        // <<< AÑO LECTIVO AQUÍ >>>

        { text: `TUTOR: ${tutor}`, fontSize: 10, alignment: 'center' },
        {
          text: `NOMBRE DEL/LA ESTUDIANTE: ${est.nombre}`,
          fontSize: 10,
          alignment: 'center',
          margin: [0, 0, 0, 8],
        },

        {
          table: { headerRows: 1, widths: notasWidths, body: bodyNotas },
          layout: 'lightHorizontalLines',
          margin: [0, 0, 0, 10],
        },

        {
          table: { headerRows: 2, widths: widthsAsis, body: [headerRow1, headerRow2, dataRow] },
          layout: 'lightHorizontalLines',
          fontSize: 10,
          margin: [0, 6, 0, 6],
        },

        {
          table: { headerRows: 1, widths: widthsDias, body: [diasHeader, diasRow] },
          layout: 'lightHorizontalLines',
          fontSize: 10,
          margin: [0, 0, 0, 16],
        },

        { text: '_____________________________', margin: [0, 40, 0, 0] },
        { text: 'TUTOR/A', margin: [0, 4, 0, 0] },
      ],
    };

    const pdf = pdfMake.createPdf(docDef);
    return pdf;
  }

  // =========================
  // Helpers
  // =========================
  public asId(val: unknown): string {
    if (!val) return '';
    if (typeof val === 'string') return val;
    if (typeof val === 'object' && (val as any)._id) return String((val as any)._id);
    if (typeof val === 'object' && (val as any).uid) return String((val as any).uid);
    return String(val);
  }
}