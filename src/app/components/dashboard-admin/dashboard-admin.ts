import { Component, OnInit, OnDestroy, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatDividerModule } from '@angular/material/divider';
import { RouterModule } from '@angular/router';
import { Chart, registerables } from 'chart.js';

import { CursoService } from '../../services/curso.service';
import { EstudianteService } from '../../services/estudiante.service';
import { AuthService } from '../../services/auth.service';
import { CalificacionService, Trimestre } from '../../services/calificacion.service';
import { AsistenciaService } from '../../services/asistencia.service';
import { firstValueFrom } from 'rxjs';

Chart.register(...registerables);

type ResumenItem = {
  icon: string;
  iconClass: string;
  valor: number | string;
  label: string;
};

@Component({
  standalone: true,
  selector: 'app-dashboard-admin',
  imports: [
    CommonModule,
    MatCardModule,
    MatIconModule,
    MatButtonModule,
    MatProgressBarModule,
    MatDividerModule,
    RouterModule,
  ],
  template: `
    <div class="wrap">
      <div class="header">
        <div>
          <h1 class="title">📊 Panel de Administración</h1>
          <p class="subtitle">Resumen general del sistema académico</p>
        </div>
        <button mat-stroked-button color="primary" routerLink="/cursos">
          <mat-icon>open_in_new</mat-icon>
          Gestionar cursos
        </button>
      </div>

      <mat-progress-bar *ngIf="cargando()" mode="indeterminate"></mat-progress-bar>

      <div class="grid-cards">
        <mat-card class="summary-card" *ngFor="let s of resumen()">
          <mat-icon [ngClass]="s.iconClass">{{ s.icon }}</mat-icon>
          <div class="info">
            <h2>{{ s.valor }}</h2>
            <p>{{ s.label }}</p>
          </div>
        </mat-card>
      </div>

      <mat-divider></mat-divider>

      <div class="charts">
        <mat-card class="chart-card">
          <div class="chart-header">
            <h3>Estudiantes por Curso</h3>
            <span class="chart-sub">Distribución actual de matrícula</span>
          </div>
          <canvas id="chartCursos"></canvas>
        </mat-card>

        <mat-card class="chart-card">
          <div class="chart-header">
            <h3>Promedios Generales por Curso (0–10)</h3>
            <span class="chart-sub">Promedio de notas reales (T1, T2 y T3 en todas las materias)</span>
          </div>
          <canvas id="chartPromedios"></canvas>
        </mat-card>
      </div>
    </div>
  `,
  styles: [`
    .wrap {
      padding: 24px;
      display: flex;
      flex-direction: column;
      gap: 24px;
      max-width: 1200px;
      margin: auto;
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 12px;
      flex-wrap: wrap;
    }
    .title {
      font-weight: 800;
      font-size: 26px;
      margin: 0;
    }
    .subtitle {
      opacity: .8;
      margin: 2px 0 10px;
      font-size: 14px;
    }
    .grid-cards {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      gap: 16px;
    }
    .summary-card {
      display: flex;
      align-items: center;
      gap: 16px;
      padding: 16px;
      border-radius: 14px;
      background: linear-gradient(135deg, #fafafa, #f1f1f1);
      box-shadow: 0 3px 6px rgba(0,0,0,0.08);
      transition: transform .2s ease, box-shadow .2s ease;
    }
    .summary-card:hover {
      transform: translateY(-4px);
      box-shadow: 0 6px 12px rgba(0,0,0,0.12);
    }
    .summary-card mat-icon {
      font-size: 40px;
    }
    .summary-card .info h2 {
      margin: 0;
      font-size: 22px;
      font-weight: 700;
    }
    .summary-card .info p {
      margin: 0;
      font-size: 14px;
      opacity: .8;
    }
    .text-blue   { color: #1E88E5; }
    .text-green  { color: #43A047; }
    .text-purple { color: #8E24AA; }

    .charts {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
      gap: 24px;
    }
    .chart-card {
      padding: 16px;
      border-radius: 14px;
      box-shadow: 0 3px 6px rgba(0,0,0,0.08);
    }
    .chart-header {
      margin-bottom: 8px;
      display: flex;
      flex-direction: column;
      gap: 2px;
    }
    .chart-header h3 {
      margin: 0;
      font-size: 16px;
      font-weight: 600;
    }
    .chart-sub {
      font-size: 12px;
      opacity: .75;
    }

    @media (max-width: 600px) {
      .header {
        flex-direction: column;
        align-items: flex-start;
      }
    }
  `]
})
export class DashboardAdminComponent implements OnInit, OnDestroy {
  private cursoSrv = inject(CursoService);
  private estSrv = inject(EstudianteService);
  private authSrv = inject(AuthService);
  private caliSrv = inject(CalificacionService);
  private asisSrv = inject(AsistenciaService);

  resumen = signal<ResumenItem[]>([]);
  cargando = signal<boolean>(false);

  private chartCursos?: Chart;
  private chartPromedios?: Chart;

  async ngOnInit(): Promise<void> {
    await this.cargarDatos();
  }

  ngOnDestroy(): void {
    this.destroyCharts();
  }

  // =====================
  // Carga de datos
  // =====================
  private async cargarDatos() {
    this.cargando.set(true);
    try {
      const [cursosResp, estRes] = await Promise.all([
        firstValueFrom(this.cursoSrv.listar()),
        firstValueFrom(this.estSrv.getAll())
      ]);

      // cursosResp puede ser { ok, data } o un array directo
      let cursos: any[] = [];
      if (Array.isArray(cursosResp)) {
        cursos = cursosResp;
      } else if (
        cursosResp &&
        typeof cursosResp === 'object' &&
        'data' in cursosResp &&
        Array.isArray((cursosResp as any).data)
      ) {
        cursos = (cursosResp as any).data;
      }

      const estudiantes = estRes ?? [];

      const totalProfes = new Set<string>();
      cursos.forEach((c: any) => {
        (c.materias ?? []).forEach((m: any) => {
          const idProf = this.asId(m.profesor);
          if (idProf) totalProfes.add(idProf);
        });
      });

      this.resumen.set([
        { icon: 'school',  iconClass: 'text-blue',   valor: cursos.length,       label: 'Cursos' },
        { icon: 'groups',  iconClass: 'text-green',  valor: estudiantes.length,  label: 'Estudiantes' },
        { icon: 'person',  iconClass: 'text-purple', valor: totalProfes.size,    label: 'Profesores' },
      ]);

      // Render charts con datos actuales
      this.renderChartCursos(cursos);
      await this.renderChartPromedios(cursos);

    } catch (e) {
      console.error('Error cargando dashboard', e);
    } finally {
      this.cargando.set(false);
    }
  }

  // =====================
  // Charts helpers
  // =====================
  private destroyCharts() {
    if (this.chartCursos) {
      this.chartCursos.destroy();
      this.chartCursos = undefined;
    }
    if (this.chartPromedios) {
      this.chartPromedios.destroy();
      this.chartPromedios = undefined;
    }
  }

  private renderChartCursos(cursos: any[]) {
    const canvas = document.getElementById('chartCursos') as HTMLCanvasElement | null;
    if (!canvas) return;

    if (this.chartCursos) {
      this.chartCursos.destroy();
    }

    const labels = cursos.map(c => c.nombre ?? '—');
    const data = cursos.map(c => (c.estudiantes?.length ?? 0));

    this.chartCursos = new Chart(canvas, {
      type: 'bar',
      data: {
        labels,
        datasets: [
          {
            label: 'Estudiantes por curso',
            data,
            backgroundColor: '#42A5F5',
          }
        ]
      },
      options: {
        responsive: true,
        plugins: {
          legend: { display: true },
          tooltip: { enabled: true }
        },
        scales: {
          y: { beginAtZero: true, ticks: { precision: 0 } }
        }
      }
    });
  }

  /**
   * Calcula, para cada curso, el promedio general (0–10) REAL:
   * - Recorre TODAS las materias del curso
   * - Para cada materia, lee T1, T2 y T3 (usando obtenerNotas)
   * - Promedia todas las notas de todos los estudiantes y trimestres
   */
  private async renderChartPromedios(cursos: any[]) {
    const canvas = document.getElementById('chartPromedios') as HTMLCanvasElement | null;
    if (!canvas) return;

    if (this.chartPromedios) {
      this.chartPromedios.destroy();
    }

    const labels = cursos.map(c => c.nombre ?? '—');
    const data = await this.calcularPromediosCursos(cursos); // (number|null)[]

    this.chartPromedios = new Chart(canvas, {
      type: 'line',
      data: {
        labels,
        datasets: [
          {
            label: 'Promedio General del Curso (0–10)',
            data,
            borderColor: '#7E57C2',
            fill: false,
            tension: 0.3,
          }
        ]
      },
      options: {
        responsive: true,
        plugins: {
          legend: { display: true },
          tooltip: { enabled: true }
        },
        scales: {
          y: {
            min: 0,
            max: 10,
            ticks: { stepSize: 1 }
          }
        }
      }
    });
  }

  /**
   * Recorre cursos y devuelve un array con el promedio general de cada curso.
   * Usa CalificacionService.obtenerNotas(cursoId, anioLectivoId, materiaId, trimestre)
   */
  private async calcularPromediosCursos(cursos: any[]): Promise<(number | null)[]> {
    const trimestres: Trimestre[] = ['T1', 'T2', 'T3'];

    // Array de promesas para cada curso
    const promesasCursos = cursos.map(async (c) => {
      const cursoId = this.asId(c._id);
      const anioId = this.asId(c.anioLectivo);

      if (!cursoId || !anioId) return null;

      const materias: string[] = (c.materias ?? [])
        .map((m: any) => this.asId(m.materia))
        .filter((x: string) => !!x);

      if (!materias.length) return null;

      // Recolectar todas las peticiones de este curso
      const peticiones = [];
      for (const matId of materias) {
        for (const tri of trimestres) {
          peticiones.push(
            firstValueFrom(
              this.caliSrv.obtenerNotas({
                cursoId,
                anioLectivoId: anioId,
                materiaId: matId,
                trimestre: tri,
              })
            ).catch((err) => {
              console.warn('[Dashboard] Error obtenerNotas', { cursoId, matId, tri, err });
              return null; // Retornar null en caso de error para no romper Promise.all
            })
          );
        }
      }

      // Esperar todas las notas del curso en paralelo
      const respuestas = await Promise.all(peticiones);

      let sumaNotas = 0;
      let cuentaNotas = 0;

      for (const resp of respuestas) {
        if (!resp) continue;
        const arr: any[] = (resp as any)?.estudiantes ?? [];
        const nums = arr
          .map((x: any) =>
            typeof x?.promedioTrimestral === 'number' ? x.promedioTrimestral : null
          )
          .filter((n: number | null) => n != null) as number[];

        if (nums.length) {
          sumaNotas += nums.reduce((a, b) => a + b, 0);
          cuentaNotas += nums.length;
        }
      }

      if (!cuentaNotas) return null;
      return Number((sumaNotas / cuentaNotas).toFixed(2));
    });

    // Esperar a que todos los cursos calculen sus promedios
    return Promise.all(promesasCursos);
  }

  // =====================
  // Helper genérico de ID
  // =====================
  private asId(val: any): string {
    if (!val) return '';
    if (typeof val === 'string') return val;
    if (typeof val === 'object') {
      return String(val._id ?? val.id ?? val.uid ?? '');
    }
    return String(val);
  }
}
