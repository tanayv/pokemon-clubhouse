import { Player } from './Player';
import { PlayerData, MoveData } from '../../types/network.types';
import { Direction } from '../../types/game.types';

export class PlayerSystem {
  private localPlayer: Player | null = null;
  private remotePlayers: Map<string, Player> = new Map();
  private characterSprites: HTMLImageElement[];
  private tileSize: number;
  private currentMapId: number;

  constructor(characterSprites: HTMLImageElement[], tileSize: number, initialMapId: number) {
    this.characterSprites = characterSprites;
    this.tileSize = tileSize;
    this.currentMapId = initialMapId;
  }

  // Initialize local player
  initializeLocalPlayer(x: number, y: number, sprite: HTMLImageElement): Player {
    this.localPlayer = new Player(x, y, sprite, this.tileSize);
    this.localPlayer.mapId = this.currentMapId;
    return this.localPlayer;
  }

  // Update local player sprite (from server assignment)
  updateLocalPlayerSprite(spriteId: number): void {
    if (!this.localPlayer) return;

    const sprite = this.getCharacterSprite(spriteId);
    this.localPlayer.sprite = sprite;
  }

  // Update local player map ID
  updateLocalPlayerMap(mapId: number): void {
    this.currentMapId = mapId;
    if (this.localPlayer) {
      this.localPlayer.mapId = mapId;
    }
  }

  // Add a remote player
  addRemotePlayer(data: PlayerData): void {
    console.log('[PlayerSystem] Adding remote player:', data.id, 'mapId:', data.mapId);

    const sprite = this.getCharacterSprite(data.spriteId);
    const remotePlayer = new Player(data.x, data.y, sprite, this.tileSize);
    remotePlayer.direction = data.direction;
    remotePlayer.mapId = data.mapId !== undefined ? data.mapId : this.currentMapId;

    this.remotePlayers.set(data.id, remotePlayer);
  }

  // Update a remote player's state
  updateRemotePlayer(id: string, data: MoveData): void {
    const remotePlayer = this.remotePlayers.get(id);
    if (remotePlayer) {
      remotePlayer.setState(data.x, data.y, data.direction, data.isMoving);
    }
  }

  // Remove a remote player
  removeRemotePlayer(id: string): void {
    console.log('[PlayerSystem] Removing remote player:', id);
    this.remotePlayers.delete(id);
  }

  // Clear all remote players (for map transitions)
  clearRemotePlayers(): void {
    console.log('[PlayerSystem] Clearing all remote players');
    this.remotePlayers.clear();
  }

  // Get local player
  getLocalPlayer(): Player | null {
    return this.localPlayer;
  }

  // Get all remote players
  getRemotePlayers(): Map<string, Player> {
    return this.remotePlayers;
  }

  // Get remote players on current map
  getRemotePlayersOnMap(mapId: number): Player[] {
    const players: Player[] = [];
    this.remotePlayers.forEach((player) => {
      if (player.mapId === mapId) {
        players.push(player);
      }
    });
    return players;
  }

  // Update all players (call in game loop)
  update(deltaTime: number): void {
    // Update local player
    if (this.localPlayer) {
      this.localPlayer.update(deltaTime);
    }

    // Update remote players
    this.remotePlayers.forEach((player) => {
      player.update(deltaTime);
    });
  }

  // Helper to get character sprite by ID
  private getCharacterSprite(spriteId: number): HTMLImageElement {
    if (this.characterSprites.length === 0) {
      throw new Error('[PlayerSystem] No character sprites loaded!');
    }

    const index = spriteId % this.characterSprites.length;
    return this.characterSprites[index];
  }

  // Cleanup
  destroy(): void {
    this.localPlayer = null;
    this.remotePlayers.clear();
  }
}
