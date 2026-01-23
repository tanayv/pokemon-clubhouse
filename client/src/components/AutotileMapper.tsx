import { useEffect, useRef, useState } from 'react';

type PatternType = 'inner' | 'outer-corner' | 'edge-horizontal' | 'edge-vertical' | 'inner-cut-corner' | 'other';

interface Mappings {
  [key: string]: PatternType;
}

const TILE_SIZE = 16;
const COLS = 6;
const ROWS = 8;
const SCALE = 4;

const patternColors: Record<PatternType, string> = {
  'inner': 'rgba(76, 175, 80, 0.5)',
  'outer-corner': 'rgba(244, 67, 54, 0.5)',
  'edge-horizontal': 'rgba(33, 150, 243, 0.5)',
  'edge-vertical': 'rgba(255, 152, 0, 0.5)',
  'inner-cut-corner': 'rgba(156, 39, 176, 0.5)',
  'other': 'rgba(158, 158, 158, 0.5)'
};

const patternLabels: Record<PatternType, string> = {
  'inner': 'Inner (Fully Surrounded)',
  'outer-corner': 'Outer Corner (Isolated)',
  'edge-horizontal': 'Edge Horizontal',
  'edge-vertical': 'Edge Vertical',
  'inner-cut-corner': 'Inner Cut Corner',
  'other': 'Other/Unknown'
};

export function AutotileMapper() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [selectedPattern, setSelectedPattern] = useState<PatternType>('inner');
  const [mappings, setMappings] = useState<Mappings>({});
  const [autotileImage, setAutotileImage] = useState<HTMLImageElement | null>(null);
  const [exportOutput, setExportOutput] = useState<string>('');

  // Load autotile image
  useEffect(() => {
    const img = new Image();
    img.onload = () => {
      setAutotileImage(img);
    };
    img.src = '/autotiles/Still water.png';
  }, []);

  // Draw grid whenever image loads or mappings change
  useEffect(() => {
    if (!autotileImage || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw the autotile image scaled up
    ctx.drawImage(autotileImage, 0, 0, canvas.width, canvas.height);

    // Draw grid lines and labels
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 1;
    ctx.font = '12px Arial';

    for (let row = 0; row < ROWS; row++) {
      for (let col = 0; col < COLS; col++) {
        const x = col * TILE_SIZE * SCALE;
        const y = row * TILE_SIZE * SCALE;

        // Draw grid lines
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 2;
        ctx.strokeRect(x, y, TILE_SIZE * SCALE, TILE_SIZE * SCALE);

        // Draw mapping overlay if exists
        const key = `${col}-${row}`;
        if (mappings[key]) {
          ctx.fillStyle = patternColors[mappings[key]];
          ctx.fillRect(x, y, TILE_SIZE * SCALE, TILE_SIZE * SCALE);
        }

        // Draw coordinates
        ctx.fillStyle = '#fff';
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 3;
        const text = `${col},${row}`;
        ctx.strokeText(text, x + 5, y + 20);
        ctx.fillStyle = '#fff';
        ctx.fillText(text, x + 5, y + 20);
      }
    }
  }, [autotileImage, mappings]);

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const col = Math.floor(x / (TILE_SIZE * SCALE));
    const row = Math.floor(y / (TILE_SIZE * SCALE));

    if (col >= 0 && col < COLS && row >= 0 && row < ROWS) {
      const key = `${col}-${row}`;
      setMappings(prev => ({
        ...prev,
        [key]: selectedPattern
      }));
    }
  };

  const exportMappings = () => {
    let result = '// RMXP Autotile Pattern Mappings\n';
    result += '// Format: {col, row}: pattern-type\n\n';
    result += 'const AUTOTILE_PATTERNS = {\n';

    // Group by pattern type
    const byPattern: Record<string, string[]> = {};
    for (const [key, pattern] of Object.entries(mappings)) {
      if (!byPattern[pattern]) byPattern[pattern] = [];
      byPattern[pattern].push(key);
    }

    for (const [pattern, keys] of Object.entries(byPattern)) {
      result += `  // ${pattern}\n`;
      for (const key of keys) {
        const [col, row] = key.split('-').map(Number);
        result += `  "${key}": "${pattern}", // col=${col}, row=${row}\n`;
      }
      result += '\n';
    }

    result += '};\n\n';
    result += '// Lookup by quadrant position:\n';
    result += '// TL (top-left), TR (top-right), BL (bottom-left), BR (bottom-right)\n\n';

    // Generate TypeScript-friendly format
    result += 'interface MiniTilePos { col: number; row: number; }\n\n';
    result += 'const PATTERN_QUADRANTS: Record<string, MiniTilePos[]> = {\n';

    for (const [pattern, keys] of Object.entries(byPattern)) {
      result += `  "${pattern}": [\n`;
      keys.forEach(key => {
        const [col, row] = key.split('-').map(Number);
        result += `    { col: ${col}, row: ${row} },\n`;
      });
      result += '  ],\n';
    }

    result += '};\n';

    setExportOutput(result);
    console.log('Mappings exported:', mappings);
  };

  const clearMappings = () => {
    if (window.confirm('Clear all mappings?')) {
      setMappings({});
      setExportOutput('');
    }
  };

  return (
    <div style={{
      fontFamily: 'Arial, sans-serif',
      padding: '20px',
      background: '#f0f0f0',
      minHeight: '100vh'
    }}>
      <div style={{
        maxWidth: '1400px',
        margin: '0 auto',
        background: 'white',
        padding: '20px',
        borderRadius: '8px',
        boxShadow: '0 2px 10px rgba(0,0,0,0.1)'
      }}>
        <h1 style={{ color: '#333' }}>🎮 RMXP Autotile Pattern Mapper</h1>

        <div style={{
          margin: '20px 0',
          padding: '15px',
          background: '#e3f2fd',
          borderLeft: '4px solid #2196F3'
        }}>
          <strong>Instructions:</strong>
          <ol>
            <li>The autotile is displayed below as a 6×8 grid (96×128 pixels divided into 16×16 mini-tiles)</li>
            <li>Select a pattern type below, then click on mini-tiles to label them</li>
            <li>Each frame (2 rows) represents one animation frame</li>
            <li>When done, click "Export Mappings" to generate the lookup table</li>
          </ol>
        </div>

        <div style={{
          margin: '20px 0',
          padding: '15px',
          background: '#f9f9f9',
          borderRadius: '4px'
        }}>
          <h3>Select Pattern Type:</h3>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
            {(Object.keys(patternLabels) as PatternType[]).map(pattern => (
              <button
                key={pattern}
                onClick={() => setSelectedPattern(pattern)}
                style={{
                  padding: '10px 20px',
                  border: `2px solid ${selectedPattern === pattern ? '#4CAF50' : '#ddd'}`,
                  background: selectedPattern === pattern ? '#4CAF50' : 'white',
                  color: selectedPattern === pattern ? 'white' : 'black',
                  cursor: 'pointer',
                  borderRadius: '4px',
                  fontSize: '14px'
                }}
              >
                {patternLabels[pattern]}
              </button>
            ))}
          </div>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '10px',
          margin: '20px 0'
        }}>
          {(Object.keys(patternColors) as PatternType[]).map(pattern => (
            <div key={pattern} style={{
              display: 'flex',
              alignItems: 'center',
              padding: '8px',
              background: '#f5f5f5',
              borderRadius: '4px'
            }}>
              <div style={{
                width: '20px',
                height: '20px',
                marginRight: '10px',
                border: '1px solid #333',
                background: patternColors[pattern]
              }} />
              <span>{patternLabels[pattern]}</span>
            </div>
          ))}
        </div>

        <div style={{
          display: 'inline-block',
          border: '2px solid #333',
          margin: '20px 0'
        }}>
          <canvas
            ref={canvasRef}
            width={COLS * TILE_SIZE * SCALE}
            height={ROWS * TILE_SIZE * SCALE}
            onClick={handleCanvasClick}
            style={{
              imageRendering: 'pixelated',
              cursor: 'crosshair'
            }}
          />
        </div>

        <div>
          <button
            onClick={exportMappings}
            style={{
              padding: '12px 24px',
              background: '#2196F3',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '16px',
              margin: '10px 5px'
            }}
          >
            📤 Export Mappings
          </button>
          <button
            onClick={clearMappings}
            style={{
              padding: '12px 24px',
              background: '#f44336',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '16px',
              margin: '10px 5px'
            }}
          >
            🗑️ Clear All
          </button>
        </div>

        {exportOutput && (
          <div style={{
            margin: '20px 0',
            padding: '15px',
            background: '#263238',
            color: '#aed581',
            fontFamily: '"Courier New", monospace',
            fontSize: '12px',
            borderRadius: '4px',
            whiteSpace: 'pre-wrap',
            maxHeight: '400px',
            overflowY: 'auto'
          }}>
            {exportOutput}
          </div>
        )}
      </div>
    </div>
  );
}
