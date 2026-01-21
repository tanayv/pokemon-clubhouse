import type { Player } from './Player';
import type { MapRenderer } from './MapRenderer';

export class InputHandler {
  player: Player;
  mapRenderer: MapRenderer;
  keysHeld: Set<string>;
  handleKeyDown: (event: KeyboardEvent) => void;
  handleKeyUp: (event: KeyboardEvent) => void;

  constructor(player: Player, mapRenderer: MapRenderer) {
    this.player = player;
    this.mapRenderer = mapRenderer;

    // Track which keys are currently held down
    this.keysHeld = new Set();

    // Bind event handlers
    this.handleKeyDown = this._handleKeyDown.bind(this);
    this.handleKeyUp = this._handleKeyUp.bind(this);

    // Register event listeners
    window.addEventListener('keydown', this.handleKeyDown);
    window.addEventListener('keyup', this.handleKeyUp);
  }

  private _handleKeyDown(event: KeyboardEvent): void {
    // Prevent default behavior for arrow keys
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'w', 'a', 's', 'd'].includes(event.key.toLowerCase())) {
      event.preventDefault();
    }

    // Add to held keys (this handles key repeat automatically)
    this.keysHeld.add(event.key);
  }

  private _handleKeyUp(event: KeyboardEvent): void {
    this.keysHeld.delete(event.key);
  }

  // Call this every frame to check for held keys
  update(): void {
    // Don't process input if player is already moving
    if (this.player.isMoving) {
      return;
    }

    // Check which direction key is held
    let dx = 0;
    let dy = 0;

    if (this.keysHeld.has('ArrowUp') || this.keysHeld.has('w') || this.keysHeld.has('W')) {
      dy = -1;
    } else if (this.keysHeld.has('ArrowDown') || this.keysHeld.has('s') || this.keysHeld.has('S')) {
      dy = 1;
    } else if (this.keysHeld.has('ArrowLeft') || this.keysHeld.has('a') || this.keysHeld.has('A')) {
      dx = -1;
    } else if (this.keysHeld.has('ArrowRight') || this.keysHeld.has('d') || this.keysHeld.has('D')) {
      dx = 1;
    }

    // No direction key held
    if (dx === 0 && dy === 0) {
      return;
    }

    // Check if target position is walkable
    const targetX = this.player.x + dx;
    const targetY = this.player.y + dy;

    const direction = dx === 1 ? 'RIGHT' : dx === -1 ? 'LEFT' : dy === 1 ? 'DOWN' : 'UP';

    if (this.mapRenderer.isWalkable(targetX, targetY)) {
      console.log(`✓ ${direction}: (${this.player.x}, ${this.player.y}) → (${targetX}, ${targetY})`);
      this.player.startMove(dx, dy);
    } else {
      console.log(`✗ ${direction} BLOCKED: (${this.player.x}, ${this.player.y}) → (${targetX}, ${targetY})`);
    }
  }

  // Cleanup
  destroy(): void {
    window.removeEventListener('keydown', this.handleKeyDown);
    window.removeEventListener('keyup', this.handleKeyUp);
  }
}
