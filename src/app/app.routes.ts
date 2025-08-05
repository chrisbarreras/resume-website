import { Routes } from '@angular/router';
import { Component } from '@angular/core';
import { TopLeftComponent } from './components/top-left/top-left';
import { TopRightComponent } from './components/top-right/top-right';
import { BottomLeftComponent } from './components/bottom-left/bottom-left';
import { BottomRightComponent } from './components/bottom-right/bottom-right';

// Main page component that renders the grid layout
@Component({
  template: `
    <main class="grid-container">
      <app-top-left class="grid-item top-left"></app-top-left>
      <app-top-right class="grid-item top-right"></app-top-right>
      <app-bottom-left class="grid-item bottom-left"></app-bottom-left>
      <app-bottom-right class="grid-item bottom-right"></app-bottom-right>
    </main>
  `,
  standalone: true,
  imports: [TopLeftComponent, TopRightComponent, BottomLeftComponent, BottomRightComponent],
  styles: [`
    .grid-container {
      display: grid;
      min-height: 100vh;
      width: 100%;
      grid-template-columns: 2fr 1fr 1fr 2fr;
      grid-template-rows: minmax(70vh, auto) auto;
    }

    .grid-item {
      padding: 2rem;
      position: relative;
      overflow: visible;
      box-sizing: border-box;
      border-color: #e0e0e0;
    }

    .top-left { 
      grid-column: 1 / 4;
      grid-row: 1 / 2;
      border-right-width: 1px; 
      border-right-style: solid; 
    }
    .top-right { 
      grid-column: 4 / 5;
      grid-row: 1 / 2;
    }
    .bottom-left { 
      grid-column: 1 / 2;
      grid-row: 2 / 3;
      border-top-width: 1px; 
      border-top-style: solid; 
      border-right-width: 1px; 
      border-right-style: solid;
      height: auto;
      min-height: 600px;
    }
    .bottom-right { 
      grid-column: 2 / 5;
      grid-row: 2 / 3;
      border-top-width: 1px; 
      border-top-style: solid; 
    }

    @media (max-width: 768px) {
      .grid-container {
        grid-template-columns: 1fr;
        grid-template-rows: auto auto auto auto;
      }
      
      .top-left,
      .top-right,
      .bottom-left,
      .bottom-right {
        grid-column: 1;
        min-height: 400px;
      }
      
      .top-left {
        grid-row: 1;
        border-right: none;
        border-bottom: 1px solid #e0e0e0;
      }
      
      .top-right {
        grid-row: 2;
        border-bottom: 1px solid #e0e0e0;
      }
      
      .bottom-left {
        grid-row: 3;
        border-right: none;
        border-bottom: 1px solid #e0e0e0;
      }
      
      .bottom-right {
        grid-row: 4;
      }
      
      .grid-item {
        padding: 1.5rem;
      }
    }
  `]
})
export class MainPageComponent {}

export const routes: Routes = [
  {
    path: '',
    component: MainPageComponent
  },
  {
    path: '**',
    component: MainPageComponent
  }
];
