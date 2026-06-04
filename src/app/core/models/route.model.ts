export interface AppRoute {
  path: 'home' | 'search' | 'details' | 'favorites' | 'not-found';
  paramId?: number; // For dynamic navigation to details view
}
