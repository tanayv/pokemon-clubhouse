const fs = require('fs');

const map = JSON.parse(fs.readFileSync('/Users/tanay/code/pokemon-leaf-green/client/public/maps/map-079.json', 'utf8'));

// Water tiles are IDs 48-95 (autotile slot 1)
const isWaterTile = (tileId) => tileId >= 48 && tileId <= 95;

// Get layer 2 (index 1) - where water tiles are
const layer = map.layers[1];

console.log('Pallet Town Water Body Visualization');
console.log('=====================================\n');
console.log('Legend:');
console.log('  W = Water tile');
console.log('  . = Non-water tile');
console.log('  X,Y = position coordinates\n');

// Find the bounding box of water tiles
let minRow = Infinity, maxRow = -Infinity;
let minCol = Infinity, maxCol = -Infinity;

for (let row = 0; row < map.height; row++) {
  for (let col = 0; col < map.width; col++) {
    const tileId = layer[row][col];
    if (isWaterTile(tileId)) {
      minRow = Math.min(minRow, row);
      maxRow = Math.max(maxRow, row);
      minCol = Math.min(minCol, col);
      maxCol = Math.max(maxCol, col);
    }
  }
}

console.log(`Water region: rows ${minRow}-${maxRow}, cols ${minCol}-${maxCol}\n`);

// Print column numbers
console.log('    ', Array.from({length: maxCol - minCol + 1}, (_, i) => String(minCol + i).padStart(2, ' ')).join(' '));

// Print each row
for (let row = minRow; row <= maxRow; row++) {
  let rowStr = String(row).padStart(2, ' ') + '  ';
  for (let col = minCol; col <= maxCol; col++) {
    const tileId = layer[row][col];
    rowStr += isWaterTile(tileId) ? ' W ' : ' . ';
  }
  console.log(rowStr);
}

console.log('\n\nDetailed Tile Information:');
console.log('===========================\n');

// Now analyze each water tile and its neighbors
for (let row = minRow; row <= maxRow; row++) {
  for (let col = minCol; col <= maxCol; col++) {
    const tileId = layer[row][col];
    if (isWaterTile(tileId)) {
      const hasUp = row > 0 && isWaterTile(layer[row - 1][col]);
      const hasDown = row < map.height - 1 && isWaterTile(layer[row + 1][col]);
      const hasLeft = col > 0 && isWaterTile(layer[row][col - 1]);
      const hasRight = col < map.width - 1 && isWaterTile(layer[row][col + 1]);
      const hasUpLeft = row > 0 && col > 0 && isWaterTile(layer[row - 1][col - 1]);
      const hasUpRight = row > 0 && col < map.width - 1 && isWaterTile(layer[row - 1][col + 1]);
      const hasDownLeft = row < map.height - 1 && col > 0 && isWaterTile(layer[row + 1][col - 1]);
      const hasDownRight = row < map.height - 1 && col < map.width - 1 && isWaterTile(layer[row + 1][col + 1]);

      let patternType = 'UNKNOWN';

      // Determine pattern type based on neighbors
      if (hasUp && hasRight && hasDown && hasLeft) {
        patternType = 'Inner (all 4 cardinals)';
      } else if (!hasUp && !hasRight && !hasDown && !hasLeft) {
        patternType = 'Outer Corner (isolated)';
      } else if (hasLeft && hasRight && !hasUp && !hasDown) {
        patternType = 'Horizontal Edge';
      } else if (hasUp && hasDown && !hasLeft && !hasRight) {
        patternType = 'Vertical Edge';
      } else if (hasUp && hasLeft && !hasDown && !hasRight) {
        patternType = 'Corner (top-left)';
      } else if (hasUp && hasRight && !hasDown && !hasLeft) {
        patternType = 'Corner (top-right)';
      } else if (hasDown && hasLeft && !hasUp && !hasRight) {
        patternType = 'Corner (bottom-left)';
      } else if (hasDown && hasRight && !hasUp && !hasLeft) {
        patternType = 'Corner (bottom-right)';
      } else if (hasUp && hasLeft) {
        patternType = 'Inner Cut (needs UL diagonal: ' + (hasUpLeft ? 'YES' : 'NO') + ')';
      } else if (hasUp && hasRight) {
        patternType = 'Inner Cut (needs UR diagonal: ' + (hasUpRight ? 'YES' : 'NO') + ')';
      } else if (hasDown && hasLeft) {
        patternType = 'Inner Cut (needs DL diagonal: ' + (hasDownLeft ? 'YES' : 'NO') + ')';
      } else if (hasDown && hasRight) {
        patternType = 'Inner Cut (needs DR diagonal: ' + (hasDownRight ? 'YES' : 'NO') + ')';
      }

      console.log(`[${col},${row}] tileId=${tileId} → ${patternType}`);
      console.log(`  U:${hasUp?'Y':'N'} R:${hasRight?'Y':'N'} D:${hasDown?'Y':'N'} L:${hasLeft?'Y':'N'} | UL:${hasUpLeft?'Y':'N'} UR:${hasUpRight?'Y':'N'} DL:${hasDownLeft?'Y':'N'} DR:${hasDownRight?'Y':'N'}`);
    }
  }
}
