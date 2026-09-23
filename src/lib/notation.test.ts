import assert from 'node:assert/strict';
import { test } from 'node:test';

import { explainNotation } from './notation.ts';

const meanings = (s: string) => explainNotation(s).found.map((f) => f.meaning);

test('брой и диаметър', () => {
  assert.match(meanings('4Ø16')[0], /^4 пръта с диаметър 16 мм/);
  assert.match(meanings('1ф12')[0], /^1 прът/);
});

test('стъпка', () => {
  assert.match(meanings('Ø8/15')[0], /диаметър 8 мм, поставени на всеки 15 см/);
  assert.match(meanings('ф10 през 20')[0], /на всеки 20 см/);
  assert.match(meanings('Ø8@150')[0], /на всеки 15 см \(в чертежа е в мм\)/);
});

test('бетон, стомана, коти', () => {
  assert.match(meanings('C25/30')[0], /Клас на бетона C25\/30/);
  assert.match(meanings('B500B')[0], /B500B/);
  assert.match(meanings('±0.00')[0], /нулата на сградата/);
  assert.match(meanings('+3.00')[0], /3 м над нулата/);
  assert.match(meanings('-1,20')[0], /1,2 м под нулата/);
});

test('сечение не се бърка със стъпка или клас', () => {
  const r = explainNotation('Колона 30/30, 4Ø16, бигли Ø8/15, C25/30');
  assert.equal(r.found.length, 4);
  assert.match(r.found[0].meaning, /Размер 30 на 30/);
  assert.match(r.found[1].meaning, /^4 пръта/);
  assert.match(r.found[2].meaning, /на всеки 15 см/);
  assert.match(r.found[3].meaning, /C25\/30/);
  assert.equal(r.unknown, 'Колона бигли');
});

test('позиция, дължина, покритие', () => {
  const m = meanings('поз.3 L=520 c=25мм');
  assert.match(m[0], /Позиция 3/);
  assert.match(m[1], /Дължина на пръта 520/);
  assert.match(m[2], /покритие 25 мм/);
});

test('непознато остава непознато', () => {
  const r = explainNotation('нещо странно');
  assert.equal(r.found.length, 0);
  assert.equal(r.unknown, 'нещо странно');
});
