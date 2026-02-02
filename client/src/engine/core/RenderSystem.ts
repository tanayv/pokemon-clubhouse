import { Player } from '../player/Player';
import { MapRenderer } from '../map/MapRenderer';
import { AnimationSystem } from '../animation/AnimationSystem';

export class RenderSystem {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private tileSize: number;

  constructor(canvas: HTMLCanvasElement, tileSize: number) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('[RenderSystem] Failed to get 2D context');
    }
    this.ctx = ctx;
    this.tileSize = tileSize;
  }

  // Main render function
  render(
    mapRenderer: MapRenderer | null,
    localPlayer: Player | null,
    remotePlayers: Player[],
    animationSystem: AnimationSystem | null
  ): void {
    // Clear canvas
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    // Calculate camera position (centered on local player)
    const { cameraX, cameraY } = this.calculateCamera(localPlayer);

    // Render map
    if (mapRenderer) {
      mapRenderer.render(this.ctx, cameraX, cameraY);
    }

    // Render animations (grass effects, etc.)
    if (animationSystem) {
      animationSystem.render(this.ctx, cameraX, cameraY);
    }

    // Render remote players
    remotePlayers.forEach((remotePlayer) => {
      const remoteWorldX = remotePlayer.x * this.tileSize;
      const remoteWorldY = remotePlayer.y * this.tileSize;
      const rScreenX = remoteWorldX - cameraX;
      const rScreenY = remoteWorldY - cameraY;

      remotePlayer.render(this.ctx, rScreenX, rScreenY);
    });

    // Render local player
    if (localPlayer) {
      const playerScreenX = localPlayer.x * this.tileSize - cameraX;
      const playerScreenY = localPlayer.y * this.tileSize - cameraY;

      localPlayer.render(this.ctx, playerScreenX, playerScreenY);
    }
  }

  // Calculate camera position centered on player
  private calculateCamera(localPlayer: Player | null): { cameraX: number; cameraY: number } {
    if (!localPlayer) {
      return { cameraX: 0, cameraY: 0 };
    }

    // Calculate player's interpolated position (matches Player.render)
    let playerWorldX = localPlayer.x * this.tileSize;
    let playerWorldY = localPlayer.y * this.tileSize;

    // Apply same interpolation as Player.render for synchronized movement
    if (localPlayer.isMoving) {
      const dx = localPlayer.targetX - localPlayer.x;
      const dy = localPlayer.targetY - localPlayer.y;
      playerWorldX += dx * localPlayer.moveProgress * this.tileSize;
      playerWorldY += dy * localPlayer.moveProgress * this.tileSize;
    }

    // Center camera on player's interpolated position
    // Round to whole pixels to prevent rendering seams
    const cameraX = Math.round(playerWorldX - this.canvas.width / 2 + 16); // 16 = half of 32px tile
    const cameraY = Math.round(playerWorldY - this.canvas.height / 2 + 16);

    return { cameraX, cameraY };
  }

  // Get canvas
  getCanvas(): HTMLCanvasElement {
    return this.canvas;
  }

  // Get context
  getContext(): CanvasRenderingContext2D {
    return this.ctx;
  }
}
