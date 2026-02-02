import { NetworkCallbacks, ServerMessage } from '../../types/network.types';
import { Direction } from '../../types/game.types';

export class NetworkSystem {
  private socket: WebSocket | null = null;
  private connected: boolean = false;
  private playerId: string | null = null;
  private currentMapId: number;
  private callbacks: NetworkCallbacks;

  constructor(callbacks: NetworkCallbacks, initialMapId: number = 79) {
    this.callbacks = callbacks;
    this.currentMapId = initialMapId;
  }

  // Connect to server
  connect(): void {
    const wsUrl = import.meta.env.VITE_WS_URL || 'ws://localhost:8080';
    this.socket = new WebSocket(wsUrl);

    this.socket.onopen = () => {
      console.log('[NetworkSystem] Connected to server');
      this.connected = true;
    };

    this.socket.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data) as ServerMessage;
        this.handleMessage(message);
      } catch (e) {
        console.error('[NetworkSystem] Failed to parse message:', e);
      }
    };

    this.socket.onclose = () => {
      console.log('[NetworkSystem] Disconnected from server');
      this.connected = false;
    };

    this.socket.onerror = (error) => {
      console.error('[NetworkSystem] WebSocket error:', error);
    };
  }

  // Handle incoming server messages
  private handleMessage(message: ServerMessage): void {
    console.log('[NetworkSystem] Received message:', message.type);

    switch (message.type) {
      case 'INIT': {
        this.playerId = message.id;
        console.log('[NetworkSystem] My Player ID:', this.playerId);
        console.log('[NetworkSystem] Total players in INIT:', message.players.length);

        // Initialize local player
        const localPlayerData = message.players.find(p => p.id === this.playerId);
        if (localPlayerData) {
          this.callbacks.onInitLocalPlayer(localPlayerData);
        }

        // Add existing remote players
        message.players.forEach(pData => {
          if (pData.id !== this.playerId) {
            this.callbacks.onAddRemotePlayer(pData);
          }
        });
        break;
      }

      case 'PLAYER_JOIN': {
        // Don't add ourselves as a remote player
        if (message.player.id !== this.playerId) {
          this.callbacks.onAddRemotePlayer(message.player);
        }
        break;
      }

      case 'PLAYER_MOVE': {
        // Don't update ourselves (we control our own movement)
        if (message.id !== this.playerId) {
          this.callbacks.onUpdateRemotePlayer(message.id, message);
        }
        break;
      }

      case 'PLAYER_LEAVE': {
        console.log('[NetworkSystem] Player left:', message.id);
        this.callbacks.onRemoveRemotePlayer(message.id);
        break;
      }
    }
  }

  // Send move to server
  sendMove(x: number, y: number, direction: Direction, isMoving: boolean): void {
    if (this.connected && this.socket) {
      this.socket.send(JSON.stringify({
        type: 'MOVE',
        x,
        y,
        direction,
        isMoving,
        mapId: this.currentMapId
      }));
    }
  }

  // Send map transition to server
  sendMapTransition(oldMapId: number, newMapId: number, newX: number, newY: number): void {
    if (this.connected && this.socket) {
      this.currentMapId = newMapId;
      this.socket.send(JSON.stringify({
        type: 'MAP_TRANSITION',
        fromMap: oldMapId,
        toMap: newMapId,
        x: newX,
        y: newY
      }));
    }
  }

  // Update current map ID
  setCurrentMap(mapId: number): void {
    this.currentMapId = mapId;
  }

  // Get connection status
  isConnected(): boolean {
    return this.connected;
  }

  // Get player ID
  getPlayerId(): string | null {
    return this.playerId;
  }

  // Disconnect from server
  disconnect(): void {
    if (this.socket) {
      this.socket.close();
      this.socket = null;
      this.connected = false;
    }
  }
}
