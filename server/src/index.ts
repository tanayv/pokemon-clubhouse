import { WebSocketServer, WebSocket } from 'ws';
import { v4 as uuidv4 } from 'uuid';
import http from 'http';

type Direction = 0 | 1 | 2 | 3;

interface Player {
  id: string;
  x: number;
  y: number;
  direction: Direction;
  isMoving: boolean;
  spriteId: number;
  mapId: number; // NEW: current map ID
}

interface MoveMessage {
  type: 'MOVE';
  x: number;
  y: number;
  direction: Direction;
  isMoving: boolean;
  mapId?: number; // NEW: optional for backward compatibility
}

interface MapTransitionMessage {
  type: 'MAP_TRANSITION';
  fromMap: number;
  toMap: number;
  x: number;
  y: number;
}

type ClientMessage = MoveMessage | MapTransitionMessage;

interface ServerInitMessage {
  type: 'INIT';
  id: string;
  players: Player[];
}

interface ServerPlayerJoinMessage {
  type: 'PLAYER_JOIN';
  player: Player;
}

interface ServerPlayerMoveMessage {
  type: 'PLAYER_MOVE';
  id: string;
  x: number;
  y: number;
  direction: Direction;
  isMoving: boolean;
  mapId?: number; // NEW: optional for map transitions
}

interface ServerPlayerLeaveMessage {
  type: 'PLAYER_LEAVE';
  id: string;
}

type ServerMessage = ServerInitMessage | ServerPlayerJoinMessage | ServerPlayerMoveMessage | ServerPlayerLeaveMessage;

const players = new Map<WebSocket, Player>();

// Number of available character sprites with walking animations
// Must match the spriteNames array in client/src/components/Game.tsx
const AVAILABLE_SPRITES = 5;

// Create HTTP server for health checks and WebSocket upgrade
const server = http.createServer((req, res) => {
  if (req.url === '/health' || req.url === '/health/') {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('healthy');
  } else {
    res.writeHead(404);
    res.end('Not found');
  }
});

// Create WebSocket server attached to HTTP server
const wss = new WebSocketServer({ server });

server.listen(8080, () => {
  console.log('Server started on port 8080');
});

wss.on('connection', (ws: WebSocket) => {
  const playerId = uuidv4();
  console.log(`Player connected: ${playerId}`);

  // Randomly assign sprite ID from available sprites with walking animations
  const spriteId = Math.floor(Math.random() * AVAILABLE_SPRITES);
  console.log(`Player ${playerId} assigned spriteId: ${spriteId}`);

  // Initialize player state
  const player: Player = {
    id: playerId,
    x: 20, // Navigational spot X in Pallet Town
    y: 1,  // One tile south of northern edge (Y: 0 is the transition point)
    direction: 0,
    isMoving: false,
    spriteId: spriteId,
    mapId: 79 // Start at Pallet Town
  };

  players.set(ws, player);

  // Send initialization message to the new player
  // Only send players on the same map (Pallet Town by default)
  const playersOnSameMap = Array.from(players.values())
    .filter(p => p.mapId === player.mapId)
    .map(p => {
      if (p.spriteId === undefined || p.spriteId === null) {
        console.warn('Player without spriteId detected! Assigning one:', p.id);
        p.spriteId = Math.floor(Math.random() * AVAILABLE_SPRITES);
      }
      return p;
    });

  const initMessage: ServerInitMessage = {
    type: 'INIT',
    id: playerId,
    players: playersOnSameMap
  };
  console.log('Sending INIT to new player:', playerId, 'with', playersOnSameMap.length, 'players on map', player.mapId);
  console.log('INIT message players:', initMessage.players.map(p => ({ id: p.id, spriteId: p.spriteId, mapId: p.mapId })));
  ws.send(JSON.stringify(initMessage));

  // Broadcast new player to everyone else
  // Verify the player object has spriteId
  console.log('Player object before broadcast:', player);
  console.log('Player.spriteId:', player.spriteId);
  console.log('Player keys:', Object.keys(player));

  const joinMessage: ServerPlayerJoinMessage = {
    type: 'PLAYER_JOIN',
    player: {
      id: player.id,
      x: player.x,
      y: player.y,
      direction: player.direction,
      isMoving: player.isMoving,
      spriteId: player.spriteId,
      mapId: player.mapId
    }
  };
  console.log('Broadcasting PLAYER_JOIN, message:', JSON.stringify(joinMessage));
  broadcastToMap(player.mapId, joinMessage, ws);

  ws.on('message', (message: Buffer) => {
    try {
      const data = JSON.parse(message.toString()) as ClientMessage;

      switch (data.type) {
        case 'MOVE': {
          // Update player state
          if (players.has(ws)) {
            const p = players.get(ws);
            if (p) {
              p.x = data.x;
              p.y = data.y;
              p.direction = data.direction;
              p.isMoving = data.isMoving;

              // Update mapId if provided (for backward compatibility)
              if (data.mapId !== undefined) {
                p.mapId = data.mapId;
              }

              // Broadcast movement to other players on the same map
              const moveMessage: ServerPlayerMoveMessage = {
                type: 'PLAYER_MOVE',
                id: playerId,
                x: p.x,
                y: p.y,
                direction: p.direction,
                isMoving: p.isMoving,
                mapId: p.mapId
              };
              broadcastToMap(p.mapId, moveMessage, ws);
            }
          }
          break;
        }

        case 'MAP_TRANSITION': {
          // Handle map transition
          if (players.has(ws)) {
            const p = players.get(ws);
            if (p) {
              console.log(`Player ${playerId} transitioning from map ${data.fromMap} to ${data.toMap}`);

              // 1. Tell players on OLD map that this player left
              const leaveMessage: ServerPlayerLeaveMessage = {
                type: 'PLAYER_LEAVE',
                id: playerId
              };
              broadcastToMap(data.fromMap, leaveMessage, ws);

              // 2. Update player's position and map ID
              p.x = data.x;
              p.y = data.y;
              p.mapId = data.toMap;
              p.isMoving = false;

              // 3. Tell players on NEW map that this player joined
              const joinMessage: ServerPlayerJoinMessage = {
                type: 'PLAYER_JOIN',
                player: {
                  id: p.id,
                  x: p.x,
                  y: p.y,
                  direction: p.direction,
                  isMoving: p.isMoving,
                  spriteId: p.spriteId,
                  mapId: p.mapId
                }
              };
              broadcastToMap(data.toMap, joinMessage, ws);

              // 4. Send current players on NEW map to transitioning player
              const playersOnNewMap: Player[] = [];
              players.forEach((otherPlayer, otherWs) => {
                if (otherPlayer.mapId === data.toMap && otherWs !== ws) {
                  playersOnNewMap.push(otherPlayer);
                }
              });

              // Send each player as a join message
              playersOnNewMap.forEach((otherPlayer) => {
                const playerJoinMsg: ServerPlayerJoinMessage = {
                  type: 'PLAYER_JOIN',
                  player: otherPlayer
                };
                ws.send(JSON.stringify(playerJoinMsg));
              });

              console.log(`Map transition complete: player ${playerId} now on map ${data.toMap} with ${playersOnNewMap.length} other players`);
            }
          }
          break;
        }
      }
    } catch (e) {
      console.error('Failed to parse message:', e);
    }
  });

  ws.on('close', () => {
    console.log(`Player disconnected: ${playerId}`);
    const disconnectedPlayer = players.get(ws);
    players.delete(ws);

    // Broadcast disconnection to players on the same map
    if (disconnectedPlayer) {
      const leaveMessage: ServerPlayerLeaveMessage = {
        type: 'PLAYER_LEAVE',
        id: playerId
      };
      broadcastToMap(disconnectedPlayer.mapId, leaveMessage);
    }
  });
});

// Broadcast to players on a specific map only
function broadcastToMap(mapId: number, message: ServerMessage, excludeWs: WebSocket | null = null): void {
  const data = JSON.stringify(message);
  players.forEach((player, ws) => {
    if (player.mapId === mapId && ws.readyState === WebSocket.OPEN && ws !== excludeWs) {
      ws.send(data);
    }
  });
}
