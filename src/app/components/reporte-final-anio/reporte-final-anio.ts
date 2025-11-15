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

// Servicios
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
    <div class="wrap">
      <mat-card class="card">
        <div class="header">
          <div class="title-block">
            <h2 class="title">📑 Notas Finales por Año Lectivo</h2>
            <p class="sub">
              Seleccione el <b>Año Lectivo</b> y el <b>Estudiante</b> para consultar sus notas finales
              (promedio de T1, T2 y T3 por materia).
            </p>
          </div>
          <div class="actions">
            <button
              mat-flat-button
              color="primary"
              (click)="imprimirPdf()"
              [disabled]="!rows().length || cargando() || !estId"
            >
              <mat-icon>picture_as_pdf</mat-icon>
              Imprimir PDF
            </button>
          </div>
        </div>

        <div class="filters">
          <!-- Año lectivo -->
          <mat-form-field appearance="outline" class="ff">
            <mat-label>Año lectivo</mat-label>
            <mat-select [(ngModel)]="anioId" (selectionChange)="onAnioChange()">
              <mat-option *ngFor="let a of aniosLectivos()" [value]="a.id">
                {{ a.nombre }}
              </mat-option>
            </mat-select>
          </mat-form-field>

          <!-- Estudiante (con búsqueda interna en el panel) -->
          <mat-form-field appearance="outline" class="ff" *ngIf="anioId">
            <mat-label>Estudiante</mat-label>
            <mat-select
              [(ngModel)]="estId"
              (selectionChange)="onEstudianteChange()"
              panelClass="estudiante-panel"
            >
              <!-- Input de búsqueda dentro del panel -->
              <mat-option>
                <input
                  type="text"
                  placeholder="Buscar por nombre o cédula"
                  class="select-search-input"
                  [ngModel]="estSearch()"
                  (ngModelChange)="estSearch.set($event || '')"
                  (click)="$event.stopPropagation()"
                  (keydown)="$event.stopPropagation()"
                />
              </mat-option>

              <!-- Opciones filtradas -->
              <mat-option
                *ngFor="let e of estudiantesFiltrados()"
                [value]="asId(e._id ?? e.uid)"
              >
                {{ e.nombre }} - {{ e.cedula }}
              </mat-option>
            </mat-select>
          </mat-form-field>
        </div>

        <mat-progress-bar *ngIf="cargando()" mode="indeterminate"></mat-progress-bar>

        <!-- Tabla de notas finales -->
        <div class="table-wrap" *ngIf="rows().length; else noData">
          <table mat-table [dataSource]="rows()" class="modern-table mat-elevation-z2">

            <!-- Materia -->
            <ng-container matColumnDef="materia">
              <th mat-header-cell *matHeaderCellDef>Materia</th>
              <td mat-cell *matCellDef="let r">
                <span [matTooltip]="r.materiaNombre">{{ r.materiaNombre }}</span>
              </td>
            </ng-container>

            <!-- T1 -->
            <ng-container matColumnDef="t1">
              <th mat-header-cell *matHeaderCellDef class="center">T1</th>
              <td mat-cell *matCellDef="let r" class="center">
                {{ fmt(r.t1) }}
              </td>
            </ng-container>

            <!-- T2 -->
            <ng-container matColumnDef="t2">
              <th mat-header-cell *matHeaderCellDef class="center">T2</th>
              <td mat-cell *matCellDef="let r" class="center">
                {{ fmt(r.t2) }}
              </td>
            </ng-container>

            <!-- T3 -->
            <ng-container matColumnDef="t3">
              <th mat-header-cell *matHeaderCellDef class="center">T3</th>
              <td mat-cell *matCellDef="let r" class="center">
                {{ fmt(r.t3) }}
              </td>
            </ng-container>

            <!-- Final -->
            <ng-container matColumnDef="final">
              <th mat-header-cell *matHeaderCellDef class="center">Final</th>
              <td mat-cell *matCellDef="let r" class="center">
                <span class="pill" [class.good]="isOK(r.final)" [class.bad]="isBad(r.final)">
                  {{ fmt(r.final) }}
                </span>
              </td>
            </ng-container>

            <tr mat-header-row *matHeaderRowDef="cols"></tr>
            <tr mat-row *matRowDef="let row; columns: cols"></tr>
          </table>

          <!-- Fila resumen promedio del año -->
          <div class="footer">
            <div class="footer-label">Promedio general del año lectivo:</div>
            <div
              class="footer-value"
              [class.bad]="isBad(promedioGeneral())"
              [class.good]="isOK(promedioGeneral())"
            >
              {{ fmt(promedioGeneral()) }}
            </div>
          </div>
        </div>

        <ng-template #noData>
          <div class="empty" *ngIf="anioId && estId && !cargando()">
            <div class="empty-icon">📭</div>
            <div class="empty-title">Sin datos de notas finales</div>
            <div class="empty-sub">
              No se encontraron notas para este estudiante en el año lectivo seleccionado.
            </div>
          </div>
        </ng-template>
      </mat-card>
    </div>
  `,
  styles: [`
    .wrap { padding: 16px; max-width: 1100px; margin: 0 auto; }
    .card { padding: 16px; border-radius: 12px; display: grid; gap: 14px; }
    .header { display: grid; grid-template-columns: 1fr auto; gap: 8px; align-items: center; }
    .title { margin: 0; font-size: 20px; font-weight: 700; }
    .sub { margin: 0; font-size: 13px; opacity: .8; }
    .actions { display: inline-flex; gap: 8px; align-items: center; }
    .filters { display: grid; grid-template-columns: repeat(2, minmax(220px, 1fr)); gap: 12px; align-items: end; }
    .ff { width: 100%; }

    .select-search-input {
      width: 100%;
      padding: 4px 8px;
      font-size: 13px;
      box-sizing: border-box;
      border-radius: 4px;
      border: 1px solid #ccc;
      outline: none;
    }
    .select-search-input:focus {
      border-color: #3f51b5;
    }

    .table-wrap { margin-top: 10px; border-radius: 12px; border: 1px solid #e0e0e0; overflow: hidden; }
    table { width: 100%; border-collapse: collapse; }
    .modern-table th { background: #f9fafb; font-weight: 600; }
    .modern-table th, .modern-table td { padding: 6px 10px; font-size: 13px; }
    .center { text-align: center; }

    .pill {
      display: inline-block;
      min-width: 44px;
      padding: 2px 8px;
      border-radius: 10px;
      background: #eee;
    }
    .pill.good { background: #e6f5e9; }
    .pill.bad { background: #fdecea; }

    .footer {
      display: flex;
      justify-content: flex-end;
      align-items: center;
      gap: 8px;
      padding: 8px 10px;
      border-top: 1px solid #e0e0e0;
      background: #fafafa;
      font-size: 13px;
    }
    .footer-label { font-weight: 600; }
    .footer-value { font-weight: 700; padding: 2px 8px; border-radius: 10px; background: #eee; }
    .footer-value.good { background: #e6f5e9; }
    .footer-value.bad { background: #fdecea; }

    .empty { padding: 24px; text-align: center; color: #666; }
    .empty-icon { font-size: 32px; }
    .empty-title { font-weight: 700; margin-top: 4px; }
    .empty-sub { font-size: 13px; }

    @media (max-width: 700px) {
      .filters { grid-template-columns: 1fr; }
      .header { grid-template-columns: 1fr; }
      .actions { justify-content: flex-start; }
    }
  `],
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
    pdf.open(); // abre nueva pestaña, no descarga automática
  }
}
