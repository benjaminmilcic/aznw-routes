import { Injectable } from '@angular/core';

export interface MoviesListState {
  pageIndex: number;
  pageSize: number;
  scrollPosition: number;
  searchQuery?: string;
  results?: any[];
}

export type NavigationHistoryType = 'list' | 'movie-detail' | 'actor-detail';

export interface NavigationHistoryEntry {
  route: string;
  scrollPosition: number;
  type: NavigationHistoryType;
  id?: number;
}

@Injectable({
  providedIn: 'root',
})
export class MoviesStateService {
  private states: Map<string, MoviesListState> = new Map();
  private currentRoute: string = '';

  // Navigation history for movie detail pages
  private navigationHistory: NavigationHistoryEntry[] = [];

  // Scroll positions for movie detail pages
  private detailScrollPositions: Map<string, number> = new Map();

  // Scroll positions for actor detail pages
  private actorScrollPositions: Map<string, number> = new Map();

  // Flag to indicate if we are navigating back
  private isNavigatingBack: boolean = false;

  // Flag to indicate if we are navigating to a similar movie (forward navigation)
  private isNavigatingToSimilarMovie: boolean = false;

  saveState(route: string, state: MoviesListState): void {
    this.states.set(route, state);
    this.currentRoute = route;
  }

  getState(route: string): MoviesListState | null {
    return this.states.get(route) || null;
  }

  getCurrentRoute(): string {
    return this.currentRoute;
  }

  clearState(route: string): void {
    this.states.delete(route);
  }

  clearAllStates(): void {
    this.states.clear();
    this.currentRoute = '';
  }

  // Navigation History Methods

  pushToHistory(
    route: string,
    scrollPosition: number = 0,
    type: NavigationHistoryType = 'list',
    id?: number
  ): void {
    this.navigationHistory.push({ route, scrollPosition, type, id });
  }

  popFromHistory(): NavigationHistoryEntry | null {
    return this.navigationHistory.pop() || null;
  }

  peekHistory(): NavigationHistoryEntry | null {
    if (this.navigationHistory.length === 0) return null;
    return this.navigationHistory[this.navigationHistory.length - 1];
  }

  clearHistory(): void {
    this.navigationHistory = [];
  }

  getHistoryLength(): number {
    return this.navigationHistory.length;
  }

  // Movie Detail Scroll Position Methods

  saveDetailScrollPosition(movieId: string, scrollPosition: number): void {
    this.detailScrollPositions.set(movieId, scrollPosition);
  }

  getDetailScrollPosition(movieId: string): number {
    return this.detailScrollPositions.get(movieId) || 0;
  }

  clearDetailScrollPosition(movieId: string): void {
    this.detailScrollPositions.delete(movieId);
  }

  clearAllDetailScrollPositions(): void {
    this.detailScrollPositions.clear();
  }

  // Actor Detail Scroll Position Methods

  saveActorScrollPosition(actorId: string, scrollPosition: number): void {
    this.actorScrollPositions.set(actorId, scrollPosition);
  }

  getActorScrollPosition(actorId: string): number {
    return this.actorScrollPositions.get(actorId) || 0;
  }

  clearActorScrollPosition(actorId: string): void {
    this.actorScrollPositions.delete(actorId);
  }

  clearAllActorScrollPositions(): void {
    this.actorScrollPositions.clear();
  }

  // Navigation Direction Methods

  setNavigatingBack(value: boolean): void {
    this.isNavigatingBack = value;
  }

  isNavigatingBackward(): boolean {
    return this.isNavigatingBack;
  }

  setNavigatingToSimilarMovie(value: boolean): void {
    this.isNavigatingToSimilarMovie = value;
  }

  isNavigatingToSimilar(): boolean {
    return this.isNavigatingToSimilarMovie;
  }
}
