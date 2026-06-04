export interface AppRoute {
  path: 'home' | 'search' | 'details' | 'favorites';
  paramId?: number; // For dynamic navigation to details view
}
