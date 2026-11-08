// @ts-nocheck
import { describe, expect, it } from 'vitest';
import {
  mapMovementType,
  materialKey,
  normalizeSku,
  parsePeso,
  parseQty,
  slugSku,
} from '../../../scripts/inventoryImportCore.mjs';

describe('inventoryImportCore', () => {
  it('parses peso and qty', () => {
    expect(parsePeso('₱321.50')).toBe(321.5);
    expect(parsePeso('0.7')).toBe(0.7);
    expect(parseQty('1,000')).toBe(1000);
  });

  it('normalizes SKU placeholders to slug', () => {
    expect(normalizeSku('ITEM', 'Easy Syrup', 'Brown Sugar')).toBe(
      slugSku('Easy Syrup', 'Brown Sugar')
    );
    expect(normalizeSku('ES-BS', 'Easy Syrup', 'Brown Sugar')).toBe('ES-BS');
  });

  it('maps excel movement types', () => {
    expect(mapMovementType('Opening')).toBe('receive');
    expect(mapMovementType('Transfer Out')).toBe('issue');
    expect(mapMovementType('Adjustment')).toBe('adjustment');
    expect(mapMovementType('Usage')).toBe('issue');
  });

  it('builds stable material keys', () => {
    expect(materialKey('Easy Syrup', 'Brown Sugar')).toBe('Easy Syrup::brown sugar');
  });
});
