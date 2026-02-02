type Layer = number[][];

interface MapData {
  width: number;
  height: number;
  layers: Layer[];
}

interface TileCoords {
  x: number;
  y: number;
  sourceImage?: HTMLImageElement;
  isRMXPAutotile?: boolean;
  tileId?: number;
  mapX?: number;
  mapY?: number;
}

// Autotile configuration: which tile IDs are self-autotiles (grass, water edges)
// These use corner-matching to blend with neighbors
interface AutotileConfig {
  name: string;
  type: 'self-autotile' | 'static-autotile';
  baseIndex?: number; // For fallback when neighbors don't match
}

export class MapRenderer {
  mapData: MapData;
  tileset: HTMLImageElement;
  autotiles: HTMLImageElement[];
  tileSize: number;
  width: number;
  height: number;
  layers: Layer[];
  tilesetColumns: number;
  animationFrame: number = 0;
  autotileConfig: { [key: number]: AutotileConfig };
  autotileCache: Map<string, TileCoords> = new Map();
  animationInterval: ReturnType<typeof setInterval> | null = null;

  constructor(mapData: MapData, tileset: HTMLImageElement, tileSize: number, autotiles: HTMLImageElement[] = []) {
    this.mapData = mapData;
    this.tileset = tileset;
    this.autotiles = autotiles;
    this.tileSize = tileSize;
    this.width = mapData.width;
    this.height = mapData.height;
    this.layers = mapData.layers;

    // RPG Maker XP tilesets are 256 pixels wide
    // Each tile is 32x32, so 8 tiles per row
    this.tilesetColumns = 8;

    // Configure autotile behavior
    // baseIndex represents the starting tile number in the tileset (row * 8 + column)
    // For static-autotiles: 4 consecutive tiles are used for animation frames
    // For self-autotiles: baseIndex * 4 gives the starting position for a 4x4 grid of corner variants
    this.autotileConfig = {
      48: { name: 'flower-1', type: 'static-autotile', baseIndex: 32 }, // Row 4
      64: { name: 'flower-2', type: 'static-autotile', baseIndex: 40 }, // Row 5
      68: { name: 'grass-edge', type: 'self-autotile', baseIndex: 4 }, // Row 2 (4*4=16)
      72: { name: 'water-edge', type: 'self-autotile', baseIndex: 6 }, // Row 3 (6*4=24)
      82: { name: 'decoration-1', type: 'static-autotile', baseIndex: 48 }, // Row 6
      84: { name: 'decoration-2', type: 'static-autotile', baseIndex: 56 }, // Row 7
      260: { name: 'water-anim-1', type: 'static-autotile', baseIndex: 0 }, // Row 0
      268: { name: 'water-anim-2', type: 'static-autotile', baseIndex: 8 }, // Row 1
      274: { name: 'terrain-trans-1', type: 'static-autotile', baseIndex: 16 }, // Row 2
      276: { name: 'terrain-var-1', type: 'static-autotile', baseIndex: 24 }, // Row 3
      278: { name: 'terrain-var-2', type: 'static-autotile', baseIndex: 64 }, // Row 8
      280: { name: 'terrain-var-3', type: 'static-autotile', baseIndex: 72 }, // Row 9
    };

    // Start animation loop
    this.startAnimationLoop();
  }

  // Animation loop for animated autotiles
  private startAnimationLoop(): void {
    this.animationInterval = setInterval(() => {
      this.animationFrame = (this.animationFrame + 1) % 4;
      this.autotileCache.clear(); // Clear cache when animation frame changes
    }, 500); // Change frame every 500ms
  }

  // Clean up animation interval
  destroy(): void {
    if (this.animationInterval) {
      clearInterval(this.animationInterval);
      this.animationInterval = null;
    }
  }

  // Get tile coordinates in the tileset image
  getTileCoords(tileId: number, x?: number, y?: number): TileCoords | null {
    if (tileId === 0) return null; // Empty tile

    // RPG Maker XP tile ID system:
    // 0-383: Autotiles (animated tiles - grass, water, flowers, etc.)
    // 384+: Regular tileset tiles (from the tileset image)

    if (tileId < 384) {
      // Handle autotiles with corner-matching and animation
      return this.getAutotileCoords(tileId, x, y);
    }

    // Regular tileset tiles
    // Subtract 384 to get the actual index in the tileset image
    const tilesetIndex = tileId - 384;

    const col = tilesetIndex % this.tilesetColumns;
    const row = Math.floor(tilesetIndex / this.tilesetColumns);

    return {
      x: col * this.tileSize,
      y: row * this.tileSize
    };
  }

  // Handle autotile rendering with corner-matching and animation
  private getAutotileCoords(tileId: number, x?: number, y?: number): TileCoords | null {
    // RPG Maker XP autotile system:
    // Tile IDs 0-383 are divided into 8 autotile slots of 48 tiles each
    // Each slot represents a different autotile graphic
    // The 48 tiles within each slot are corner/edge variations

    const autotileSlot = Math.floor(tileId / 48); // Which autotile (0-7)
    const autotileVariation = tileId % 48; // Which variation (0-47)

    // Check if we have this autotile image loaded
    if (!this.autotiles[autotileSlot]) {
      // Fallback: render from main tileset (may not look correct)
      return { x: 0, y: 0 };
    }

    const autotileImage = this.autotiles[autotileSlot];

    // Check autotile format:
    // - 96x128: Standard RMXP animated autotile (complex mini-tile format)
    // - 128x32: Simple 4-frame animation (4 tiles horizontally)
    // - 32x32: Static single tile

    if (autotileImage.width === 128 && autotileImage.height === 32) {
      // Simple 4-frame animation format
      const frameX = (this.animationFrame % 4) * this.tileSize;
      return {
        x: frameX,
        y: 0,
        sourceImage: autotileImage
      };
    } else if (autotileImage.width === 96 && autotileImage.height === 128) {
      // Standard RMXP autotile format - needs special rendering
      // Return marker to use custom rendering
      return {
        x: 0,
        y: 0,
        sourceImage: autotileImage,
        isRMXPAutotile: true,
        tileId: tileId,
        mapX: x,
        mapY: y
      };
    } else {
      // Unknown format, use first tile
      return {
        x: 0,
        y: 0,
        sourceImage: autotileImage
      };
    }
  }

  // Render an RMXP autotile using mini-tile assembly
  // Based on Algorithm 19 from AutotileTester (verified correct)
  private renderRMXPAutotile(
    ctx: CanvasRenderingContext2D,
    autotileImage: HTMLImageElement,
    tileId: number,
    x: number,
    y: number,
    screenX: number,
    screenY: number
  ): void {
    const halfTile = this.tileSize / 2; // 16 pixels for mini-tiles

    // Check all 8 neighbors (4 cardinal + 4 diagonal)
    const hasUp = this.getTileIdAt(x, y - 1) === tileId;
    const hasRight = this.getTileIdAt(x + 1, y) === tileId;
    const hasDown = this.getTileIdAt(x, y + 1) === tileId;
    const hasLeft = this.getTileIdAt(x - 1, y) === tileId;
    const hasUpLeft = this.getTileIdAt(x - 1, y - 1) === tileId;
    const hasUpRight = this.getTileIdAt(x + 1, y - 1) === tileId;
    const hasDownLeft = this.getTileIdAt(x - 1, y + 1) === tileId;
    const hasDownRight = this.getTileIdAt(x + 1, y + 1) === tileId;

    // Helper function - determines which mini-tile to use for each quadrant
    const getMiniTile = (
      hasAdjacent1: boolean,
      hasAdjacent2: boolean,
      hasDiagonal: boolean,
      quadrant: 'TL' | 'TR' | 'BL' | 'BR'
    ): { col: number, row: number } => {
      if (hasAdjacent1 && hasAdjacent2) {
        if (hasDiagonal) {
          // Inner (fully connected)
          if (quadrant === 'TL') return { col: 1, row: 3 };
          if (quadrant === 'TR') return { col: 2, row: 3 };
          if (quadrant === 'BL') return { col: 1, row: 4 };
          return { col: 2, row: 4 };
        } else {
          // Inner-cut corner
          if (quadrant === 'TL') return { col: 0, row: 0 };
          if (quadrant === 'TR') return { col: 1, row: 0 };
          if (quadrant === 'BL') return { col: 4, row: 0 };
          return { col: 5, row: 0 };
        }
      } else if (!hasAdjacent1 && !hasAdjacent2) {
        // Outer corner (rounded edges) - ALGORITHM 19
        if (quadrant === 'TL') return { col: 0, row: 2 };
        if (quadrant === 'TR') return { col: 5, row: 2 };
        if (quadrant === 'BL') return { col: 0, row: 2 };
        return { col: 5, row: 2 };
      } else if (hasAdjacent1 && !hasAdjacent2) {
        // Edge-horizontal (from Algorithm 19)
        if (quadrant === 'TL') return { col: 1, row: 2 };
        if (quadrant === 'TR') return { col: 2, row: 2 };
        if (quadrant === 'BL') return { col: 3, row: 2 };
        return { col: 4, row: 2 };
      } else {
        // Edge-vertical (from Algorithm 19)
        if (quadrant === 'TL') return { col: 0, row: 3 };
        if (quadrant === 'TR') return { col: 5, row: 3 };
        if (quadrant === 'BL') return { col: 0, row: 4 };
        return { col: 5, row: 4 };
      }
    };

    // Determine each quadrant
    const tl = getMiniTile(hasLeft, hasUp, hasUpLeft, 'TL');
    const tr = getMiniTile(hasRight, hasUp, hasUpRight, 'TR');
    const bl = getMiniTile(hasLeft, hasDown, hasDownLeft, 'BL');
    const br = getMiniTile(hasRight, hasDown, hasDownRight, 'BR');

    // Draw all four quadrants
    ctx.drawImage(autotileImage, tl.col * halfTile, tl.row * halfTile, halfTile, halfTile, screenX, screenY, halfTile, halfTile);
    ctx.drawImage(autotileImage, tr.col * halfTile, tr.row * halfTile, halfTile, halfTile, screenX + halfTile, screenY, halfTile, halfTile);
    ctx.drawImage(autotileImage, bl.col * halfTile, bl.row * halfTile, halfTile, halfTile, screenX, screenY + halfTile, halfTile, halfTile);
    ctx.drawImage(autotileImage, br.col * halfTile, br.row * halfTile, halfTile, halfTile, screenX + halfTile, screenY + halfTile, halfTile, halfTile);
  }

  // Corner-matching algorithm for self-autotiles
  private getCornerMatchedTile(
    tileId: number,
    x: number,
    y: number,
    config: AutotileConfig
  ): TileCoords {
    // Check all 4 neighbors for same tile ID
    const top = this.getTileIdAt(x, y - 1);
    const right = this.getTileIdAt(x + 1, y);
    const bottom = this.getTileIdAt(x, y + 1);
    const left = this.getTileIdAt(x - 1, y);

    // Create corner bitmask: TRBL (top, right, bottom, left)
    let cornerMask = 0;
    if (top === tileId) cornerMask |= 0b1000;      // Top
    if (right === tileId) cornerMask |= 0b0100;    // Right
    if (bottom === tileId) cornerMask |= 0b0010;   // Bottom
    if (left === tileId) cornerMask |= 0b0001;     // Left

    // Use cache to avoid recalculation
    const cacheKey = `${tileId}-${cornerMask}`;
    const cached = this.autotileCache.get(cacheKey);
    if (cached) {
      return cached;
    }

    // Map corner configurations to autotile offsets
    // Standard 16-tile autotile pattern (4x4 grid within autotile tileset)
    const cornerToOffset: { [key: number]: number } = {
      0b0000: 0,  // Isolated
      0b0001: 1,  // Left
      0b0010: 2,  // Bottom
      0b0011: 3,  // Bottom-Left
      0b0100: 4,  // Right
      0b0101: 5,  // Left-Right
      0b0110: 6,  // Bottom-Right
      0b0111: 7,  // Bottom-Left-Right
      0b1000: 8,  // Top
      0b1001: 9,  // Top-Left
      0b1010: 10, // Top-Bottom
      0b1011: 11, // Top-Bottom-Left
      0b1100: 12, // Top-Right
      0b1101: 13, // Top-Left-Right
      0b1110: 14, // Top-Bottom-Right
      0b1111: 15, // All sides (full tile)
    };

    const offset = cornerToOffset[cornerMask] || 0;
    const baseIndex = config.baseIndex || 0;

    // Autotiles are stored as 4x4 grids within the base index region
    // Each offset represents a tile within that 4x4 grid
    const tileRow = Math.floor(offset / 4);
    const tileCol = offset % 4;

    // Get base position in tileset
    const baseCol = (baseIndex * 4) % this.tilesetColumns;
    const baseRow = Math.floor((baseIndex * 4) / this.tilesetColumns);

    const col = baseCol + tileCol;
    const row = baseRow + tileRow;

    const result = {
      x: col * this.tileSize,
      y: row * this.tileSize
    };

    this.autotileCache.set(cacheKey, result);
    return result;
  }

  // Get tile ID at specific position
  private getTileIdAt(x: number, y: number): number {
    if (x < 0 || x >= this.width || y < 0 || y >= this.height) {
      return -1; // Out of bounds
    }

    // Check all layers from top to bottom
    for (let layerIndex = this.layers.length - 1; layerIndex >= 0; layerIndex--) {
      const layer = this.layers[layerIndex];
      if (!layer || !layer[y] || !layer[y][x]) continue;
      
      const tileId = layer[y][x];
      if (tileId !== 0) return tileId;
    }

    return 0; // Empty
  }

  // Render the map
  render(ctx: CanvasRenderingContext2D, cameraX: number, cameraY: number): void {
    const canvasWidth = ctx.canvas.width;
    const canvasHeight = ctx.canvas.height;

    // Calculate visible tile range
    const startX = Math.floor(cameraX / this.tileSize);
    const startY = Math.floor(cameraY / this.tileSize);
    const endX = Math.min(this.width, startX + Math.ceil(canvasWidth / this.tileSize) + 1);
    const endY = Math.min(this.height, startY + Math.ceil(canvasHeight / this.tileSize) + 1);

    // Render each layer
    for (let layer = 0; layer < this.layers.length; layer++) {
      this.renderLayer(ctx, layer, startX, startY, endX, endY, cameraX, cameraY);
    }
  }

  renderLayer(
    ctx: CanvasRenderingContext2D,
    layerIndex: number,
    startX: number,
    startY: number,
    endX: number,
    endY: number,
    cameraX: number,
    cameraY: number
  ): void {
    const layer = this.layers[layerIndex];
    if (!layer) return;

    // Disable image smoothing for pixel-perfect rendering
    ctx.imageSmoothingEnabled = false;

    for (let y = Math.max(0, startY); y < endY; y++) {
      for (let x = Math.max(0, startX); x < endX; x++) {
        if (!layer[y] || !layer[y][x]) continue;

        const tileId = layer[y][x];
        if (tileId === 0) continue; // Skip empty tiles

        // Pass coordinates for autotile corner-matching
        const tileCoords = this.getTileCoords(tileId, x, y);
        if (!tileCoords) continue;

        // Calculate screen position (round to whole pixels)
        const screenX = Math.round(x * this.tileSize - cameraX);
        const screenY = Math.round(y * this.tileSize - cameraY);

        // Draw tile
        try {
          // Check if this is an RMXP autotile that needs special rendering
          if (tileCoords.isRMXPAutotile && tileCoords.sourceImage &&
              tileCoords.mapX !== undefined && tileCoords.mapY !== undefined) {
            this.renderRMXPAutotile(
              ctx,
              tileCoords.sourceImage,
              tileId,
              tileCoords.mapX,
              tileCoords.mapY,
              screenX,
              screenY
            );
          } else {
            // Use sourceImage if provided (for autotiles), otherwise use main tileset
            const sourceImage = tileCoords.sourceImage || this.tileset;
            ctx.drawImage(
              sourceImage,
              tileCoords.x, tileCoords.y, // Source position in tileset/autotile
              this.tileSize, this.tileSize, // Source size
              screenX, screenY, // Destination position on canvas
              this.tileSize, this.tileSize // Destination size
            );
          }
        } catch (error) {
          // Skip tiles that are out of bounds in tileset
          console.warn(`Failed to draw tile ${tileId} at ${x},${y}`, error);
        }
      }
    }
  }

  // Check if a tile ID is blocking
  isBlockingTile(tileId: number): boolean {
    if (tileId === 0) return false; // Empty tile

    // Autotiles are generally not blocking unless configured
    // Most autotiles (grass, flowers, water edges) are passable
    if (tileId < 384) {
      // Only block on deep water and certain animated tiles
      return tileId >= 2048 && tileId <= 2200;
    }

    // Tile ID ranges that are blocking (trees, buildings, rocks, etc.)
    // Based on RPG Maker XP / Pokemon FireRed tileset structure
    const blockingRanges: [number, number][] = [
      [800, 827],   // Trees and forest tiles
      [1280, 1400], // Building walls and roofs
      [1536, 1600], // Rock formations
      [1960, 2000], // House structures (walls, roofs, windows)
      [2048, 2200], // Water tiles (deep water)
      [2304, 2400], // Cliffs and ledges
      [3400, 3500], // Additional building elements
    ];

    for (const [min, max] of blockingRanges) {
      if (tileId >= min && tileId <= max) {
        return true;
      }
    }

    return false;
  }

  // Check if a tile position is walkable (for collision detection)
  isWalkable(x: number, y: number): boolean {
    if (x < 0 || x >= this.width || y < 0 || y >= this.height) {
      return false; // Out of bounds
    }

    // Check all layers for blocking tiles
    for (let layerIndex = 0; layerIndex < this.layers.length; layerIndex++) {
      const layer = this.layers[layerIndex];
      if (layer && layer[y] && layer[y][x]) {
        const tileId = layer[y][x];
        if (this.isBlockingTile(tileId)) {
          return false;
        }
      }
    }

    return true;
  }

  // Check if a tile position is grass (for animation triggers)
  isGrassTile(x: number, y: number): boolean {
    if (x < 0 || x >= this.width || y < 0 || y >= this.height) {
      return false;
    }

    // Check all layers for tall grass
    // Layer 2 (top overlay)
    if (this.layers.length > 2) {
      const layer2 = this.layers[2];
      if (layer2 && layer2[y] && layer2[y][x]) {
        const tileId = layer2[y][x];
        if (tileId !== 0) {
          console.log(`[isGrassTile] Layer 2 tile at (${x}, ${y}): ${tileId}`);

          // Check for tall grass in layer 2
          if (
            (tileId >= 1656 && tileId <= 1682) ||
            (tileId >= 1784 && tileId <= 1812)
          ) {
            console.log(`[isGrassTile] ✓ TALL GRASS FOUND in Layer 2 at (${x}, ${y})`);
            return true;
          }
        }
      }
    }

    // Layer 1 (middle overlay)
    if (this.layers.length > 1) {
      const layer1 = this.layers[1];
      if (layer1 && layer1[y] && layer1[y][x]) {
        const tileId = layer1[y][x];
        if (tileId !== 0) {
          console.log(`[isGrassTile] Layer 1 tile at (${x}, ${y}): ${tileId}`);

          // Tall grass overlay tile ranges
          if (
            (tileId >= 1656 && tileId <= 1682) ||
            (tileId >= 1784 && tileId <= 1812)
          ) {
            console.log(`[isGrassTile] ✓ TALL GRASS FOUND in Layer 1 at (${x}, ${y})`);
            return true;
          }
        }
      }
    }

    // Layer 0 (base layer) - Check for base grass tiles
    if (this.layers.length > 0) {
      const layer0 = this.layers[0];
      if (layer0 && layer0[y] && layer0[y][x]) {
        const tileId = layer0[y][x];

        // Only log and check specific tiles that are tall encounter grass
        // Based on Pokemon tilesets, typically 389-390 are the dark tall grass
        // while 385-388 might be lighter/shorter grass
        if (tileId >= 385 && tileId <= 390) {
          console.log(`[isGrassTile] Layer 0 grass tile at (${x}, ${y}): ${tileId} - checking if tall grass...`);
        }

        // ONLY tiles 389-390 are the tall dark encounter grass
        // Tiles 385-388 are regular shorter grass (no animation)
        if (tileId === 389 || tileId === 390) {
          console.log(`[isGrassTile] ✓ TALL DARK GRASS FOUND in Layer 0 at (${x}, ${y}), tileId: ${tileId}`);
          return true;
        } else if (tileId >= 385 && tileId <= 388) {
          console.log(`[isGrassTile] ✗ Regular grass (no animation), tileId: ${tileId}`);
          return false;
        }
      }
    }

    return false;
  }
}
