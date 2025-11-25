import { Component, inject, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
// Eliminamos MatSnackBarModule ya que usaremos SweetAlert2
import { Router, RouterLink, ActivatedRoute } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { finalize } from 'rxjs/operators';
import Swal from 'sweetalert2'; // Importamos SweetAlert2

import { AuthService } from '../../../services/auth.service';

function deferChange(fn: () => void) {
  if (typeof queueMicrotask === 'function') queueMicrotask(fn);
  else setTimeout(fn, 0);
}

@Component({
  selector: 'app-login',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    FormsModule,
    MatCardModule,
    MatInputModule,
    MatFormFieldModule,
    MatButtonModule,
    MatIconModule,
    RouterLink,
    MatProgressSpinnerModule
    // MatSnackBarModule eliminado de imports
  ],
  templateUrl: './login.html',
  styleUrls: ['./login.scss']
})
export class LoginComponent {
  credenciales = { correo: '', clave: '' };
  isLoading = false;
  esClaveVisible = false;

  private authService = inject(AuthService);
  // private snackBar = inject(MatSnackBar); // Ya no se necesita
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private cdr = inject(ChangeDetectorRef);

  toggleClaveVisibilidad() {
    this.esClaveVisible = !this.esClaveVisible;
    this.cdr.markForCheck();
  }

  iniciarSesion() {
    if (this.isLoading) return;

    const correo = (this.credenciales.correo || '').trim();
    const clave = this.credenciales.clave || '';

    // Validación de campos vacíos
    if (!correo || !clave) {
      Swal.fire({
        icon: 'warning',
        title: 'Campos incompletos',
        text: 'Por favor, ingresa tu correo y contraseña.',
        confirmButtonColor: '#3085d6',
        confirmButtonText: 'Entendido'
      });
      return;
    }

    this.isLoading = true;
    this.cdr.markForCheck();

    this.authService.login({ correo, clave })
      .pipe(finalize(() => {
        deferChange(() => {
          this.isLoading = false;
          this.cdr.markForCheck();
        });
      }))
      .subscribe({
        next: () => {
          deferChange(() => {
            const rawReturn = this.route.snapshot.queryParamMap.get('returnUrl') ?? '';
            const role = (this.authService.getrole() ?? '').toLowerCase();

            const adminOnly = ['/app/usuarios', '/app/cursos', '/app/materias', '/app/estudiantes', '/app/calificaciones'];
            const isAdminOnlyReturn = adminOnly.some(p => rawReturn.startsWith(p));

            if (role === 'profesor') {
              const destino = isAdminOnlyReturn ? '/app/mis-cursos' : (rawReturn || '/app/mis-cursos');
              this.router.navigateByUrl(destino);
            } else if (role === 'admin') {
              this.router.navigateByUrl(rawReturn || '/app/dashboard-admin');
            } else {
              this.router.navigateByUrl('/app');
            }

            // Alerta de Éxito (Tipo Toast para no bloquear visualmente)
            const Toast = Swal.mixin({
              toast: true,
              position: 'top-end',
              showConfirmButton: false,
              timer: 3000,
              timerProgressBar: true,
              didOpen: (toast) => {
                toast.onmouseenter = Swal.stopTimer;
                toast.onmouseleave = Swal.resumeTimer;
              }
            });

            Toast.fire({
              icon: 'success',
              title: '¡Bienvenido! Sesión iniciada.'
            });

            this.cdr.markForCheck();
          });
        },
        error: (err: HttpErrorResponse) => {
          deferChange(() => {
            let mensajeError = 'Error de conexión con el servidor. Intente más tarde.';
            
            if (err.status === 0) {
              mensajeError = 'No se pudo contactar al servidor. Verifique que el backend esté activo.';
            } else if (err.status === 401 || err.status === 400) {
              mensajeError = err.error?.error || 'Correo o contraseña incorrectos. Por favor, verifique.';
            } else if (err.error?.message) {
              mensajeError = err.error.message;
            }

            // Alerta de Error
            Swal.fire({
              icon: 'error',
              title: 'Error de acceso',
              text: mensajeError,
              confirmButtonColor: '#d33',
              confirmButtonText: 'Cerrar'
            });

            this.cdr.markForCheck();
          });
        }
      });
  }
}