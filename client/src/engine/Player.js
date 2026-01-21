export class Player {
  constructor(x, y, sprite, tileSize) {
    this.x = x; // Grid position X
    this.y = y; // Grid position Y
    this.sprite = sprite;
    this.tileSize = tileSize;

    // Movement
    this.isMoving = false;
    this.moveProgress = 0;
    this.moveSpeed = 4.5; // Tiles per second (slower for smoother appearance)
    this.targetX = x;
    this.targetY = y;

    // Direction (0 = down, 1 = left, 2 = right, 3 = up)
    this.direction = 0;

    // Animation
    this.animationFrame = 0;
    this.animationTimer = 0;
    this.frameInterval = 0.12; // Seconds per frame (balanced animation speed)
    this.animationSpeed = 0.1; // Kept for backwards compatibility if needed, but not used

    // Sprite layout (Pokemon style character sprite sheet)
    // 128x192 sprite sheet: 4 columns x 4 rows
    // Each sprite is 32 pixels wide x 48 pixels tall
    // Row 0: Down, Row 1: Left, Row 2: Right, Row 3: Up
    this.spriteWidth = 32; // Width of each sprite frame
    this.spriteHeight = 48; // Height of each sprite frame (taller sprites!)
  }

  // Start moving in a direction
  startMove(dx, dy) {
    if (this.isMoving) {
      console.warn('⚠️ startMove() called but already moving!');
      return false;
    }

    // Update direction
    if (dy > 0) this.direction = 0; // Down
    else if (dy < 0) this.direction = 3; // Up
    else if (dx < 0) this.direction = 1; // Left
    else if (dx > 0) this.direction = 2; // Right

    this.targetX = this.x + dx;
    this.targetY = this.y + dy;
    this.isMoving = true;
    this.moveProgress = 0;

    console.log(`🚀 START MOVE: (${this.x}, ${this.y}) → (${this.targetX}, ${this.targetY})`);

    if (this.onMove) {
      // Send CURRENT position as start (network uses x,y as start, not target)
      this.onMove(this.x, this.y, this.direction, true);
    }

    return true;
  }

  // Update player state
  update(deltaTime = 0.016) {
    if (this.isMoving) {
      this.moveProgress += this.moveSpeed * deltaTime;

      // Debug log every 10 frames - simplified
      if (Math.random() < 0.01) {
        // console.log(`Moving: progress=${this.moveProgress.toFixed(2)}`);
      }

      if (this.moveProgress >= 1) {
        // Movement complete
        console.log(`✅ Movement COMPLETE: arrived at (${this.targetX}, ${this.targetY})`);
        this.x = this.targetX;
        this.y = this.targetY;
        this.isMoving = false;
        this.moveProgress = 0;
        this.animationFrame = 0; // Reset to standing frame

        // Notify stop
        if (this.onMove) {
          this.onMove(this.x, this.y, this.direction, false);
        }
      } else {
        // Update animation while moving
        this.animationTimer += deltaTime;
        if (this.animationTimer >= this.frameInterval) {
          this.animationTimer = 0;
          this.animationFrame = (this.animationFrame + 1) % 4;
        }
      }
    }
  }

  // Set state from network
  setState(x, y, direction, isMoving) {
    // If we are starting a new move
    if (isMoving && !this.isMoving) {
      this.moveProgress = 0;
      this.animationFrame = 0;
      this.animationTimer = 0;
    }

    this.x = x;
    this.y = y;
    this.direction = direction;
    this.isMoving = isMoving;

    // If moving, set target based on direction
    if (isMoving) {
      // Simple interpolation handling for now - assuming movement works same way
      this.targetX = direction === 2 ? x + 1 : direction === 1 ? x - 1 : x;
      this.targetY = direction === 0 ? y + 1 : direction === 3 ? y - 1 : y;
    } else {
      this.targetX = x;
      this.targetY = y;
    }
  }

  // Set callback for movement
  setOnMove(callback) {
    this.onMove = callback;
  }

  // Render player
  render(ctx, screenX, screenY) {
    // Calculate interpolated position for smooth movement
    let renderX = screenX;
    let renderY = screenY;

    if (this.isMoving) {
      const dx = this.targetX - this.x;
      const dy = this.targetY - this.y;
      // Linear interpolation for smooth movement
      renderX += dx * this.moveProgress * this.tileSize;
      renderY += dy * this.moveProgress * this.tileSize;
    }

    // Calculate sprite sheet position
    // Sprite sheet: 4 columns x 4 rows, each sprite is 32x48
    const frame = this.isMoving ? (this.animationFrame % 4) : 1; // Use frame 1 for standing
    const srcX = frame * 32;
    const srcY = this.direction * 48; // Each row is 48 pixels tall

    // Draw player sprite
    ctx.imageSmoothingEnabled = false;

    ctx.drawImage(
      this.sprite,
      srcX, srcY,           // Source position
      32, 48,               // Source size (32x48)
      renderX, renderY - 16,  // Dest position (shift up by 16 to align feet with tile)
      32, 48                // Dest size (keep at 32x48)
    );
  }

  // Get current grid position
  getPosition() {
    return { x: this.x, y: this.y };
  }
}
