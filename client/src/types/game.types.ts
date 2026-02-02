// Core game types

export interface CanvasSize {
  width: number;
  height: number;
}

export interface Position {
  x: number;
  y: number;
}

export interface GameState {
  loaded: boolean;
  error: string | null;
}

export type Direction = 0 | 1 | 2 | 3; // 0=down, 1=left, 2=right, 3=up
