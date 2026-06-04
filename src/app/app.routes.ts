import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', children: [] },
  { path: 'home', children: [] },
  { path: 'search', children: [] },
  { path: 'details/:id', children: [] },
  { path: 'favorites', children: [] },
  { path: '**', children: [] }
];
