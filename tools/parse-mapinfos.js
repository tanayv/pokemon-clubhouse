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

// Path to the MapInfos.rxdata file
const mapInfosPath = '../JohtoBlazikens Bootleg Pokemon FireRed v0.6/JohtoBlaziken\'s Bootleg Pokemon FireRed v0.6/Data/MapInfos.rxdata';

try {
  // Read the .rxdata file
  const data = fs.readFileSync(mapInfosPath);

  // Parse using Ruby Marshal
  const mapInfos = load(data);

  console.log('Type of mapInfos:', typeof mapInfos);
  console.log('Is Array?:', Array.isArray(mapInfos));
  console.log('Total maps found:', Object.keys(mapInfos).length);

  // Log first entry to see structure
  const firstKey = Object.keys(mapInfos)[0];
  console.log('\nFirst entry (key:', firstKey, '):');
  console.log(mapInfos[firstKey]);
  console.log('Type:', typeof mapInfos[firstKey]);
  console.log('Constructor:', mapInfos[firstKey]?.constructor?.name);

  // Try to log properties
  if (mapInfos[firstKey]) {
    console.log('\nProperties of first entry:');
    for (const key in mapInfos[firstKey]) {
      console.log(`  ${key}:`, mapInfos[firstKey][key]);
    }
  }

  console.log('\n\nSearching for Pallet Town...\n');

  // Search for Pallet Town
  for (const [mapId, mapInfo] of Object.entries(mapInfos)) {
    if (mapInfo) {
      const nameData = getRubyVar(mapInfo, 'name');
      const name = decodeString(nameData);

      // Check if it contains "Pallet"
      if (name && name.toLowerCase().includes('pallet')) {
        console.log(`Found: Map ID ${mapId} - "${name}"`);
        console.log('Parent ID:', getRubyVar(mapInfo, 'parent_id'));
        console.log('Order:', getRubyVar(mapInfo, 'order'));
      }
    }
  }

  // Let's also list first 50 maps to see the structure
  console.log('\n\nFirst 50 maps:');
  const sortedIds = Object.keys(mapInfos).sort((a, b) => parseInt(a) - parseInt(b)).slice(0, 50);

  for (const mapId of sortedIds) {
    const mapInfo = mapInfos[mapId];
    if (mapInfo) {
      const nameData = getRubyVar(mapInfo, 'name');
      const name = decodeString(nameData);
      if (name) {
        console.log(`Map ${mapId.padStart(3, '0')}: ${name}`);
      }
    }
  }

  // Save full output to JSON for inspection
  const output = {};
  for (const [mapId, mapInfo] of Object.entries(mapInfos)) {
    if (mapInfo) {
      const nameData = getRubyVar(mapInfo, 'name');
      const name = decodeString(nameData);

      if (name) {
        output[mapId] = {
          name: name,
          parent_id: getRubyVar(mapInfo, 'parent_id'),
          order: getRubyVar(mapInfo, 'order'),
          expanded: getRubyVar(mapInfo, 'expanded'),
          scroll_x: getRubyVar(mapInfo, 'scroll_x'),
          scroll_y: getRubyVar(mapInfo, 'scroll_y')
        };
      }
    }
  }

  fs.writeFileSync('../data/mapinfos.json', JSON.stringify(output, null, 2));
  console.log('\n\nFull map list saved to data/mapinfos.json');

} catch (error) {
  console.error('Error parsing MapInfos:', error);
  console.error('Stack:', error.stack);
}
