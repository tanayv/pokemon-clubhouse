import { useEffect, useRef, useState } from 'react';

// Test water layout matching Pallet Town more closely
// Water extends beyond bottom of map, so no bottom edge
const WATER_LAYOUT = [
  [0, 0, 0, 0, 0, 0], // Row above water (grass)
  [0, 1, 1, 1, 1, 0], // Row 17 - top edge with corners
  [0, 1, 1, 1, 1, 0], // Row 18 - middle (fully surrounded)
  [0, 1, 1, 1, 1, 0], // Row 19 - continues downward
  [0, 1, 1, 1, 1, 0], // Row 20 - water continues (extends off-map)
  [0, 1, 1, 1, 1, 0], // Row 21 - water continues (extends off-map)
];

const TILE_SIZE = 32;
const MINI_TILE = 16;
const SCALE = 1.5; // Scale up for visibility (reduced to fit more on screen)

type AlgorithmFunc = (
  row: number,
  col: number,
  quadrant: 'TL' | 'TR' | 'BL' | 'BR'
) => { col: number; row: number };

export function AutotileTesterScreen() {
  const canvasRefs = useRef<(HTMLCanvasElement | null)[]>([]);
  const [autotileImage, setAutotileImage] = useState<HTMLImageElement | null>(null);
  const [selectedAlgorithm, setSelectedAlgorithm] = useState<number | null>(null);

  // Load autotile image
  useEffect(() => {
    const img = new Image();
    img.src = '/autotiles/Still water.png';
    img.onload = () => {
      setAutotileImage(img);
    };
  }, []);

  // Helper: Check if a position has water
  const hasWater = (row: number, col: number): boolean => {
    if (row < 0 || row >= WATER_LAYOUT.length) return false;
    if (col < 0 || col >= WATER_LAYOUT[0].length) return false;
    return WATER_LAYOUT[row][col] === 1;
  };

  // Algorithm 1: Current implementation
  const algorithm1: AlgorithmFunc = (row, col, quadrant) => {
    const hasLeft = hasWater(row, col - 1);
    const hasRight = hasWater(row, col + 1);
    const hasUp = hasWater(row - 1, col);
    const hasDown = hasWater(row + 1, col);
    const hasUpLeft = hasWater(row - 1, col - 1);
    const hasUpRight = hasWater(row - 1, col + 1);
    const hasDownLeft = hasWater(row + 1, col - 1);
    const hasDownRight = hasWater(row + 1, col + 1);

    let hasAdjacent1: boolean, hasAdjacent2: boolean, hasDiagonal: boolean;

    if (quadrant === 'TL') {
      hasAdjacent1 = hasLeft;
      hasAdjacent2 = hasUp;
      hasDiagonal = hasUpLeft;
    } else if (quadrant === 'TR') {
      hasAdjacent1 = hasRight;
      hasAdjacent2 = hasUp;
      hasDiagonal = hasUpRight;
    } else if (quadrant === 'BL') {
      hasAdjacent1 = hasLeft;
      hasAdjacent2 = hasDown;
      hasDiagonal = hasDownLeft;
    } else {
      hasAdjacent1 = hasRight;
      hasAdjacent2 = hasDown;
      hasDiagonal = hasDownRight;
    }

    if (hasAdjacent1 && hasAdjacent2) {
      if (hasDiagonal) {
        // Inner
        if (quadrant === 'TL') return { col: 1, row: 3 };
        if (quadrant === 'TR') return { col: 2, row: 3 };
        if (quadrant === 'BL') return { col: 1, row: 4 };
        return { col: 2, row: 4 };
      } else {
        // Inner-cut corner
        if (quadrant === 'TL') return { col: 0, row: 0 };
        if (quadrant === 'TR') return { col: 1, row: 0 };
        if (quadrant === 'BL') return { col: 4, row: 0 };
        return { col: 5, row: 0 };
      }
    } else if (!hasAdjacent1 && !hasAdjacent2) {
      // Outer corner
      if (quadrant === 'TL') return { col: 2, row: 0 };
      if (quadrant === 'TR') return { col: 3, row: 0 };
      if (quadrant === 'BL') return { col: 2, row: 1 };
      return { col: 3, row: 1 };
    } else if (hasAdjacent1 && !hasAdjacent2) {
      // Edge-vertical
      if (quadrant === 'TL') return { col: 0, row: 3 };
      if (quadrant === 'TR') return { col: 5, row: 3 };
      if (quadrant === 'BL') return { col: 0, row: 4 };
      return { col: 5, row: 4 };
    } else {
      // Edge-horizontal
      if (quadrant === 'TL') return { col: 1, row: 2 };
      if (quadrant === 'TR') return { col: 2, row: 2 };
      if (quadrant === 'BL') return { col: 3, row: 2 };
      return { col: 4, row: 2 };
    }
  };

  // Algorithm 2: Swap inner rows (3-4 vs 4-5)
  const algorithm2: AlgorithmFunc = (row, col, quadrant) => {
    const result = algorithm1(row, col, quadrant);
    // If it's using inner tiles (row 3-4), swap to 4-5
    if (result.row === 3) return { col: result.col, row: 4 };
    if (result.row === 4) return { col: result.col, row: 5 };
    return result;
  };

  // Algorithm 3: Inverted edge logic
  const algorithm3: AlgorithmFunc = (row, col, quadrant) => {
    const hasLeft = hasWater(row, col - 1);
    const hasRight = hasWater(row, col + 1);
    const hasUp = hasWater(row - 1, col);
    const hasDown = hasWater(row + 1, col);
    const hasUpLeft = hasWater(row - 1, col - 1);
    const hasUpRight = hasWater(row - 1, col + 1);
    const hasDownLeft = hasWater(row + 1, col - 1);
    const hasDownRight = hasWater(row + 1, col + 1);

    let hasAdjacent1: boolean, hasAdjacent2: boolean, hasDiagonal: boolean;

    if (quadrant === 'TL') {
      hasAdjacent1 = hasLeft;
      hasAdjacent2 = hasUp;
      hasDiagonal = hasUpLeft;
    } else if (quadrant === 'TR') {
      hasAdjacent1 = hasRight;
      hasAdjacent2 = hasUp;
      hasDiagonal = hasUpRight;
    } else if (quadrant === 'BL') {
      hasAdjacent1 = hasLeft;
      hasAdjacent2 = hasDown;
      hasDiagonal = hasDownLeft;
    } else {
      hasAdjacent1 = hasRight;
      hasAdjacent2 = hasDown;
      hasDiagonal = hasDownRight;
    }

    if (hasAdjacent1 && hasAdjacent2) {
      if (hasDiagonal) {
        // Inner
        if (quadrant === 'TL') return { col: 1, row: 3 };
        if (quadrant === 'TR') return { col: 2, row: 3 };
        if (quadrant === 'BL') return { col: 1, row: 4 };
        return { col: 2, row: 4 };
      } else {
        // Inner-cut corner
        if (quadrant === 'TL') return { col: 0, row: 0 };
        if (quadrant === 'TR') return { col: 1, row: 0 };
        if (quadrant === 'BL') return { col: 4, row: 0 };
        return { col: 5, row: 0 };
      }
    } else if (!hasAdjacent1 && !hasAdjacent2) {
      // Outer corner
      if (quadrant === 'TL') return { col: 2, row: 0 };
      if (quadrant === 'TR') return { col: 3, row: 0 };
      if (quadrant === 'BL') return { col: 2, row: 1 };
      return { col: 3, row: 1 };
    } else if (hasAdjacent1 && !hasAdjacent2) {
      // SWAPPED: horizontal neighbor = edge-horizontal
      if (quadrant === 'TL') return { col: 1, row: 2 };
      if (quadrant === 'TR') return { col: 2, row: 2 };
      if (quadrant === 'BL') return { col: 3, row: 2 };
      return { col: 4, row: 2 };
    } else {
      // SWAPPED: vertical neighbor = edge-vertical
      if (quadrant === 'TL') return { col: 0, row: 3 };
      if (quadrant === 'TR') return { col: 5, row: 3 };
      if (quadrant === 'BL') return { col: 0, row: 4 };
      return { col: 5, row: 4 };
    }
  };

  // Algorithm 4: Completely different coordinate mapping
  const algorithm4: AlgorithmFunc = (row, col, quadrant) => {
    const hasLeft = hasWater(row, col - 1);
    const hasRight = hasWater(row, col + 1);
    const hasUp = hasWater(row - 1, col);
    const hasDown = hasWater(row + 1, col);
    const hasUpLeft = hasWater(row - 1, col - 1);
    const hasUpRight = hasWater(row - 1, col + 1);
    const hasDownLeft = hasWater(row + 1, col - 1);
    const hasDownRight = hasWater(row + 1, col + 1);

    let hasAdjacent1: boolean, hasAdjacent2: boolean, hasDiagonal: boolean;

    if (quadrant === 'TL') {
      hasAdjacent1 = hasLeft;
      hasAdjacent2 = hasUp;
      hasDiagonal = hasUpLeft;
    } else if (quadrant === 'TR') {
      hasAdjacent1 = hasRight;
      hasAdjacent2 = hasUp;
      hasDiagonal = hasUpRight;
    } else if (quadrant === 'BL') {
      hasAdjacent1 = hasLeft;
      hasAdjacent2 = hasDown;
      hasDiagonal = hasDownLeft;
    } else {
      hasAdjacent1 = hasRight;
      hasAdjacent2 = hasDown;
      hasDiagonal = hasDownRight;
    }

    if (hasAdjacent1 && hasAdjacent2) {
      if (hasDiagonal) {
        // Inner - use cols 3-4
        if (quadrant === 'TL') return { col: 3, row: 3 };
        if (quadrant === 'TR') return { col: 4, row: 3 };
        if (quadrant === 'BL') return { col: 3, row: 4 };
        return { col: 4, row: 4 };
      } else {
        // Inner-cut corner - use row 2 cols 0,5
        if (quadrant === 'TL') return { col: 0, row: 2 };
        if (quadrant === 'TR') return { col: 5, row: 2 };
        if (quadrant === 'BL') return { col: 0, row: 2 };
        return { col: 5, row: 2 };
      }
    } else if (!hasAdjacent1 && !hasAdjacent2) {
      // Outer corner - use cols 0,5
      if (quadrant === 'TL') return { col: 0, row: 0 };
      if (quadrant === 'TR') return { col: 5, row: 0 };
      if (quadrant === 'BL') return { col: 0, row: 1 };
      return { col: 5, row: 1 };
    } else if (hasAdjacent1 && !hasAdjacent2) {
      // Edge-vertical
      if (quadrant === 'TL') return { col: 0, row: 3 };
      if (quadrant === 'TR') return { col: 5, row: 3 };
      if (quadrant === 'BL') return { col: 0, row: 4 };
      return { col: 5, row: 4 };
    } else {
      // Edge-horizontal
      if (quadrant === 'TL') return { col: 3, row: 2 };
      if (quadrant === 'TR') return { col: 4, row: 2 };
      if (quadrant === 'BL') return { col: 1, row: 2 };
      return { col: 2, row: 2 };
    }
  };

  // Algorithm 5: Use rows 5-6 for inner
  const algorithm5: AlgorithmFunc = (row, col, quadrant) => {
    const hasLeft = hasWater(row, col - 1);
    const hasRight = hasWater(row, col + 1);
    const hasUp = hasWater(row - 1, col);
    const hasDown = hasWater(row + 1, col);
    const hasUpLeft = hasWater(row - 1, col - 1);
    const hasUpRight = hasWater(row - 1, col + 1);
    const hasDownLeft = hasWater(row + 1, col - 1);
    const hasDownRight = hasWater(row + 1, col + 1);

    let hasAdjacent1: boolean, hasAdjacent2: boolean, hasDiagonal: boolean;

    if (quadrant === 'TL') {
      hasAdjacent1 = hasLeft;
      hasAdjacent2 = hasUp;
      hasDiagonal = hasUpLeft;
    } else if (quadrant === 'TR') {
      hasAdjacent1 = hasRight;
      hasAdjacent2 = hasUp;
      hasDiagonal = hasUpRight;
    } else if (quadrant === 'BL') {
      hasAdjacent1 = hasLeft;
      hasAdjacent2 = hasDown;
      hasDiagonal = hasDownLeft;
    } else {
      hasAdjacent1 = hasRight;
      hasAdjacent2 = hasDown;
      hasDiagonal = hasDownRight;
    }

    if (hasAdjacent1 && hasAdjacent2) {
      if (hasDiagonal) {
        // Inner - use rows 5-6
        if (quadrant === 'TL') return { col: 1, row: 5 };
        if (quadrant === 'TR') return { col: 2, row: 5 };
        if (quadrant === 'BL') return { col: 1, row: 6 };
        return { col: 2, row: 6 };
      } else {
        // Inner-cut corner
        if (quadrant === 'TL') return { col: 0, row: 0 };
        if (quadrant === 'TR') return { col: 1, row: 0 };
        if (quadrant === 'BL') return { col: 4, row: 0 };
        return { col: 5, row: 0 };
      }
    } else if (!hasAdjacent1 && !hasAdjacent2) {
      // Outer corner
      if (quadrant === 'TL') return { col: 2, row: 0 };
      if (quadrant === 'TR') return { col: 3, row: 0 };
      if (quadrant === 'BL') return { col: 2, row: 1 };
      return { col: 3, row: 1 };
    } else if (hasAdjacent1 && !hasAdjacent2) {
      // Edge-vertical
      if (quadrant === 'TL') return { col: 0, row: 5 };
      if (quadrant === 'TR') return { col: 5, row: 5 };
      if (quadrant === 'BL') return { col: 0, row: 6 };
      return { col: 5, row: 6 };
    } else {
      // Edge-horizontal
      if (quadrant === 'TL') return { col: 1, row: 2 };
      if (quadrant === 'TR') return { col: 2, row: 2 };
      if (quadrant === 'BL') return { col: 3, row: 2 };
      return { col: 4, row: 2 };
    }
  };

  // Algorithm 6: Use row 1 for edges, different inner-cut
  const algorithm6: AlgorithmFunc = (row, col, quadrant) => {
    const hasLeft = hasWater(row, col - 1);
    const hasRight = hasWater(row, col + 1);
    const hasUp = hasWater(row - 1, col);
    const hasDown = hasWater(row + 1, col);
    const hasUpLeft = hasWater(row - 1, col - 1);
    const hasUpRight = hasWater(row - 1, col + 1);
    const hasDownLeft = hasWater(row + 1, col - 1);
    const hasDownRight = hasWater(row + 1, col + 1);

    let hasAdjacent1: boolean, hasAdjacent2: boolean, hasDiagonal: boolean;

    if (quadrant === 'TL') {
      hasAdjacent1 = hasLeft;
      hasAdjacent2 = hasUp;
      hasDiagonal = hasUpLeft;
    } else if (quadrant === 'TR') {
      hasAdjacent1 = hasRight;
      hasAdjacent2 = hasUp;
      hasDiagonal = hasUpRight;
    } else if (quadrant === 'BL') {
      hasAdjacent1 = hasLeft;
      hasAdjacent2 = hasDown;
      hasDiagonal = hasDownLeft;
    } else {
      hasAdjacent1 = hasRight;
      hasAdjacent2 = hasDown;
      hasDiagonal = hasDownRight;
    }

    if (hasAdjacent1 && hasAdjacent2) {
      if (hasDiagonal) {
        // Inner
        if (quadrant === 'TL') return { col: 1, row: 3 };
        if (quadrant === 'TR') return { col: 2, row: 3 };
        if (quadrant === 'BL') return { col: 1, row: 4 };
        return { col: 2, row: 4 };
      } else {
        // Inner-cut corner - different mapping
        if (quadrant === 'TL') return { col: 4, row: 1 };
        if (quadrant === 'TR') return { col: 5, row: 1 };
        if (quadrant === 'BL') return { col: 4, row: 1 };
        return { col: 5, row: 1 };
      }
    } else if (!hasAdjacent1 && !hasAdjacent2) {
      // Outer corner - try row 1
      if (quadrant === 'TL') return { col: 0, row: 0 };
      if (quadrant === 'TR') return { col: 1, row: 0 };
      if (quadrant === 'BL') return { col: 4, row: 0 };
      return { col: 5, row: 0 };
    } else if (hasAdjacent1 && !hasAdjacent2) {
      // Edge-vertical - use row 1
      if (quadrant === 'TL') return { col: 0, row: 1 };
      if (quadrant === 'TR') return { col: 5, row: 1 };
      if (quadrant === 'BL') return { col: 0, row: 1 };
      return { col: 5, row: 1 };
    } else {
      // Edge-horizontal - use row 1
      if (quadrant === 'TL') return { col: 2, row: 1 };
      if (quadrant === 'TR') return { col: 3, row: 1 };
      if (quadrant === 'BL') return { col: 2, row: 1 };
      return { col: 3, row: 1 };
    }
  };

  // Algorithm 7: Simple symmetric approach
  const algorithm7: AlgorithmFunc = (row, col, quadrant) => {
    const hasLeft = hasWater(row, col - 1);
    const hasRight = hasWater(row, col + 1);
    const hasUp = hasWater(row - 1, col);
    const hasDown = hasWater(row + 1, col);
    const hasUpLeft = hasWater(row - 1, col - 1);
    const hasUpRight = hasWater(row - 1, col + 1);
    const hasDownLeft = hasWater(row + 1, col - 1);
    const hasDownRight = hasWater(row + 1, col + 1);

    let hasAdjacent1: boolean, hasAdjacent2: boolean, hasDiagonal: boolean;

    if (quadrant === 'TL') {
      hasAdjacent1 = hasLeft;
      hasAdjacent2 = hasUp;
      hasDiagonal = hasUpLeft;
    } else if (quadrant === 'TR') {
      hasAdjacent1 = hasRight;
      hasAdjacent2 = hasUp;
      hasDiagonal = hasUpRight;
    } else if (quadrant === 'BL') {
      hasAdjacent1 = hasLeft;
      hasAdjacent2 = hasDown;
      hasDiagonal = hasDownLeft;
    } else {
      hasAdjacent1 = hasRight;
      hasAdjacent2 = hasDown;
      hasDiagonal = hasDownRight;
    }

    // Same tile for all quadrants based on pattern
    if (hasAdjacent1 && hasAdjacent2 && hasDiagonal) {
      return { col: 1, row: 3 }; // All inner use same
    } else if (hasAdjacent1 && hasAdjacent2 && !hasDiagonal) {
      return { col: 0, row: 0 }; // All inner-cut use same
    } else if (!hasAdjacent1 && !hasAdjacent2) {
      return { col: 2, row: 0 }; // All outer use same
    } else if (hasAdjacent1 && !hasAdjacent2) {
      return { col: 0, row: 3 }; // All edge-vert use same
    } else {
      return { col: 1, row: 2 }; // All edge-horiz use same
    }
  };

  // Algorithm 8: Use cols 3-4, rows 5-7
  const algorithm8: AlgorithmFunc = (row, col, quadrant) => {
    const hasLeft = hasWater(row, col - 1);
    const hasRight = hasWater(row, col + 1);
    const hasUp = hasWater(row - 1, col);
    const hasDown = hasWater(row + 1, col);
    const hasUpLeft = hasWater(row - 1, col - 1);
    const hasUpRight = hasWater(row - 1, col + 1);
    const hasDownLeft = hasWater(row + 1, col - 1);
    const hasDownRight = hasWater(row + 1, col + 1);

    let hasAdjacent1: boolean, hasAdjacent2: boolean, hasDiagonal: boolean;

    if (quadrant === 'TL') {
      hasAdjacent1 = hasLeft;
      hasAdjacent2 = hasUp;
      hasDiagonal = hasUpLeft;
    } else if (quadrant === 'TR') {
      hasAdjacent1 = hasRight;
      hasAdjacent2 = hasUp;
      hasDiagonal = hasUpRight;
    } else if (quadrant === 'BL') {
      hasAdjacent1 = hasLeft;
      hasAdjacent2 = hasDown;
      hasDiagonal = hasDownLeft;
    } else {
      hasAdjacent1 = hasRight;
      hasAdjacent2 = hasDown;
      hasDiagonal = hasDownRight;
    }

    if (hasAdjacent1 && hasAdjacent2) {
      if (hasDiagonal) {
        // Inner - use cols 3-4, rows 5-6
        if (quadrant === 'TL') return { col: 3, row: 5 };
        if (quadrant === 'TR') return { col: 4, row: 5 };
        if (quadrant === 'BL') return { col: 3, row: 6 };
        return { col: 4, row: 6 };
      } else {
        // Inner-cut corner
        if (quadrant === 'TL') return { col: 0, row: 0 };
        if (quadrant === 'TR') return { col: 1, row: 0 };
        if (quadrant === 'BL') return { col: 4, row: 0 };
        return { col: 5, row: 0 };
      }
    } else if (!hasAdjacent1 && !hasAdjacent2) {
      // Outer corner
      if (quadrant === 'TL') return { col: 2, row: 0 };
      if (quadrant === 'TR') return { col: 3, row: 0 };
      if (quadrant === 'BL') return { col: 2, row: 1 };
      return { col: 3, row: 1 };
    } else if (hasAdjacent1 && !hasAdjacent2) {
      // Edge-vertical - use cols 3-4
      if (quadrant === 'TL') return { col: 3, row: 7 };
      if (quadrant === 'TR') return { col: 4, row: 7 };
      if (quadrant === 'BL') return { col: 3, row: 7 };
      return { col: 4, row: 7 };
    } else {
      // Edge-horizontal - use cols 3-4
      if (quadrant === 'TL') return { col: 3, row: 2 };
      if (quadrant === 'TR') return { col: 4, row: 2 };
      if (quadrant === 'BL') return { col: 3, row: 2 };
      return { col: 4, row: 2 };
    }
  };

  // Algorithm 9: Try ignoring diagonals completely
  const algorithm9: AlgorithmFunc = (row, col, quadrant) => {
    const hasLeft = hasWater(row, col - 1);
    const hasRight = hasWater(row, col + 1);
    const hasUp = hasWater(row - 1, col);
    const hasDown = hasWater(row + 1, col);

    let hasAdjacent1: boolean, hasAdjacent2: boolean;

    if (quadrant === 'TL') {
      hasAdjacent1 = hasLeft;
      hasAdjacent2 = hasUp;
    } else if (quadrant === 'TR') {
      hasAdjacent1 = hasRight;
      hasAdjacent2 = hasUp;
    } else if (quadrant === 'BL') {
      hasAdjacent1 = hasLeft;
      hasAdjacent2 = hasDown;
    } else {
      hasAdjacent1 = hasRight;
      hasAdjacent2 = hasDown;
    }

    if (hasAdjacent1 && hasAdjacent2) {
      // Both neighbors - always inner (ignore diagonal)
      if (quadrant === 'TL') return { col: 1, row: 3 };
      if (quadrant === 'TR') return { col: 2, row: 3 };
      if (quadrant === 'BL') return { col: 1, row: 4 };
      return { col: 2, row: 4 };
    } else if (!hasAdjacent1 && !hasAdjacent2) {
      // Outer corner
      if (quadrant === 'TL') return { col: 2, row: 0 };
      if (quadrant === 'TR') return { col: 3, row: 0 };
      if (quadrant === 'BL') return { col: 2, row: 1 };
      return { col: 3, row: 1 };
    } else if (hasAdjacent1 && !hasAdjacent2) {
      // Edge-vertical
      if (quadrant === 'TL') return { col: 0, row: 3 };
      if (quadrant === 'TR') return { col: 5, row: 3 };
      if (quadrant === 'BL') return { col: 0, row: 4 };
      return { col: 5, row: 4 };
    } else {
      // Edge-horizontal
      if (quadrant === 'TL') return { col: 1, row: 2 };
      if (quadrant === 'TR') return { col: 2, row: 2 };
      if (quadrant === 'BL') return { col: 3, row: 2 };
      return { col: 4, row: 2 };
    }
  };

  // Algorithm 10: Like Algo 3 but use cols 0,1 for horizontal edges
  const algorithm10: AlgorithmFunc = (row, col, quadrant) => {
    const hasLeft = hasWater(row, col - 1);
    const hasRight = hasWater(row, col + 1);
    const hasUp = hasWater(row - 1, col);
    const hasDown = hasWater(row + 1, col);
    const hasUpLeft = hasWater(row - 1, col - 1);
    const hasUpRight = hasWater(row - 1, col + 1);
    const hasDownLeft = hasWater(row + 1, col - 1);
    const hasDownRight = hasWater(row + 1, col + 1);

    let hasAdjacent1: boolean, hasAdjacent2: boolean, hasDiagonal: boolean;

    if (quadrant === 'TL') {
      hasAdjacent1 = hasLeft;
      hasAdjacent2 = hasUp;
      hasDiagonal = hasUpLeft;
    } else if (quadrant === 'TR') {
      hasAdjacent1 = hasRight;
      hasAdjacent2 = hasUp;
      hasDiagonal = hasUpRight;
    } else if (quadrant === 'BL') {
      hasAdjacent1 = hasLeft;
      hasAdjacent2 = hasDown;
      hasDiagonal = hasDownLeft;
    } else {
      hasAdjacent1 = hasRight;
      hasAdjacent2 = hasDown;
      hasDiagonal = hasDownRight;
    }

    if (hasAdjacent1 && hasAdjacent2) {
      if (hasDiagonal) {
        // Inner
        if (quadrant === 'TL') return { col: 1, row: 3 };
        if (quadrant === 'TR') return { col: 2, row: 3 };
        if (quadrant === 'BL') return { col: 1, row: 4 };
        return { col: 2, row: 4 };
      } else {
        // Inner-cut corner
        if (quadrant === 'TL') return { col: 0, row: 0 };
        if (quadrant === 'TR') return { col: 1, row: 0 };
        if (quadrant === 'BL') return { col: 4, row: 0 };
        return { col: 5, row: 0 };
      }
    } else if (!hasAdjacent1 && !hasAdjacent2) {
      // Outer corner
      if (quadrant === 'TL') return { col: 2, row: 0 };
      if (quadrant === 'TR') return { col: 3, row: 0 };
      if (quadrant === 'BL') return { col: 2, row: 1 };
      return { col: 3, row: 1 };
    } else if (hasAdjacent1 && !hasAdjacent2) {
      // horizontal neighbor = edge-horizontal (use 0,1 instead of 1,2)
      if (quadrant === 'TL') return { col: 0, row: 2 };
      if (quadrant === 'TR') return { col: 1, row: 2 };
      if (quadrant === 'BL') return { col: 2, row: 2 };
      return { col: 3, row: 2 };
    } else {
      // vertical neighbor = edge-vertical
      if (quadrant === 'TL') return { col: 0, row: 3 };
      if (quadrant === 'TR') return { col: 5, row: 3 };
      if (quadrant === 'BL') return { col: 0, row: 4 };
      return { col: 5, row: 4 };
    }
  };

  // Algorithm 11: Like Algo 3 but use row 1 for vertical edges
  const algorithm11: AlgorithmFunc = (row, col, quadrant) => {
    const hasLeft = hasWater(row, col - 1);
    const hasRight = hasWater(row, col + 1);
    const hasUp = hasWater(row - 1, col);
    const hasDown = hasWater(row + 1, col);
    const hasUpLeft = hasWater(row - 1, col - 1);
    const hasUpRight = hasWater(row - 1, col + 1);
    const hasDownLeft = hasWater(row + 1, col - 1);
    const hasDownRight = hasWater(row + 1, col + 1);

    let hasAdjacent1: boolean, hasAdjacent2: boolean, hasDiagonal: boolean;

    if (quadrant === 'TL') {
      hasAdjacent1 = hasLeft;
      hasAdjacent2 = hasUp;
      hasDiagonal = hasUpLeft;
    } else if (quadrant === 'TR') {
      hasAdjacent1 = hasRight;
      hasAdjacent2 = hasUp;
      hasDiagonal = hasUpRight;
    } else if (quadrant === 'BL') {
      hasAdjacent1 = hasLeft;
      hasAdjacent2 = hasDown;
      hasDiagonal = hasDownLeft;
    } else {
      hasAdjacent1 = hasRight;
      hasAdjacent2 = hasDown;
      hasDiagonal = hasDownRight;
    }

    if (hasAdjacent1 && hasAdjacent2) {
      if (hasDiagonal) {
        // Inner
        if (quadrant === 'TL') return { col: 1, row: 3 };
        if (quadrant === 'TR') return { col: 2, row: 3 };
        if (quadrant === 'BL') return { col: 1, row: 4 };
        return { col: 2, row: 4 };
      } else {
        // Inner-cut corner
        if (quadrant === 'TL') return { col: 0, row: 0 };
        if (quadrant === 'TR') return { col: 1, row: 0 };
        if (quadrant === 'BL') return { col: 4, row: 0 };
        return { col: 5, row: 0 };
      }
    } else if (!hasAdjacent1 && !hasAdjacent2) {
      // Outer corner
      if (quadrant === 'TL') return { col: 2, row: 0 };
      if (quadrant === 'TR') return { col: 3, row: 0 };
      if (quadrant === 'BL') return { col: 2, row: 1 };
      return { col: 3, row: 1 };
    } else if (hasAdjacent1 && !hasAdjacent2) {
      // horizontal neighbor = edge-horizontal
      if (quadrant === 'TL') return { col: 1, row: 2 };
      if (quadrant === 'TR') return { col: 2, row: 2 };
      if (quadrant === 'BL') return { col: 3, row: 2 };
      return { col: 4, row: 2 };
    } else {
      // vertical neighbor = edge-vertical (use row 1)
      if (quadrant === 'TL') return { col: 0, row: 1 };
      if (quadrant === 'TR') return { col: 5, row: 1 };
      if (quadrant === 'BL') return { col: 0, row: 1 };
      return { col: 5, row: 1 };
    }
  };

  // Algorithm 12: Like Algo 3 but cols 4,5 for horizontal edges
  const algorithm12: AlgorithmFunc = (row, col, quadrant) => {
    const hasLeft = hasWater(row, col - 1);
    const hasRight = hasWater(row, col + 1);
    const hasUp = hasWater(row - 1, col);
    const hasDown = hasWater(row + 1, col);
    const hasUpLeft = hasWater(row - 1, col - 1);
    const hasUpRight = hasWater(row - 1, col + 1);
    const hasDownLeft = hasWater(row + 1, col - 1);
    const hasDownRight = hasWater(row + 1, col + 1);

    let hasAdjacent1: boolean, hasAdjacent2: boolean, hasDiagonal: boolean;

    if (quadrant === 'TL') {
      hasAdjacent1 = hasLeft;
      hasAdjacent2 = hasUp;
      hasDiagonal = hasUpLeft;
    } else if (quadrant === 'TR') {
      hasAdjacent1 = hasRight;
      hasAdjacent2 = hasUp;
      hasDiagonal = hasUpRight;
    } else if (quadrant === 'BL') {
      hasAdjacent1 = hasLeft;
      hasAdjacent2 = hasDown;
      hasDiagonal = hasDownLeft;
    } else {
      hasAdjacent1 = hasRight;
      hasAdjacent2 = hasDown;
      hasDiagonal = hasDownRight;
    }

    if (hasAdjacent1 && hasAdjacent2) {
      if (hasDiagonal) {
        // Inner
        if (quadrant === 'TL') return { col: 1, row: 3 };
        if (quadrant === 'TR') return { col: 2, row: 3 };
        if (quadrant === 'BL') return { col: 1, row: 4 };
        return { col: 2, row: 4 };
      } else {
        // Inner-cut corner
        if (quadrant === 'TL') return { col: 0, row: 0 };
        if (quadrant === 'TR') return { col: 1, row: 0 };
        if (quadrant === 'BL') return { col: 4, row: 0 };
        return { col: 5, row: 0 };
      }
    } else if (!hasAdjacent1 && !hasAdjacent2) {
      // Outer corner
      if (quadrant === 'TL') return { col: 2, row: 0 };
      if (quadrant === 'TR') return { col: 3, row: 0 };
      if (quadrant === 'BL') return { col: 2, row: 1 };
      return { col: 3, row: 1 };
    } else if (hasAdjacent1 && !hasAdjacent2) {
      // horizontal neighbor = edge-horizontal (use 4,5)
      if (quadrant === 'TL') return { col: 4, row: 2 };
      if (quadrant === 'TR') return { col: 5, row: 2 };
      if (quadrant === 'BL') return { col: 0, row: 2 };
      return { col: 1, row: 2 };
    } else {
      // vertical neighbor = edge-vertical
      if (quadrant === 'TL') return { col: 0, row: 3 };
      if (quadrant === 'TR') return { col: 5, row: 3 };
      if (quadrant === 'BL') return { col: 0, row: 4 };
      return { col: 5, row: 4 };
    }
  };

  // Algorithm 13: Like 3 but row 5 for edges
  const algorithm13: AlgorithmFunc = (row, col, quadrant) => {
    const hasLeft = hasWater(row, col - 1);
    const hasRight = hasWater(row, col + 1);
    const hasUp = hasWater(row - 1, col);
    const hasDown = hasWater(row + 1, col);
    const hasUpLeft = hasWater(row - 1, col - 1);
    const hasUpRight = hasWater(row - 1, col + 1);
    const hasDownLeft = hasWater(row + 1, col - 1);
    const hasDownRight = hasWater(row + 1, col + 1);

    let hasAdjacent1: boolean, hasAdjacent2: boolean, hasDiagonal: boolean;

    if (quadrant === 'TL') {
      hasAdjacent1 = hasLeft;
      hasAdjacent2 = hasUp;
      hasDiagonal = hasUpLeft;
    } else if (quadrant === 'TR') {
      hasAdjacent1 = hasRight;
      hasAdjacent2 = hasUp;
      hasDiagonal = hasUpRight;
    } else if (quadrant === 'BL') {
      hasAdjacent1 = hasLeft;
      hasAdjacent2 = hasDown;
      hasDiagonal = hasDownLeft;
    } else {
      hasAdjacent1 = hasRight;
      hasAdjacent2 = hasDown;
      hasDiagonal = hasDownRight;
    }

    if (hasAdjacent1 && hasAdjacent2) {
      if (hasDiagonal) {
        // Inner
        if (quadrant === 'TL') return { col: 1, row: 3 };
        if (quadrant === 'TR') return { col: 2, row: 3 };
        if (quadrant === 'BL') return { col: 1, row: 4 };
        return { col: 2, row: 4 };
      } else {
        // Inner-cut corner
        if (quadrant === 'TL') return { col: 0, row: 0 };
        if (quadrant === 'TR') return { col: 1, row: 0 };
        if (quadrant === 'BL') return { col: 4, row: 0 };
        return { col: 5, row: 0 };
      }
    } else if (!hasAdjacent1 && !hasAdjacent2) {
      // Outer corner
      if (quadrant === 'TL') return { col: 2, row: 0 };
      if (quadrant === 'TR') return { col: 3, row: 0 };
      if (quadrant === 'BL') return { col: 2, row: 1 };
      return { col: 3, row: 1 };
    } else if (hasAdjacent1 && !hasAdjacent2) {
      // horizontal neighbor = edge-horizontal (row 5)
      if (quadrant === 'TL') return { col: 1, row: 5 };
      if (quadrant === 'TR') return { col: 2, row: 5 };
      if (quadrant === 'BL') return { col: 3, row: 5 };
      return { col: 4, row: 5 };
    } else {
      // vertical neighbor = edge-vertical (row 5)
      if (quadrant === 'TL') return { col: 0, row: 5 };
      if (quadrant === 'TR') return { col: 5, row: 5 };
      if (quadrant === 'BL') return { col: 0, row: 5 };
      return { col: 5, row: 5 };
    }
  };

  // Algorithm 14: Like 3 but row 6 for edges
  const algorithm14: AlgorithmFunc = (row, col, quadrant) => {
    const hasLeft = hasWater(row, col - 1);
    const hasRight = hasWater(row, col + 1);
    const hasUp = hasWater(row - 1, col);
    const hasDown = hasWater(row + 1, col);
    const hasUpLeft = hasWater(row - 1, col - 1);
    const hasUpRight = hasWater(row - 1, col + 1);
    const hasDownLeft = hasWater(row + 1, col - 1);
    const hasDownRight = hasWater(row + 1, col + 1);

    let hasAdjacent1: boolean, hasAdjacent2: boolean, hasDiagonal: boolean;

    if (quadrant === 'TL') {
      hasAdjacent1 = hasLeft;
      hasAdjacent2 = hasUp;
      hasDiagonal = hasUpLeft;
    } else if (quadrant === 'TR') {
      hasAdjacent1 = hasRight;
      hasAdjacent2 = hasUp;
      hasDiagonal = hasUpRight;
    } else if (quadrant === 'BL') {
      hasAdjacent1 = hasLeft;
      hasAdjacent2 = hasDown;
      hasDiagonal = hasDownLeft;
    } else {
      hasAdjacent1 = hasRight;
      hasAdjacent2 = hasDown;
      hasDiagonal = hasDownRight;
    }

    if (hasAdjacent1 && hasAdjacent2) {
      if (hasDiagonal) {
        // Inner
        if (quadrant === 'TL') return { col: 1, row: 3 };
        if (quadrant === 'TR') return { col: 2, row: 3 };
        if (quadrant === 'BL') return { col: 1, row: 4 };
        return { col: 2, row: 4 };
      } else {
        // Inner-cut corner
        if (quadrant === 'TL') return { col: 0, row: 0 };
        if (quadrant === 'TR') return { col: 1, row: 0 };
        if (quadrant === 'BL') return { col: 4, row: 0 };
        return { col: 5, row: 0 };
      }
    } else if (!hasAdjacent1 && !hasAdjacent2) {
      // Outer corner
      if (quadrant === 'TL') return { col: 2, row: 0 };
      if (quadrant === 'TR') return { col: 3, row: 0 };
      if (quadrant === 'BL') return { col: 2, row: 1 };
      return { col: 3, row: 1 };
    } else if (hasAdjacent1 && !hasAdjacent2) {
      // horizontal neighbor = edge-horizontal (row 6)
      if (quadrant === 'TL') return { col: 1, row: 6 };
      if (quadrant === 'TR') return { col: 2, row: 6 };
      if (quadrant === 'BL') return { col: 3, row: 6 };
      return { col: 4, row: 6 };
    } else {
      // vertical neighbor = edge-vertical (row 6)
      if (quadrant === 'TL') return { col: 0, row: 6 };
      if (quadrant === 'TR') return { col: 5, row: 6 };
      if (quadrant === 'BL') return { col: 0, row: 6 };
      return { col: 5, row: 6 };
    }
  };

  // Algorithm 15: Like 3 but row 7 for edges
  const algorithm15: AlgorithmFunc = (row, col, quadrant) => {
    const hasLeft = hasWater(row, col - 1);
    const hasRight = hasWater(row, col + 1);
    const hasUp = hasWater(row - 1, col);
    const hasDown = hasWater(row + 1, col);
    const hasUpLeft = hasWater(row - 1, col - 1);
    const hasUpRight = hasWater(row - 1, col + 1);
    const hasDownLeft = hasWater(row + 1, col - 1);
    const hasDownRight = hasWater(row + 1, col + 1);

    let hasAdjacent1: boolean, hasAdjacent2: boolean, hasDiagonal: boolean;

    if (quadrant === 'TL') {
      hasAdjacent1 = hasLeft;
      hasAdjacent2 = hasUp;
      hasDiagonal = hasUpLeft;
    } else if (quadrant === 'TR') {
      hasAdjacent1 = hasRight;
      hasAdjacent2 = hasUp;
      hasDiagonal = hasUpRight;
    } else if (quadrant === 'BL') {
      hasAdjacent1 = hasLeft;
      hasAdjacent2 = hasDown;
      hasDiagonal = hasDownLeft;
    } else {
      hasAdjacent1 = hasRight;
      hasAdjacent2 = hasDown;
      hasDiagonal = hasDownRight;
    }

    if (hasAdjacent1 && hasAdjacent2) {
      if (hasDiagonal) {
        // Inner
        if (quadrant === 'TL') return { col: 1, row: 3 };
        if (quadrant === 'TR') return { col: 2, row: 3 };
        if (quadrant === 'BL') return { col: 1, row: 4 };
        return { col: 2, row: 4 };
      } else {
        // Inner-cut corner
        if (quadrant === 'TL') return { col: 0, row: 0 };
        if (quadrant === 'TR') return { col: 1, row: 0 };
        if (quadrant === 'BL') return { col: 4, row: 0 };
        return { col: 5, row: 0 };
      }
    } else if (!hasAdjacent1 && !hasAdjacent2) {
      // Outer corner
      if (quadrant === 'TL') return { col: 2, row: 0 };
      if (quadrant === 'TR') return { col: 3, row: 0 };
      if (quadrant === 'BL') return { col: 2, row: 1 };
      return { col: 3, row: 1 };
    } else if (hasAdjacent1 && !hasAdjacent2) {
      // horizontal neighbor = edge-horizontal (row 7)
      if (quadrant === 'TL') return { col: 1, row: 7 };
      if (quadrant === 'TR') return { col: 2, row: 7 };
      if (quadrant === 'BL') return { col: 3, row: 7 };
      return { col: 4, row: 7 };
    } else {
      // vertical neighbor = edge-vertical (row 7)
      if (quadrant === 'TL') return { col: 0, row: 7 };
      if (quadrant === 'TR') return { col: 5, row: 7 };
      if (quadrant === 'BL') return { col: 0, row: 7 };
      return { col: 5, row: 7 };
    }
  };

  // Algorithm 16: Like 3 but cols 3-4 row 3 for horiz edges, cols 0,5 row 5 for vert
  const algorithm16: AlgorithmFunc = (row, col, quadrant) => {
    const hasLeft = hasWater(row, col - 1);
    const hasRight = hasWater(row, col + 1);
    const hasUp = hasWater(row - 1, col);
    const hasDown = hasWater(row + 1, col);
    const hasUpLeft = hasWater(row - 1, col - 1);
    const hasUpRight = hasWater(row - 1, col + 1);
    const hasDownLeft = hasWater(row + 1, col - 1);
    const hasDownRight = hasWater(row + 1, col + 1);

    let hasAdjacent1: boolean, hasAdjacent2: boolean, hasDiagonal: boolean;

    if (quadrant === 'TL') {
      hasAdjacent1 = hasLeft;
      hasAdjacent2 = hasUp;
      hasDiagonal = hasUpLeft;
    } else if (quadrant === 'TR') {
      hasAdjacent1 = hasRight;
      hasAdjacent2 = hasUp;
      hasDiagonal = hasUpRight;
    } else if (quadrant === 'BL') {
      hasAdjacent1 = hasLeft;
      hasAdjacent2 = hasDown;
      hasDiagonal = hasDownLeft;
    } else {
      hasAdjacent1 = hasRight;
      hasAdjacent2 = hasDown;
      hasDiagonal = hasDownRight;
    }

    if (hasAdjacent1 && hasAdjacent2) {
      if (hasDiagonal) {
        // Inner
        if (quadrant === 'TL') return { col: 1, row: 3 };
        if (quadrant === 'TR') return { col: 2, row: 3 };
        if (quadrant === 'BL') return { col: 1, row: 4 };
        return { col: 2, row: 4 };
      } else {
        // Inner-cut corner
        if (quadrant === 'TL') return { col: 0, row: 0 };
        if (quadrant === 'TR') return { col: 1, row: 0 };
        if (quadrant === 'BL') return { col: 4, row: 0 };
        return { col: 5, row: 0 };
      }
    } else if (!hasAdjacent1 && !hasAdjacent2) {
      // Outer corner
      if (quadrant === 'TL') return { col: 2, row: 0 };
      if (quadrant === 'TR') return { col: 3, row: 0 };
      if (quadrant === 'BL') return { col: 2, row: 1 };
      return { col: 3, row: 1 };
    } else if (hasAdjacent1 && !hasAdjacent2) {
      // horizontal neighbor = edge-horizontal (cols 3-4)
      if (quadrant === 'TL') return { col: 3, row: 3 };
      if (quadrant === 'TR') return { col: 4, row: 3 };
      if (quadrant === 'BL') return { col: 3, row: 4 };
      return { col: 4, row: 4 };
    } else {
      // vertical neighbor = edge-vertical (row 5)
      if (quadrant === 'TL') return { col: 0, row: 5 };
      if (quadrant === 'TR') return { col: 5, row: 5 };
      if (quadrant === 'BL') return { col: 0, row: 6 };
      return { col: 5, row: 6 };
    }
  };

  // Algorithm 17: Mix - horiz from row 3, vert from row 6
  const algorithm17: AlgorithmFunc = (row, col, quadrant) => {
    const hasLeft = hasWater(row, col - 1);
    const hasRight = hasWater(row, col + 1);
    const hasUp = hasWater(row - 1, col);
    const hasDown = hasWater(row + 1, col);
    const hasUpLeft = hasWater(row - 1, col - 1);
    const hasUpRight = hasWater(row - 1, col + 1);
    const hasDownLeft = hasWater(row + 1, col - 1);
    const hasDownRight = hasWater(row + 1, col + 1);

    let hasAdjacent1: boolean, hasAdjacent2: boolean, hasDiagonal: boolean;

    if (quadrant === 'TL') {
      hasAdjacent1 = hasLeft;
      hasAdjacent2 = hasUp;
      hasDiagonal = hasUpLeft;
    } else if (quadrant === 'TR') {
      hasAdjacent1 = hasRight;
      hasAdjacent2 = hasUp;
      hasDiagonal = hasUpRight;
    } else if (quadrant === 'BL') {
      hasAdjacent1 = hasLeft;
      hasAdjacent2 = hasDown;
      hasDiagonal = hasDownLeft;
    } else {
      hasAdjacent1 = hasRight;
      hasAdjacent2 = hasDown;
      hasDiagonal = hasDownRight;
    }

    if (hasAdjacent1 && hasAdjacent2) {
      if (hasDiagonal) {
        // Inner
        if (quadrant === 'TL') return { col: 1, row: 3 };
        if (quadrant === 'TR') return { col: 2, row: 3 };
        if (quadrant === 'BL') return { col: 1, row: 4 };
        return { col: 2, row: 4 };
      } else {
        // Inner-cut corner
        if (quadrant === 'TL') return { col: 0, row: 0 };
        if (quadrant === 'TR') return { col: 1, row: 0 };
        if (quadrant === 'BL') return { col: 4, row: 0 };
        return { col: 5, row: 0 };
      }
    } else if (!hasAdjacent1 && !hasAdjacent2) {
      // Outer corner
      if (quadrant === 'TL') return { col: 2, row: 0 };
      if (quadrant === 'TR') return { col: 3, row: 0 };
      if (quadrant === 'BL') return { col: 2, row: 1 };
      return { col: 3, row: 1 };
    } else if (hasAdjacent1 && !hasAdjacent2) {
      // horizontal neighbor = edge-horizontal (row 3)
      if (quadrant === 'TL') return { col: 3, row: 2 };
      if (quadrant === 'TR') return { col: 4, row: 2 };
      if (quadrant === 'BL') return { col: 1, row: 2 };
      return { col: 2, row: 2 };
    } else {
      // vertical neighbor = edge-vertical (row 6)
      if (quadrant === 'TL') return { col: 0, row: 6 };
      if (quadrant === 'TR') return { col: 5, row: 6 };
      if (quadrant === 'BL') return { col: 0, row: 7 };
      return { col: 5, row: 7 };
    }
  };

  // Algorithm 18: cols 3,4 for both edges
  const algorithm18: AlgorithmFunc = (row, col, quadrant) => {
    const hasLeft = hasWater(row, col - 1);
    const hasRight = hasWater(row, col + 1);
    const hasUp = hasWater(row - 1, col);
    const hasDown = hasWater(row + 1, col);
    const hasUpLeft = hasWater(row - 1, col - 1);
    const hasUpRight = hasWater(row - 1, col + 1);
    const hasDownLeft = hasWater(row + 1, col - 1);
    const hasDownRight = hasWater(row + 1, col + 1);

    let hasAdjacent1: boolean, hasAdjacent2: boolean, hasDiagonal: boolean;

    if (quadrant === 'TL') {
      hasAdjacent1 = hasLeft;
      hasAdjacent2 = hasUp;
      hasDiagonal = hasUpLeft;
    } else if (quadrant === 'TR') {
      hasAdjacent1 = hasRight;
      hasAdjacent2 = hasUp;
      hasDiagonal = hasUpRight;
    } else if (quadrant === 'BL') {
      hasAdjacent1 = hasLeft;
      hasAdjacent2 = hasDown;
      hasDiagonal = hasDownLeft;
    } else {
      hasAdjacent1 = hasRight;
      hasAdjacent2 = hasDown;
      hasDiagonal = hasDownRight;
    }

    if (hasAdjacent1 && hasAdjacent2) {
      if (hasDiagonal) {
        // Inner
        if (quadrant === 'TL') return { col: 1, row: 3 };
        if (quadrant === 'TR') return { col: 2, row: 3 };
        if (quadrant === 'BL') return { col: 1, row: 4 };
        return { col: 2, row: 4 };
      } else {
        // Inner-cut corner
        if (quadrant === 'TL') return { col: 0, row: 0 };
        if (quadrant === 'TR') return { col: 1, row: 0 };
        if (quadrant === 'BL') return { col: 4, row: 0 };
        return { col: 5, row: 0 };
      }
    } else if (!hasAdjacent1 && !hasAdjacent2) {
      // Outer corner
      if (quadrant === 'TL') return { col: 2, row: 0 };
      if (quadrant === 'TR') return { col: 3, row: 0 };
      if (quadrant === 'BL') return { col: 2, row: 1 };
      return { col: 3, row: 1 };
    } else if (hasAdjacent1 && !hasAdjacent2) {
      // horizontal neighbor = edge-horizontal
      if (quadrant === 'TL') return { col: 3, row: 2 };
      if (quadrant === 'TR') return { col: 4, row: 2 };
      if (quadrant === 'BL') return { col: 3, row: 2 };
      return { col: 4, row: 2 };
    } else {
      // vertical neighbor = edge-vertical
      if (quadrant === 'TL') return { col: 3, row: 3 };
      if (quadrant === 'TR') return { col: 4, row: 3 };
      if (quadrant === 'BL') return { col: 3, row: 4 };
      return { col: 4, row: 4 };
    }
  };

  // Algorithm 19: Like 3 but outer corners from row 2 cols 0,5
  const algorithm19: AlgorithmFunc = (row, col, quadrant) => {
    const hasLeft = hasWater(row, col - 1);
    const hasRight = hasWater(row, col + 1);
    const hasUp = hasWater(row - 1, col);
    const hasDown = hasWater(row + 1, col);
    const hasUpLeft = hasWater(row - 1, col - 1);
    const hasUpRight = hasWater(row - 1, col + 1);
    const hasDownLeft = hasWater(row + 1, col - 1);
    const hasDownRight = hasWater(row + 1, col + 1);

    let hasAdjacent1: boolean, hasAdjacent2: boolean, hasDiagonal: boolean;

    if (quadrant === 'TL') {
      hasAdjacent1 = hasLeft;
      hasAdjacent2 = hasUp;
      hasDiagonal = hasUpLeft;
    } else if (quadrant === 'TR') {
      hasAdjacent1 = hasRight;
      hasAdjacent2 = hasUp;
      hasDiagonal = hasUpRight;
    } else if (quadrant === 'BL') {
      hasAdjacent1 = hasLeft;
      hasAdjacent2 = hasDown;
      hasDiagonal = hasDownLeft;
    } else {
      hasAdjacent1 = hasRight;
      hasAdjacent2 = hasDown;
      hasDiagonal = hasDownRight;
    }

    if (hasAdjacent1 && hasAdjacent2) {
      if (hasDiagonal) {
        // Inner
        if (quadrant === 'TL') return { col: 1, row: 3 };
        if (quadrant === 'TR') return { col: 2, row: 3 };
        if (quadrant === 'BL') return { col: 1, row: 4 };
        return { col: 2, row: 4 };
      } else {
        // Inner-cut corner
        if (quadrant === 'TL') return { col: 0, row: 0 };
        if (quadrant === 'TR') return { col: 1, row: 0 };
        if (quadrant === 'BL') return { col: 4, row: 0 };
        return { col: 5, row: 0 };
      }
    } else if (!hasAdjacent1 && !hasAdjacent2) {
      // Outer corner - try row 2, cols 0,5
      if (quadrant === 'TL') return { col: 0, row: 2 };
      if (quadrant === 'TR') return { col: 5, row: 2 };
      if (quadrant === 'BL') return { col: 0, row: 2 };
      return { col: 5, row: 2 };
    } else if (hasAdjacent1 && !hasAdjacent2) {
      // horizontal neighbor = edge-horizontal
      if (quadrant === 'TL') return { col: 1, row: 2 };
      if (quadrant === 'TR') return { col: 2, row: 2 };
      if (quadrant === 'BL') return { col: 3, row: 2 };
      return { col: 4, row: 2 };
    } else {
      // vertical neighbor = edge-vertical
      if (quadrant === 'TL') return { col: 0, row: 3 };
      if (quadrant === 'TR') return { col: 5, row: 3 };
      if (quadrant === 'BL') return { col: 0, row: 4 };
      return { col: 5, row: 4 };
    }
  };

  // Algorithm 20: Like 3 but outer corners from row 3 cols 3,4
  const algorithm20: AlgorithmFunc = (row, col, quadrant) => {
    const hasLeft = hasWater(row, col - 1);
    const hasRight = hasWater(row, col + 1);
    const hasUp = hasWater(row - 1, col);
    const hasDown = hasWater(row + 1, col);
    const hasUpLeft = hasWater(row - 1, col - 1);
    const hasUpRight = hasWater(row - 1, col + 1);
    const hasDownLeft = hasWater(row + 1, col - 1);
    const hasDownRight = hasWater(row + 1, col + 1);

    let hasAdjacent1: boolean, hasAdjacent2: boolean, hasDiagonal: boolean;

    if (quadrant === 'TL') {
      hasAdjacent1 = hasLeft;
      hasAdjacent2 = hasUp;
      hasDiagonal = hasUpLeft;
    } else if (quadrant === 'TR') {
      hasAdjacent1 = hasRight;
      hasAdjacent2 = hasUp;
      hasDiagonal = hasUpRight;
    } else if (quadrant === 'BL') {
      hasAdjacent1 = hasLeft;
      hasAdjacent2 = hasDown;
      hasDiagonal = hasDownLeft;
    } else {
      hasAdjacent1 = hasRight;
      hasAdjacent2 = hasDown;
      hasDiagonal = hasDownRight;
    }

    if (hasAdjacent1 && hasAdjacent2) {
      if (hasDiagonal) {
        // Inner
        if (quadrant === 'TL') return { col: 1, row: 3 };
        if (quadrant === 'TR') return { col: 2, row: 3 };
        if (quadrant === 'BL') return { col: 1, row: 4 };
        return { col: 2, row: 4 };
      } else {
        // Inner-cut corner
        if (quadrant === 'TL') return { col: 0, row: 0 };
        if (quadrant === 'TR') return { col: 1, row: 0 };
        if (quadrant === 'BL') return { col: 4, row: 0 };
        return { col: 5, row: 0 };
      }
    } else if (!hasAdjacent1 && !hasAdjacent2) {
      // Outer corner - try cols 3,4 row 3
      if (quadrant === 'TL') return { col: 3, row: 3 };
      if (quadrant === 'TR') return { col: 4, row: 3 };
      if (quadrant === 'BL') return { col: 3, row: 4 };
      return { col: 4, row: 4 };
    } else if (hasAdjacent1 && !hasAdjacent2) {
      // horizontal neighbor = edge-horizontal
      if (quadrant === 'TL') return { col: 1, row: 2 };
      if (quadrant === 'TR') return { col: 2, row: 2 };
      if (quadrant === 'BL') return { col: 3, row: 2 };
      return { col: 4, row: 2 };
    } else {
      // vertical neighbor = edge-vertical
      if (quadrant === 'TL') return { col: 0, row: 3 };
      if (quadrant === 'TR') return { col: 5, row: 3 };
      if (quadrant === 'BL') return { col: 0, row: 4 };
      return { col: 5, row: 4 };
    }
  };

  // Algorithm 21: Like 3 but outer corners from rows 5,6
  const algorithm21: AlgorithmFunc = (row, col, quadrant) => {
    const hasLeft = hasWater(row, col - 1);
    const hasRight = hasWater(row, col + 1);
    const hasUp = hasWater(row - 1, col);
    const hasDown = hasWater(row + 1, col);
    const hasUpLeft = hasWater(row - 1, col - 1);
    const hasUpRight = hasWater(row - 1, col + 1);
    const hasDownLeft = hasWater(row + 1, col - 1);
    const hasDownRight = hasWater(row + 1, col + 1);

    let hasAdjacent1: boolean, hasAdjacent2: boolean, hasDiagonal: boolean;

    if (quadrant === 'TL') {
      hasAdjacent1 = hasLeft;
      hasAdjacent2 = hasUp;
      hasDiagonal = hasUpLeft;
    } else if (quadrant === 'TR') {
      hasAdjacent1 = hasRight;
      hasAdjacent2 = hasUp;
      hasDiagonal = hasUpRight;
    } else if (quadrant === 'BL') {
      hasAdjacent1 = hasLeft;
      hasAdjacent2 = hasDown;
      hasDiagonal = hasDownLeft;
    } else {
      hasAdjacent1 = hasRight;
      hasAdjacent2 = hasDown;
      hasDiagonal = hasDownRight;
    }

    if (hasAdjacent1 && hasAdjacent2) {
      if (hasDiagonal) {
        // Inner
        if (quadrant === 'TL') return { col: 1, row: 3 };
        if (quadrant === 'TR') return { col: 2, row: 3 };
        if (quadrant === 'BL') return { col: 1, row: 4 };
        return { col: 2, row: 4 };
      } else {
        // Inner-cut corner
        if (quadrant === 'TL') return { col: 0, row: 0 };
        if (quadrant === 'TR') return { col: 1, row: 0 };
        if (quadrant === 'BL') return { col: 4, row: 0 };
        return { col: 5, row: 0 };
      }
    } else if (!hasAdjacent1 && !hasAdjacent2) {
      // Outer corner - try rows 5,6
      if (quadrant === 'TL') return { col: 0, row: 5 };
      if (quadrant === 'TR') return { col: 5, row: 5 };
      if (quadrant === 'BL') return { col: 0, row: 6 };
      return { col: 5, row: 6 };
    } else if (hasAdjacent1 && !hasAdjacent2) {
      // horizontal neighbor = edge-horizontal
      if (quadrant === 'TL') return { col: 1, row: 2 };
      if (quadrant === 'TR') return { col: 2, row: 2 };
      if (quadrant === 'BL') return { col: 3, row: 2 };
      return { col: 4, row: 2 };
    } else {
      // vertical neighbor = edge-vertical
      if (quadrant === 'TL') return { col: 0, row: 3 };
      if (quadrant === 'TR') return { col: 5, row: 3 };
      if (quadrant === 'BL') return { col: 0, row: 4 };
      return { col: 5, row: 4 };
    }
  };

  // Algorithm 22: Outer corners from cols 4,5 row 0 (labeled inner-cut)
  const algorithm22: AlgorithmFunc = (row, col, quadrant) => {
    const hasLeft = hasWater(row, col - 1);
    const hasRight = hasWater(row, col + 1);
    const hasUp = hasWater(row - 1, col);
    const hasDown = hasWater(row + 1, col);
    const hasUpLeft = hasWater(row - 1, col - 1);
    const hasUpRight = hasWater(row - 1, col + 1);
    const hasDownLeft = hasWater(row + 1, col - 1);
    const hasDownRight = hasWater(row + 1, col + 1);

    let hasAdjacent1: boolean, hasAdjacent2: boolean, hasDiagonal: boolean;

    if (quadrant === 'TL') {
      hasAdjacent1 = hasLeft;
      hasAdjacent2 = hasUp;
      hasDiagonal = hasUpLeft;
    } else if (quadrant === 'TR') {
      hasAdjacent1 = hasRight;
      hasAdjacent2 = hasUp;
      hasDiagonal = hasUpRight;
    } else if (quadrant === 'BL') {
      hasAdjacent1 = hasLeft;
      hasAdjacent2 = hasDown;
      hasDiagonal = hasDownLeft;
    } else {
      hasAdjacent1 = hasRight;
      hasAdjacent2 = hasDown;
      hasDiagonal = hasDownRight;
    }

    if (hasAdjacent1 && hasAdjacent2) {
      if (hasDiagonal) {
        // Inner
        if (quadrant === 'TL') return { col: 1, row: 3 };
        if (quadrant === 'TR') return { col: 2, row: 3 };
        if (quadrant === 'BL') return { col: 1, row: 4 };
        return { col: 2, row: 4 };
      } else {
        // Inner-cut corner
        if (quadrant === 'TL') return { col: 0, row: 0 };
        if (quadrant === 'TR') return { col: 1, row: 0 };
        if (quadrant === 'BL') return { col: 4, row: 0 };
        return { col: 5, row: 0 };
      }
    } else if (!hasAdjacent1 && !hasAdjacent2) {
      // Outer corner - swap with inner-cut tiles
      if (quadrant === 'TL') return { col: 4, row: 0 };
      if (quadrant === 'TR') return { col: 5, row: 0 };
      if (quadrant === 'BL') return { col: 0, row: 0 };
      return { col: 1, row: 0 };
    } else if (hasAdjacent1 && !hasAdjacent2) {
      // horizontal neighbor = edge-horizontal
      if (quadrant === 'TL') return { col: 1, row: 2 };
      if (quadrant === 'TR') return { col: 2, row: 2 };
      if (quadrant === 'BL') return { col: 3, row: 2 };
      return { col: 4, row: 2 };
    } else {
      // vertical neighbor = edge-vertical
      if (quadrant === 'TL') return { col: 0, row: 3 };
      if (quadrant === 'TR') return { col: 5, row: 3 };
      if (quadrant === 'BL') return { col: 0, row: 4 };
      return { col: 5, row: 4 };
    }
  };

  // Algorithm 23: Try row 1 for outer corners
  const algorithm23: AlgorithmFunc = (row, col, quadrant) => {
    const hasLeft = hasWater(row, col - 1);
    const hasRight = hasWater(row, col + 1);
    const hasUp = hasWater(row - 1, col);
    const hasDown = hasWater(row + 1, col);
    const hasUpLeft = hasWater(row - 1, col - 1);
    const hasUpRight = hasWater(row - 1, col + 1);
    const hasDownLeft = hasWater(row + 1, col - 1);
    const hasDownRight = hasWater(row + 1, col + 1);

    let hasAdjacent1: boolean, hasAdjacent2: boolean, hasDiagonal: boolean;

    if (quadrant === 'TL') {
      hasAdjacent1 = hasLeft;
      hasAdjacent2 = hasUp;
      hasDiagonal = hasUpLeft;
    } else if (quadrant === 'TR') {
      hasAdjacent1 = hasRight;
      hasAdjacent2 = hasUp;
      hasDiagonal = hasUpRight;
    } else if (quadrant === 'BL') {
      hasAdjacent1 = hasLeft;
      hasAdjacent2 = hasDown;
      hasDiagonal = hasDownLeft;
    } else {
      hasAdjacent1 = hasRight;
      hasAdjacent2 = hasDown;
      hasDiagonal = hasDownRight;
    }

    if (hasAdjacent1 && hasAdjacent2) {
      if (hasDiagonal) {
        // Inner
        if (quadrant === 'TL') return { col: 1, row: 3 };
        if (quadrant === 'TR') return { col: 2, row: 3 };
        if (quadrant === 'BL') return { col: 1, row: 4 };
        return { col: 2, row: 4 };
      } else {
        // Inner-cut corner
        if (quadrant === 'TL') return { col: 0, row: 0 };
        if (quadrant === 'TR') return { col: 1, row: 0 };
        if (quadrant === 'BL') return { col: 4, row: 0 };
        return { col: 5, row: 0 };
      }
    } else if (!hasAdjacent1 && !hasAdjacent2) {
      // Outer corner - try row 1 cols 0,5
      if (quadrant === 'TL') return { col: 0, row: 1 };
      if (quadrant === 'TR') return { col: 5, row: 1 };
      if (quadrant === 'BL') return { col: 0, row: 1 };
      return { col: 5, row: 1 };
    } else if (hasAdjacent1 && !hasAdjacent2) {
      // horizontal neighbor = edge-horizontal
      if (quadrant === 'TL') return { col: 1, row: 2 };
      if (quadrant === 'TR') return { col: 2, row: 2 };
      if (quadrant === 'BL') return { col: 3, row: 2 };
      return { col: 4, row: 2 };
    } else {
      // vertical neighbor = edge-vertical
      if (quadrant === 'TL') return { col: 0, row: 3 };
      if (quadrant === 'TR') return { col: 5, row: 3 };
      if (quadrant === 'BL') return { col: 0, row: 4 };
      return { col: 5, row: 4 };
    }
  };

  const algorithms: { name: string; func: AlgorithmFunc }[] = [
    { name: 'Algo 3: Base (current)', func: algorithm3 },
    { name: 'Algo 19: Corners row 2', func: algorithm19 },
    { name: 'Algo 20: Corners cols 3-4', func: algorithm20 },
    { name: 'Algo 21: Corners rows 5-6', func: algorithm21 },
    { name: 'Algo 22: Swap corner/cut', func: algorithm22 },
    { name: 'Algo 23: Corners row 1', func: algorithm23 },
    { name: 'Algo 13: Edges row 5', func: algorithm13 },
    { name: 'Algo 14: Edges row 6', func: algorithm14 },
    { name: 'Algo 15: Edges row 7', func: algorithm15 },
  ];

  // Render water using a specific algorithm
  const renderWater = (canvas: HTMLCanvasElement, algorithm: AlgorithmFunc) => {
    if (!autotileImage) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Render each water tile
    for (let row = 0; row < WATER_LAYOUT.length; row++) {
      for (let col = 0; col < WATER_LAYOUT[0].length; col++) {
        if (WATER_LAYOUT[row][col] === 1) {
          const screenX = col * TILE_SIZE * SCALE;
          const screenY = row * TILE_SIZE * SCALE;

          // Get mini-tiles for all 4 quadrants
          const tl = algorithm(row, col, 'TL');
          const tr = algorithm(row, col, 'TR');
          const bl = algorithm(row, col, 'BL');
          const br = algorithm(row, col, 'BR');

          // Draw all 4 quadrants
          ctx.drawImage(
            autotileImage,
            tl.col * MINI_TILE, tl.row * MINI_TILE,
            MINI_TILE, MINI_TILE,
            screenX, screenY,
            MINI_TILE * SCALE, MINI_TILE * SCALE
          );

          ctx.drawImage(
            autotileImage,
            tr.col * MINI_TILE, tr.row * MINI_TILE,
            MINI_TILE, MINI_TILE,
            screenX + MINI_TILE * SCALE, screenY,
            MINI_TILE * SCALE, MINI_TILE * SCALE
          );

          ctx.drawImage(
            autotileImage,
            bl.col * MINI_TILE, bl.row * MINI_TILE,
            MINI_TILE, MINI_TILE,
            screenX, screenY + MINI_TILE * SCALE,
            MINI_TILE * SCALE, MINI_TILE * SCALE
          );

          ctx.drawImage(
            autotileImage,
            br.col * MINI_TILE, br.row * MINI_TILE,
            MINI_TILE, MINI_TILE,
            screenX + MINI_TILE * SCALE, screenY + MINI_TILE * SCALE,
            MINI_TILE * SCALE, MINI_TILE * SCALE
          );
        }
      }
    }
  };

  // Render all algorithms when autotile image loads
  useEffect(() => {
    if (!autotileImage) return;

    canvasRefs.current.forEach((canvas, index) => {
      if (canvas) {
        renderWater(canvas, algorithms[index].func);
      }
    });
  }, [autotileImage]);

  return (
    <div style={{ padding: '15px', fontFamily: 'monospace' }}>
      <h2 style={{ marginTop: '5px' }}>Autotile Algorithm Tester</h2>
      <p style={{ margin: '5px 0' }}>Testing different algorithms for rendering Pallet Town water body. Click on the version that looks correct!</p>

      {selectedAlgorithm !== null && (
        <div style={{
          padding: '8px',
          background: '#4CAF50',
          color: 'white',
          marginBottom: '10px',
          borderRadius: '5px',
          fontSize: '14px'
        }}>
          ✓ Selected: {algorithms[selectedAlgorithm].name}
        </div>
      )}

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: '15px',
        marginTop: '20px',
        maxWidth: '1400px'
      }}>
        {algorithms.map((algo, index) => (
          <div
            key={index}
            style={{
              border: selectedAlgorithm === index ? '3px solid #4CAF50' : '1px solid #ccc',
              padding: '8px',
              borderRadius: '8px',
              cursor: 'pointer',
              background: selectedAlgorithm === index ? '#e8f5e9' : 'white'
            }}
            onClick={() => setSelectedAlgorithm(index)}
          >
            <h4 style={{ marginTop: 0, fontSize: '13px' }}>{algo.name}</h4>
            <canvas
              ref={(el) => (canvasRefs.current[index] = el)}
              width={WATER_LAYOUT[0].length * TILE_SIZE * SCALE}
              height={WATER_LAYOUT.length * TILE_SIZE * SCALE}
              style={{
                border: '1px solid #999',
                imageRendering: 'pixelated',
                width: '100%',
                height: 'auto'
              }}
            />
          </div>
        ))}
      </div>

      {!autotileImage && (
        <p style={{ color: 'red' }}>Loading autotile image...</p>
      )}
    </div>
  );
}
