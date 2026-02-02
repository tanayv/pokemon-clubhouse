# Code Refactoring Plan - Multiplayer Pokemon Game

## Current Problems
1. **Game.tsx is bloated** (500+ lines) - too many responsibilities
2. **No clear separation of concerns** - rendering, state, networking all mixed
3. **Poor scalability** - hard to add new maps, servers, features
4. **Basic routing** - tools are mixed with game logic
5. **Hard to test** - tightly coupled code

## New Architecture

### Directory Structure
```
client/src/
├── screens/                    # Main application screens
│   ├── GameScreen.tsx         # Main game screen (refactored Game.tsx)
│   └── tools/                 # Internal development tools
│       ├── AutotileMapperScreen.tsx
│       ├── AutotileTesterScreen.tsx
│       └── GrassAnimationPickerScreen.tsx
│
├── engine/                     # Game engine - business logic
│   ├── core/                  # Core engine systems
│   │   ├── GameEngine.ts      # Main coordinator - manages all systems
│   │   ├── RenderSystem.ts    # Rendering pipeline
│   │   ├── InputSystem.ts     # Input handling
│   │   └── AnimationSystem.ts # Animation management
│   │
│   ├── map/                   # Map-related systems
│   │   ├── MapSystem.ts       # Map loading, transitions, state
│   │   ├── MapRenderer.ts     # Map rendering (existing)
│   │   └── MapTransitions.ts  # Transition logic (existing)
│   │
│   ├── player/                # Player-related systems
│   │   ├── PlayerSystem.ts    # Player management (local + remote)
│   │   └── Player.ts          # Player entity (existing)
│   │
│   ├── network/               # Networking systems
│   │   └── NetworkSystem.ts   # Network management (refactored NetworkManager)
│   │
│   └── animation/             # Animation systems
│       └── GrassAnimation.ts  # Grass animation (existing)
│
├── components/                 # React UI components
│   ├── GameCanvas.tsx         # Canvas wrapper component
│   └── ui/                    # UI overlays
│       └── CoordinateDisplay.tsx
│
├── router/                     # Application routing
│   └── AppRouter.tsx          # Centralized routing logic
│
└── types/                      # Shared TypeScript types
    ├── game.types.ts          # Game-related types
    ├── map.types.ts           # Map-related types
    └── network.types.ts       # Network-related types
```

## System Responsibilities

### GameEngine (Core Coordinator)
- **Purpose**: Central coordinator for all game systems
- **Responsibilities**:
  - Initialize all systems
  - Coordinate system interactions
  - Manage game loop
  - Handle system lifecycle (start, stop, cleanup)
- **Dependencies**: All systems
- **Usage**: Created once per game instance

### RenderSystem
- **Purpose**: Handle all rendering logic
- **Responsibilities**:
  - Render map layers
  - Render players (local + remote)
  - Render animations
  - Manage camera positioning
  - Handle canvas state
- **Dependencies**: MapRenderer, Player, AnimationSystem
- **Benefits**: Centralized rendering, easier to optimize

### MapSystem
- **Purpose**: Manage map state and transitions
- **Responsibilities**:
  - Load maps
  - Handle map transitions
  - Track current map state
  - Manage map data
  - Coordinate with NetworkSystem on transitions
- **Dependencies**: MapRenderer, MapTransitions, NetworkSystem
- **Benefits**: Single source of truth for map state

### PlayerSystem
- **Purpose**: Manage all players (local and remote)
- **Responsibilities**:
  - Manage local player state
  - Manage remote players collection
  - Update player positions
  - Filter players by map
  - Sync with NetworkSystem
- **Dependencies**: Player, NetworkSystem
- **Benefits**: Clear player management, easy to scale

### InputSystem
- **Purpose**: Handle user input
- **Responsibilities**:
  - Process keyboard input
  - Validate moves with MapSystem
  - Update local player
  - Trigger animations
- **Dependencies**: Player, MapSystem, AnimationSystem
- **Benefits**: Decoupled input from game logic

### NetworkSystem
- **Purpose**: Handle all networking
- **Responsibilities**:
  - Connect to server
  - Send player moves
  - Send map transitions
  - Receive server messages
  - Notify other systems of network events
- **Dependencies**: None (pure networking)
- **Benefits**: Isolated networking logic, easy to test

### AnimationSystem
- **Purpose**: Manage all animations
- **Responsibilities**:
  - Manage grass animations
  - Manage other future animations
  - Update animation states
  - Coordinate with RenderSystem
- **Dependencies**: GrassAnimation
- **Benefits**: Centralized animation management

## Refactoring Steps

### Phase 1: Setup New Structure (Create scaffolding)
1. Create new directory structure
2. Create type definition files
3. Move existing tools to screens/tools

### Phase 2: Extract Systems (Break apart Game.tsx)
1. Create MapSystem - extract map loading/transition logic
2. Create PlayerSystem - extract player management logic
3. Create InputSystem - refactor InputHandler
4. Create NetworkSystem - refactor NetworkManager
5. Create AnimationSystem - wrap GrassAnimation
6. Create RenderSystem - extract rendering logic

### Phase 3: Create GameEngine
1. Build GameEngine to coordinate all systems
2. Implement initialization flow
3. Implement game loop
4. Implement cleanup

### Phase 4: Refactor React Components
1. Create GameCanvas - simple canvas wrapper
2. Create CoordinateDisplay - UI overlay component
3. Refactor GameScreen - use GameEngine
4. Create AppRouter - proper routing

### Phase 5: Testing & Cleanup
1. Test all functionality
2. Remove old files
3. Update imports
4. Verify multiplayer works

## Benefits of New Architecture

### Scalability
- **Multiple Maps**: MapSystem easily handles different maps
- **Multiple Servers**: NetworkSystem supports different server connections
- **Multiple Players**: PlayerSystem efficiently manages many players
- **New Features**: Easy to add new systems (weather, battles, etc.)

### Maintainability
- **Clear Responsibilities**: Each system has one job
- **Loose Coupling**: Systems communicate through interfaces
- **Easy Testing**: Systems can be tested independently
- **Better Organization**: Related code is grouped together

### Performance
- **Optimized Rendering**: RenderSystem can batch operations
- **Efficient Updates**: Systems only update what changed
- **Memory Management**: Clear lifecycle for cleanup

### Developer Experience
- **Easy to Navigate**: Clear file structure
- **Easy to Debug**: Isolated systems
- **Easy to Extend**: Add new systems without touching existing code
- **Clear Tools**: Separated from game code

## Migration Strategy
- Refactor incrementally (one system at a time)
- Keep old code working during refactor
- Test each system after extraction
- Final cutover when all systems ready
