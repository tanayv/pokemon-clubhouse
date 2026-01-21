# Map Data Extraction and Format Documentation

This document explains how we extract and decode map data from RPG Maker XP format used in Pokemon FireRed ROM hacking projects.

## Table of Contents
- [Overview](#overview)
- [Source Data Format](#source-data-format)
- [Extraction Process](#extraction-process)
- [Map Data Structure](#map-data-structure)
- [Tile ID System](#tile-id-system)
- [Tools](#tools)

## Overview

Pokemon FireRed ROM hacks built on RPG Maker XP store map data in Ruby Marshal format (`.rxdata` files). We convert these binary files to JSON for use in our web-based game engine.

## Source Data Format

### RPG Maker XP Data Files

The source data comes from JohtoBlaziken's Bootleg Pokemon FireRed v0.6:

```
Data/
├── MapInfos.rxdata       # Map index with names and metadata
├── Map001.rxdata         # Individual map files
├── Map002.rxdata
├── Map079.rxdata         # Pallet Town
└── ...
```

### Ruby Marshal Format

RPG Maker XP uses Ruby's `Marshal` serialization format to store game data. These files contain:
- Ruby objects with instance variables
- Custom classes (like `Table` for tile data)
- Nested data structures

## Extraction Process

### Step 1: Parse MapInfos.rxdata

**Tool**: `tools/parse-mapinfos.js`

This script:
1. Reads the binary `.rxdata` file
2. Deserializes using `@hyrious/marshal` library (Ruby Marshal parser for Node.js)
3. Extracts map metadata:
   - Map ID
   - Map name
   - Parent map (for hierarchical organization)
   - Scroll positions

**Code snippet:**
```javascript
const { load } = require('@hyrious/marshal');
const data = fs.readFileSync('MapInfos.rxdata');
const mapInfos = load(data);

// Access Ruby instance variables using symbols
function getRubyVar(obj, varName) {
  const symbols = Object.getOwnPropertySymbols(obj);
  for (const sym of symbols) {
    if (sym.toString() === `Symbol(@${varName})`) {
      return obj[sym];
    }
  }
  return undefined;
}

const mapName = getRubyVar(mapInfo, 'name');
```

**Output**: `data/mapinfos.json`
```json
{
  "79": {
    "name": "Pallet Town",
    "parent_id": 0,
    "order": 79
  }
}
```

### Step 2: Parse Individual Map Files

**Tool**: `tools/parse-map.js`

This script handles the complex RPG Maker `Table` class used for tile data.

#### Understanding the Table Class

RPG Maker's `Table` class stores a 3D grid of tiles:
- **X axis**: Map width (columns)
- **Y axis**: Map height (rows)
- **Z axis**: Layers (typically 3 layers)

**Binary Structure**:
```
Byte 0-3:   Dimensions count (always 3 for maps)
Byte 4-7:   X size (width) - 32-bit little-endian integer
Byte 8-11:  Y size (height) - 32-bit little-endian integer
Byte 12-15: Z size (layers) - 32-bit little-endian integer
Byte 16+:   Tile data - 16-bit integers (little-endian)
```

#### Parsing Algorithm

```javascript
// Read dimensions from userDefined buffer
const buffer = data_tiles.userDefined;
const view = new DataView(buffer.buffer);

const xSize = view.getUint32(4, true);   // width
const ySize = view.getUint32(8, true);   // height
const zSize = view.getUint32(12, true);  // layers

// Extract tile data (16-bit integers)
const tileDataStart = 16;
const tileCount = xSize * ySize * zSize;
const tileData = new Uint16Array(tileCount);

for (let i = 0; i < tileCount; i++) {
  tileData[i] = view.getUint16(tileDataStart + i * 2, true);
}
```

#### Converting to Layered Arrays

The flat array is converted to a nested structure for easier use:

```javascript
// Convert: data[x + y*width + z*width*height]
// To: layers[z][y][x]

const layers = [];
for (let z = 0; z < zSize; z++) {
  const layer = [];
  for (let y = 0; y < ySize; y++) {
    const row = [];
    for (let x = 0; x < xSize; x++) {
      const index = x + y * xSize + z * xSize * ySize;
      row.push(tileData[index]);
    }
    layer.push(row);
  }
  layers.push(layer);
}
```

**Output**: `client/public/maps/map-079.json`

## Map Data Structure

### JSON Format

```json
{
  "id": 79,
  "width": 36,
  "height": 20,
  "tileset_id": 1,
  "layers": [
    [
      [808, 809, 800, ...],  // Layer 0, Row 0
      [800, 801, 808, ...],  // Layer 0, Row 1
      ...
    ],
    [...],  // Layer 1
    [...]   // Layer 2
  ],
  "events": [
    {
      "id": 1,
      "name": "Sign",
      "x": 10,
      "y": 5
    }
  ]
}
```

### Layer System

RPG Maker XP maps typically have 3 layers:

1. **Layer 0 (Ground)**: Base terrain (grass, paths, water)
2. **Layer 1 (Objects)**: Buildings, trees, decorations
3. **Layer 2 (Overhead)**: Tree canopies, roof overhangs, clouds

All layers are rendered from bottom to top, with layer 2 drawn on top of the player.

## Tile ID System

### ID Ranges

RPG Maker XP uses a specific tile ID system:

| Range | Type | Description |
|-------|------|-------------|
| 0 | Empty | No tile rendered |
| 1-383 | Autotiles | Animated tiles (water, flowers, grass patterns) |
| 384+ | Static Tiles | Regular tileset tiles |

### Autotiles (IDs 0-383)

Autotiles are special animated tiles that automatically connect with adjacent tiles. Examples:
- **Water**: IDs 1-48 (animated, flows)
- **Grass patterns**: IDs 49-96 (border transitions)
- **Flowers**: IDs 260-280 (decorative)

**Rendering Challenge**: Autotiles use 47-frame animation patterns and require complex edge-matching logic. Our current implementation renders them as base grass tiles to prevent rendering gaps.

### Static Tiles (IDs 384+)

These map directly to the tileset image:

```javascript
// Calculate position in tileset
const tilesetIndex = tileId - 384;
const col = tilesetIndex % 8;  // 8 tiles per row (256px / 32px)
const row = Math.floor(tilesetIndex / 8);

const srcX = col * 32;
const srcY = row * 32;
```

**Example Tile ID Ranges**:
- **800-827**: Trees and forest tiles
- **1960-2000**: House structures (walls, roofs, windows)
- **2048-2200**: Deep water
- **3400-3500**: Building decorative elements

## Tools

### Prerequisites

```bash
cd tools
npm install
```

**Dependencies**:
- `@hyrious/marshal` - Ruby Marshal parser for Node.js

### Running the Tools

**Extract map list**:
```bash
node parse-mapinfos.js
```

**Extract specific map** (modify script for different map IDs):
```bash
node parse-map.js
# Default extracts Map 079 (Pallet Town)
```

### Tool Output

```
tools/
└── output will be in:

../data/
├── mapinfos.json          # All map names and IDs
└── maps/
    ├── map-001.json
    ├── map-079.json      # Pallet Town
    └── ...
```

## Collision Detection

Tile IDs are also used for collision detection. We maintain ranges of blocking tiles:

```javascript
const blockingRanges = [
  [800, 827],    // Trees and forest tiles
  [1280, 1400],  // Building walls and roofs
  [1536, 1600],  // Rock formations
  [1960, 2000],  // House structures
  [2048, 2200],  // Water tiles
  [2304, 2400],  // Cliffs and ledges
  [3400, 3500],  // Additional building elements
];
```

Players cannot walk on tiles within these ranges.

## Tileset Images

Tilesets are 256 pixels wide PNG images:
- Each tile: 32×32 pixels
- 8 tiles per row
- Variable height depending on tile count

**Path**: `client/public/tilesets/Outside.png`

## Future Improvements

### Proper Autotile Rendering

To fully support autotiles, we need:

1. **Animation Frames**: 3-4 frame animations for water/flowers
2. **Edge Detection**: Check adjacent tiles to determine border patterns
3. **Tile Variants**: 47 different sub-tiles per autotile set for seamless transitions

### Map Transitions

Support moving between maps:
- Detect edge tiles with warp points
- Load adjacent maps dynamically
- Handle player position across transitions

### Event Triggers

Parse and implement map events:
- Signs with text
- NPCs with dialogue
- Warp points between maps
- Item pickups

## Technical References

- **RPG Maker XP Documentation**: RGSS (Ruby Game Scripting System)
- **Ruby Marshal Format**: Ruby 1.8 Marshal specification
- **Pokemon Rom Hacking**: PokéCommunity forums and documentation

## Troubleshooting

### Issue: Black rectangles on map

**Cause**: Autotiles (ID < 384) being skipped in rendering

**Solution**: Render autotiles as base tiles:
```javascript
if (tileId < 384) {
  return { x: 0, y: 0 };  // Base grass tile
}
```

### Issue: Tiles appear garbled

**Cause**: Incorrect tileset width calculation

**Solution**: Ensure tileset is 256px wide (8 tiles):
```javascript
this.tilesetColumns = 8;
```

### Issue: Player walks through obstacles

**Cause**: Missing tile IDs in blocking ranges

**Solution**: Add new ranges to `isBlockingTile()` function after analyzing map data.

---

*For questions about map data extraction, open an issue on GitHub.*
