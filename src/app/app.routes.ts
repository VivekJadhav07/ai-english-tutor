import { Routes } from '@angular/router';
// 1. Import your component here (Check your file path)
import { App } from './app'; 

export const routes: Routes = [
  // 2. Set the empty path (home) to your component
  { path: '', component: App },
  
  // 3. Catch-all: redirect any unknown paths to home
  { path: '**', redirectTo: '' }
];