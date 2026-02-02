// Map-related types

export interface MapData {
  id?: number;
  width: number;
  height: number;
  layers: number[][][];
  tileset_id?: number;
}

export interface MapTransition {
  fromMap: number;
  edge: 'north' | 'south' | 'east' | 'west';
  toMap: number;
  spawnX: number;
  spawnY: number;
  minTile?: number;
  maxTile?: number;
}

export interface MapAssets {
  tileset: HTMLImageElement;
  autotiles: HTMLImageElement[];
}
