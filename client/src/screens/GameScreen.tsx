import { useEffect, useRef, useState } from 'react';
import { GameEngine } from '../engine/core/GameEngine';
import { CanvasSize, GameState } from '../types/game.types';
import { MapAssets } from '../types/map.types';

const TILE_SIZE = 32;
const INITIAL_MAP_ID = 79; // Pallet Town
const INITIAL_SPAWN_X = 20;
const INITIAL_SPAWN_Y = 1;

export function GameScreen() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameEngineRef = useRef<GameEngine | null>(null);
  const isInitializedRef = useRef(false);

  const [gameState, setGameState] = useState<GameState>({
    loaded: false,
    error: null,
  });
  const [canvasSize, setCanvasSize] = useState<CanvasSize>({ width: 800, height: 600 });
  const [playerCoords, setPlayerCoords] = useState({ x: INITIAL_SPAWN_X, y: INITIAL_SPAWN_Y, mapId: INITIAL_MAP_ID });

  // Handle window resize to make canvas full screen
  useEffect(() => {
    const handleResize = () => {
      const windowHeight = window.innerHeight;
      const windowWidth = window.innerWidth;
      const aspectRatio = 4 / 3;

      let canvasHeight = windowHeight;
      let canvasWidth = canvasHeight * aspectRatio;

      if (canvasWidth > windowWidth) {
        canvasWidth = windowWidth;
        canvasHeight = canvasWidth / aspectRatio;
      }

      setCanvasSize({ width: Math.floor(canvasWidth), height: Math.floor(canvasHeight) });
    };

    handleResize();
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  // Initialize game engine
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const init = async () => {
      // Prevent duplicate initialization
      if (isInitializedRef.current) {
        console.warn('[GameScreen] Already initialized, skipping');
        return;
      }
      isInitializedRef.current = true;

      try {
        // Load assets
        const assets = await loadAssets();
        const characterSprites = await loadCharacterSprites();

        // Create game engine
        const gameEngine = new GameEngine({
          canvas,
          tileSize: TILE_SIZE,
          initialMapId: INITIAL_MAP_ID,
          initialSpawnX: INITIAL_SPAWN_X,
          initialSpawnY: INITIAL_SPAWN_Y,
          assets,
          characterSprites,
          playerSprite: characterSprites[2], // Default player sprite
          onCoordinateUpdate: (x, y, mapId) => {
            setPlayerCoords({ x, y, mapId });
          },
        });

        gameEngineRef.current = gameEngine;

        // Start the engine
        await gameEngine.start();

        setGameState({ loaded: true, error: null });
      } catch (error) {
        console.error('[GameScreen] Failed to initialize:', error);
        setGameState({ loaded: false, error: (error as Error).message });
      }
    };

    init();

    // Cleanup
    return () => {
      console.log('[GameScreen] Cleaning up');
      isInitializedRef.current = false;
      if (gameEngineRef.current) {
        gameEngineRef.current.destroy();
        gameEngineRef.current = null;
      }
    };
  }, []); // Only initialize once

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
        <div>
          Map ID: <span style={{ color: '#4CAF50' }}>{playerCoords.mapId}</span> |
          X: <span style={{ color: '#2196F3' }}>{playerCoords.x}</span> |
          Y: <span style={{ color: '#FF9800' }}>{playerCoords.y}</span>
        </div>
      </div>

      {/* Error Display */}
      {gameState.error && (
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          backgroundColor: 'rgba(255, 0, 0, 0.9)',
          color: '#fff',
          padding: '20px',
          borderRadius: '8px',
          maxWidth: '400px',
          textAlign: 'center',
        }}>
          <h2>Error</h2>
          <p>{gameState.error}</p>
        </div>
      )}
    </div>
  );
}

// Asset loading functions
async function loadAssets(): Promise<MapAssets> {
  console.log('[GameScreen] Loading assets...');

  // Load tileset
  const tileset = new Image();
  await new Promise((resolve, reject) => {
    tileset.onload = resolve;
    tileset.onerror = reject;
    tileset.src = '/tilesets/Outside.png';
  });

  // Load autotiles
  const autotileFiles = [
    null,
    '/autotiles/Still water.png',
    null,
    null,
    null,
    '/autotiles/Flowers1.png',
    null,
    null,
  ];

  const autotiles: HTMLImageElement[] = [];
  for (let i = 0; i < autotileFiles.length; i++) {
    if (autotileFiles[i]) {
      const autotile = new Image();
      await new Promise((resolve) => {
        autotile.onload = () => {
          console.log(`[GameScreen] Loaded autotile ${i}: ${autotileFiles[i]}`);
          resolve(null);
        };
        autotile.onerror = () => {
          console.warn(`[GameScreen] Failed to load autotile ${i}: ${autotileFiles[i]}`);
          resolve(null);
        };
        autotile.src = autotileFiles[i]!;
      });
      autotiles[i] = autotile;
    }
  }

  console.log('[GameScreen] Assets loaded');
  return { tileset, autotiles };
}

async function loadCharacterSprites(): Promise<HTMLImageElement[]> {
  console.log('[GameScreen] Loading character sprites...');

  const spriteNames = [
    'boy_run.png',
    'girl_run.png',
    'player.png',
    'npc01.png',
    'npc02.png',
  ];

  const characterSprites: HTMLImageElement[] = [];

  for (const spriteName of spriteNames) {
    const sprite = new Image();
    await new Promise((resolve) => {
      sprite.onload = () => {
        console.log(`[GameScreen] Loaded sprite: ${spriteName}`);
        resolve(null);
      };
      sprite.onerror = () => {
        console.warn(`[GameScreen] Failed to load ${spriteName}, skipping...`);
        resolve(null);
      };
      sprite.src = `/characters/${spriteName}`;
    });

    if (sprite.complete && sprite.naturalHeight !== 0) {
      characterSprites.push(sprite);
    }
  }

  console.log(`[GameScreen] Loaded ${characterSprites.length} character sprites`);
  return characterSprites;
}
