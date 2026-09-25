import assert from 'node:assert/strict';
import { test } from 'node:test';

import { extractJson, parseReadResponse } from './ai-parse.ts';
import type { BeamElement, ColumnElement, Element, ElementType, SlabElement } from './calc.ts';

const common = { id: 'x', levelId: 'L1', count: 1, concreteClass: 'C25/30' as const, status: 'todo' as const };

function base(type: ElementType): Element {
  switch (type) {
    case 'column':
      return { ...common, type, name: 'Колона', b: 30, h: 30, height: 3, bars: { n: 4, d: 16 }, stirrup: { d: 8, s: 15 } };
    case 'beam':
      return { ...common, type, name: 'Греда', b: 25, h: 30, length: 5, bottom: { n: 3, d: 16 }, top: { n: 2, d: 12 }, stirrup: { d: 8, s: 15 } };
    case 'slab':
      return { ...common, type, name: 'Плоча', lx: 6, ly: 5, t: 18, bottom: { d: 10, s: 15 }, top: { d: 10, s: 20 }, openings: 0 };
    default:
      throw new Error('не се ползва в теста');
  }
}

test('чете колона и приема числа като текст', () => {
  const r = parseReadResponse(
    '```json\n{"elements":[{"type":"column","name":"К1","count":"4","b":"25","h":40,"height":"2,8","bars":{"n":6,"d":"Ø14"},"stirrup":{"d":8,"s":"15 см"},"concreteClass":"c30/37"}],"notes":["ок"]}\n```',
    base
  );
  assert.equal(r.items.length, 1);
  const c = r.items[0].element as ColumnElement;
  assert.equal(c.name, 'К1');
  assert.equal(c.count, 4);
  assert.equal(c.b, 25);
  assert.equal(c.h, 40);
  assert.equal(c.height, 2.8);
  assert.deepEqual(c.bars, { n: 6, d: 14 });
  assert.deepEqual(c.stirrup, { d: 8, s: 15 });
  assert.equal(c.concreteClass, 'C30/37');
  assert.deepEqual(r.items[0].doubts, []);
  assert.deepEqual(r.notes, ['ок']);
});

test('невалидни и липсващи стойности остават по подразбиране и се показват като съмнения', () => {
  const r = parseReadResponse(
    '{"elements":[{"type":"column","name":"К2","b":3000,"h":30,"height":3,"bars":{"n":4,"d":15},"stirrup":{"d":8}}]}',
    base
  );
  const it = r.items[0];
  const c = it.element as ColumnElement;
  assert.equal(c.b, 30, 'ширина 3000 см е невъзможна');
  assert.equal(c.bars.d, 16, 'Ø15 не съществува');
  assert.ok(it.doubts.includes('ширина'));
  assert.ok(it.doubts.includes('диаметър на прътите'));
  assert.ok(it.doubts.includes('разстояние между биглите'));
  assert.equal(c.concreteClass, 'C25/30');
});

test('плоча без горна мрежа и греда без горни пръти', () => {
  const r = parseReadResponse(
    JSON.stringify({
      elements: [
        { type: 'slab', name: 'П1', lx: 8, ly: 6, t: 20, bottom: { d: 12, s: 15 }, top: null },
        { type: 'beam', name: 'Г1', b: 25, h: 40, length: 6, bottom: { n: 3, d: 18 }, top: { n: 0 }, stirrup: { d: 8, s: 10 } },
      ],
    }),
    base
  );
  const s = r.items[0].element as SlabElement;
  assert.equal(s.top, null);
  assert.deepEqual(r.items[0].doubts, []);
  const b = r.items[1].element as BeamElement;
  assert.equal(b.top.n, 0);
  assert.deepEqual(r.items[1].doubts, []);
});

test('непознати типове и боклук се пропускат', () => {
  const r = parseReadResponse('Ето резултата: {"elements":[{"type":"roof"},null,"текст",{"type":"slab","lx":5,"ly":4,"t":16,"bottom":{"d":10,"s":20}}]} Надявам се да помогне.', base);
  assert.equal(r.items.length, 1);
  assert.equal(r.items[0].element.type, 'slab');
});

test('отговор без JSON дава ясна грешка', () => {
  assert.throws(() => extractJson('Не мога да прочета чертежа.'), /очаквания вид/);
});
