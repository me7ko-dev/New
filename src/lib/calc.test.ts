import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  barWeightPerMeter,
  calcElement,
  countAt,
  DEFAULT_SETTINGS,
  summarize,
  withLaps,
  type BeamElement,
  type ColumnElement,
  type MasonryElement,
  type SlabElement,
} from './calc.ts';
import { cutDiameter } from './cutting.ts';

const base = { levelId: 'l1', name: 'x', count: 1, concreteClass: 'C25/30' as const, status: 'todo' as const };

test('тегло на пръта съвпада с таблиците', () => {
  assert.equal(barWeightPerMeter(8).toFixed(3), '0.395');
  assert.equal(barWeightPerMeter(12).toFixed(3), '0.888');
  assert.equal(barWeightPerMeter(16).toFixed(3), '1.578');
});

test('брой пръти на стъпка', () => {
  assert.equal(countAt(3, 15), 21);
  assert.equal(countAt(0, 15), 0);
});

test('снаждане при дълги пръти', () => {
  assert.equal(withLaps(10, 12, DEFAULT_SETTINGS), 10);
  // 20 м с Ø12: снаждане 0.6 м → 2 парчета → 20.6 м
  assert.equal(withLaps(20, 12, DEFAULT_SETTINGS), 20.6);
});

test('колона 30×30, h=3 м', () => {
  const col: ColumnElement = {
    ...base,
    id: 'c',
    type: 'column',
    b: 30,
    h: 30,
    height: 3,
    bars: { n: 4, d: 16 },
    stirrup: { d: 8, s: 15 },
  };
  const r = calcElement(col);
  assert.equal(r.concrete, 0.27);
  assert.equal(r.formwork, 3.6);
  assert.equal(r.bars[0].count, 4);
  assert.equal(r.bars[0].length, 3.8); // 3 + 50×16 мм
  assert.equal(r.bars[1].count, 21);
  // стреме: 2×(25+25) см + 2×10×8 мм = 1.16 м
  assert.equal(r.bars[1].length, 1.16);
});

test('плоча 5×4 м, 18 см, с отвор 1 м²', () => {
  const slab: SlabElement = {
    ...base,
    id: 's',
    type: 'slab',
    lx: 5,
    ly: 4,
    t: 18,
    bottom: { d: 10, s: 15 },
    top: null,
    openings: 1,
  };
  const r = calcElement(slab);
  assert.equal(r.concrete, 3.42);
  assert.equal(r.bars.length, 2);
});

test('греда: бетон и пръти', () => {
  const beam: BeamElement = {
    ...base,
    id: 'b',
    type: 'beam',
    b: 25,
    h: 40,
    length: 5,
    count: 2,
    bottom: { n: 3, d: 16 },
    top: { n: 2, d: 12 },
    stirrup: { d: 8, s: 15 },
  };
  const r = calcElement(beam);
  assert.equal(r.concrete, 1);
  assert.equal(r.bars[0].count, 6);
});

test('зидария: площ, тухли, мазилка', () => {
  const wall: MasonryElement = {
    ...base,
    id: 'm',
    type: 'masonry',
    length: 10,
    height: 3,
    t: 25,
    openings: 4,
    blocksPerM2: 11.2,
    mortarPerM2: 22,
    plasterBothSides: true,
  };
  const r = calcElement(wall);
  assert.equal(r.masonryArea, 26);
  assert.equal(r.blocks, 292);
  assert.equal(r.plaster, 52);
  assert.equal(r.concrete, 0);
});

test('обобщение и бетоновози', () => {
  const slab: SlabElement = {
    ...base,
    id: 's',
    type: 'slab',
    lx: 10,
    ly: 10,
    t: 20,
    bottom: { d: 10, s: 15 },
    top: { d: 10, s: 15 },
    openings: 0,
  };
  const s = summarize([slab]);
  assert.equal(s.concrete, 20);
  assert.equal(s.trucks, 3); // 20.6 м³ / 8
  assert.ok(s.rebarKg > 0);
});

test('разкрой: 3.8 м пръти от 12 м', () => {
  const r = cutDiameter(16, [{ mark: '1', label: '', d: 16, count: 6, length: 3.8, shape: { kind: 'straight' } }], 12);
  assert.equal(r.stockBars, 2);
  assert.equal(r.patterns[0].pieces.length, 3);
  assert.equal(r.patterns[0].times, 2);
});

test('разкрой: прът по-дълъг от търговския се разделя', () => {
  const r = cutDiameter(12, [{ mark: '1', label: '', d: 12, count: 1, length: 20.6, shape: { kind: 'straight' } }], 12);
  assert.equal(r.stockBars, 2);
  assert.ok(Math.abs(r.usedLength - 20.6) < 1e-9);
});
