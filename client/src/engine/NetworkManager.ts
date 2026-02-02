type Direction = 0 | 1 | 2 | 3;

interface PlayerData {
  id: string;
  x: number;
  y: number;
  direction: Direction;
  isMoving: boolean;
  spriteId: number;
  mapId: number; // NEW: current map ID
}

interface InitMessage {
  type: 'INIT';
  id: string;
  players: PlayerData[];
}

interface PlayerJoinMessage {
  type: 'PLAYER_JOIN';
  player: PlayerData;
}

interface PlayerMoveMessage {
  type: 'PLAYER_MOVE';
  id: string;
  x: number;
  y: number;
  direction: Direction;
  isMoving: boolean;
  mapId?: number; // NEW: optional for backward compatibility
}

interface PlayerLeaveMessage {
  type: 'PLAYER_LEAVE';
  id: string;
}

type ServerMessage = InitMessage | PlayerJoinMessage | PlayerMoveMessage | PlayerLeaveMessage;

interface MoveData {
  x: number;
  y: number;
  direction: Direction;
  isMoving: boolean;
}

interface GameInterface {
  initLocalPlayer: (data: PlayerData) => void;
  addRemotePlayer: (data: PlayerData) => void;
  removeRemotePlayer: (id: string) => void;
  updateRemotePlayer: (id: string, data: MoveData) => void;
}

export class NetworkManager {
  game: GameInterface;
  socket: WebSocket | null;
  connected: boolean;
  playerId: string | null;
  currentMapId: number; // NEW: track current map ID

  constructor(game: GameInterface, initialMapId: number = 79) {
    this.game = game;
    this.socket = null;
    this.connected = false;
    this.playerId = null;
    this.currentMapId = initialMapId; // Start at Pallet Town by default
  }

  connect(): void {
    // Use environment variable or default to localhost for development
    const wsUrl = import.meta.env.VITE_WS_URL || 'ws://localhost:8080';
    this.socket = new WebSocket(wsUrl);

    this.socket.onopen = () => {
      console.log('Connected to server');
      this.connected = true;
    };

    this.socket.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data) as ServerMessage;
        this.handleMessage(message);
      } catch (e) {
        console.error('Failed to parse message:', e);
      }
    };

    this.socket.onclose = () => {
      console.log('Disconnected from server');
      this.connected = false;
    };
  }

  handleMessage(message: ServerMessage): void {
    console.log('===== RECEIVED MESSAGE =====');
    console.log('Type:', message.type);
    console.log('Full message:', JSON.stringify(message, null, 2));

    switch (message.type) {
      case 'INIT': {
        this.playerId = message.id;
        console.log('My Player ID:', this.playerId);
        console.log('Total players in INIT:', message.players.length);

        message.players.forEach((p, i) => {
          console.log(`Player ${i}:`, { id: p.id, spriteId: p.spriteId, x: p.x, y: p.y });
        });

        // Initialize local player with sprite from server
        const localPlayerData = message.players.find(p => p.id === this.playerId);
        console.log('My player data:', localPlayerData);

        if (localPlayerData && this.game.initLocalPlayer) {
          this.game.initLocalPlayer(localPlayerData);
        }

        // Add existing players
        message.players.forEach(pData => {
          if (pData.id !== this.playerId) {
            console.log('Adding existing player from INIT:', { id: pData.id, spriteId: pData.spriteId });
            this.game.addRemotePlayer(pData);
          }
        });
        break;
      }

      case 'PLAYER_JOIN':
        console.log('PLAYER_JOIN message.player:', message.player);
        console.log('PLAYER_JOIN spriteId specifically:', message.player?.spriteId);
        // Don't add ourselves as a remote player
        if (message.player.id !== this.playerId) {
          this.game.addRemotePlayer(message.player);
        } else {
          console.warn('Received PLAYER_JOIN for local player, ignoring');
        }
        break;

      case 'PLAYER_MOVE':
        // Don't update ourselves as a remote player (we control our own movement)
        if (message.id !== this.playerId) {
          this.game.updateRemotePlayer(message.id, message);
        }
        break;

      case 'PLAYER_LEAVE':
        console.log('Player left:', message.id);
        this.game.removeRemotePlayer(message.id);
        break;
    }
  }

  sendMove(x: number, y: number, direction: Direction, isMoving: boolean): void {
    if (this.connected && this.socket) {
      this.socket.send(JSON.stringify({
        type: 'MOVE',
        x,
        y,
        direction,
        isMoving,
        mapId: this.currentMapId // NEW: include current map ID
      }));
    }
  }

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

  setCurrentMap(mapId: number): void {
    this.currentMapId = mapId;
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
  }
}
