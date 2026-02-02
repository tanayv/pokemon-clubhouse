import { useEffect, useRef, useState } from 'react';
import { MapRenderer } from '../engine/MapRenderer';
import { Player } from '../engine/Player';
import { InputHandler } from '../engine/InputHandler';
import { NetworkManager } from '../engine/NetworkManager';
import { checkTransition } from '../engine/MapTransitions';
import { GrassAnimationManager } from '../engine/GrassAnimation';

const TILE_SIZE = 32; // Each tile is 32x32 pixels

interface MapData {
  width: number;
  height: number;
  layers: number[][][];
}

interface GameState {
  loaded: boolean;
  error: string | null;
}

interface CanvasSize {
  width: number;
  height: number;
}

export function Game() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const remotePlayersRef = useRef(new Map<string, Player>());
  const isInitializedRef = useRef(false);
  const [_gameState, setGameState] = useState<GameState>({
    loaded: false,
    error: null
  });
  const [canvasSize, setCanvasSize] = useState<CanvasSize>({ width: 800, height: 600 });
  const currentMapIdRef = useRef<number>(79); // Start at Pallet Town
  const mapDataRef = useRef<MapData | null>(null);
  const mapRendererRef = useRef<MapRenderer | null>(null);
  const playerRef = useRef<Player | null>(null);
  const grassAnimationRef = useRef<GrassAnimationManager | null>(null);
  const [playerCoords, setPlayerCoords] = useState({ x: 0, y: 0, mapId: 79 });

  // Handle window resize to make canvas full screen
  useEffect(() => {
    const handleResize = () => {
      const windowHeight = window.innerHeight;
      const windowWidth = window.innerWidth;

      // Maintain 4:3 aspect ratio (or adjust as needed)
      const aspectRatio = 4 / 3;

      // Fit to height
      let canvasHeight = windowHeight;
      let canvasWidth = canvasHeight * aspectRatio;

      // If width exceeds window width, fit to width instead
      if (canvasWidth > windowWidth) {
        canvasWidth = windowWidth;
        canvasHeight = canvasWidth / aspectRatio;
      }

      setCanvasSize({ width: Math.floor(canvasWidth), height: Math.floor(canvasHeight) });
    };

    // Set initial size
    handleResize();

    // Add resize listener
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Capture ref values for cleanup
    const remotePlayers = remotePlayersRef.current;

    let animationFrameId: number;
    let mapRenderer: MapRenderer;
    let player: Player;
    let inputHandler: InputHandler;
    let networkManager: NetworkManager;
    let grassAnimation: GrassAnimationManager;

    // Initialize game
    const init = async () => {
      // Prevent duplicate initialization (React Strict Mode protection)
      if (isInitializedRef.current) {
        console.warn('Game already initialized, skipping duplicate init');
        return;
      }
      isInitializedRef.current = true;

      // Clear existing remote players to prevent ghosts from HMR/React Strict Mode
      remotePlayers.clear();

      try {
        // Helper function to load a map
        const loadMap = async (mapId: number, spawnX?: number, spawnY?: number) => {
          console.log(`Loading map ${mapId}...`);
          const oldMapId = currentMapIdRef.current;

          const mapResponse = await fetch(`/maps/map-${String(mapId).padStart(3, '0')}.json`);
          const newMapData = await mapResponse.json() as MapData;

          // Update map data reference
          mapDataRef.current = newMapData;
          currentMapIdRef.current = mapId;

          // Create new map renderer
          if (mapRendererRef.current) {
            mapRendererRef.current.destroy();
          }
          mapRendererRef.current = new MapRenderer(newMapData, tileset, TILE_SIZE, autotiles);
          mapRenderer = mapRendererRef.current;

          // Update player position if spawn coordinates provided
          if (spawnX !== undefined && spawnY !== undefined && playerRef.current) {
            console.log(`Spawning player at (${spawnX}, ${spawnY})`);
            playerRef.current.x = spawnX;
            playerRef.current.y = spawnY;
            playerRef.current.targetX = spawnX;
            playerRef.current.targetY = spawnY;
            playerRef.current.isMoving = false;
            playerRef.current.moveProgress = 0;
            playerRef.current.mapId = mapId; // Update player's mapId

            // Update coordinate display
            setPlayerCoords({ x: spawnX, y: spawnY, mapId: currentMapIdRef.current });

            // Notify server of map transition
            if (networkManager) {
              networkManager.sendMapTransition(oldMapId, mapId, spawnX, spawnY);
            }

            // Clear remote players (server will send new ones for this map)
            remotePlayers.clear();
            console.log('Remote players cleared for map transition');

            // Clear grass animations
            if (grassAnimation) {
              grassAnimation.clear();
            }
          }

          // Update input handler with new map renderer
          if (inputHandler) {
            inputHandler.mapRenderer = mapRenderer;
          }

          console.log(`Map ${mapId} loaded successfully`);
        };

        // Load initial map - Pallet Town
        const mapResponse = await fetch('/maps/map-079.json');
        const mapData = await mapResponse.json() as MapData;
        mapDataRef.current = mapData;

        // Load tileset
        const tileset = new Image();
        await new Promise((resolve, reject) => {
          tileset.onload = resolve;
          tileset.onerror = reject;
          tileset.src = '/tilesets/Outside.png';
        });

        // Load autotiles (8 slots for RPG Maker XP)
        // Map autotile slots to image files based on the tileset configuration
        const autotileFiles = [
          null,                      // Slot 0: Not used in this map
          '/autotiles/Still water.png', // Slot 1: Water (tile IDs 48-95)
          null,                      // Slot 2: Not used
          null,                      // Slot 3: Not used
          null,                      // Slot 4: Not used
          '/autotiles/Flowers1.png', // Slot 5: Flowers (tile IDs 240-287)
          null,                      // Slot 6: Not used
          null,                      // Slot 7: Not used
        ];

        const autotiles: HTMLImageElement[] = [];
        for (let i = 0; i < autotileFiles.length; i++) {
          if (autotileFiles[i]) {
            const autotile = new Image();
            await new Promise((resolve) => {
              autotile.onload = () => {
                console.log(`Loaded autotile ${i}: ${autotileFiles[i]}`);
                resolve(null);
              };
              autotile.onerror = () => {
                console.warn(`Failed to load autotile ${i}: ${autotileFiles[i]}`);
                resolve(null);
              };
              autotile.src = autotileFiles[i]!;
            });
            autotiles[i] = autotile;
          }
        }

        // Load player sprite
        const playerSprite = new Image();
        await new Promise((resolve, reject) => {
          playerSprite.onload = resolve;
          playerSprite.onerror = reject;
          playerSprite.src = '/characters/player.png';
        });

        // Load multiple character sprites for multiplayer
        // Only include sprites with proper 4-frame walking animations
        const characterSprites: HTMLImageElement[] = [];
        const spriteNames = [
          // Trainer sprites with walking animations
          'boy_run.png',
          'girl_run.png',
          'player.png',
          // NPC sprites with walking animations (if you find some NPCs work well, add them here)
          'npc01.png',
          'npc02.png',
        ];

        for (const spriteName of spriteNames) {
          const sprite = new Image();
          await new Promise((resolve) => {
            sprite.onload = () => {
              console.log(`Loaded sprite: ${spriteName}`);
              resolve(null);
            };
            sprite.onerror = () => {
              console.warn(`Failed to load ${spriteName}, skipping...`);
              resolve(null); // Continue even if one fails
            };
            sprite.src = `/characters/${spriteName}`;
          });
          if (sprite.complete && sprite.naturalHeight !== 0) {
            characterSprites.push(sprite);
          }
        }
        console.log(`Total character sprites loaded: ${characterSprites.length}`);

        // Initialize renderer
        mapRenderer = new MapRenderer(mapData, tileset, TILE_SIZE, autotiles);
        mapRendererRef.current = mapRenderer;

        // Initialize grass animation manager
        grassAnimation = new GrassAnimationManager(TILE_SIZE);
        grassAnimationRef.current = grassAnimation;

        // Helper function to get character sprite by ID
        const getCharacterSprite = (spriteId: number): HTMLImageElement => {
          console.log(`[getCharacterSprite] Called with spriteId: ${spriteId}, Available: ${characterSprites.length} sprites`);

          if (characterSprites.length === 0) {
            console.error('[getCharacterSprite] NO SPRITES LOADED! Using fallback.');
            return playerSprite;
          }

          if (spriteId === undefined || spriteId === null) {
            console.error('[getCharacterSprite] spriteId is undefined/null! Using fallback.');
            return playerSprite;
          }

          const index = spriteId % characterSprites.length;
          const selectedSprite = characterSprites[index];
          const spriteName = spriteNames[index];

          console.log(`[getCharacterSprite] spriteId:${spriteId} -> index:${index} -> ${spriteName}`);
          console.log(`[getCharacterSprite] Sprite loaded: ${selectedSprite?.complete && selectedSprite?.naturalHeight !== 0}`);

          return selectedSprite;
        };

        // Initialize player at spawn position (near navigational spot in Pallet Town) - will be updated with server spriteId
        const spawnX = 20; // Navigational spot X
        const spawnY = 1;  // One tile south of northern edge (Y: 0 is the transition point)

        player = new Player(
          spawnX,
          spawnY,
          playerSprite, // Temporary sprite, will be replaced when server sends INIT
          TILE_SIZE
        );
        player.mapId = currentMapIdRef.current; // Set initial map ID
        playerRef.current = player;

        // Initialize coordinate display
        setPlayerCoords({ x: spawnX, y: spawnY, mapId: currentMapIdRef.current });

        // Initialize input handler
        inputHandler = new InputHandler(player, mapRenderer);

        // Initialize Network Manager
        const gameInterface = {
          initLocalPlayer: (playerData: { spriteId: number; mapId?: number }) => {
            // Update local player with sprite from server
            console.log('=== INITIALIZING LOCAL PLAYER ===');
            console.log('Player Data:', playerData);
            console.log('Assigned spriteId:', playerData.spriteId);
            console.log('Before sprite change:', player.sprite.src);

            const sprite = getCharacterSprite(playerData.spriteId);
            player.sprite = sprite;

            // Update player's mapId if provided
            if (playerData.mapId !== undefined) {
              player.mapId = playerData.mapId;
              currentMapIdRef.current = playerData.mapId;
            }

            console.log('After sprite change:', player.sprite.src);
            console.log('=== LOCAL PLAYER INITIALIZED ===');
          },
          addRemotePlayer: (data: { id: string; x: number; y: number; direction: 0 | 1 | 2 | 3; spriteId: number; mapId?: number }) => {
            console.log('=== ADDING REMOTE PLAYER ===');
            console.log('Remote Player Data:', data);
            console.log('Remote spriteId:', data.spriteId);

            const sprite = getCharacterSprite(data.spriteId);
            const remotePlayer = new Player(data.x, data.y, sprite, TILE_SIZE);
            remotePlayer.direction = data.direction;
            remotePlayer.mapId = data.mapId !== undefined ? data.mapId : currentMapIdRef.current; // Set mapId
            remotePlayers.set(data.id, remotePlayer);

            console.log('Remote player sprite set to:', sprite.src);
            console.log('Remote player mapId:', remotePlayer.mapId);
            console.log('Total remote players:', remotePlayers.size);
            console.log('=== REMOTE PLAYER ADDED ===');
          },
          removeRemotePlayer: (id: string) => {
            remotePlayers.delete(id);
          },
          updateRemotePlayer: (id: string, data: { x: number; y: number; direction: 0 | 1 | 2 | 3; isMoving: boolean }) => {
            const remotePlayer = remotePlayers.get(id);
            if (remotePlayer) {
              remotePlayer.setState(data.x, data.y, data.direction, data.isMoving);
            }
          }
        };

        networkManager = new NetworkManager(gameInterface, currentMapIdRef.current);
        networkManager.connect();

        // Setup local player network sync and map transition checking
        player.setOnMove((x, y, direction, isMoving) => {
          networkManager.sendMove(x, y, direction, isMoving);

          // Update coordinate display
          setPlayerCoords({ x, y, mapId: currentMapIdRef.current });

          // Trigger grass animation when player arrives at grass tile
          // isMoving=false means player just finished moving to position (x, y)
          if (!isMoving && mapRenderer && grassAnimation) {
            if (mapRenderer.isGrassTile(x, y)) {
              console.log(`🌿 Grass animation triggered at (${x}, ${y})`);
              grassAnimation.trigger(x, y);
            }
          }

          // Check for map transitions when player finishes moving
          if (!isMoving && mapDataRef.current) {
            const transition = checkTransition(
              currentMapIdRef.current,
              x,
              y,
              mapDataRef.current.width,
              mapDataRef.current.height
            );

            if (transition) {
              console.log(`Map transition triggered: ${currentMapIdRef.current} -> ${transition.toMap}`);
              loadMap(transition.toMap, transition.spawnX, transition.spawnY);
            }
          }
        });

        setGameState({ loaded: true, error: null });

        // Start game loop
        gameLoop();
      } catch (error) {
        console.error('Failed to initialize game:', error);
        setGameState({ loaded: false, error: (error as Error).message });
      }
    };

    let lastTime = 0;

    // Game loop
    const gameLoop = (timestamp: number = 0) => {
      // Calculate delta time
      if (!lastTime) lastTime = timestamp;
      const deltaTime = (timestamp - lastTime) / 1000; // Convert to seconds
      lastTime = timestamp;

      // Ensure deltaTime is reasonable (prevent huge jumps if tab was inactive)
      const safeDeltaTime = Math.min(deltaTime, 0.1);

      // Clear canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Update input handler (check for held keys)
      if (inputHandler) {
        inputHandler.update();
      }

      // Get current player and map renderer references
      const currentPlayer = playerRef.current || player;
      const currentMapRenderer = mapRendererRef.current || mapRenderer;
      const currentGrassAnimation = grassAnimationRef.current || grassAnimation;

      // Update player
      if (currentPlayer) {
        currentPlayer.update(safeDeltaTime);
      }

      // Update grass animations
      if (currentGrassAnimation) {
        currentGrassAnimation.update(safeDeltaTime);
      }

      // Calculate camera position (centered on player)
      let cameraX = 0;
      let cameraY = 0;

      if (currentPlayer && currentMapRenderer) {
        // Calculate player's interpolated position - matches Player.render exactly
        let playerWorldX = currentPlayer.x * TILE_SIZE;
        let playerWorldY = currentPlayer.y * TILE_SIZE;

        // Apply same interpolation as Player.render for synchronized movement
        if (currentPlayer.isMoving) {
          const dx = currentPlayer.targetX - currentPlayer.x;
          const dy = currentPlayer.targetY - currentPlayer.y;
          playerWorldX += dx * currentPlayer.moveProgress * TILE_SIZE;
          playerWorldY += dy * currentPlayer.moveProgress * TILE_SIZE;
        }

        // Center camera on player's interpolated position
        // Round to whole pixels to prevent rendering seams
        cameraX = Math.round(playerWorldX - canvas.width / 2 + 16); // 16 = half of 32px tile
        cameraY = Math.round(playerWorldY - canvas.height / 2 + 16);
      }

      // Render map with camera offset
      if (currentMapRenderer) {
        currentMapRenderer.render(ctx, cameraX, cameraY);
      }

      // Render grass animations (after map, before players)
      if (currentGrassAnimation) {
        currentGrassAnimation.render(ctx, cameraX, cameraY);
      }

      // Render remote players (only those on the same map)
      remotePlayers.forEach((remotePlayer) => {
        // Only render and update players on the same map
        if (remotePlayer.mapId !== currentMapIdRef.current) {
          return; // Skip players on different maps
        }

        remotePlayer.update(safeDeltaTime);

        // Calculate screen position relative to camera
        // We pass the BASE coordinate (without interpolation) because Player.render adds the interpolation
        // Note: remotePlayer.x is the logical grid position (start of move)
        const remoteWorldX = remotePlayer.x * TILE_SIZE;
        const remoteWorldY = remotePlayer.y * TILE_SIZE;

        const rScreenX = remoteWorldX - cameraX;
        const rScreenY = remoteWorldY - cameraY;

        remotePlayer.render(ctx, rScreenX, rScreenY);
      });

      if (currentPlayer) {
        // Calculate player screen position (centered)
        // We pass the BASE coordinate (without interpolation) because Player.render adds the interpolation
        // Since camera follows player (smoothly), passing base - camera means:
        // Input: (Start - (Start + Offset - Center)) = Center - Offset
        // Player.render adds Offset -> Center
        // Result: Player stays centered
        const playerScreenX = currentPlayer.x * TILE_SIZE - cameraX;
        const playerScreenY = currentPlayer.y * TILE_SIZE - cameraY;

        currentPlayer.render(ctx, playerScreenX, playerScreenY);
      }

      animationFrameId = requestAnimationFrame(gameLoop);
    };

    init();

    // Cleanup
    return () => {
      console.log('Cleaning up game instance');
      isInitializedRef.current = false;
      remotePlayers.clear();
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
      if (inputHandler) {
        inputHandler.destroy();
      }
      if (mapRenderer) {
        mapRenderer.destroy();
      }
      if (mapRendererRef.current) {
        mapRendererRef.current.destroy();
        mapRendererRef.current = null;
      }
      if (networkManager) {
        networkManager.disconnect();
      }
      mapDataRef.current = null;
      playerRef.current = null;
    };
  }, []); // Empty dependency array - only initialize once on mount

  return (
    <div style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      width: '100vw',
      height: '100vh',
      backgroundColor: '#000',
      margin: 0,
      padding: 0,
      overflow: 'hidden',
      position: 'relative'
    }}>
      <canvas
        ref={canvasRef}
        width={canvasSize.width}
        height={canvasSize.height}
        style={{
          imageRendering: 'pixelated',
          backgroundColor: '#000'
        }}
      />
      {/* Coordinate Display Overlay */}
      <div style={{
        position: 'absolute',
        top: '10px',
        left: '50%',
        transform: 'translateX(-50%)',
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        color: '#fff',
        padding: '10px 20px',
        borderRadius: '8px',
        fontFamily: 'monospace',
        fontSize: '16px',
        fontWeight: 'bold',
        zIndex: 1000,
        border: '2px solid #4CAF50',
        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.5)'
      }}>
        <div>Map ID: <span style={{ color: '#4CAF50' }}>{playerCoords.mapId}</span> |
        X: <span style={{ color: '#2196F3' }}>{playerCoords.x}</span> |
        Y: <span style={{ color: '#FF9800' }}>{playerCoords.y}</span></div>
      </div>
    </div>
  );
}
