export class MapRenderer {
  constructor(mapData, tileset, tileSize) {
    this.mapData = mapData;
    this.tileset = tileset;
    this.tileSize = tileSize;
    this.width = mapData.width;
    this.height = mapData.height;
    this.layers = mapData.layers;

    // RPG Maker XP tilesets are 256 pixels wide
    // Each tile is 32x32, so 8 tiles per row
    this.tilesetColumns = 8;
  }

  // Get tile coordinates in the tileset image
  getTileCoords(tileId) {
    if (tileId === 0) return null; // Empty tile

    // RPG Maker XP tile ID system:
    // 0-383: Autotiles (animated tiles - grass, water, flowers, etc.)
    // 384+: Regular tileset tiles (from the tileset image)

    if (tileId < 384) {
      // Simple autotile rendering
      // Autotiles are special animated tiles that need complex rendering
      // For now, render them as base grass tile to prevent black holes
      // TODO: Implement proper autotile rendering with animation frames
      return {
        x: 0,
        y: 0
      };
    }

    // Subtract 384 to get the actual index in the tileset image
    const tilesetIndex = tileId - 384;

    const col = tilesetIndex % this.tilesetColumns;
    const row = Math.floor(tilesetIndex / this.tilesetColumns);

    return {
      x: col * this.tileSize,
      y: row * this.tileSize
    };
  }

  // Render the map
  render(ctx, cameraX, cameraY) {
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

  renderLayer(ctx, layerIndex, startX, startY, endX, endY, cameraX, cameraY) {
    const layer = this.layers[layerIndex];
    if (!layer) return;

    // Disable image smoothing for pixel-perfect rendering
    ctx.imageSmoothingEnabled = false;

    for (let y = Math.max(0, startY); y < endY; y++) {
      for (let x = Math.max(0, startX); x < endX; x++) {
        if (!layer[y] || !layer[y][x]) continue;

        const tileId = layer[y][x];
        if (tileId === 0) continue; // Skip empty tiles

        const tileCoords = this.getTileCoords(tileId);
        if (!tileCoords) continue;

        // Calculate screen position (round to whole pixels)
        const screenX = Math.round(x * this.tileSize - cameraX);
        const screenY = Math.round(y * this.tileSize - cameraY);

        // Draw tile
        try {
          ctx.drawImage(
            this.tileset,
            tileCoords.x, tileCoords.y, // Source position in tileset
            this.tileSize, this.tileSize, // Source size
            screenX, screenY, // Destination position on canvas
            this.tileSize, this.tileSize // Destination size
          );
        } catch (error) {
          // Skip tiles that are out of bounds in tileset
          console.warn(`Failed to draw tile ${tileId} at ${x},${y}`, error);
        }
      }
    }
  }

  // Check if a tile ID is blocking
  isBlockingTile(tileId) {
    if (tileId === 0) return false; // Empty tile

    // Tile ID ranges that are blocking (trees, buildings, rocks, etc.)
    // Based on RPG Maker XP / Pokemon FireRed tileset structure
    const blockingRanges = [
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
  isWalkable(x, y) {
    if (x < 0 || x >= this.width || y < 0 || y >= this.height) {
      return false; // Out of bounds
    }

    // Check all layers for blocking tiles
    for (let layerIndex = 0; layerIndex < this.layers.length; layerIndex++) {
      const layer = this.layers[layerIndex];
      if (layer[y] && layer[y][x]) {
        const tileId = layer[y][x];
        if (this.isBlockingTile(tileId)) {
          return false;
        }
      }
    }

    return true;
  }
}
