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
import { CalificacionService, Trimestre } from '../../services/calificacion.service';

import { environment } from '../../environments/environment';

// pdfmake
import pdfMake from 'pdfmake/build/pdfmake';
import * as pdfFonts from 'pdfmake/build/vfs_fonts';
(pdfMake as any).vfs = (pdfFonts as any).vfs || (pdfFonts as any).pdfMake?.vfs;

type MateriaAsignada = { materiaId: string; materiaNombre: string };

type RowVM = {
  estudianteId: string;
  estudianteNombre: string;
  nota: number | null;
};

@Component({
  standalone: true,
  selector: 'app-profesor-reporte-trimestral-pdf',
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
    MatChipsModule,
  ],
  template: `
    <div class="page-container fade-in">
      <div class="page-header">
        <div>
          <h1 class="main-title">Reporte de Calificaciones</h1>
          <p class="subtitle">Genera reportes trimestrales y exporta a PDF fácilmente.</p>
        </div>
        <button mat-icon-button (click)="recargarCursos()" [disabled]="cargandoCursos()" matTooltip="Actualizar cursos">
          <mat-icon [class.spin]="cargandoCursos()">sync</mat-icon>
        </button>
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
            <mat-label>Materia</mat-label>
            <mat-icon matPrefix class="field-icon">menu_book</mat-icon>
            <mat-select
              [(ngModel)]="materiaId"
              [disabled]="!materiasAsignadas().length"
              (selectionChange)="onMateriaChange()"
            >
              <mat-option *ngFor="let m of materiasAsignadas()" [value]="m.materiaId">
                {{ m.materiaNombre }}
              </mat-option>
            </mat-select>
          </mat-form-field>

          <mat-form-field appearance="outline" class="custom-field">
            <mat-label>Periodo</mat-label>
            <mat-icon matPrefix class="field-icon">calendar_today</mat-icon>
            <mat-select [(ngModel)]="trimestre" (selectionChange)="onTrimestreChange()">
              <mat-option value="T1">Primer Trimestre</mat-option>
              <mat-option value="T2">Segundo Trimestre</mat-option>
              <mat-option value="T3">Tercer Trimestre</mat-option>
            </mat-select>
          </mat-form-field>

          <button
            mat-flat-button
            color="primary"
            class="action-btn"
            (click)="exportarPdf()"
            [disabled]="!rows().length"
          >
            <mat-icon>picture_as_pdf</mat-icon>
            Exportar PDF
          </button>
        </div>

        <div class="info-badges" *ngIf="cursoDetalle()">
          <div class="badge-item">
            <mat-icon>person</mat-icon>
            <span>Tutor: <strong>{{ cursoDetalle()?.profesorTutor?.nombre ?? 'N/A' }}</strong></span>
          </div>
          <div class="badge-item">
            <mat-icon>groups</mat-icon>
            <span>Estudiantes: <strong>{{ cursoDetalle()?.estudiantes?.length || 0 }}</strong></span>
          </div>
          <div class="badge-item">
            <mat-icon>event</mat-icon>
            <span>Año: <strong>{{ cursoDetalle()?.anioLectivo?.nombre ?? 'Actual' }}</strong></span>
          </div>
        </div>
      </div>

      <mat-progress-bar *ngIf="cargandoDetalle()" mode="indeterminate" class="custom-loader"></mat-progress-bar>

      <div class="data-container mat-elevation-z2" *ngIf="rows().length; else emptyState">
        <table mat-table [dataSource]="rows()" class="friendly-table">
          <ng-container matColumnDef="n">
            <th mat-header-cell *matHeaderCellDef class="w-50 center-header">#</th>
            <td mat-cell *matCellDef="let r; let i = index" class="w-50 text-muted center-cell">
              {{ i + 1 }}
            </td>
          </ng-container>

          <ng-container matColumnDef="est">
            <th mat-header-cell *matHeaderCellDef>Estudiante</th>
            <td mat-cell *matCellDef="let r">
              <div class="student-row">
                <div class="avatar-circle">
                  {{ r.estudianteNombre?.charAt(0) ?? 'E' }}
                </div>
                <span class="student-name">{{ r.estudianteNombre }}</span>
              </div>
            </td>
          </ng-container>

          <ng-container matColumnDef="nota">
            <th mat-header-cell *matHeaderCellDef class="center-header">Calificación</th>
            <td mat-cell *matCellDef="let r" class="center-cell">
              <div class="grade-pill" [ngClass]="getGradeClass(r.nota)">
                {{ fmt(r.nota) }}
              </div>
            </td>
          </ng-container>

          <tr mat-header-row *matHeaderRowDef="cols"></tr>
          <tr mat-row *matRowDef="let row; columns: cols" class="hover-row"></tr>
        </table>

        <div class="table-footer">
          <span class="footer-label">Promedio del Curso:</span>
          <div class="grade-pill big" [ngClass]="getGradeClass(promedioCurso())">
            {{ fmt(promedioCurso()) }}
          </div>
        </div>
      </div>

      <ng-template #emptyState>
        <div class="empty-state">
          <div class="illustration">📊</div>
          <h3>Esperando datos...</h3>
          <p>Selecciona un curso, materia y trimestre para ver las calificaciones.</p>
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
      .spin { animation: spin 1s linear infinite; }
      @keyframes spin { 100% { transform: rotate(360deg); } }

      /* Variables CSS locales */
      :host {
        --primary-soft: #eef2ff;
        --primary-color: #3f51b5;
        --success-bg: #dcfce7;
        --success-text: #166534;
        --danger-bg: #fee2e2;
        --danger-text: #991b1b;
        --neutral-bg: #f3f4f6;
        --text-main: #1f2937;
        --text-secondary: #6b7280;
        --border-radius: 16px;
      }

      .page-container {
        max-width: 1000px;
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
        font-size: 28px;
        font-weight: 800;
        margin: 0;
        color: var(--text-main);
        letter-spacing: -0.5px;
      }
      .subtitle {
        margin: 4px 0 0;
        color: var(--text-secondary);
        font-size: 15px;
      }

      /* Panel de Control */
      .control-panel {
        background: #fff;
        border-radius: var(--border-radius);
        padding: 24px;
        border: 1px solid #e5e7eb;
        margin-bottom: 16px;
      }

      .filters-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
        gap: 16px;
        align-items: center;
      }

      /* Inputs personalizados */
      .custom-field {
        width: 100%;
      }
      .field-icon {
        color: var(--text-secondary);
        margin-right: 8px;
      }
      ::ng-deep .custom-field .mat-mdc-form-field-subscript-wrapper {
        display: none; /* Ocultar espacio extra inferior */
      }

      .action-btn {
        height: 56px;
        border-radius: 12px;
        font-weight: 600;
        font-size: 15px;
        box-shadow: 0 4px 12px rgba(63, 81, 181, 0.2);
      }

      /* Chips Info */
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
        background: var(--neutral-bg);
        padding: 6px 12px;
        border-radius: 20px;
        font-size: 13px;
        color: var(--text-secondary);
      }
      .badge-item mat-icon {
        font-size: 18px;
        width: 18px;
        height: 18px;
        opacity: 0.7;
      }
      .badge-item strong {
        color: var(--text-main);
      }

      /* Loader */
      .custom-loader {
        border-radius: 4px;
        height: 4px;
        margin-bottom: 16px;
      }

      /* Contenedor de Datos y Tabla */
      .data-container {
        background: #fff;
        border-radius: var(--border-radius);
        overflow: hidden;
        border: 1px solid #e5e7eb;
      }

      .friendly-table {
        width: 100%;
      }
      .friendly-table th {
        background: #f9fafb;
        color: var(--text-secondary);
        font-weight: 600;
        font-size: 13px;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        padding: 16px;
        border-bottom: 1px solid #e5e7eb;
      }
      .friendly-table td {
        padding: 12px 16px;
        border-bottom: 1px solid #f3f4f6;
        color: var(--text-main);
        font-size: 14px;
      }
      .hover-row:hover {
        background-color: #f9fafb;
      }
      .center-header, .center-cell { text-align: center; }

      /* Estudiante Avatar */
      .student-row {
        display: flex;
        align-items: center;
        gap: 12px;
      }
      .avatar-circle {
        width: 36px;
        height: 36px;
        background: linear-gradient(135deg, #6366f1, #8b5cf6);
        color: white;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: 700;
        font-size: 14px;
        box-shadow: 0 2px 5px rgba(0,0,0,0.1);
      }
      .student-name {
        font-weight: 500;
      }
      .w-50 { width: 50px; }
      .text-muted { color: var(--text-secondary); }

      /* Pills de Notas */
      .grade-pill {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        min-width: 48px;
        padding: 4px 12px;
        border-radius: 99px;
        font-weight: 700;
        font-size: 14px;
      }
      .grade-pill.big {
        font-size: 16px;
        padding: 6px 16px;
      }
      .grade-pass {
        background-color: var(--success-bg);
        color: var(--success-text);
      }
      .grade-fail {
        background-color: var(--danger-bg);
        color: var(--danger-text);
      }
      .grade-null {
        background-color: var(--neutral-bg);
        color: var(--text-secondary);
      }

      /* Footer */
      .table-footer {
        display: flex;
        justify-content: flex-end;
        align-items: center;
        gap: 12px;
        padding: 16px 24px;
        background: #fdfdfd;
        border-top: 1px solid #e5e7eb;
      }
      .footer-label {
        font-size: 14px;
        color: var(--text-secondary);
        font-weight: 500;
      }

      /* Empty State */
      .empty-state {
        text-align: center;
        padding: 60px 20px;
        background: #fff;
        border-radius: var(--border-radius);
        border: 2px dashed #e5e7eb;
        color: var(--text-secondary);
      }
      .illustration {
        font-size: 48px;
        margin-bottom: 16px;
        opacity: 0.8;
      }
      .empty-state h3 {
        margin: 0 0 8px;
        color: var(--text-main);
        font-weight: 700;
      }

      @media (max-width: 600px) {
        .filters-grid { grid-template-columns: 1fr; }
        .page-header { flex-direction: column; gap: 16px; }
      }
    `,
  ],
})
export class ProfesorReporteTrimestralPdfComponent implements OnInit {
  // ... (El resto de tu lógica de TypeScript se mantiene EXACTAMENTE IGUAL)
  private sb = inject(MatSnackBar);
  private auth = inject(AuthService);
  private cursoSrv = inject(CursoService);
  private caliSrv = inject(CalificacionService);

  cursos = signal<any[]>([]);
  cursoId = '';
  cursoDetalle = signal<any | null>(null);

  materiaId = '';
  trimestre: Trimestre = 'T1';

  cargandoCursos = signal<boolean>(false);
  cargandoDetalle = signal<boolean>(false);

  cols: string[] = ['n', 'est', 'nota'];
  rows = signal<RowVM[]>([]);

  // cache logos base64
  private logoIzqB64: string | null = null;
  private logoDerB64: string | null = null;

  ngOnInit(): void {
    this.cargarCursos();
  }

  // Helper para clases CSS dinámicas de notas
  getGradeClass(n: number | null): string {
    if (n === null || isNaN(n)) return 'grade-null';
    return n >= 7 ? 'grade-pass' : 'grade-fail';
  }

  private cargarCursos(): void {
    this.cargandoCursos.set(true);
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
          this.cargandoCursos.set(false);
        },
        error: () => {
          this.cargandoCursos.set(false);
          this.sb.open('No se pudieron cargar los cursos', 'Cerrar', { duration: 3000 });
        },
      });
    });
  }

  recargarCursos(): void {
    this.cursoId = '';
    this.cursoDetalle.set(null);
    this.rows.set([]);
    this.cargarCursos();
  }

  // ===== Derivados =====
  cursoSel = computed(() =>
    (this.cursos() ?? []).find((c) => this.asId(c._id) === this.cursoId)
  );
  anioLectivoId = computed(() =>
    this.asId(this.cursoDetalle()?.anioLectivo || this.cursoSel()?.anioLectivo)
  );

  materiasAsignadas = computed<MateriaAsignada[]>(() => {
    const me = this.auth.getuser()?.id ?? '';
    return (this.cursoDetalle()?.materias ?? this.cursoSel()?.materias ?? [])
      .filter((m: any) => this.asId(m?.profesor) === me)
      .map((m: any) => ({
        materiaId: this.asId(m?.materia),
        materiaNombre: m?.materia?.nombre ?? m?.materia ?? '—',
      }));
  });

  // ===== Eventos selección =====
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

        const mats = this.materiasAsignadas();
        this.materiaId = mats.length === 1 ? mats[0].materiaId : '';

        this.cargandoDetalle.set(false);

        // si ya tenemos materia definida, cargamos notas automático
        if (this.materiaId) {
          this.cargarNotas();
        }
      },
      error: () => {
        this.cargandoDetalle.set(false);
        this.sb.open('No se pudo cargar el detalle del curso', 'Cerrar', { duration: 3000 });
      },
    });
  }

  onMateriaChange(): void {
    this.rows.set([]);
    if (this.materiaId) {
      this.cargarNotas();
    }
  }

  onTrimestreChange(): void {
    this.rows.set([]);
    if (this.materiaId) {
      this.cargarNotas();
    }
  }

  // ===== Helpers de normalización =====
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
    const raw =
      item?.promedioTrimestral ??
      item?.promedio10 ??
      item?.promedio ??
      item?.nota ??
      null;
    if (raw == null) return null;
    const v = Number(raw);
    if (isNaN(v)) return null;
    return v > 10 ? Number((v / 10).toFixed(2)) : Number(v.toFixed(2));
  }

  // ===== Cargar notas (se llama automático) =====
  cargarNotas(): void {
    this.rows.set([]);

    if (!this.cursoId || !this.cursoDetalle()) {
      this.sb.open('Seleccione un curso.', 'Cerrar', { duration: 2500 });
      return;
    }

    const anioId = this.anioLectivoId();
    if (!anioId) {
      this.sb.open('No se pudo determinar el año lectivo.', 'Cerrar', { duration: 2500 });
      return;
    }

    const mats = this.materiasAsignadas();
    if (!mats.length) {
      this.sb.open('Este curso no tiene materias asignadas a este profesor.', 'Cerrar', {
        duration: 3000,
      });
      return;
    }

    if (!this.materiaId) {
      // no mostramos error aquí porque puede ser que aún no haya elegido materia
      return;
    }

    const cursoId = this.asId(this.cursoDetalle()?._id);
    const materiaId = this.materiaId;
    const tri = this.trimestre;

    const estudiantes: any[] = this.cursoDetalle()?.estudiantes ?? [];
    const base = new Map<string, RowVM>();

    for (const e of estudiantes) {
      const sid = this.pickId(e);
      const nombre = this.pickName(e);
      if (!sid) continue;
      base.set(sid, { estudianteId: sid, estudianteNombre: nombre, nota: null });
    }

    this.cargandoDetalle.set(true);

    this.caliSrv
      .obtenerNotas({
        cursoId,
        anioLectivoId: anioId,
        materiaId,
        trimestre: tri,
      })
      .subscribe({
        next: (res: any) => {
          const arr: any[] = res?.estudiantes ?? res ?? [];

          for (const it of arr) {
            const sid = this.pickId(it?.estudianteId ?? it?.estudiante);
            if (!sid) continue;
            const nota = this.notaFrom(it);
            if (!base.has(sid)) {
              base.set(sid, {
                estudianteId: sid,
                estudianteNombre: sid,
                nota,
              });
            } else {
              const prev = base.get(sid)!;
              prev.nota = nota;
            }
          }

          const lista = Array.from(base.values()).sort((a, b) =>
            a.estudianteNombre.localeCompare(b.estudianteNombre)
          );

          this.rows.set(lista);
          this.cargandoDetalle.set(false);
        },
        error: () => {
          this.cargandoDetalle.set(false);
          this.sb.open('Error al cargar las notas.', 'Cerrar', { duration: 3000 });
        },
      });
  }

  promedioCurso(): number | null {
    const notas = this.rows()
      .map((r) => r.nota)
      .filter((n) => n != null) as number[];
    if (!notas.length) return null;
    const sum = notas.reduce((a, b) => a + b, 0);
    return Number((sum / notas.length).toFixed(2));
  }

  // ===== Logos pdfMake =====
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

  // ===== Exportar PDF (abre en nueva pestaña) =====
  async exportarPdf(): Promise<void> {
    if (!this.rows().length) {
      this.sb.open('No hay datos para exportar.', 'Cerrar', { duration: 2500 });
      return;
    }

    await this.ensureLogos();

    const curso: any = this.cursoDetalle() || this.cursoSel() || {};

    const cursoNombre: string =
      curso?.nombre ??
      curso?.nombreCurso ??
      (curso?.nivel && curso?.paralelo ? `${curso.nivel} ${curso.paralelo}` : null) ??
      (curso?.nivel ? String(curso.nivel) : null) ??
      `Curso ${this.cursoId}`;

    const materiaNombre =
      this.materiasAsignadas().find((m) => m.materiaId === this.materiaId)?.materiaNombre ??
      'Materia';
    const triEtiqueta = this.etiquetaTrimestre(this.trimestre);

    const institucion = {
      nombreL1: environment.school?.titleLine1 ?? 'UNIDAD EDUCATIVA',
      nombreL2: environment.school?.titleLine2 ?? '“FRAY BARTOLOMÉ DE LAS CASAS - SALASACA”',
      lema: environment.school?.motto ?? '¡Buenos Cristianos, Buenos Ciudadanos!',
    };

    const body: any[] = [];

    body.push([
      { text: 'ESTUDIANTE', bold: true },
      { text: 'NOTA', bold: true, alignment: 'center' },
    ]);

    this.rows().forEach((r) => {
      body.push([
        r.estudianteNombre,
        { text: this.fmt(r.nota), alignment: 'center' },
      ]);
    });

    body.push([
      { text: 'PROMEDIO DEL CURSO', bold: true, alignment: 'right' },
      { text: this.fmt(this.promedioCurso()), bold: true, alignment: 'center' },
    ]);

    const docDef: any = {
      pageSize: 'A4',
      pageMargins: [32, 32, 32, 40],
      content: [
        {
          columns: [
            this.logoIzqB64
              ? { image: this.logoIzqB64, width: 90 }
              : { text: '', width: 90 },
            {
              width: '*',
              alignment: 'center',
              stack: [
                { text: institucion.nombreL1, bold: true, fontSize: 11 },
                { text: institucion.nombreL2, margin: [0, 2, 0, 2] },
                { text: institucion.lema, italics: true, fontSize: 9, margin: [0, 0, 0, 4] },
                {
                  text: `REPORTE TRIMESTRAL DE NOTAS`,
                  bold: true,
                  fontSize: 12,
                  margin: [0, 2, 0, 0],
                },
              ],
            },
            this.logoDerB64
              ? { image: this.logoDerB64, width: 50, alignment: 'right' }
              : { text: '', width: 50 },
          ],
          columnGap: 10,
          margin: [0, 0, 0, 10],
        },

        {
          alignment: 'center',
          margin: [0, 0, 0, 8],
          stack: [
            { text: `Curso: ${cursoNombre}`, fontSize: 10 },
            { text: `Materia: ${materiaNombre}`, fontSize: 10 },
            { text: `Trimestre: ${triEtiqueta}`, fontSize: 10 },
          ],
        },

        {
          table: {
            headerRows: 1,
            widths: ['*', 80],
            body,
          },
          layout: 'lightHorizontalLines',
          margin: [0, 4, 0, 16],
        },

        {
          margin: [0, 40, 0, 0],
          alignment: 'center',
          stack: [
            { text: '_____________________________', margin: [0, 0, 0, 4] },
            { text: 'TUTOR/A', fontSize: 10 },
          ],
        },
      ],
    };

    pdfMake.createPdf(docDef).open(); // 👉 abre en nueva pestaña
  }

  // ===== Helpers UI =====
  fmt(n: number | null): string {
    return n == null || isNaN(Number(n)) ? '—' : Number(n).toFixed(2);
  }
  isOK(n: number | null): boolean {
    return n != null && n >= 7;
  }
  isBad(n: number | null): boolean {
    return n != null && n < 7;
  }
  etiquetaTrimestre(t: Trimestre): string {
    if (t === 'T1') return '1er Trimestre';
    if (t === 'T2') return '2do Trimestre';
    return '3er Trimestre';
  }

  asId(val: any): string {
    if (!val) return '';
    if (typeof val === 'string') return val;
    if (typeof val === 'object' && (val as any)._id) return String((val as any)._id);
    return String(val);
  }
}