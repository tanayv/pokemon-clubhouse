import { MapData, MapAssets, MapTransition } from '../../types/map.types';
import { MapRenderer } from './MapRenderer';
import { checkTransition } from './MapTransitions';

export class MapSystem {
  private currentMapId: number;
  private mapData: MapData | null = null;
  private mapRenderer: MapRenderer | null = null;
  private assets: MapAssets;
  private tileSize: number;

  constructor(initialMapId: number, assets: MapAssets, tileSize: number) {
    this.currentMapId = initialMapId;
    this.assets = assets;
    this.tileSize = tileSize;
  }

  // Load a map by ID
  async loadMap(mapId: number, spawnX?: number, spawnY?: number): Promise<{ x: number; y: number }> {
    console.log(`[MapSystem] Loading map ${mapId}...`);

    try {
      const response = await fetch(`/maps/map-${String(mapId).padStart(3, '0')}.json`);
      const newMapData = await response.json() as MapData;

      // Update map data and ID
      this.mapData = newMapData;
      this.currentMapId = mapId;

      // Recreate map renderer
      if (this.mapRenderer) {
        this.mapRenderer.destroy();
      }
      this.mapRenderer = new MapRenderer(
        newMapData,
        this.assets.tileset,
        this.tileSize,
        this.assets.autotiles
      );

      console.log(`[MapSystem] Map ${mapId} loaded successfully`);

      // Return spawn position
      const spawnPosition = {
        x: spawnX !== undefined ? spawnX : Math.floor(newMapData.width / 2),
        y: spawnY !== undefined ? spawnY : Math.floor(newMapData.height / 2),
      };

      return spawnPosition;
    } catch (error) {
      console.error(`[MapSystem] Failed to load map ${mapId}:`, error);
      throw error;
    }
  }

  // Check if a position triggers a map transition
  checkTransition(playerX: number, playerY: number): MapTransition | null {
    if (!this.mapData) return null;

    return checkTransition(
      this.currentMapId,
      playerX,
      playerY,
      this.mapData.width,
      this.mapData.height
    );
  }

  // Get current map ID
  getCurrentMapId(): number {
    return this.currentMapId;
  }

  // Get current map data
  getMapData(): MapData | null {
    return this.mapData;
  }

  // Get map renderer
  getRenderer(): MapRenderer | null {
    return this.mapRenderer;
  }

  // Check if a tile is walkable
  isWalkable(x: number, y: number): boolean {
    if (!this.mapRenderer) return false;
    return this.mapRenderer.isWalkable(x, y);
  }

  // Check if a tile is grass (for animations)
  isGrassTile(x: number, y: number): boolean {
    if (!this.mapRenderer) return false;
    return this.mapRenderer.isGrassTile(x, y);
  }

  // Cleanup
  destroy(): void {
    if (this.mapRenderer) {
      this.mapRenderer.destroy();
      this.mapRenderer = null;
    }
    this.mapData = null;
  }
}
