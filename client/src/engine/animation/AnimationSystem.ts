import { GrassAnimationManager } from './GrassAnimation';

export class AnimationSystem {
  private grassAnimations: GrassAnimationManager;
  private tileSize: number;

  constructor(tileSize: number) {
    this.tileSize = tileSize;
    this.grassAnimations = new GrassAnimationManager(tileSize);
  }

  // Trigger grass animation at a tile
  triggerGrassAnimation(tileX: number, tileY: number): void {
    console.log(`[AnimationSystem] Triggering grass animation at (${tileX}, ${tileY})`);
    this.grassAnimations.trigger(tileX, tileY);
  }

  // Update all animations
  update(deltaTime: number): void {
    this.grassAnimations.update(deltaTime);
  }

  // Render all animations
  render(ctx: CanvasRenderingContext2D, cameraX: number, cameraY: number): void {
    this.grassAnimations.render(ctx, cameraX, cameraY);
  }

  // Clear all animations (for map transitions)
  clear(): void {
    this.grassAnimations.clear();
  }

  // Cleanup
  destroy(): void {
    this.grassAnimations.clear();
  }
}
