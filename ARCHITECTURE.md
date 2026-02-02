# Pokemon LeafGreen Multiplayer Architecture

## Overview
Multi-server, multi-map architecture similar to Club Penguin/Minecraft where:
- Multiple servers can run independently
- Each server hosts the entire Pokemon LeafGreen world
- Players can navigate between towns/routes
- Players only see others in the same location

## Architecture

### Server Structure
```
Server Instance
├── Game State
│   ├── Players Map<playerId, PlayerState>
│   │   ├── playerId: string
│   │   ├── x, y: number (tile coordinates)
│   │   ├── direction: 0|1|2|3
│   │   ├── mapId: number (current map)
│   │   ├── spriteId: number
│   │   └── isMoving: boolean
│   └── Maps (all loaded maps)
└── Broadcast Logic (filter by mapId)
```

### Client Structure
```
Client Instance
├── Current Player
│   ├── Position (x, y)
│   ├── Current Map (mapId)
│   └── Sprite
├── Remote Players Map<playerId, Player>
│   └── Filtered by current mapId
├── Map Renderer (current map only)
└── Network Manager
    ├── Send: position + mapId
    └── Receive: remote players (same map)
```

## Key Components

### 1. Network Protocol

**Client → Server Messages:**
```typescript
{
  type: 'MOVE',
  x: number,
  y: number,
  direction: 0|1|2|3,
  isMoving: boolean,
  mapId: number  // NEW: current map
}

{
  type: 'MAP_TRANSITION',
  fromMap: number,
  toMap: number,
  newX: number,
  newY: number
}
```

**Server → Client Messages:**
```typescript
{
  type: 'INIT',
  playerId: string,
  spriteId: number,
  x: number,
  y: number,
  mapId: number  // NEW: starting map
}

{
  type: 'PLAYER_JOINED',
  playerId: string,
  x: number,
  y: number,
  direction: 0|1|2|3,
  mapId: number,  // NEW: their current map
  spriteId: number
}

{
  type: 'PLAYER_MOVED',
  playerId: string,
  x: number,
  y: number,
  direction: 0|1|2|3,
  isMoving: boolean,
  mapId: number  // NEW: for map transitions
}

{
  type: 'PLAYER_LEFT',
  playerId: string
}
```

### 2. Server-Side Changes

**Player State:**
```typescript
interface PlayerState {
  id: string;
  x: number;
  y: number;
  direction: 0 | 1 | 2 | 3;
  mapId: number;  // NEW
  spriteId: number;
  isMoving: boolean;
}
```

**Broadcast Logic:**
```typescript
// Only broadcast to players on the same map
function broadcastToMap(mapId: number, message: any) {
  players.forEach((player, playerId) => {
    if (player.mapId === mapId) {
      connections.get(playerId)?.send(message);
    }
  });
}
```

**Map Transition Handling:**
```typescript
// When player transitions maps
function handleMapTransition(playerId: string, oldMapId: number, newMapId: number) {
  // 1. Tell players on OLD map that this player left
  broadcastToMap(oldMapId, {
    type: 'PLAYER_LEFT',
    playerId
  });

  // 2. Update player's map ID
  players.get(playerId).mapId = newMapId;

  // 3. Tell players on NEW map that this player joined
  broadcastToMap(newMapId, {
    type: 'PLAYER_JOINED',
    playerId,
    ...players.get(playerId)
  });

  // 4. Send current players on NEW map to transitioning player
  players.forEach((player, pid) => {
    if (player.mapId === newMapId && pid !== playerId) {
      sendToPlayer(playerId, {
        type: 'PLAYER_JOINED',
        playerId: pid,
        ...player
      });
    }
  });
}
```

### 3. Client-Side Changes

**Network Manager Updates:**
```typescript
class NetworkManager {
  private currentMapId: number;

  sendMove(x: number, y: number, direction: number, isMoving: boolean) {
    this.send({
      type: 'MOVE',
      x, y, direction, isMoving,
      mapId: this.currentMapId
    });
  }

  sendMapTransition(oldMapId: number, newMapId: number, newX: number, newY: number) {
    this.currentMapId = newMapId;
    this.send({
      type: 'MAP_TRANSITION',
      fromMap: oldMapId,
      toMap: newMapId,
      newX, newY
    });
  }
}
```

**Remote Player Filtering:**
```typescript
// In game loop - only render players on same map
remotePlayers.forEach((remotePlayer, playerId) => {
  if (remotePlayer.mapId === currentMapIdRef.current) {
    remotePlayer.render(ctx, screenX, screenY);
  }
});
```

**Map Transition Flow:**
```typescript
function handleMapTransition(transition: MapTransition) {
  const oldMapId = currentMapIdRef.current;

  // 1. Load new map locally
  await loadMap(transition.toMap, transition.spawnX, transition.spawnY);

  // 2. Notify server
  networkManager.sendMapTransition(
    oldMapId,
    transition.toMap,
    transition.spawnX,
    transition.spawnY
  );

  // 3. Clear remote players (server will send new ones)
  remotePlayersRef.current.clear();
}
```

### 4. Multi-Server Support

**Server Selection:**
- Client connects to specific server URL/port
- Each server runs independently
- No cross-server communication needed
- Players choose server from a list

**Server List UI (future):**
```
┌─────────────────────────────┐
│  Pokemon LeafGreen Servers  │
├─────────────────────────────┤
│ Server 1  [20/50 players]   │
│ Server 2  [45/50 players]   │
│ Server 3  [5/50 players]    │
└─────────────────────────────┘
```

## Implementation Order

1. ✅ Add mapId tracking to server player state
2. ✅ Update network protocol to include mapId
3. ✅ Implement server-side broadcast filtering
4. ✅ Update client NetworkManager to send mapId
5. ✅ Implement map transition notification to server
6. ✅ Filter remote player rendering by mapId
7. ✅ Handle PLAYER_JOINED/PLAYER_LEFT on map transitions
8. ⏳ Add server selection UI (future)
9. ⏳ Deploy multiple server instances (future)

## Benefits

✅ **Scalability**: Each map only broadcasts to relevant players
✅ **Performance**: Clients only render players in same location
✅ **Flexibility**: Easy to add new maps/areas
✅ **Social**: Players can explore together or separately
✅ **Server Support**: Multiple independent game instances
