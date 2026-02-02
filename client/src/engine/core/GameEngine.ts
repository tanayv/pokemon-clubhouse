import { MapSystem } from '../map/MapSystem';
import { PlayerSystem } from '../player/PlayerSystem';
import { NetworkSystem } from '../network/NetworkSystem';
import { AnimationSystem } from '../animation/AnimationSystem';
import { InputSystem } from './InputSystem';
import { RenderSystem } from './RenderSystem';
import { MapAssets } from '../../types/map.types';
import { NetworkCallbacks, PlayerData } from '../../types/network.types';

export interface GameEngineConfig {
  canvas: HTMLCanvasElement;
  tileSize: number;
  initialMapId: number;
  initialSpawnX: number;
  initialSpawnY: number;
  assets: MapAssets;
  characterSprites: HTMLImageElement[];
  playerSprite: HTMLImageElement;
  onCoordinateUpdate?: (x: number, y: number, mapId: number) => void;
}

export class GameEngine {
  // Systems
  private mapSystem: MapSystem;
  private playerSystem: PlayerSystem;
  private networkSystem: NetworkSystem;
  private animationSystem: AnimationSystem;
  private inputSystem: InputSystem | null = null;
  private renderSystem: RenderSystem;

  // State
  private running: boolean = false;
  private animationFrameId: number | null = null;
  private lastTime: number = 0;

  // Callbacks
  private onCoordinateUpdate?: (x: number, y: number, mapId: number) => void;

  constructor(config: GameEngineConfig) {
    const {
      canvas,
      tileSize,
      initialMapId,
      initialSpawnX,
      initialSpawnY,
      assets,
      characterSprites,
      playerSprite,
      onCoordinateUpdate,
    } = config;

    this.onCoordinateUpdate = onCoordinateUpdate;

    console.log('[GameEngine] Initializing...');

    // Initialize systems
    this.mapSystem = new MapSystem(initialMapId, assets, tileSize);
    this.playerSystem = new PlayerSystem(characterSprites, tileSize, initialMapId);
    this.animationSystem = new AnimationSystem(tileSize);
    this.renderSystem = new RenderSystem(canvas, tileSize);

    // Initialize network system with callbacks
    const networkCallbacks: NetworkCallbacks = {
      onInitLocalPlayer: this.handleInitLocalPlayer.bind(this),
      onAddRemotePlayer: this.handleAddRemotePlayer.bind(this),
      onRemoveRemotePlayer: this.handleRemoveRemotePlayer.bind(this),
      onUpdateRemotePlayer: this.handleUpdateRemotePlayer.bind(this),
    };
    this.networkSystem = new NetworkSystem(networkCallbacks, initialMapId);

    // Initialize local player
    const localPlayer = this.playerSystem.initializeLocalPlayer(
      initialSpawnX,
      initialSpawnY,
      playerSprite
    );

    // Setup player movement callback
    localPlayer.setOnMove((x, y, direction, isMoving) => {
      this.handlePlayerMove(x, y, direction, isMoving);
    });

    // Initialize input system
    this.inputSystem = new InputSystem(localPlayer, this.mapSystem);

    console.log('[GameEngine] Initialized successfully');
  }

  // Start the game engine
  async start(): Promise<void> {
    console.log('[GameEngine] Starting...');

    try {
      // Load initial map
      const spawnPos = await this.mapSystem.loadMap(
        this.mapSystem.getCurrentMapId()
      );

      // Update player position
      const localPlayer = this.playerSystem.getLocalPlayer();
      if (localPlayer) {
        localPlayer.x = spawnPos.x;
        localPlayer.y = spawnPos.y;
        localPlayer.targetX = spawnPos.x;
        localPlayer.targetY = spawnPos.y;
      }

      // Connect to network
      this.networkSystem.connect();

      // Start game loop
      this.running = true;
      this.gameLoop();

      console.log('[GameEngine] Started successfully');
    } catch (error) {
      console.error('[GameEngine] Failed to start:', error);
      throw error;
    }
  }

  // Main game loop
  private gameLoop(timestamp: number = 0): void {
    if (!this.running) return;

    // Calculate delta time
    if (!this.lastTime) this.lastTime = timestamp;
    const deltaTime = (timestamp - this.lastTime) / 1000; // Convert to seconds
    this.lastTime = timestamp;

    // Ensure deltaTime is reasonable (prevent huge jumps if tab was inactive)
    const safeDeltaTime = Math.min(deltaTime, 0.1);

    // Update systems
    this.update(safeDeltaTime);

    // Render
    this.render();

    // Schedule next frame
    this.animationFrameId = requestAnimationFrame((t) => this.gameLoop(t));
  }

  // Update all systems
  private update(deltaTime: number): void {
    // Update input
    if (this.inputSystem) {
      this.inputSystem.update();
    }

    // Update players
    this.playerSystem.update(deltaTime);

    // Update animations
    this.animationSystem.update(deltaTime);
  }

  // Render everything
  private render(): void {
    const mapRenderer = this.mapSystem.getRenderer();
    const localPlayer = this.playerSystem.getLocalPlayer();
    const currentMapId = this.mapSystem.getCurrentMapId();
    const remotePlayers = this.playerSystem.getRemotePlayersOnMap(currentMapId);

    this.renderSystem.render(
      mapRenderer,
      localPlayer,
      remotePlayers,
      this.animationSystem
    );
  }

  // Handle player movement
  private handlePlayerMove(x: number, y: number, direction: number, isMoving: boolean): void {
    const currentMapId = this.mapSystem.getCurrentMapId();

    // Send move to server
    this.networkSystem.sendMove(x, y, direction as 0 | 1 | 2 | 3, isMoving);

    // Update coordinate display
    if (this.onCoordinateUpdate) {
      this.onCoordinateUpdate(x, y, currentMapId);
    }

    // Trigger grass animation when player arrives at grass tile
    if (!isMoving && this.mapSystem.isGrassTile(x, y)) {
      console.log(`🌿 Grass animation triggered at (${x}, ${y})`);
      this.animationSystem.triggerGrassAnimation(x, y);
    }

    // Check for map transitions when player finishes moving
    if (!isMoving) {
      const transition = this.mapSystem.checkTransition(x, y);
      if (transition) {
        console.log(`[GameEngine] Map transition: ${currentMapId} -> ${transition.toMap}`);
        this.handleMapTransition(transition.toMap, transition.spawnX, transition.spawnY);
      }
    }
  }

  // Handle map transition
  private async handleMapTransition(newMapId: number, spawnX: number, spawnY: number): Promise<void> {
    const oldMapId = this.mapSystem.getCurrentMapId();

    try {
      // Load new map
      const spawnPos = await this.mapSystem.loadMap(newMapId, spawnX, spawnY);

      // Update local player position and map
      const localPlayer = this.playerSystem.getLocalPlayer();
      if (localPlayer) {
        localPlayer.x = spawnPos.x;
        localPlayer.y = spawnPos.y;
        localPlayer.targetX = spawnPos.x;
        localPlayer.targetY = spawnPos.y;
        localPlayer.isMoving = false;
        localPlayer.moveProgress = 0;
        localPlayer.mapId = newMapId;
      }

      // Update player system map ID
      this.playerSystem.updateLocalPlayerMap(newMapId);

      // Update coordinate display
      if (this.onCoordinateUpdate) {
        this.onCoordinateUpdate(spawnPos.x, spawnPos.y, newMapId);
      }

      // Notify server of map transition
      this.networkSystem.sendMapTransition(oldMapId, newMapId, spawnPos.x, spawnPos.y);

      // Clear remote players and animations
      this.playerSystem.clearRemotePlayers();
      this.animationSystem.clear();

      console.log(`[GameEngine] Map transition complete: now on map ${newMapId}`);
    } catch (error) {
      console.error('[GameEngine] Map transition failed:', error);
    }
  }

  // Network callbacks
  private handleInitLocalPlayer(data: PlayerData): void {
    console.log('[GameEngine] Initializing local player from server:', data);

    // Update local player sprite
    this.playerSystem.updateLocalPlayerSprite(data.spriteId);

    // Update map if server sent a different one
    if (data.mapId !== undefined) {
      this.playerSystem.updateLocalPlayerMap(data.mapId);
      this.networkSystem.setCurrentMap(data.mapId);
    }
  }

  private handleAddRemotePlayer(data: PlayerData): void {
    this.playerSystem.addRemotePlayer(data);
  }

  private handleRemoveRemotePlayer(id: string): void {
    this.playerSystem.removeRemotePlayer(id);
  }

  private handleUpdateRemotePlayer(id: string, data: { x: number; y: number; direction: 0 | 1 | 2 | 3; isMoving: boolean }): void {
    this.playerSystem.updateRemotePlayer(id, data);
  }

  // Stop the game engine
  stop(): void {
    console.log('[GameEngine] Stopping...');
    this.running = false;

    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  // Cleanup and destroy
  destroy(): void {
    console.log('[GameEngine] Destroying...');

    this.stop();

    // Cleanup systems
    if (this.inputSystem) {
      this.inputSystem.destroy();
    }
    this.mapSystem.destroy();
    this.playerSystem.destroy();
    this.networkSystem.disconnect();
    this.animationSystem.destroy();

    console.log('[GameEngine] Destroyed');
  }
}
