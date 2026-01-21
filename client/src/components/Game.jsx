import { useEffect, useRef, useState } from 'react';
import { MapRenderer } from '../engine/MapRenderer';
import { Player } from '../engine/Player';
import { InputHandler } from '../engine/InputHandler';
import { NetworkManager } from '../engine/NetworkManager';

const TILE_SIZE = 32; // Each tile is 32x32 pixels

export function Game() {
  const canvasRef = useRef(null);
  const remotePlayersRef = useRef(new Map());
  const [gameState, setGameState] = useState({
    loaded: false,
    error: null
  });
  const [canvasSize, setCanvasSize] = useState({ width: 800, height: 600 });

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
    let animationFrameId;
    let mapRenderer;
    let player;
    let inputHandler;
    let networkManager;

    // Initialize game
    const init = async () => {
      // Clear existing remote players to prevent ghosts from HMR/React Strict Mode
      remotePlayersRef.current.clear();

      try {
        // Load map data
        const mapResponse = await fetch('/maps/map-079.json');
        const mapData = await mapResponse.json();

        // Load tileset
        const tileset = new Image();
        await new Promise((resolve, reject) => {
          tileset.onload = resolve;
          tileset.onerror = reject;
          tileset.src = '/tilesets/Outside.png';
        });

        // Load player sprite
        const playerSprite = new Image();
        await new Promise((resolve, reject) => {
          playerSprite.onload = resolve;
          playerSprite.onerror = reject;
          playerSprite.src = '/characters/player.png';
        });

        // Load multiple character sprites for multiplayer
        const characterSprites = [];
        const spriteNames = [
          'npc01.png', 'npc02.png', 'npc03.png', 'npc04.png',
          'npc05.png', 'npc06.png', 'npc07.png', 'npc08.png',
          'boy_run.png', 'girl_run.png', 'player.png'
        ];

        for (const spriteName of spriteNames) {
          const sprite = new Image();
          await new Promise((resolve, reject) => {
            sprite.onload = () => {
              console.log(`Loaded sprite: ${spriteName}`);
              resolve();
            };
            sprite.onerror = () => {
              console.warn(`Failed to load ${spriteName}, skipping...`);
              resolve(); // Continue even if one fails
            };
            sprite.src = `/characters/${spriteName}`;
          });
          if (sprite.complete && sprite.naturalHeight !== 0) {
            characterSprites.push(sprite);
          }
        }
        console.log(`Total character sprites loaded: ${characterSprites.length}`);

        // Initialize renderer
        mapRenderer = new MapRenderer(mapData, tileset, TILE_SIZE);

        // Helper function to get character sprite by ID
        const getCharacterSprite = (spriteId) => {
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
          console.log(`[getCharacterSprite] Sprite loaded: ${selectedSprite.complete && selectedSprite.naturalHeight !== 0}`);

          return selectedSprite;
        };

        // Initialize player at spawn position (center of map) - will be updated with server spriteId
        const spawnX = Math.floor(mapData.width / 2);
        const spawnY = Math.floor(mapData.height / 2);

        player = new Player(
          spawnX,
          spawnY,
          playerSprite, // Temporary sprite, will be replaced when server sends INIT
          TILE_SIZE
        );

        // Initialize input handler
        inputHandler = new InputHandler(player, mapRenderer);

        // Initialize Network Manager
        const gameInterface = {
          initLocalPlayer: (playerData) => {
            // Update local player with sprite from server
            console.log('=== INITIALIZING LOCAL PLAYER ===');
            console.log('Player Data:', playerData);
            console.log('Assigned spriteId:', playerData.spriteId);
            console.log('Before sprite change:', player.sprite.src);

            const sprite = getCharacterSprite(playerData.spriteId);
            player.sprite = sprite;

            console.log('After sprite change:', player.sprite.src);
            console.log('=== LOCAL PLAYER INITIALIZED ===');
          },
          addRemotePlayer: (data) => {
            console.log('=== ADDING REMOTE PLAYER ===');
            console.log('Remote Player Data:', data);
            console.log('Remote spriteId:', data.spriteId);

            const sprite = getCharacterSprite(data.spriteId);
            const remotePlayer = new Player(data.x, data.y, sprite, TILE_SIZE);
            remotePlayer.direction = data.direction;
            remotePlayersRef.current.set(data.id, remotePlayer);

            console.log('Remote player sprite set to:', sprite.src);
            console.log('Total remote players:', remotePlayersRef.current.size);
            console.log('=== REMOTE PLAYER ADDED ===');
          },
          removeRemotePlayer: (id) => {
            remotePlayersRef.current.delete(id);
          },
          updateRemotePlayer: (id, data) => {
            const remotePlayer = remotePlayersRef.current.get(id);
            if (remotePlayer) {
              remotePlayer.setState(data.x, data.y, data.direction, data.isMoving);
            }
          }
        };

        networkManager = new NetworkManager(gameInterface);
        networkManager.connect();

        // Setup local player network sync
        player.setOnMove((x, y, direction, isMoving) => {
          networkManager.sendMove(x, y, direction, isMoving);
        });

        setGameState({ loaded: true, error: null });

        // Start game loop
        gameLoop();
      } catch (error) {
        console.error('Failed to initialize game:', error);
        setGameState({ loaded: false, error: error.message });
      }
    };

    let lastTime = 0;

    // Game loop
    const gameLoop = (timestamp) => {
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

      // Update player
      if (player) {
        player.update(safeDeltaTime);
      }

      // Calculate camera position (centered on player)
      let cameraX = 0;
      let cameraY = 0;

      if (player && mapRenderer) {
        // Calculate player's interpolated position - matches Player.render exactly
        let playerWorldX = player.x * TILE_SIZE;
        let playerWorldY = player.y * TILE_SIZE;

        // Apply same interpolation as Player.render for synchronized movement
        if (player.isMoving) {
          const dx = player.targetX - player.x;
          const dy = player.targetY - player.y;
          playerWorldX += dx * player.moveProgress * TILE_SIZE;
          playerWorldY += dy * player.moveProgress * TILE_SIZE;
        }

        // Center camera on player's interpolated position
        // Round to whole pixels to prevent rendering seams
        cameraX = Math.round(playerWorldX - canvas.width / 2 + 16); // 16 = half of 32px tile
        cameraY = Math.round(playerWorldY - canvas.height / 2 + 16);
      }

      // Render map with camera offset
      if (mapRenderer) {
        mapRenderer.render(ctx, cameraX, cameraY);
      }

      // Render remote players
      remotePlayersRef.current.forEach((remotePlayer) => {
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

      if (player) {
        // Calculate player screen position (centered)
        // We pass the BASE coordinate (without interpolation) because Player.render adds the interpolation
        // Since camera follows player (smoothly), passing base - camera means:
        // Input: (Start - (Start + Offset - Center)) = Center - Offset
        // Player.render adds Offset -> Center
        // Result: Player stays centered
        const playerScreenX = player.x * TILE_SIZE - cameraX;
        const playerScreenY = player.y * TILE_SIZE - cameraY;

        player.render(ctx, playerScreenX, playerScreenY);
      }

      animationFrameId = requestAnimationFrame(gameLoop);
    };

    init();

    // Cleanup
    return () => {
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
      if (inputHandler) {
        inputHandler.destroy();
      }
      if (networkManager) {
        networkManager.disconnect();
      }
    };
  }, [canvasSize]);

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
      overflow: 'hidden'
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
    </div>
  );
}
