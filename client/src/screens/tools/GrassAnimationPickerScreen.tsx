import { useState, useEffect, useRef } from 'react';

// Tool to help identify the grass animation sprite frames
export function GrassAnimationPickerScreen() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [tileset, setTileset] = useState<HTMLImageElement | null>(null);
  const [selectedTiles, setSelectedTiles] = useState<number[]>([]);
  const [hoveredTile, setHoveredTile] = useState<number | null>(null);
  const [animationFrame, setAnimationFrame] = useState(0);

  const TILE_SIZE = 32;
  const TILESET_COLUMNS = 8;
  const DISPLAY_SCALE = 2; // Scale up for better visibility

  useEffect(() => {
    // Load the tileset
    const img = new Image();
    img.onload = () => {
      setTileset(img);
    };
    img.src = '/tilesets/Outside.png';
  }, []);

  useEffect(() => {
    // Animation loop for preview
    const interval = setInterval(() => {
      setAnimationFrame(prev => (prev + 1) % selectedTiles.length);
    }, 150); // 150ms per frame

    return () => clearInterval(interval);
  }, [selectedTiles.length]);

  useEffect(() => {
    if (!canvasRef.current || !tileset) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Calculate how many tiles we can show
    const tilesetRows = Math.floor(tileset.height / TILE_SIZE);
    const totalTiles = TILESET_COLUMNS * tilesetRows;

    // Draw all tiles
    for (let i = 0; i < totalTiles && i < 200; i++) {
      const col = i % TILESET_COLUMNS;
      const row = Math.floor(i / TILESET_COLUMNS);

      const x = col * TILE_SIZE * DISPLAY_SCALE;
      const y = row * TILE_SIZE * DISPLAY_SCALE;

      // Draw tile
      ctx.drawImage(
        tileset,
        col * TILE_SIZE,
        row * TILE_SIZE,
        TILE_SIZE,
        TILE_SIZE,
        x,
        y,
        TILE_SIZE * DISPLAY_SCALE,
        TILE_SIZE * DISPLAY_SCALE
      );

      // Highlight selected tiles
      if (selectedTiles.includes(i)) {
        ctx.strokeStyle = '#00ff00';
        ctx.lineWidth = 3;
        ctx.strokeRect(x, y, TILE_SIZE * DISPLAY_SCALE, TILE_SIZE * DISPLAY_SCALE);

        // Draw order number
        ctx.fillStyle = '#00ff00';
        ctx.font = 'bold 20px monospace';
        ctx.fillText(
          String(selectedTiles.indexOf(i) + 1),
          x + 5,
          y + 25
        );
      }

      // Highlight hovered tile
      if (hoveredTile === i) {
        ctx.strokeStyle = '#ffff00';
        ctx.lineWidth = 2;
        ctx.strokeRect(x, y, TILE_SIZE * DISPLAY_SCALE, TILE_SIZE * DISPLAY_SCALE);
      }

      // Draw tile ID
      ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
      ctx.fillRect(x, y + TILE_SIZE * DISPLAY_SCALE - 20, TILE_SIZE * DISPLAY_SCALE, 20);
      ctx.fillStyle = '#ffffff';
      ctx.font = '12px monospace';
      ctx.fillText(String(i + 384), x + 2, y + TILE_SIZE * DISPLAY_SCALE - 5);
    }
  }, [tileset, selectedTiles, hoveredTile]);

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const col = Math.floor(x / (TILE_SIZE * DISPLAY_SCALE));
    const row = Math.floor(y / (TILE_SIZE * DISPLAY_SCALE));
    const tileIndex = row * TILESET_COLUMNS + col;

    // Toggle selection
    setSelectedTiles(prev => {
      if (prev.includes(tileIndex)) {
        return prev.filter(t => t !== tileIndex);
      } else {
        return [...prev, tileIndex];
      }
    });
  };

  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const col = Math.floor(x / (TILE_SIZE * DISPLAY_SCALE));
    const row = Math.floor(y / (TILE_SIZE * DISPLAY_SCALE));
    const tileIndex = row * TILESET_COLUMNS + col;

    setHoveredTile(tileIndex);
  };

  const exportSelection = () => {
    const tileIds = selectedTiles.map(i => i + 384);
    console.log('Grass animation tile IDs:', tileIds);
    alert(`Grass animation tiles (in order):\n${JSON.stringify(tileIds, null, 2)}\n\nCheck console for copy-paste.`);
  };

  return (
    <div style={{ padding: '20px', backgroundColor: '#1a1a1a', minHeight: '100vh', color: '#fff' }}>
      <h1>🌿 Grass Animation Sprite Picker</h1>

      <div style={{ backgroundColor: '#2a2a2a', padding: '20px', borderRadius: '8px', marginBottom: '20px' }}>
        <h2>Instructions:</h2>
        <ol>
          <li>Look through the tileset below and find the grass animation frames</li>
          <li>Click on tiles in order: frame 1, frame 2, frame 3, frame 4</li>
          <li>The tiles should show the grass rustling/moving animation</li>
          <li>Once selected, click "Export Selection" to get the tile IDs</li>
          <li>Look for tiles that show grass with movement/rustle effect</li>
        </ol>
        <p style={{ color: '#ffaa00', marginTop: '10px' }}>
          💡 Tip: Grass animations are usually 2-4 frames. Look for tiles that show grass blades at different positions.
        </p>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <button
          onClick={exportSelection}
          disabled={selectedTiles.length === 0}
          style={{
            padding: '10px 20px',
            fontSize: '16px',
            backgroundColor: selectedTiles.length > 0 ? '#4CAF50' : '#555',
            color: '#fff',
            border: 'none',
            borderRadius: '4px',
            cursor: selectedTiles.length > 0 ? 'pointer' : 'not-allowed',
            marginRight: '10px'
          }}
        >
          Export Selection ({selectedTiles.length} tiles)
        </button>
        <button
          onClick={() => setSelectedTiles([])}
          style={{
            padding: '10px 20px',
            fontSize: '16px',
            backgroundColor: '#f44336',
            color: '#fff',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          Clear Selection
        </button>
      </div>

      {/* Animation Preview */}
      {selectedTiles.length > 0 && tileset && (
        <div style={{ backgroundColor: '#2a2a2a', padding: '20px', borderRadius: '8px', marginBottom: '20px' }}>
          <h3>Animation Preview:</h3>
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
            <canvas
              width={TILE_SIZE * 4}
              height={TILE_SIZE * 4}
              style={{
                imageRendering: 'pixelated',
                border: '2px solid #4CAF50'
              }}
              ref={(canvas) => {
                if (!canvas || !tileset) return;
                const ctx = canvas.getContext('2d');
                if (!ctx) return;

                ctx.imageSmoothingEnabled = false;
                ctx.clearRect(0, 0, canvas.width, canvas.height);

                // Draw background
                ctx.fillStyle = '#90c880';
                ctx.fillRect(0, 0, canvas.width, canvas.height);

                // Draw animated frame
                const tileIndex = selectedTiles[animationFrame];
                const col = tileIndex % TILESET_COLUMNS;
                const row = Math.floor(tileIndex / TILESET_COLUMNS);

                ctx.drawImage(
                  tileset,
                  col * TILE_SIZE,
                  row * TILE_SIZE,
                  TILE_SIZE,
                  TILE_SIZE,
                  TILE_SIZE * 1.5,
                  TILE_SIZE * 1.5,
                  TILE_SIZE,
                  TILE_SIZE
                );
              }}
            />
            <div>
              <p>Frame {animationFrame + 1} of {selectedTiles.length}</p>
              <p>Tile ID: {selectedTiles[animationFrame] + 384}</p>
            </div>
          </div>
        </div>
      )}

      {/* Tileset Grid */}
      <div style={{ overflowX: 'auto' }}>
        <canvas
          ref={canvasRef}
          width={TILESET_COLUMNS * TILE_SIZE * DISPLAY_SCALE}
          height={25 * TILE_SIZE * DISPLAY_SCALE}
          onClick={handleCanvasClick}
          onMouseMove={handleCanvasMouseMove}
          onMouseLeave={() => setHoveredTile(null)}
          style={{
            border: '2px solid #444',
            imageRendering: 'pixelated',
            cursor: 'crosshair'
          }}
        />
      </div>

      <div style={{ marginTop: '20px', padding: '15px', backgroundColor: '#2a2a2a', borderRadius: '8px' }}>
        <h3>Selected Tiles:</h3>
        <p style={{ fontFamily: 'monospace', color: '#4CAF50' }}>
          {selectedTiles.length === 0
            ? 'No tiles selected yet'
            : selectedTiles.map(i => i + 384).join(', ')}
        </p>
      </div>
    </div>
  );
}
