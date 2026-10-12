import { describe, test, expect } from 'vitest';
import type { FurnitureItem } from '../types';
import { furnitureInRect } from '../utils/furnitureUtils';

const item = (id: string, xCm: number, yCm: number, widthCm: number, depthCm: number, rotation = 0): FurnitureItem => ({
  id, name: id, xCm, yCm, widthCm, depthCm, rotation, color: '#ccc',
});

describe('furnitureInRect', () => {
  test('selects furniture entirely inside, taking rotation into account', () => {
    const furniture = [item('a', 50, 50, 40, 20), item('b', 150, 50, 40, 20), item('c', 50, 50, 100, 10, 90)];
    // c is 100 long but rotated upright: it sticks out of a 100×80 rect vertically
    expect(furnitureInRect(furniture, { x: 0, y: 0, w: 100, h: 80 })).toEqual(['a']);
    expect(furnitureInRect(furniture, { x: 0, y: -10, w: 200, h: 120 })).toEqual(['a', 'b', 'c']);
  });
});
