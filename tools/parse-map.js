const fs = require('fs');
const { load } = require('@hyrious/marshal');

// Helper function to get Ruby instance variable from parsed object
function getRubyVar(obj, varName) {
  const symbols = Object.getOwnPropertySymbols(obj);
  for (const sym of symbols) {
    if (sym.toString() === `Symbol(@${varName})`) {
      return obj[sym];
    }
  }
  return undefined;
}

// Helper function to decode Uint8Array to string
function decodeString(data) {
  if (data instanceof Uint8Array) {
    return new TextDecoder('utf-8').decode(data);
  }
  return data;
}

// Parse a map file
function parseMap(mapId) {
  const mapPath = `../JohtoBlazikens Bootleg Pokemon FireRed v0.6/JohtoBlaziken's Bootleg Pokemon FireRed v0.6/Data/Map${String(mapId).padStart(3, '0')}.rxdata`;

  console.log(`Parsing map file: ${mapPath}`);

  try {
    const data = fs.readFileSync(mapPath);
    const map = load(data);

    console.log('\nMap object type:', typeof map);
    console.log('Constructor:', map?.constructor?.name);

    // Get map properties
    const width = getRubyVar(map, 'width');
    const height = getRubyVar(map, 'height');
    const tileset_id = getRubyVar(map, 'tileset_id');
    const data_tiles = getRubyVar(map, 'data');
    const events = getRubyVar(map, 'events');

    console.log('\nMap Properties:');
    console.log('Width:', width);
    console.log('Height:', height);
    console.log('Tileset ID:', tileset_id);
    console.log('Data type:', data_tiles?.constructor?.name);
    console.log('Events:', events ? Object.keys(events).length : 0);

    // RPG Maker XP uses a Table class for tile data
    // It's a 3D array: data[x, y, z] where z is the layer
    if (data_tiles) {
      console.log('\nData Table Object:');
      console.log('Type:', typeof data_tiles);
      console.log('Constructor:', data_tiles.constructor?.name);

      // List all properties (both regular and symbol)
      console.log('\nAll regular properties:', Object.keys(data_tiles));
      console.log('\nAll symbol properties:');
      const symbols = Object.getOwnPropertySymbols(data_tiles);
      console.log('Number of symbols:', symbols.length);
      for (const sym of symbols) {
        const value = data_tiles[sym];
        let display = value;
        if (value instanceof Uint8Array) {
          display = `Uint8Array(${value.length}) [${Array.from(value.slice(0, 10)).join(', ')}...]`;
        } else if (value instanceof Uint16Array) {
          display = `Uint16Array(${value.length}) [${Array.from(value.slice(0, 10)).join(', ')}...]`;
        } else if (typeof value === 'object' && value !== null) {
          display = `${value.constructor?.name || 'Object'}`;
        }
        console.log(`  ${sym.toString()}:`, display);
      }

      // Maybe the data is stored differently - try to access it as an array or buffer
      console.log('\nDirect property check:');
      console.log('Is array?', Array.isArray(data_tiles));
      console.log('Length prop:', data_tiles.length);
      console.log('Has buffer?', data_tiles.buffer !== undefined);

      // Check userDefined property
      if (data_tiles.userDefined) {
        console.log('\nuserDefined property found!');
        console.log('Type:', typeof data_tiles.userDefined);
        console.log('Is buffer?:', data_tiles.userDefined instanceof Uint8Array || data_tiles.userDefined instanceof Buffer);
        if (data_tiles.userDefined instanceof Uint8Array) {
          console.log('Length:', data_tiles.userDefined.length);
          console.log('First 50 bytes:', Array.from(data_tiles.userDefined.slice(0, 50)));
        }
      }

      console.log('\nData Table Properties:');
      const dim = getRubyVar(data_tiles, 'dim');
      const xsize = getRubyVar(data_tiles, 'xsize');
      const ysize = getRubyVar(data_tiles, 'ysize');
      const zsize = getRubyVar(data_tiles, 'zsize');
      const table_data = getRubyVar(data_tiles, 'data');

      console.log('Dimensions:', dim);
      console.log('X Size (width):', xsize);
      console.log('Y Size (height):', ysize);
      console.log('Z Size (layers):', zsize);
      console.log('Data length:', table_data ? table_data.length : 0);

      // Parse userDefined buffer if available
      let parsedXSize = xsize;
      let parsedYSize = ysize;
      let parsedZSize = zsize;
      let parsedData = table_data;

      if (data_tiles.userDefined instanceof Uint8Array) {
        const buffer = data_tiles.userDefined;
        // Read as 32-bit little-endian integers for dimensions
        const view = new DataView(buffer.buffer, buffer.byteOffset, buffer.byteLength);

        parsedXSize = view.getUint32(4, true);  // xsize at offset 4
        parsedYSize = view.getUint32(8, true);  // ysize at offset 8
        parsedZSize = view.getUint32(12, true); // zsize at offset 12

        console.log('\nParsed from userDefined buffer:');
        console.log('X Size:', parsedXSize);
        console.log('Y Size:', parsedYSize);
        console.log('Z Size:', parsedZSize);

        // Tile data starts at byte 16 (after 4 dimension values)
        // Data is stored as 16-bit integers
        const tileDataStart = 16;
        const tileCount = parsedXSize * parsedYSize * parsedZSize;
        parsedData = new Uint16Array(tileCount);

        for (let i = 0; i < tileCount; i++) {
          parsedData[i] = view.getUint16(tileDataStart + i * 2, true);
        }

        console.log('Tile data parsed, total tiles:', parsedData.length);
      }

      // Convert table to layered array
      const layers = [];
      if (parsedData && parsedXSize && parsedYSize && parsedZSize) {
        for (let z = 0; z < parsedZSize; z++) {
          const layer = [];
          for (let y = 0; y < parsedYSize; y++) {
            const row = [];
            for (let x = 0; x < parsedXSize; x++) {
              const index = x + y * parsedXSize + z * parsedXSize * parsedYSize;
              row.push(parsedData[index]);
            }
            layer.push(row);
          }
          layers.push(layer);
        }
        console.log('\nLayers created:', layers.length);
      }

      // Parse events
      const eventsList = [];
      if (events) {
        for (const [eventId, event] of Object.entries(events)) {
          const eventName = decodeString(getRubyVar(event, 'name'));
          const eventX = getRubyVar(event, 'x');
          const eventY = getRubyVar(event, 'y');

          eventsList.push({
            id: parseInt(eventId),
            name: eventName,
            x: eventX,
            y: eventY
          });
        }
      }

      // Create output JSON
      const output = {
        id: mapId,
        width: parsedXSize,
        height: parsedYSize,
        tileset_id: tileset_id,
        layers: layers,
        events: eventsList
      };

      const outputPath = `../data/maps/map-${String(mapId).padStart(3, '0')}.json`;
      fs.writeFileSync(outputPath, JSON.stringify(output, null, 2));
      console.log(`\nMap data saved to: ${outputPath}`);

      // Show a sample of the first layer (ground layer)
      if (layers.length > 0 && layers[0].length > 0) {
        console.log('\nSample tiles from layer 0 (first 5x5):');
        for (let y = 0; y < Math.min(5, parsedYSize); y++) {
          let row = '';
          for (let x = 0; x < Math.min(5, parsedXSize); x++) {
            row += String(layers[0][y][x]).padStart(4, ' ') + ' ';
          }
          console.log(row);
        }
      }

      return output;
    }

  } catch (error) {
    console.error('Error parsing map:', error);
    console.error('Stack:', error.stack);
  }
}

// Parse both Pallet Towns
console.log('=== PARSING PALLET TOWN (Map 79) ===\n');
const map79 = parseMap(79);

console.log('\n\n=== PARSING Pallet Town (Map 336) ===\n');
const map336 = parseMap(336);

console.log('\n\n=== COMPARISON ===');
if (map79 && map336) {
  console.log('Map 79 dimensions:', map79.width, 'x', map79.height);
  console.log('Map 336 dimensions:', map336.width, 'x', map336.height);
}
