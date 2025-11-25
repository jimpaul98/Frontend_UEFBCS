// src/app/pages/admin/cursos.ts
import {
  Component,
  OnInit,
  inject,
  signal,
  computed,
  ViewChild,
  TemplateRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClientModule } from '@angular/common/http';

// Importación de SweetAlert2
import Swal from 'sweetalert2';

// Material Imports
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatCardModule } from '@angular/material/card';
import { MatDividerModule } from '@angular/material/divider';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatDialog, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatListModule } from '@angular/material/list';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

// Componente del formulario (Asegúrate de que la ruta sea correcta)
import {
  CursoFormularioComponent,
  MateriaCatalogoItem,
  CursoPayload,
} from '../curso-formulario/curso-formulario';

// ---- Services
import { CursoService, Curso } from '../../services/curso.service';
import { AnioLectivoService } from '../../services/anio-lectivo.service';
import { UsuarioService } from '../../services/usuario.service';
import { EstudianteService } from '../../services/estudiante.service';
import { MateriaService } from '../../services/materia.service';

@Component({
  standalone: true,
  selector: 'app-cursos',
  imports: [
    CommonModule,
    HttpClientModule,
    MatSnackBarModule,
    MatCardModule,
    MatDividerModule,
    MatButtonModule,
    MatIconModule,
    MatChipsModule,
    MatDialogModule,
    MatProgressBarModule,
    MatListModule,
    MatTooltipModule,
    MatProgressSpinnerModule
  ],
  template: `
    <div class="wrap">
      <div class="header">
        <div class="titles">
          <h1>📘 Gestión de Cursos</h1>
          <p class="subtitle">
            Crea cursos asignando materias (con su profesor responsable) y estudiantes.
          </p>
        </div>
        <div class="actions">
          <button mat-flat-button color="primary" (click)="abrirCrear()">
            <mat-icon>add</mat-icon>
            Agregar curso
          </button>
        </div>
      </div>

      <mat-card class="card">
        <mat-progress-bar *ngIf="cargando()" mode="indeterminate"></mat-progress-bar>

        <div class="list" *ngIf="cursos().length; else vacio">
          <mat-card class="item" *ngFor="let c of cursos()">
            <div class="item-head">
              <button class="item-title link" (click)="verDetalles(c)">{{ c.nombre }}</button>
              <mat-chip-set>
                <mat-chip appearance="outlined" color="primary">
                  Año: {{ c.anioLectivo?.nombre ?? c.anioLectivo }}
                </mat-chip>
                <mat-chip appearance="outlined">
                  Tutor: {{ c.profesorTutor?.nombre ?? c.profesorTutor }}
                </mat-chip>
                <mat-chip appearance="outlined">
                  Nivel: {{ c.nivel }}
                </mat-chip>
                <mat-chip appearance="outlined">{{ c.materias?.length || 0 }} materia(s)</mat-chip>
              </mat-chip-set>
            </div>

            <div class="item-actions">
              <button mat-stroked-button (click)="abrirEditar(c)">
                <mat-icon>edit</mat-icon>
                Editar
              </button>
              <button mat-stroked-button color="warn" (click)="eliminar(c)">
                <mat-icon>delete</mat-icon>
                Eliminar
              </button>
            </div>
          </mat-card>
        </div>

        <ng-template #vacio>
          <div class="empty">
            <div class="emoji">🗂️</div>
            <div class="msg">No hay cursos registrados.</div>
            <button mat-flat-button color="primary" (click)="abrirCrear()">
              <mat-icon>add</mat-icon>
              Crear el primero
            </button>
          </div>
        </ng-template>
      </mat-card>

      <ng-template #detalleDlg>
        <div class="modern-modal">
          <div class="modal-header">
            <div class="header-content">
              <h2 class="title">{{ cursoDetalle()?.nombre }}</h2>
              <span class="subtitle-badge">Detalle Académico</span>
            </div>
            <button mat-icon-button class="close-btn" (click)="cerrarDialogo()">
              <mat-icon>close</mat-icon>
            </button>
          </div>

          <div class="modal-body" *ngIf="cursoDetalle(); else cargandoDetalle">
            
            <div class="stats-grid">
              <div class="stat-card blue">
                <div class="icon-bg"><mat-icon>calendar_today</mat-icon></div>
                <div class="stat-info">
                  <label>Año Lectivo</label>
                  <strong>{{ cursoDetalle().anioLectivo?.nombre ?? cursoDetalle().anioLectivo }}</strong>
                </div>
              </div>

              <div class="stat-card purple">
                <div class="icon-bg"><mat-icon>school</mat-icon></div>
                <div class="stat-info">
                  <label>Tutor</label>
                  <strong>{{ cursoDetalle().profesorTutor?.nombre ?? cursoDetalle().profesorTutor }}</strong>
                </div>
              </div>

              <div class="stat-card orange">
                <div class="icon-bg"><mat-icon>bar_chart</mat-icon></div>
                <div class="stat-info">
                  <label>Nivel</label>
                  <strong>{{ cursoDetalle().nivel }}</strong>
                </div>
              </div>
            </div>

            <div class="content-grid">
              
              <div class="section-col">
                <div class="section-header">
                  <div class="sec-icon"><mat-icon>menu_book</mat-icon></div>
                  <h3>Materias Asignadas</h3>
                  <span class="badge-count">{{ cursoDetalle().materias?.length || 0 }}</span>
                </div>
                
                <div class="custom-list">
                  <div class="list-item" *ngFor="let m of cursoDetalle().materias">
                    <div class="item-avatar book">
                      <mat-icon>import_contacts</mat-icon>
                    </div>
                    <div class="item-info">
                      <div class="main-text">{{ m.materia?.nombre ?? m.materia }}</div>
                      <div class="sub-text">
                        <mat-icon class="tiny-icon">person</mat-icon> 
                        {{ m.profesor?.nombre ?? m.profesor }}
                      </div>
                    </div>
                    <button mat-icon-button color="warn" matTooltip="Quitar materia" (click)="quitarMateria(m)">
                      <mat-icon>delete_outline</mat-icon>
                    </button>
                  </div>

                  <div class="empty-state" *ngIf="!cursoDetalle().materias?.length">
                    <mat-icon>library_books</mat-icon>
                    <p>Sin materias asignadas</p>
                  </div>
                </div>
              </div>

              <div class="section-col">
                <div class="section-header">
                  <div class="sec-icon student"><mat-icon>groups</mat-icon></div>
                  <h3>Estudiantes</h3>
                  <span class="badge-count">{{ cursoDetalle().estudiantes?.length || 0 }}</span>
                </div>

                <div class="custom-list">
                  <div class="list-item" *ngFor="let e of cursoDetalle().estudiantes">
                    <div class="item-avatar person">
                      {{ (e?.nombre?.[0] || 'E') | uppercase }}
                    </div>
                    <div class="item-info">
                      <div class="main-text">{{ e?.nombre ?? e }}</div>
                      <div class="sub-text" *ngIf="e?.cedula">
                        <mat-icon class="tiny-icon">fingerprint</mat-icon> {{ e.cedula }}
                      </div>
                    </div>
                    <button mat-icon-button color="warn" matTooltip="Quitar estudiante" (click)="quitarEstudiante(e)">
                      <mat-icon>person_remove</mat-icon>
                    </button>
                  </div>

                  <div class="empty-state" *ngIf="!cursoDetalle().estudiantes?.length">
                    <mat-icon>person_off</mat-icon>
                    <p>Sin estudiantes matriculados</p>
                  </div>
                </div>
              </div>

            </div> <div class="footer-hint">
              <mat-icon>info</mat-icon>
              <span>Para agregar nuevos registros, utiliza el botón "Editar" en el panel principal.</span>
            </div>

          </div>

          <ng-template #cargandoDetalle>
            <div class="loading-wrap">
              <mat-spinner diameter="40"></mat-spinner>
              <p>Cargando información del curso...</p>
            </div>
          </ng-template>
        </div>
      </ng-template>
    </div>
  `,
  styles: [
    `
      /* === Estilos Principales del Listado === */
      .wrap { padding: 24px; max-width: 1100px; margin: 0 auto; display: grid; gap: 16px; }
      .header { display: flex; align-items: center; justify-content: space-between; gap: 16px; }
      .titles h1 { margin: 0; font-size: 24px; font-weight: 700; }
      .subtitle { margin: 2px 0 0; opacity: 0.7; }
      .actions button mat-icon { margin-right: 6px; }

      .card { padding: 0; overflow: hidden; }
      .list { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 12px; padding: 16px; }
      .item { padding: 14px; border-radius: 16px; }
      .item-head { display: grid; gap: 8px; }
      .item-title { font-weight: 700; font-size: 16px; text-align: left; }
      .link { background: transparent; border: 0; color: #1a73e8; cursor: pointer; padding: 0; text-align: left; }
      .link:hover { text-decoration: underline; }
      .item-actions { display: flex; gap: 8px; margin-top: 8px; }

      .empty { padding: 32px; text-align: center; display: grid; gap: 10px; }
      .empty .emoji { font-size: 40px; }
      .empty .msg { opacity: 0.7; }

      /* Ajuste global para el borde del Dialog de Material */
      :host ::ng-deep .mat-mdc-dialog-container .mdc-dialog__container {
        border-radius: 18px;
        overflow: hidden;
      }

      /* === ESTILOS MODERNOS DEL DIÁLOGO === */
      
      .modern-modal {
        display: flex;
        flex-direction: column;
        height: 100%;
        max-height: 85vh;
        background: #fff;
        font-family: 'Roboto', sans-serif;
        color: #374151;
      }

      /* Header Sticky */
      .modal-header {
        padding: 16px 24px;
        display: flex;
        justify-content: space-between;
        align-items: center;
        border-bottom: 1px solid #f0f0f0;
        background: rgba(255, 255, 255, 0.95);
        backdrop-filter: blur(5px);
        position: sticky;
        top: 0;
        z-index: 10;
      }

      .title {
        margin: 0;
        font-size: 20px;
        font-weight: 800;
        color: #1f2937;
        line-height: 1.2;
      }

      .subtitle-badge {
        font-size: 12px;
        background: #e0e7ff;
        color: #4338ca;
        padding: 2px 8px;
        border-radius: 12px;
        font-weight: 600;
      }

      .close-btn { color: #9ca3af; }

      /* Cuerpo del modal scrolleable */
      .modal-body {
        padding: 24px;
        overflow-y: auto;
        display: flex;
        flex-direction: column;
        gap: 24px;
      }

      /* GRID DE ESTADÍSTICAS (Stats) */
      .stats-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
        gap: 16px;
      }

      .stat-card {
        background: #f9fafb;
        border-radius: 16px;
        padding: 16px;
        display: flex;
        align-items: center;
        gap: 16px;
        border: 1px solid #f3f4f6;
        transition: transform 0.2s;
      }
      
      .stat-card:hover {
        transform: translateY(-2px);
        box-shadow: 0 4px 12px rgba(0,0,0,0.05);
      }

      .icon-bg {
        width: 48px;
        height: 48px;
        border-radius: 12px;
        display: flex;
        align-items: center;
        justify-content: center;
        color: #fff;
      }

      .stat-card.blue .icon-bg { background: linear-gradient(135deg, #3b82f6, #2563eb); }
      .stat-card.purple .icon-bg { background: linear-gradient(135deg, #8b5cf6, #7c3aed); }
      .stat-card.orange .icon-bg { background: linear-gradient(135deg, #f97316, #ea580c); }

      .stat-info { display: flex; flex-direction: column; }
      .stat-info label { font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; color: #6b7280; font-weight: 600; }
      .stat-info strong { font-size: 15px; color: #111827; }

      /* CONTENT GRID (Columnas) */
      .content-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 24px;
      }

      @media (max-width: 768px) {
        .content-grid { grid-template-columns: 1fr; }
      }

      .section-col {
        display: flex;
        flex-direction: column;
        gap: 12px;
      }

      .section-header {
        display: flex;
        align-items: center;
        gap: 10px;
        padding-bottom: 8px;
        border-bottom: 2px solid #f3f4f6;
      }

      .section-header h3 { margin: 0; font-size: 16px; font-weight: 700; color: #374151; }
      .sec-icon { color: #6b7280; display: flex; }
      .sec-icon.student { color: #059669; }

      .badge-count {
        background: #f3f4f6;
        color: #4b5563;
        padding: 2px 8px;
        border-radius: 10px;
        font-size: 12px;
        font-weight: 700;
      }

      /* CUSTOM LIST */
      .custom-list {
        display: flex;
        flex-direction: column;
        gap: 8px;
      }

      .list-item {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 10px 12px;
        background: #fff;
        border: 1px solid #e5e7eb;
        border-radius: 12px;
        transition: all 0.2s ease;
      }

      .list-item:hover {
        border-color: #d1d5db;
        background: #f9fafb;
        box-shadow: 0 2px 4px rgba(0,0,0,0.03);
      }

      .item-avatar {
        width: 40px;
        height: 40px;
        border-radius: 50%;
        background: #e0e7ff;
        color: #4f46e5;
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: 700;
        font-size: 14px;
        margin-right: 12px;
        flex-shrink: 0;
      }

      .item-avatar.book { background: #fee2e2; color: #dc2626; border-radius: 8px; }
      .item-avatar.person { background: #d1fae5; color: #059669; }

      .item-info { flex: 1; min-width: 0; }
      .main-text { font-weight: 600; font-size: 14px; color: #1f2937; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
      .sub-text { font-size: 12px; color: #6b7280; display: flex; align-items: center; gap: 4px; margin-top: 2px; }
      .tiny-icon { font-size: 14px; width: 14px; height: 14px; }

      /* EMPTY STATE */
      .empty-state {
        text-align: center;
        padding: 32px 16px;
        background: #f9fafb;
        border-radius: 12px;
        border: 1px dashed #d1d5db;
        color: #9ca3af;
      }
      .empty-state mat-icon { font-size: 32px; width: 32px; height: 32px; margin-bottom: 8px; opacity: 0.5; }
      .empty-state p { margin: 0; font-size: 13px; }

      /* FOOTER */
      .footer-hint {
        margin-top: 16px;
        background: #eff6ff;
        border-radius: 8px;
        padding: 12px;
        display: flex;
        align-items: start;
        gap: 10px;
        font-size: 13px;
        color: #1e40af;
      }
      .footer-hint mat-icon { font-size: 18px; width: 18px; height: 18px; }

      /* LOADER */
      .loading-wrap {
        height: 300px;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 16px;
        color: #6b7280;
      }
    `,
  ],
})
export class CursosComponent implements OnInit {
  // Inyecciones
  private sb = inject(MatSnackBar);
  private cursoSvc = inject(CursoService);
  private dialog = inject(MatDialog);
  private anioSvc = inject(AnioLectivoService);
  private usuarioSvc = inject(UsuarioService);
  private estuSvc = inject(EstudianteService);
  private materiaSvc = inject(MateriaService);

  // Signals
  cargando = signal<boolean>(false);
  
  aniosLectivo = signal<{ _id: string; nombre: string }[]>([]);
  profesores = signal<{ _id: string; nombre: string }[]>([]);
  estudiantes = signal<{ _id: string; nombre: string; cedula: string }[]>([]);
  materiasRaw = signal<any[]>([]);

  // Computed
  materiasConProfesor = computed<MateriaCatalogoItem[]>(() =>
    (this.materiasRaw() ?? []).map((m: any) => ({
      _id: m._id,
      nombre: m.nombre,
      profesorId: typeof m.profesor === 'object' ? m.profesor?._id : m.profesor,
      profesorNombre: typeof m.profesor === 'object' ? m.profesor?.nombre : undefined,
    }))
  );

  cursos = signal<any[]>([]);

  @ViewChild('detalleDlg') detalleDlgTpl!: TemplateRef<any>;
  detalleRef?: MatDialogRef<any>;
  cursoDetalle = signal<any | null>(null);

  // =====================
  // Helper Methods
  // =====================
  private asId(val: any): string {
    if (!val) return '';
    if (typeof val === 'string') return val;
    if (typeof val === 'object' && val._id) return String(val._id);
    return '';
  }

  private mapIdArray(arr: any[]): string[] {
    return Array.isArray(arr) ? arr.map((x) => this.asId(x)).filter(Boolean) : [];
  }

  ngOnInit() {
    this.cargarCatalogos();
    this.refrescar();
  }

  // =====================
  // Carga de Datos
  // =====================
  private cargarCatalogos() {
    this.anioSvc.getAll().subscribe({
      next: (res: any) => this.aniosLectivo.set(res?.data ?? res ?? []),
      error: () =>
        this.sb.open('Error al cargar años lectivos', 'Cerrar', { duration: 3000 }),
    });

    (this.usuarioSvc as any).getProfesores?.().subscribe?.({
      next: (res: any) => {
        const list = res?.data ?? res ?? [];
        const mapped = list.map((p: any) => ({
          _id: p._id ?? p.uid ?? p.id,
          nombre: p.nombre ?? p.fullname ?? p.email ?? 'Profesor',
        }));
        this.profesores.set(mapped);
      },
      error: () =>
        this.sb.open('Error al cargar profesores', 'Cerrar', { duration: 3000 }),
    });

    this.estuSvc.getAll().subscribe({
      next: (res: any) =>
        this.estudiantes.set(
          (res?.data ?? res ?? []).map((e: any) => ({
            _id: e._id ?? e.uid ?? e.id,
            nombre: e.nombre ?? e.fullname ?? e.email,
            cedula: e.cedula ?? e.ci ?? '',
          }))
        ),
      error: () =>
        this.sb.open('Error al cargar estudiantes', 'Cerrar', { duration: 3000 }),
    });

    this.materiaSvc.getAll().subscribe({
      next: (res: any) => this.materiasRaw.set(res?.materias ?? res ?? []),
      error: () => this.sb.open('Error al cargar materias', 'Cerrar', { duration: 3000 }),
    });
  }

  refrescar() {
    this.cargando.set(true);
    this.cursoSvc.listar().subscribe({
      next: (res: any) => {
        this.cursos.set(res?.data ?? res ?? []);
        this.cargando.set(false);
      },
      error: () => {
        this.cargando.set(false);
        this.sb.open('No se pudieron cargar los cursos', 'Cerrar', { duration: 3000 });
      },
    });
  }

  // =====================
  // Acciones (CRUD)
  // =====================

  abrirCrear() {
    this.abrirDialogo(null);
  }

  abrirEditar(curso: any) {
    const flat: Curso = {
      _id: this.asId(curso?._id) || '',
      nombre: curso?.nombre ?? '',
      nivel: curso?.nivel ?? '',
      anioLectivo: this.asId(curso?.anioLectivo),
      profesorTutor: this.asId(curso?.profesorTutor),
      estudiantes: this.mapIdArray(curso?.estudiantes ?? []),
      materias: Array.isArray(curso?.materias)
        ? curso.materias
            .map((m: any) => ({
              materia: this.asId(m?.materia),
              profesor: this.asId(m?.profesor),
            }))
            .filter((row: { materia: any }) => !!row.materia)
        : [],
    };

    if (!flat._id) {
      Swal.fire('Error', 'El curso seleccionado no tiene un ID válido', 'error');
      return;
    }

    this.abrirDialogo(flat);
  }

  private abrirDialogo(cursoExistente: Curso | null) {
    const ref = this.dialog.open(CursoFormularioComponent, {
      width: '900px',
      maxWidth: '95vw',
      panelClass: 'soft-dialog',
      disableClose: true,
      autoFocus: false,
      data: null,
    });

    // Inyectar datos al componente hijo
    ref.componentInstance.aniosLectivo = this.aniosLectivo as any;
    ref.componentInstance.profesoresCatalogo = this.profesores as any;
    ref.componentInstance.estudiantesCatalogo = this.estudiantes as any;
    ref.componentInstance.materiasCatalogo = this.materiasConProfesor as any;
    ref.componentInstance.cursoExistente = cursoExistente;

    // Manejar el submit
    ref.componentInstance.submitCurso.subscribe((payload: CursoPayload) => {
      const isEdit = !!cursoExistente?._id;

      const data: CursoPayload = {
        nombre: payload.nombre,
        nivel: payload.nivel,
        anioLectivo: payload.anioLectivo,
        profesorTutor: payload.profesorTutor,
        estudiantes: payload.estudiantes,
        materias: payload.materias,
      };

      const req$ = isEdit
        ? this.cursoSvc.actualizar(cursoExistente!._id!, data as any)
        : this.cursoSvc.crear(data as any);

      this.cargando.set(true);
      req$.subscribe({
        next: () => {
          Swal.fire({
            title: isEdit ? 'Curso actualizado' : 'Curso creado',
            icon: 'success',
            timer: 2000,
            showConfirmButton: false
          });
          ref.close(true);
          this.refrescar();
        },
        error: (e) => {
          this.cargando.set(false);
          console.error('[Cursos] Error backend:', e);
          const msg = e?.error?.message || e?.error?.msg || 'Error al guardar';
          Swal.fire('Error', msg, 'error');
        },
      });
    });

    ref.afterClosed().subscribe();
  }

  eliminar(curso: any) {
    Swal.fire({
      title: '¿Eliminar curso?',
      text: `Se eliminará permanentemente el curso "${curso.nombre}".`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar'
    }).then((result) => {
      if (result.isConfirmed) {
        this.cargando.set(true);
        this.cursoSvc.eliminar(curso._id).subscribe({
          next: () => {
            Swal.fire('Eliminado', 'El curso ha sido eliminado.', 'success');
            this.refrescar();
          },
          error: (e) => {
            this.cargando.set(false);
            Swal.fire('Error', e?.error?.message ?? 'No se pudo eliminar', 'error');
          },
        });
      }
    });
  }

  // =====================
  // Ver Detalles
  // =====================

  verDetalles(curso: any) {
    this.cursoDetalle.set(null);
    this.detalleRef = this.dialog.open(this.detalleDlgTpl, {
      width: '820px',
      maxWidth: '95vw',
      panelClass: 'soft-dialog', // Clase opcional, puedes quitarla si no tienes CSS global
      autoFocus: false,
    });

    this.cursoSvc.obtener(curso._id).subscribe({
      next: (res: any) => this.cursoDetalle.set(res?.data ?? res),
      error: (e) => {
        console.error('[Cursos] Error al obtener detalle:', e);
        this.sb.open(e?.error?.message ?? 'No se pudo cargar el detalle', 'Cerrar', {
          duration: 3500,
        });
        this.detalleRef?.close();
      },
    });
  }

  cerrarDialogo(): void {
    this.detalleRef?.close();
  }

  // ==========================
  // Acciones en Detalle
  // ==========================

  quitarEstudiante(est: any) {
    const curso = this.cursoDetalle();
    if (!curso?._id) return;

    const nombreEst = est?.nombre ?? est;

    Swal.fire({
      title: '¿Quitar estudiante?',
      text: `¿Desea quitar a "${nombreEst}" de este curso?`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Sí, quitar',
      cancelButtonText: 'Cancelar'
    }).then((result) => {
      if (result.isConfirmed) {
        const cursoId = this.asId(curso._id);
        const payload: Curso = {
          _id: cursoId,
          nombre: curso.nombre,
          nivel: curso.nivel,
          anioLectivo: this.asId(curso.anioLectivo),
          profesorTutor: this.asId(curso.profesorTutor),
          estudiantes: (curso.estudiantes ?? [])
            .map((x: any) => this.asId(x))
            .filter((id: string) => id && id !== this.asId(est)),
          materias: (curso.materias ?? []).map((m: any) => ({
            materia: this.asId(m.materia),
            profesor: this.asId(m.profesor),
          })),
        };

        this.cursoSvc.actualizar(cursoId, payload).subscribe({
          next: () => {
            const nuevosEsts = (curso.estudiantes ?? []).filter(
              (x: any) => this.asId(x) !== this.asId(est)
            );
            this.cursoDetalle.set({ ...curso, estudiantes: nuevosEsts });
            
            Swal.fire({
              toast: true,
              position: 'top-end',
              icon: 'success',
              title: 'Estudiante retirado',
              showConfirmButton: false,
              timer: 2000
            });
            this.refrescar(); // Actualizar lista principal
          },
          error: (e) => {
            console.error('[Cursos] Error al quitar estudiante:', e);
            Swal.fire('Error', e?.error?.message ?? 'No se pudo quitar el estudiante', 'error');
          },
        });
      }
    });
  }

  quitarMateria(materiaRow: any) {
    const curso = this.cursoDetalle();
    if (!curso?._id) return;

    const nombreMat = materiaRow?.materia?.nombre ?? materiaRow?.materia ?? 'esta materia';

    Swal.fire({
      title: '¿Quitar materia?',
      text: `¿Desea quitar la materia "${nombreMat}" de este curso?`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Sí, quitar',
      cancelButtonText: 'Cancelar'
    }).then((result) => {
      if (result.isConfirmed) {
        const cursoId = this.asId(curso._id);
        const materiaIdAEliminar = this.asId(materiaRow.materia);

        const payload: Curso = {
          _id: cursoId,
          nombre: curso.nombre,
          nivel: curso.nivel,
          anioLectivo: this.asId(curso.anioLectivo),
          profesorTutor: this.asId(curso.profesorTutor),
          estudiantes: (curso.estudiantes ?? [])
            .map((x: any) => this.asId(x)),
          materias: (curso.materias ?? [])
            .map((m: any) => ({
              materia: this.asId(m.materia),
              profesor: this.asId(m.profesor),
            }))
            .filter((m: any) => m.materia !== materiaIdAEliminar),
        };

        this.cursoSvc.actualizar(cursoId, payload).subscribe({
          next: () => {
            const nuevasMats = (curso.materias ?? []).filter(
              (m: any) => this.asId(m.materia) !== materiaIdAEliminar
            );
            this.cursoDetalle.set({ ...curso, materias: nuevasMats });
            
            Swal.fire({
              toast: true,
              position: 'top-end',
              icon: 'success',
              title: 'Materia retirada',
              showConfirmButton: false,
              timer: 2000
            });
            this.refrescar();
          },
          error: (e) => {
            console.error('[Cursos] Error al quitar materia:', e);
            Swal.fire('Error', e?.error?.message ?? 'No se pudo quitar la materia', 'error');
          },
        });
      }
    });
  }
}