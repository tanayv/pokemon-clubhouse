// Map transition configuration
// Defines how maps connect to each other

export interface MapTransition {
  // Source map
  fromMap: number;
  // Edge of the source map that triggers the transition
  edge: 'north' | 'south' | 'east' | 'west';
  // Target map to load
  toMap: number;
  // Where to place the player in the target map
  spawnX: number;
  spawnY: number;
  // Optional: specific tile range that triggers transition (if not whole edge)
  minTile?: number;
  maxTile?: number;
}

// All map transitions in the game
export const MAP_TRANSITIONS: MapTransition[] = [
  // Pallet Town (79) -> Route 1 (5)
  // Trigger at X: 20-21, Y: 0 (northernmost edge of Pallet Town)
  {
    fromMap: 79,
    edge: 'north',
    toMap: 5,
    spawnX: 20, // Spawn at X: 20 in Route 1
    spawnY: 22, // Spawn one tile north of southern edge (Y: 23 is the trigger point)
    minTile: 20,
    maxTile: 21,
  },

  // Route 1 (5) -> Pallet Town (79)
  // Trigger at X: 20-21, Y: 23 (southernmost edge of Route 1)
  {
    fromMap: 5,
    edge: 'south',
    toMap: 79,
    spawnX: 20, // Spawn at X: 20 in Pallet Town
    spawnY: 1,  // Spawn one tile south of northern edge (Y: 0 is the trigger point)
    minTile: 20,
    maxTile: 21,
  },
];

// Helper function to check if player position triggers a transition
export function checkTransition(
  currentMap: number,
  playerX: number,
  playerY: number,
  mapWidth: number,
  mapHeight: number
): MapTransition | null {
  for (const transition of MAP_TRANSITIONS) {
    if (transition.fromMap !== currentMap) continue;

    let triggered = false;

    switch (transition.edge) {
      case 'north':
        if (playerY <= 0) {
          triggered = true;
        }
        break;
      case 'south':
        if (playerY >= mapHeight - 1) {
          triggered = true;
        }
        break;
      case 'east':
        if (playerX >= mapWidth - 1) {
          triggered = true;
        }
        break;
      case 'west':
        if (playerX <= 0) {
          triggered = true;
        }
        break;
    }

    if (triggered) {
      // Check if specific tile range is defined
      if (transition.minTile !== undefined && transition.maxTile !== undefined) {
        const checkCoord = (transition.edge === 'north' || transition.edge === 'south') ? playerX : playerY;
        if (checkCoord < transition.minTile || checkCoord > transition.maxTile) {
          continue; // Not in the valid range
        }
      }

      return transition;
    }
  }

  return null;
}
