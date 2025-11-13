// src/app/pages/admin/nota-final-estudiante.ts
import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

// Angular Material
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatIconModule } from '@angular/material/icon';

// Servicios existentes (ajusta rutas si difieren)
import { AnioLectivoService } from '../../services/anio-lectivo.service';
import { CursoService } from '../../services/curso.service';
import { EstudianteService } from '../../services/estudiante.service';

@Component({
  standalone: true,
  selector: 'app-nota-final-estudiante',
  imports: [
    CommonModule,
    FormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatSelectModule,
    MatButtonModule,
    MatProgressBarModule,
    MatSnackBarModule,
    MatIconModule,
  ],
  template: `
    <div class="wrap">
      <div class="header">
        <div>
          <h1>📊 Nota final del estudiante</h1>
          <p class="subtitle">
            Consulta la nota final de un estudiante por año lectivo y curso.
          </p>
        </div>
      </div>

      <mat-card class="card">
        <mat-progress-bar
          *ngIf="cargando()"
          mode="indeterminate">
        </mat-progress-bar>

        <div class="filters">
          <!-- Año lectivo -->
          <mat-form-field appearance="fill">
            <mat-label>Año lectivo</mat-label>
            <mat-select [(ngModel)]="anioSeleccionado">
              <mat-option *ngFor="let a of aniosLectivo()" [value]="a._id">
                {{ a.nombre }}
              </mat-option>
            </mat-select>
          </mat-form-field>

          <!-- Curso -->
          <mat-form-field appearance="fill">
            <mat-label>Curso</mat-label>
            <mat-select [(ngModel)]="cursoSeleccionado">
              <mat-option *ngFor="let c of cursos()" [value]="c._id">
                {{ c.nombre }}
              </mat-option>
            </mat-select>
          </mat-form-field>

          <!-- Estudiante -->
          <mat-form-field appearance="fill">
            <mat-label>Estudiante</mat-label>
            <mat-select [(ngModel)]="estudianteSeleccionado">
              <mat-option *ngFor="let e of estudiantes()" [value]="e._id">
                {{ e.nombre }}
              </mat-option>
            </mat-select>
          </mat-form-field>
        </div>

        <div class="actions">
          <button
            mat-flat-button
            color="primary"
            (click)="consultar()">
            <mat-icon>search</mat-icon>
            Consultar nota final
          </button>
        </div>

        <div class="resultado" *ngIf="resultado()">
          <mat-card class="res-card">
            <div class="res-title">
              <mat-icon>check_circle</mat-icon>
              <span>Resultado</span>
            </div>
            <div class="res-body">
              <p>
                <strong>Nota final:</strong>
                <span class="nota">{{ resultado()?.notaFinal ?? '—' }}</span>
              </p>
              <div class="trims">
                <div class="trim">
                  <span class="trim-label">T1</span>
                  <span>{{ resultado()?.detalle?.T1 ?? '—' }}</span>
                </div>
                <div class="trim">
                  <span class="trim-label">T2</span>
                  <span>{{ resultado()?.detalle?.T2 ?? '—' }}</span>
                </div>
                <div class="trim">
                  <span class="trim-label">T3</span>
                  <span>{{ resultado()?.detalle?.T3 ?? '—' }}</span>
                </div>
              </div>
            </div>
          </mat-card>
        </div>
      </mat-card>
    </div>
  `,
  styles: [
    `
      .wrap {
        padding: 24px;
        max-width: 900px;
        margin: 0 auto;
        display: grid;
        gap: 16px;
      }
      .header h1 {
        margin: 0;
        font-size: 24px;
        font-weight: 700;
      }
      .subtitle {
        margin: 4px 0 0;
        opacity: 0.7;
      }
      .card {
        padding: 16px;
        border-radius: 18px;
        display: grid;
        gap: 16px;
      }
      .filters {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
        gap: 12px;
        margin-top: 8px;
      }
      .actions {
        margin-top: 4px;
        display: flex;
        justify-content: flex-end;
      }
      .actions button mat-icon {
        margin-right: 6px;
      }
      .resultado {
        margin-top: 16px;
      }
      .res-card {
        padding: 16px;
        border-radius: 16px;
      }
      .res-title {
        display: flex;
        align-items: center;
        gap: 8px;
        font-weight: 600;
        margin-bottom: 10px;
      }
      .res-title mat-icon {
        color: #2e7d32;
      }
      .res-body p {
        margin: 0 0 12px;
      }
      .nota {
        font-size: 20px;
        font-weight: 700;
        margin-left: 4px;
      }
      .trims {
        display: flex;
        gap: 12px;
        flex-wrap: wrap;
      }
      .trim {
        padding: 8px 10px;
        border-radius: 12px;
        background: #f5f5f5;
        display: grid;
        gap: 2px;
        min-width: 70px;
        text-align: center;
      }
      .trim-label {
        font-size: 12px;
        font-weight: 600;
        opacity: 0.7;
      }
      @media (max-width: 600px) {
        .wrap {
          padding: 16px;
        }
      }
    `,
  ],
})
export class NotaFinalEstudianteComponent implements OnInit {
  private anioSvc = inject(AnioLectivoService);
  private cursoSvc = inject(CursoService);
  private estuSvc = inject(EstudianteService);
  private sb = inject(MatSnackBar);

  cargando = signal(false);

  aniosLectivo = signal<any[]>([]);
  cursos = signal<any[]>([]);
  estudiantes = signal<any[]>([]);

  anioSeleccionado: string | null = null;
  cursoSeleccionado: string | null = null;
  estudianteSeleccionado: string | null = null;

  resultado = signal<any | null>(null);

  ngOnInit(): void {
    this.cargarCatalogos();
  }

  private cargarCatalogos() {
    this.cargando.set(true);

    // Años lectivos
    this.anioSvc.getAll().subscribe({
      next: (res: any) => {
        this.aniosLectivo.set(res?.data ?? res ?? []);
      },
      error: () => {
        this.sb.open('No se pudieron cargar los años lectivos', 'Cerrar', {
          duration: 3000,
        });
      },
    });

    // Cursos
    this.cursoSvc.listar().subscribe({
      next: (res: any) => {
        this.cursos.set(res?.data ?? res ?? []);
      },
      error: () => {
        this.sb.open('No se pudieron cargar los cursos', 'Cerrar', {
          duration: 3000,
        });
      },
    });

    // Estudiantes
    this.estuSvc.getAll().subscribe({
      next: (res: any) => {
        this.estudiantes.set(res?.data ?? res ?? []);
        this.cargando.set(false);
      },
      error: () => {
        this.cargando.set(false);
        this.sb.open('No se pudieron cargar los estudiantes', 'Cerrar', {
          duration: 3000,
        });
      },
    });
  }

  consultar() {
    this.resultado.set(null);

    if (!this.anioSeleccionado || !this.cursoSeleccionado || !this.estudianteSeleccionado) {
      this.sb.open('Selecciona año lectivo, curso y estudiante', 'Cerrar', {
        duration: 3000,
      });
      return;
    }

    this.cargando.set(true);

    // Suponemos que en el AnioLectivoService defines un método para llamar al endpoint:
    // GET /api/aniolectivo/:anioId/curso/:cursoId/estudiante/:estId/nota-final
    (this.anioSvc as any)
      .obtenerNotaFinal(this.anioSeleccionado, this.cursoSeleccionado, this.estudianteSeleccionado)
      .subscribe({
        next: (res: any) => {
          this.cargando.set(false);
          const data = res?.data ?? res;
          this.resultado.set(data);
        },
        error: (e: any) => {
          this.cargando.set(false);
          const msg =
            e?.error?.message ||
            e?.error?.msg ||
            'No se pudo obtener la nota final del estudiante';
          this.sb.open(msg, 'Cerrar', { duration: 4000 });
        },
      });
  }
}
