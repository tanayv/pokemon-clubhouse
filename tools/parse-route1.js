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

    // Get map properties
    const width = getRubyVar(map, 'width');
    const height = getRubyVar(map, 'height');
    const tileset_id = getRubyVar(map, 'tileset_id');
    const data_tiles = getRubyVar(map, 'data');
    const events = getRubyVar(map, 'events');

    console.log('Map Properties:');
    console.log('  Width:', width);
    console.log('  Height:', height);
    console.log('  Tileset ID:', tileset_id);

    let parsedXSize = width;
    let parsedYSize = height;
    let parsedZSize = 3;
    let parsedData = null;

    if (data_tiles && data_tiles.userDefined instanceof Uint8Array) {
      const buffer = data_tiles.userDefined;
      const view = new DataView(buffer.buffer, buffer.byteOffset, buffer.byteLength);

      parsedXSize = view.getUint32(4, true);
      parsedYSize = view.getUint32(8, true);
      parsedZSize = view.getUint32(12, true);

      const tileDataStart = 16;
      const tileCount = parsedXSize * parsedYSize * parsedZSize;
      parsedData = new Uint16Array(tileCount);

      for (let i = 0; i < tileCount; i++) {
        parsedData[i] = view.getUint16(tileDataStart + i * 2, true);
      }
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
      console.log('  Layers created:', layers.length);
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
      console.log('  Events:', eventsList.length);
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

    const outputPath = `../client/public/maps/map-${String(mapId).padStart(3, '0')}.json`;
    fs.writeFileSync(outputPath, JSON.stringify(output, null, 2));
    console.log(`Map data saved to: ${outputPath}`);

    return output;

  } catch (error) {
    console.error('Error parsing map:', error);
    console.error('Stack:', error.stack);
  }
}

console.log('=== PARSING ROUTE 1 (Map 5) ===\n');
parseMap(5);
