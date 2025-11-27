// src/app/components/layout/main-layout/main-layout.component.ts
import { Component, ViewChild, ChangeDetectionStrategy, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatSidenavModule, MatSidenav } from '@angular/material/sidenav';
import { BreakpointObserver, Breakpoints } from '@angular/cdk/layout';
import { Subject, takeUntil } from 'rxjs';
import { NavbarComponent } from '../navbar/navbar';
import { SidebarComponent } from '../sidebar/sidebar';

@Component({
  selector: 'app-main-layout',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule, 
    RouterModule, 
    MatSidenavModule, 
    NavbarComponent, 
    SidebarComponent
  ],
  template: `
    <app-navbar (toggleSidebar)="toggleSidenav()"></app-navbar>
    <mat-sidenav-container class="sidenav-container">
      <mat-sidenav #sidenav [mode]="sidenavMode" [opened]="sidenavOpened" class="sidebar">
        <app-sidebar></app-sidebar>
      </mat-sidenav>
      
      <mat-sidenav-content class="content-area">
        <div class="page-content">
          <router-outlet></router-outlet>
        </div>
      </mat-sidenav-content>
    </mat-sidenav-container>
  `,
  styles: [`
    .sidenav-container {
      height: calc(100vh - 64px);
    }
    
    .sidebar {
      width: 250px;
    }
    
    .content-area {
      padding: 20px;
      background-color: #f4f4f4;
    }
    
    .page-content {
      padding: 10px;
    }
    
    /* Responsive adjustments */
    @media (max-width: 768px) {
      .content-area {
        padding: 12px;
      }
      
      .page-content {
        padding: 4px;
      }
    }
    
    @media (max-width: 599px) {
      .content-area {
        padding: 8px;
      }
      
      .page-content {
        padding: 0;
      }
    }
  `]
})
export class MainLayoutComponent implements OnInit, OnDestroy {
  @ViewChild('sidenav') sidenav!: MatSidenav;
  
  private breakpointObserver = inject(BreakpointObserver);
  private destroy$ = new Subject<void>();
  
  sidenavMode: 'side' | 'over' = 'side';
  sidenavOpened = true;

  ngOnInit() {
    // Observe screen size changes
    this.breakpointObserver
      .observe([Breakpoints.Handset, Breakpoints.Tablet])
      .pipe(takeUntil(this.destroy$))
      .subscribe(result => {
        if (result.matches) {
          // Mobile or tablet: use overlay mode and close by default
          this.sidenavMode = 'over';
          this.sidenavOpened = false;
        } else {
          // Desktop: use side mode and open by default
          this.sidenavMode = 'side';
          this.sidenavOpened = true;
        }
      });
  }
  
  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  toggleSidenav() {
    this.sidenav.toggle();
  }
}