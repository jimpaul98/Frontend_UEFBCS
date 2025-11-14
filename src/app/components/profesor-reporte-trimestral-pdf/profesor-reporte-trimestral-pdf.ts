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
    <div class="wrap">
      <mat-card class="card">
        <!-- Header -->
        <div class="header">
          <div class="title-block">
            <div class="eyebrow">
              <mat-icon>picture_as_pdf</mat-icon>
              Reporte Trimestral en PDF
            </div>
            <h2 class="title">Notas por Estudiante</h2>
            <p class="sub">
              Seleccione <b>Curso</b>, <b>Materia</b> y <b>Trimestre</b>. La tabla se cargará
              automáticamente y podrá exportarla a <b>PDF</b>, con una fila de
              <b>promedio del curso</b>.
            </p>
          </div>
          <div class="actions">
            <button mat-stroked-button (click)="recargarCursos()" [disabled]="cargandoCursos()">
              <mat-icon>refresh</mat-icon>
              Recargar cursos
            </button>
          </div>
        </div>

        <mat-divider class="soft-divider"></mat-divider>

        <!-- Filtros -->
        <div class="filters">
          <!-- Curso -->
          <mat-form-field appearance="outline" class="ff dense">
            <mat-label>Curso</mat-label>
            <mat-select
              [(ngModel)]="cursoId"
              name="cursoId"
              (selectionChange)="onCursoChange()"
            >
              <mat-option *ngFor="let c of cursos()" [value]="asId(c._id)">
                {{ c.nombre }}
              </mat-option>
            </mat-select>
          </mat-form-field>

          <!-- Materia (obligatoria, sólo las que dicta el profesor) -->
          <mat-form-field appearance="outline" class="ff dense">
            <mat-label>Materia</mat-label>
            <mat-select
              [(ngModel)]="materiaId"
              name="materiaId"
              [disabled]="!materiasAsignadas().length"
              (selectionChange)="onMateriaChange()"
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
              (selectionChange)="onTrimestreChange()"
            >
              <mat-option [value]="'T1'">Primer Trimestre</mat-option>
              <mat-option [value]="'T2'">Segundo Trimestre</mat-option>
              <mat-option [value]="'T3'">Tercer Trimestre</mat-option>
            </mat-select>
          </mat-form-field>

          <!-- Botón PDF solamente -->
          <div class="btns">
            <button
              mat-flat-button
              color="primary"
              class="btn-primary"
              (click)="exportarPdf()"
              [disabled]="!rows().length"
            >
              <mat-icon>picture_as_pdf</mat-icon>
              <span>Exportar PDF</span>
            </button>
          </div>
        </div>

        <!-- Chips info -->
        <div class="badges" *ngIf="cursoDetalle()">
          <mat-chip-set>
            <mat-chip appearance="outlined" color="primary">
              Año: {{ cursoDetalle()?.anioLectivo?.nombre ?? cursoDetalle()?.anioLectivo }}
            </mat-chip>
            <mat-chip appearance="outlined">
              Tutor: {{ cursoDetalle()?.profesorTutor?.nombre ?? cursoDetalle()?.profesorTutor }}
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
                <span class="pill" [class.good]="isOK(r.nota)" [class.bad]="isBad(r.nota)">
                  {{ fmt(r.nota) }}
                </span>
              </td>
            </ng-container>

            <tr mat-header-row *matHeaderRowDef="cols"></tr>
            <tr mat-row *matRowDef="let row; columns: cols" class="row"></tr>
          </table>

          <!-- Fila de promedio (en pantalla) -->
          <div class="footer-row">
            <span class="label">Promedio del curso:</span>
            <span class="value">{{ fmt(promedioCurso()) }}</span>
          </div>
        </div>

        <ng-template #noRows>
          <div class="empty">
            <div class="empty-icon">📄</div>
            <div class="empty-title">No hay datos para mostrar</div>
            <div class="empty-sub">
              Seleccione <b>Curso</b>, <b>Materia</b> y <b>Trimestre</b>. La tabla se cargará
              automáticamente si hay información.
            </div>
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
      .eyebrow {
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
      .filters {
        display: grid;
        grid-template-columns: repeat(4, minmax(200px, 1fr));
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
      .btns {
        display: flex;
        flex-direction: column;
        gap: 6px;
      }
      .btn-primary mat-icon {
        margin-right: 6px;
      }
      .table-wrap {
        margin-top: 8px;
        overflow: auto;
        border-radius: 12px;
        border: 1px solid #eaeaea;
      }
      table {
        width: 100%;
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
      .pill {
        display: inline-block;
        min-width: 60px;
        padding: 3px 10px;
        border-radius: 999px;
        background: #eee;
        font-variant-numeric: tabular-nums;
      }
      .pill.good {
        background: #e6f5e9;
      }
      .pill.bad {
        background: #fdecea;
      }
      .center {
        text-align: center;
      }
      .muted {
        opacity: 0.7;
      }
      .empty {
        padding: 28px 14px;
        text-align: center;
        color: #555;
      }
      .empty-icon {
        font-size: 40px;
      }
      .empty-title {
        font-weight: 700;
      }
      .badges {
        display: flex;
        align-items: center;
        gap: 10px;
        flex-wrap: wrap;
      }
      .footer-row {
        padding: 10px 12px;
        border-top: 1px solid #eee;
        display: flex;
        justify-content: flex-end;
        gap: 8px;
        font-size: 13px;
      }
      .footer-row .value {
        font-weight: 700;
        font-variant-numeric: tabular-nums;
      }
      @media (max-width: 900px) {
        .filters {
          grid-template-columns: 1fr 1fr;
        }
      }
      @media (max-width: 600px) {
        .filters {
          grid-template-columns: 1fr;
        }
        .header {
          grid-template-columns: 1fr;
        }
        .btns {
          flex-direction: row;
          flex-wrap: wrap;
        }
      }
    `,
  ],
})
export class ProfesorReporteTrimestralPdfComponent implements OnInit {
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
