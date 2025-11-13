import {
  Component,
  EventEmitter,
  Input,
  OnInit,
  Output,
  Signal,
  ViewChild,
  ElementRef,
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  ReactiveFormsModule,
  FormBuilder,
  Validators,
  FormArray,
  FormGroup,
  FormControl,
} from '@angular/forms';

import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDividerModule } from '@angular/material/divider';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatChipsModule } from '@angular/material/chips';

type MateriaFormGroup = FormGroup<{
  materia: FormControl<string>;
}>;

export interface CursoPayload {
  nombre: string;
  nivel: string;
  anioLectivo: string;
  profesorTutor: string;
  estudiantes: string[];
  materias: { materia: string; profesor: string }[];
}

export interface MateriaCatalogoItem {
  _id: string;
  nombre: string;
  profesorId?: string;
  profesorNombre?: string;
}

interface EstudianteItem {
  _id: string;
  nombre: string;
  cedula: string;
}

@Component({
  standalone: true,
  selector: 'app-curso-formulario',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatSelectModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatSnackBarModule,
    MatDividerModule,
    MatAutocompleteModule,
    MatChipsModule,
  ],
  template: `
    <div class="shell">
      <div class="card">
        <!-- Encabezado -->
        <div class="card-header">
          <div class="header-left">
            <div class="header-icon">
              <mat-icon>library_add</mat-icon>
            </div>
            <div>
              <div class="title">
                {{ cursoExistente ? 'Editar curso' : 'Crear curso' }}
              </div>
              <div class="subtitle">
                Define la información general, estudiantes y materias del curso.
              </div>
            </div>
          </div>

          <button mat-icon-button class="icon-ghost" (click)="cerrar()" aria-label="Cerrar">
            <mat-icon>close</mat-icon>
          </button>
        </div>

        <mat-divider class="divider"></mat-divider>

        <!-- Contenido scrollable -->
        <div class="card-body">
          <form [formGroup]="form" (ngSubmit)="emitir()" class="form-layout">
            <!-- Sección: Información general -->
            <section class="section">
              <div class="section-head">
                <div>
                  <div class="section-title">
                    <mat-icon>info</mat-icon>
                    <span>Información general</span>
                  </div>
                  <p class="section-subtitle">
                    Datos básicos del curso necesarios para su identificación.
                  </p>
                </div>
              </div>

              <div class="grid grid-2">
                <mat-form-field appearance="outline" class="full-width">
                  <mat-label>Nombre del curso</mat-label>
                  <input matInput formControlName="nombre" placeholder="Ej. Noveno A" />
                </mat-form-field>

                <mat-form-field appearance="outline" class="full-width">
                  <mat-label>Año lectivo</mat-label>
                  <mat-select formControlName="anioLectivo">
                    <mat-option *ngFor="let a of aniosLectivo()" [value]="a._id">
                      {{ a.nombre }}
                    </mat-option>
                  </mat-select>
                </mat-form-field>
              </div>

              <div class="grid grid-2">
                <mat-form-field appearance="outline" class="full-width">
                  <mat-label>Profesor tutor</mat-label>
                  <mat-select formControlName="profesorTutor">
                    <mat-option *ngFor="let p of profesoresCatalogo()" [value]="p._id">
                      {{ p.nombre }}
                    </mat-option>
                  </mat-select>
                </mat-form-field>

                <mat-form-field appearance="outline" class="full-width">
                  <mat-label>Nivel</mat-label>
                  <mat-select formControlName="nivel">
                    <mat-option value="EGB">EGB</mat-option>
                    <mat-option value="BACHILLERATO">BACHILLERATO</mat-option>
                  </mat-select>
                </mat-form-field>
              </div>
            </section>

            <mat-divider class="divider-spaced"></mat-divider>

            <!-- Sección: Estudiantes (buscador + chips) -->
            <section class="section">
              <div class="section-head">
                <div>
                  <div class="section-title">
                    <mat-icon>group</mat-icon>
                    <span>Estudiantes</span>
                  </div>
                  <p class="section-subtitle">
                    Busca por nombre o cédula y agrega estudiantes al curso.
                  </p>
                </div>
              </div>

              <mat-form-field appearance="outline" class="full-width dense">
                <mat-label>Buscar estudiante</mat-label>
                <input
                  #buscarEstudianteInput
                  matInput
                  placeholder="Escribe nombre o cédula..."
                  [formControl]="buscarEstudianteCtrl"
                  [matAutocomplete]="autoEstudiante"
                />
                <mat-autocomplete
                  #autoEstudiante="matAutocomplete"
                  (optionSelected)="onSeleccionEstudiante($event.option.value)"
                  [displayWith]="displayEstudiante"
                >
                  <mat-option *ngFor="let e of opcionesFiltradas" [value]="e">
                    <span class="res-nombre">{{ e.nombre }}</span>
                    <span class="res-cedula">{{ e.cedula }}</span>
                  </mat-option>
                </mat-autocomplete>
                <mat-hint>Escribe al menos 2 caracteres y selecciona un estudiante.</mat-hint>
              </mat-form-field>

              <div *ngIf="seleccionados.length; else sinSeleccionados" class="chips-wrapper">
                <div class="chips-label">Seleccionados</div>
                <mat-chip-listbox class="chips-list" aria-label="Estudiantes seleccionados">
                  <mat-chip
                    *ngFor="let e of seleccionados"
                    [removable]="true"
                    (removed)="quitarEstudiante(e._id)"
                  >
                    {{ e.nombre }} · {{ e.cedula }}
                    <button matChipRemove aria-label="Quitar estudiante">
                      <mat-icon>close</mat-icon>
                    </button>
                  </mat-chip>
                </mat-chip-listbox>
              </div>

              <ng-template #sinSeleccionados>
                <div class="chips-empty">
                  <mat-icon>info</mat-icon>
                  <span>No hay estudiantes seleccionados aún.</span>
                </div>
              </ng-template>
            </section>

            <mat-divider class="divider-spaced"></mat-divider>

            <!-- Sección: Materias (buscador + lista) -->
            <section class="section">
              <div class="section-head">
                <div>
                  <div class="section-title">
                    <mat-icon>menu_book</mat-icon>
                    <span>Materias del curso</span>
                  </div>
                  <p class="section-subtitle">
                    Busca y agrega materias al curso. El profesor responsable se toma del catálogo.
                  </p>
                </div>
              </div>

              <!-- Buscador de materias -->
              <mat-form-field appearance="outline" class="full-width dense">
                <mat-label>Agregar materia</mat-label>
                <input
                  matInput
                  placeholder="Escribe para buscar materia..."
                  [formControl]="buscarMateriaCtrl"
                  [matAutocomplete]="autoMateria"
                />
                <mat-autocomplete
                  #autoMateria="matAutocomplete"
                  (optionSelected)="onSeleccionMateria($event.option.value)"
                >
                  <mat-option *ngFor="let m of opcionesMateriasFiltradas" [value]="m">
                    {{ m.nombre }}
                    <span class="res-cedula" *ngIf="m.profesorNombre">
                      · {{ m.profesorNombre }}
                    </span>
                  </mat-option>
                </mat-autocomplete>
                <mat-hint>Escribe al menos 2 letras y selecciona una materia.</mat-hint>
              </mat-form-field>

              <!-- Lista de materias agregadas -->
              <div
                formArrayName="materias"
                class="materias-list"
                *ngIf="materiasFA().length; else sinMaterias"
              >
                <div
                  class="materia-row"
                  *ngFor="let fg of materiasFA().controls; let i = index"
                  [formGroupName]="i"
                >
                  <div class="materia-main">
                    <div class="materia-title">
                      {{ materiaNombreDeFila(i) }}
                    </div>
                  </div>

                  <div class="materia-meta">
                    <div
                      class="prof-pill"
                      [class.prof-pill-ok]="profesorDeFila(i)"
                      [class.prof-pill-warn]="!profesorDeFila(i)"
                    >
                      <mat-icon class="pill-icon">
                        {{ profesorDeFila(i) ? 'person' : 'priority_high' }}
                      </mat-icon>
                      <span *ngIf="profesorDeFila(i) as prof; else noProf">
                        {{ prof }}
                      </span>
                      <ng-template #noProf>
                        <span>Sin profesor asignado</span>
                      </ng-template>
                    </div>
                  </div>

                  <button
                    mat-icon-button
                    color="warn"
                    type="button"
                    (click)="removeAt(i)"
                    class="icon-ghost"
                    aria-label="Eliminar materia"
                  >
                    <mat-icon>delete</mat-icon>
                  </button>
                </div>
              </div>

              <ng-template #sinMaterias>
                <div class="empty-hint">
                  <mat-icon>info</mat-icon>
                  <span>No hay materias agregadas aún. Usa el buscador de arriba.</span>
                </div>
              </ng-template>
            </section>

            <!-- Acciones del formulario -->
            <div class="footer-actions">
              <button
                mat-stroked-button
                type="button"
                class="btn-cancel"
                (click)="cerrar()"
              >
                Cancelar
              </button>

              <button
                mat-flat-button
                color="primary"
                type="submit"
                class="btn-primary"
              >
                <mat-icon>save</mat-icon>
                {{ cursoExistente ? 'Guardar cambios' : 'Crear curso' }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  `,
  styles: [
    `
      /* ===== CONTENEDOR GENERAL ===== */
      .shell {
        background: #f3f4f6;
        padding: 16px;
      }

      .card {
        max-width: 960px;
        margin: 0 auto;
        background: #ffffff;
        border-radius: 18px;
        box-shadow: 0 12px 30px rgba(15, 23, 42, 0.08);
        display: flex;
        flex-direction: column;
        overflow: hidden;
      }

      /* ===== ENCABEZADO ===== */
      .card-header {
        padding: 16px 20px;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
      }

      .header-left {
        display: flex;
        align-items: center;
        gap: 12px;
      }

      .header-icon {
        width: 42px;
        height: 42px;
        border-radius: 12px;
        background: linear-gradient(135deg, #2563eb, #4f46e5);
        display: grid;
        place-items: center;
        color: #ffffff;
      }

      .title {
        font-size: 20px;
        font-weight: 700;
        color: #111827;
      }

      .subtitle {
        font-size: 13px;
        color: #6b7280;
        margin-top: 2px;
      }

      .icon-ghost {
        border-radius: 999px;
      }
      .icon-ghost:hover {
        background: rgba(148, 163, 184, 0.16);
      }

      .divider {
        border-color: #e5e7eb !important;
      }
      .divider-spaced {
        margin: 4px 0 12px;
        border-color: #e5e7eb !important;
      }

      /* ===== BODY / FORM ===== */
      .card-body {
        padding: 12px 20px 18px;
        max-height: 75vh;
        overflow-y: auto;
      }

      .card-body::-webkit-scrollbar {
        width: 8px;
      }
      .card-body::-webkit-scrollbar-track {
        background: #f9fafb;
      }
      .card-body::-webkit-scrollbar-thumb {
        background: #cbd5e1;
        border-radius: 999px;
      }

      .form-layout {
        display: flex;
        flex-direction: column;
        gap: 18px;
      }

      .section {
        display: flex;
        flex-direction: column;
        gap: 12px;
      }

      .section-head {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: 12px;
      }

      .section-title {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        font-weight: 600;
        color: #111827;
        font-size: 15px;
      }

      .section-title mat-icon {
        font-size: 18px;
        width: 18px;
        height: 18px;
        color: #2563eb;
      }

      .section-subtitle {
        margin: 2px 0 0;
        font-size: 13px;
        color: #6b7280;
      }

      .grid {
        display: grid;
        gap: 12px;
      }

      .grid-2 {
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }

      .full-width {
        width: 100%;
      }

      mat-form-field {
        font-size: 14px;
      }

      .dense .mat-mdc-text-field-wrapper,
      .dense .mat-mdc-select-trigger {
        min-height: 40px;
      }

      /* ===== AUTOCOMPLETE ESTUDIANTES ===== */
      .res-nombre {
        font-weight: 500;
        margin-right: 6px;
      }

      .res-cedula {
        font-size: 12px;
        color: #6b7280;
      }

      .chips-wrapper {
        display: flex;
        flex-direction: column;
        gap: 8px;
      }

      .chips-label {
        font-size: 13px;
        font-weight: 500;
        color: #4b5563;
      }

      .chips-list {
        max-height: 120px;
        overflow-y: auto;
      }

      .chips-list::-webkit-scrollbar {
        height: 6px;
        width: 6px;
      }

      .chips-empty {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        font-size: 13px;
        color: #6b7280;
        padding: 6px 10px;
        border-radius: 10px;
        background: #f9fafb;
        border: 1px dashed #e5e7eb;
      }

      .chips-empty mat-icon {
        font-size: 18px;
        width: 18px;
        height: 18px;
        color: #2563eb;
      }

      /* ===== MATERIAS ===== */
      .materias-list {
        display: flex;
        flex-direction: column;
        gap: 10px;
      }

      .materia-row {
        display: grid;
        grid-template-columns: minmax(0, 3fr) minmax(0, 2fr) auto;
        gap: 10px;
        align-items: center;
        padding: 10px 12px;
        border-radius: 12px;
        background: #f9fafb;
        border: 1px solid #e5e7eb;
      }

      .materia-main {
        display: flex;
        flex: 1;
      }

      .materia-title {
        font-weight: 500;
        color: #111827;
      }

      .materia-meta {
        display: flex;
        justify-content: flex-start;
      }

      .prof-pill {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        padding: 4px 10px;
        border-radius: 999px;
        font-size: 12px;
        border: 1px solid #e5e7eb;
        background: #f3f4f6;
        color: #374151;
      }

      .prof-pill-ok {
        background: #ecfdf3;
        border-color: #bbf7d0;
        color: #166534;
      }

      .prof-pill-warn {
        background: #fef2f2;
        border-color: #fecaca;
        color: #b91c1c;
      }

      .pill-icon {
        font-size: 16px;
        width: 16px;
        height: 16px;
      }

      .empty-hint {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        font-size: 13px;
        color: #6b7280;
        padding: 8px 10px;
        border-radius: 10px;
        background: #f9fafb;
        border: 1px dashed #e5e7eb;
      }

      .empty-hint mat-icon {
        font-size: 18px;
        width: 18px;
        height: 18px;
        color: #2563eb;
      }

      /* ===== BOTONES ===== */
      .btn-cancel {
        border-radius: 999px;
        border-color: #cbd5e1 !important;
        background: #ffffff;
        padding: 0 16px;
        font-size: 14px;
      }

      .btn-primary {
        border-radius: 999px;
        padding: 0 18px;
        font-weight: 600;
        font-size: 14px;
        box-shadow: 0 10px 25px rgba(37, 99, 235, 0.25);
      }

      .btn-primary mat-icon {
        margin-right: 6px;
      }

      .footer-actions {
        margin-top: 4px;
        padding-top: 8px;
        display: flex;
        justify-content: flex-end;
        gap: 10px;
      }

      /* ===== RESPONSIVE ===== */
      @media (max-width: 900px) {
        .card {
          border-radius: 0;
          max-width: 100%;
        }
        .card-body {
          padding: 10px 12px 14px;
        }
        .grid-2 {
          grid-template-columns: 1fr;
        }
        .materia-row {
          grid-template-columns: 1fr;
        }
        .section-head {
          flex-direction: column;
          align-items: flex-start;
        }
      }
    `,
  ],
})
export class CursoFormularioComponent implements OnInit {
  private fb = inject(FormBuilder);
  private sb = inject(MatSnackBar);
  private dialogRef = inject(MatDialogRef<CursoFormularioComponent>, { optional: true });

  @Input({ required: true }) materiasCatalogo!: Signal<MateriaCatalogoItem[]>;
  @Input({ required: true }) profesoresCatalogo!: Signal<{ _id: string; nombre: string }[]>;
  @Input({ required: true }) aniosLectivo!: Signal<{ _id: string; nombre: string }[]>;
  @Input({ required: true })
  estudiantesCatalogo!: Signal<EstudianteItem[]>;
  @Input() cursoExistente: Partial<CursoPayload> | null = null;

  @Output() submitCurso = new EventEmitter<CursoPayload>();

  @ViewChild('buscarEstudianteInput') buscarEstudianteInput!: ElementRef<HTMLInputElement>;

  // --- Estudiantes (buscador + chips) ---
  buscarEstudianteCtrl = new FormControl<string>('', { nonNullable: true });
  opcionesFiltradas: EstudianteItem[] = [];
  seleccionados: EstudianteItem[] = [];

  // --- Materias (buscador + lista) ---
  buscarMateriaCtrl = new FormControl<string>('', { nonNullable: true });
  opcionesMateriasFiltradas: MateriaCatalogoItem[] = [];

  private newMateriaFG(materia = ''): MateriaFormGroup {
    return this.fb.group({
      materia: this.fb.control<string>(materia, {
        nonNullable: true,
        validators: [Validators.required],
      }),
    });
  }

  form = this.fb.group({
    nombre: this.fb.control<string>('', {
      nonNullable: true,
      validators: [Validators.required],
    }),
    nivel: this.fb.control<string>('', {
      nonNullable: true,
      validators: [Validators.required],
    }),
    anioLectivo: this.fb.control<string>('', {
      nonNullable: true,
      validators: [Validators.required],
    }),
    profesorTutor: this.fb.control<string>('', {
      nonNullable: true,
      validators: [Validators.required],
    }),
    estudiantes: this.fb.control<string[]>([], { nonNullable: true }),
    materias: this.fb.array<MateriaFormGroup>([]),
  });

  materiasFA(): FormArray<MateriaFormGroup> {
    return this.form.controls.materias;
  }

  ngOnInit() {
    // Inicializar form con curso existente
    if (this.cursoExistente) {
      this.form.patchValue({
        nombre: this.cursoExistente.nombre ?? '',
        nivel: this.cursoExistente.nivel ?? '',
        anioLectivo: this.cursoExistente.anioLectivo ?? '',
        profesorTutor: this.cursoExistente.profesorTutor ?? '',
        estudiantes: this.cursoExistente.estudiantes ?? [],
      });

      const fa = this.materiasFA();
      fa.clear();
      for (const m of this.cursoExistente.materias ?? []) {
        fa.push(this.newMateriaFG(m.materia));
      }
    } else {
      this.agregarMateriaInicial();
    }

    // Reconstruir seleccionados (estudiantes) desde IDs
    this.initSeleccionadosDesdeForm();

    // Filtro de estudiantes
    this.buscarEstudianteCtrl.valueChanges.subscribe((term) =>
      this.actualizarFiltroEstudiantes(term || '')
    );

    // Filtro de materias
    this.buscarMateriaCtrl.valueChanges.subscribe((term) =>
      this.actualizarFiltroMaterias(term || '')
    );
  }

  // ---------- ESTUDIANTES ----------

  private initSeleccionadosDesdeForm() {
    const ids = this.form.controls.estudiantes.value ?? [];
    if (!ids.length) return;

    const catalogo = this.estudiantesCatalogo();
    this.seleccionados = ids
      .map((id) => catalogo.find((e) => e._id === id))
      .filter((e): e is EstudianteItem => !!e);
  }

  private actualizarFiltroEstudiantes(termino: string) {
    const t = termino.trim().toLowerCase();
    if (t.length < 2) {
      this.opcionesFiltradas = [];
      return;
    }

    const base = this.estudiantesCatalogo();
    const seleccionadosIds = new Set(this.seleccionados.map((s) => s._id));

    this.opcionesFiltradas = base
      .filter((e) => {
        if (seleccionadosIds.has(e._id)) return false;
        const nombre = (e.nombre ?? '').toLowerCase();
        const cedula = (e.cedula ?? '').toLowerCase();
        return nombre.includes(t) || cedula.includes(t);
      })
      .slice(0, 20);
  }

  displayEstudiante = (e?: EstudianteItem | null): string =>
    e ? `${e.nombre} · ${e.cedula}` : '';

  onSeleccionEstudiante(e: EstudianteItem) {
    if (!e?._id) return;

    const ya = this.seleccionados.some((s) => s._id === e._id);
    if (!ya) {
      this.seleccionados.push(e);
      this.syncEstudiantesControl();
    }

    this.buscarEstudianteCtrl.setValue('');
    this.opcionesFiltradas = [];

    queueMicrotask(() => {
      this.buscarEstudianteInput?.nativeElement?.focus();
    });
  }

  quitarEstudiante(id: string) {
    this.seleccionados = this.seleccionados.filter((e) => e._id !== id);
    this.syncEstudiantesControl();
  }

  private syncEstudiantesControl() {
    this.form.controls.estudiantes.setValue(this.seleccionados.map((s) => s._id));
  }

  // ---------- MATERIAS ----------

  private agregarMateriaInicial() {
    // no agregamos fila vacía; el usuario añade con el buscador
  }

  private actualizarFiltroMaterias(termino: string) {
    const t = termino.trim().toLowerCase();
    if (t.length < 2) {
      this.opcionesMateriasFiltradas = [];
      return;
    }

    const base = this.materiasCatalogo();
    const usadas = new Set(
      this.materiasFA().controls.map((fg) => fg.controls.materia.value)
    );

    this.opcionesMateriasFiltradas = base
      .filter((m) => {
        if (usadas.has(m._id)) return false;
        const nombre = (m.nombre ?? '').toLowerCase();
        return nombre.includes(t);
      })
      .slice(0, 20);
  }

  onSeleccionMateria(m: MateriaCatalogoItem) {
    if (!m?._id) return;

    const ya = this.materiasFA().controls.some(
      (fg) => fg.controls.materia.value === m._id
    );
    if (!ya) {
      this.materiasFA().push(this.newMateriaFG(m._id));
    }

    this.buscarMateriaCtrl.setValue('');
    this.opcionesMateriasFiltradas = [];
  }

  materiaNombreDeFila(index: number): string {
    const materiaId = (this.materiasFA().at(index)?.get('materia')?.value ?? '').trim();
    if (!materiaId) return 'Materia';
    const item = this.materiasCatalogo().find((m) => m._id === materiaId);
    return item?.nombre ?? 'Materia';
  }

  // ---------- COMÚN (MATERIAS) ----------

  removeAt(i: number) {
    this.materiasFA().removeAt(i);
  }

  profesorDeFila(index: number): string | null {
    const materiaId = (this.materiasFA().at(index)?.get('materia')?.value ?? '').trim();
    if (!materiaId) return null;
    const item = this.materiasCatalogo().find((m) => m._id === materiaId);
    return item?.profesorNombre ?? null;
  }

  onMateriaChange(_index: number) {
    /* ya no se usa, pero lo dejamos por si luego agregas más lógica */
  }

  private buildMateriasPayload(): { materia: string; profesor: string }[] {
    const catalogo = this.materiasCatalogo();
    const rows: { materia: string; profesor: string }[] = [];

    for (const fg of this.materiasFA().controls) {
      const materiaId = (fg.controls.materia.value ?? '').trim();
      if (!materiaId) continue;
      const found = catalogo.find((m) => m._id === materiaId);
      rows.push({ materia: materiaId, profesor: found?.profesorId || '' });
    }
    return rows;
  }

  private hasDuplicadasPorMateria(rows: { materia: string; profesor: string }[]): boolean {
    const set = new Set<string>();
    for (const r of rows) {
      if (set.has(r.materia)) return true;
      set.add(r.materia);
    }
    return false;
  }

  // ---------- GENERAL ----------

  cerrar() {
    this.dialogRef?.close(false);
  }

  emitir() {
    this.form.markAllAsTouched();

    const nombre = (this.form.controls.nombre.value ?? '').trim();
    const nivel = (this.form.controls.nivel.value ?? '').trim();
    const anioLectivo = (this.form.controls.anioLectivo.value ?? '').trim();
    const profesorTutor = (this.form.controls.profesorTutor.value ?? '').trim();
    const estudiantes = (this.form.controls.estudiantes.value ?? [])
      .map((s) => (s ?? '').trim())
      .filter(Boolean);

    if (!nombre || !nivel || !anioLectivo || !profesorTutor) {
      this.sb.open('Completa nombre, nivel, año lectivo y profesor tutor.', 'Cerrar', {
        duration: 3000,
      });
      return;
    }

    const materias = this.buildMateriasPayload();
    if (materias.length === 0) {
      this.sb.open('Agrega al menos una materia.', 'Cerrar', { duration: 3000 });
      return;
    }
    if (materias.some((m) => !m.profesor)) {
      this.sb.open(
        'Alguna materia no tiene profesor asignado. Corrige la materia en “Gestión de Materias”.',
        'Cerrar',
        { duration: 4000 }
      );
      return;
    }
    if (this.hasDuplicadasPorMateria(materias)) {
      this.sb.open('No repitas la misma materia más de una vez en el curso.', 'Cerrar', {
        duration: 3000,
      });
      return;
    }

    const payload: CursoPayload = {
      nombre,
      nivel,
      anioLectivo,
      profesorTutor,
      estudiantes,
      materias,
    };

    this.submitCurso.emit(payload);
  }
}
