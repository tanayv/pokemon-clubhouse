// Grass animation system for Pokemon-style rustling grass effect

interface GrassAnimationInstance {
  x: number;
  y: number;
  frame: number;
  timer: number;
  maxFrames: number;
}

export class GrassAnimationManager {
  animations: GrassAnimationInstance[];
  tileSize: number;
  frameDuration: number; // Duration of each frame in seconds

  constructor(tileSize: number) {
    this.animations = [];
    this.tileSize = tileSize;
    this.frameDuration = 0.08; // 80ms per frame
  }

  // Trigger a grass animation at a tile position
  trigger(tileX: number, tileY: number): void {
    // Check if animation already exists at this position
    const exists = this.animations.some(
      anim => anim.x === tileX && anim.y === tileY
    );

    if (!exists) {
      this.animations.push({
        x: tileX,
        y: tileY,
        frame: 0,
        timer: 0,
        maxFrames: 4 // 4-frame animation
      });
    }
  }

  // Update all active animations
  update(deltaTime: number): void {
    this.animations = this.animations.filter(anim => {
      anim.timer += deltaTime;

      if (anim.timer >= this.frameDuration) {
        anim.timer -= this.frameDuration;
        anim.frame++;

        // Remove animation when complete
        if (anim.frame >= anim.maxFrames) {
          return false;
        }
      }

      return true;
    });
  }

  // Render all active grass animations
  render(ctx: CanvasRenderingContext2D, cameraX: number, cameraY: number): void {
    ctx.imageSmoothingEnabled = false;

    this.animations.forEach(anim => {
      const screenX = anim.x * this.tileSize - cameraX;
      const screenY = anim.y * this.tileSize - cameraY;

      this.renderGrassEffect(ctx, screenX, screenY, anim.frame);
    });
  }

  // Render individual grass rustling effect (Pokemon-style)
  private renderGrassEffect(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    frame: number
  ): void {
    ctx.save();

    // Pokemon-style grass rustle with visible leaves/particles
    const centerX = x + 16;
    const centerY = y + 20; // Lower in tile

    // Grass blade positions and movement
    const grassBlades = [
      { baseX: x + 8, baseY: y + 28, swayLeft: true },
      { baseX: x + 12, baseY: y + 26, swayLeft: false },
      { baseX: x + 16, baseY: y + 30, swayLeft: true },
      { baseX: x + 20, baseY: y + 26, swayLeft: false },
      { baseX: x + 24, baseY: y + 28, swayLeft: true },
    ];

    // Calculate sway based on frame (more dramatic movement)
    const swayAmount = frame === 1 ? -4 : frame === 2 ? 4 : 0;

    // Draw grass blades with movement
    grassBlades.forEach((blade) => {
      const offsetX = blade.swayLeft ? swayAmount : -swayAmount;
      const tipX = blade.baseX + offsetX;
      const tipY = blade.baseY - 12;

      // Draw blade
      ctx.strokeStyle = `rgba(80, 160, 80, ${0.8 - frame * 0.15})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(blade.baseX, blade.baseY);
      ctx.quadraticCurveTo(blade.baseX + offsetX / 2, blade.baseY - 6, tipX, tipY);
      ctx.stroke();
    });

    // Draw leaf particles flying up (Pokemon style) - yellowish
    if (frame >= 1 && frame <= 3) {
      const particles = [
        { x: centerX - 6, y: centerY - (frame * 4), size: 3 },
        { x: centerX + 6, y: centerY - (frame * 3), size: 3 },
        { x: centerX - 2, y: centerY - (frame * 5), size: 2 },
        { x: centerX + 2, y: centerY - (frame * 4), size: 2 },
      ];

      particles.forEach((particle) => {
        const opacity = frame === 3 ? 0.3 : 0.7;

        // Draw leaf-like particle (yellowish-green)
        ctx.fillStyle = `rgba(180, 220, 100, ${opacity})`;
        ctx.beginPath();
        ctx.ellipse(particle.x, particle.y, particle.size, particle.size * 1.5, Math.PI / 4, 0, Math.PI * 2);
        ctx.fill();

        // Add yellow-white highlight
        ctx.fillStyle = `rgba(255, 255, 200, ${opacity * 0.5})`;
        ctx.beginPath();
        ctx.arc(particle.x - 1, particle.y - 1, particle.size / 2, 0, Math.PI * 2);
        ctx.fill();
      });
    }

    // Add sparkle effect on frame 1 (peak of animation) - yellowish
    if (frame === 1 || frame === 2) {
      const sparkles = [
        { x: centerX - 8, y: centerY - 6 },
        { x: centerX + 8, y: centerY - 4 },
        { x: centerX, y: centerY - 10 },
      ];

      sparkles.forEach((sparkle) => {
        const size = frame === 1 ? 4 : 3;
        const opacity = frame === 1 ? 1.0 : 0.6;

        // Yellow-white sparkle core
        ctx.fillStyle = `rgba(255, 255, 180, ${opacity})`;
        ctx.beginPath();
        ctx.arc(sparkle.x, sparkle.y, size, 0, Math.PI * 2);
        ctx.fill();

        // Sparkle rays (yellowish)
        ctx.strokeStyle = `rgba(255, 255, 200, ${opacity * 0.8})`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        // Horizontal ray
        ctx.moveTo(sparkle.x - size - 2, sparkle.y);
        ctx.lineTo(sparkle.x + size + 2, sparkle.y);
        // Vertical ray
        ctx.moveTo(sparkle.x, sparkle.y - size - 2);
        ctx.lineTo(sparkle.x, sparkle.y + size + 2);
        ctx.stroke();
      });
    }

    ctx.restore();
  }

  // Clear all animations
  clear(): void {
    this.animations = [];
  }
}
