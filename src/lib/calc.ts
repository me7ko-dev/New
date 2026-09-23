/**
 * Количествени сметки: бетон, армировка, кофраж, зидария.
 *
 * Мерни единици:
 *  - сечения и дебелини: см
 *  - дължини, височини, отвори в план: м (отвори — м²)
 *  - диаметри на армировка: мм
 *
 * Приложението смята КОЛИЧЕСТВА по готов конструктивен проект.
 * То НЕ оразмерява конструкцията — това е работа на инженер-конструктор.
 */

export type ConcreteClass = 'C16/20' | 'C20/25' | 'C25/30' | 'C30/37' | 'C35/45';
export const CONCRETE_CLASSES: ConcreteClass[] = ['C16/20', 'C20/25', 'C25/30', 'C30/37', 'C35/45'];
export const DIAMETERS = [6, 8, 10, 12, 14, 16, 18, 20, 22, 25, 28, 32];

/** Етап на изпълнение на елемент — „какво е свършено“. */
export type ElementStatus = 'todo' | 'formwork' | 'rebar' | 'concrete' | 'done';
export const STATUS_ORDER: ElementStatus[] = ['todo', 'formwork', 'rebar', 'concrete', 'done'];

export type Bars = { n: number; d: number };
export type Mesh = { d: number; s: number };

type ElementBase = {
  id: string;
  levelId: string;
  name: string;
  count: number;
  concreteClass: ConcreteClass;
  status: ElementStatus;
  note?: string;
};

export type ColumnElement = ElementBase & {
  type: 'column';
  b: number;
  h: number;
  height: number;
  bars: Bars;
  stirrup: Mesh;
};

export type BeamElement = ElementBase & {
  type: 'beam';
  b: number;
  /** Височина под плочата, за да не се брои бетонът на плочата два пъти. */
  h: number;
  length: number;
  bottom: Bars;
  top: Bars;
  stirrup: Mesh;
};

export type SlabElement = ElementBase & {
  type: 'slab';
  lx: number;
  ly: number;
  t: number;
  bottom: Mesh;
  top: Mesh | null;
  openings: number;
};

export type WallElement = ElementBase & {
  type: 'wall';
  length: number;
  t: number;
  height: number;
  vertical: Mesh;
  horizontal: Mesh;
  openings: number;
};

export type StairElement = ElementBase & {
  type: 'stair';
  /** Хоризонтална дължина на рамото, м. */
  run: number;
  /** Височина, която рамото изкачва, м. */
  rise: number;
  width: number;
  t: number;
  steps: number;
  main: Mesh;
  dist: Mesh;
};

export type MasonryElement = ElementBase & {
  type: 'masonry';
  length: number;
  height: number;
  t: number;
  openings: number;
  blocksPerM2: number;
  /** Разтвор, литри на м². */
  mortarPerM2: number;
  plasterBothSides: boolean;
};

export type Element =
  | ColumnElement
  | BeamElement
  | SlabElement
  | WallElement
  | StairElement
  | MasonryElement;

export type ElementType = Element['type'];

export type CalcSettings = {
  /** Бетонно покритие, см. */
  cover: number;
  /** Дължина на снаждане = lapFactor × Ø. */
  lapFactor: number;
  /** Дължина на анкериране = anchorFactor × Ø. */
  anchorFactor: number;
  /** Дължина на кука на стреме = hookFactor × Ø (за всяка от двете куки). */
  hookFactor: number;
  /** Търговска дължина на прът, м. */
  stockLength: number;
  /** Загуба на бетон, %. */
  concreteWaste: number;
  /** Обем на един бетоновоз, м³. */
  truckVolume: number;
};

export const DEFAULT_SETTINGS: CalcSettings = {
  cover: 2.5,
  lapFactor: 50,
  anchorFactor: 40,
  hookFactor: 10,
  stockLength: 12,
  concreteWaste: 3,
  truckVolume: 8,
};

export type BarShape =
  | { kind: 'straight' }
  /** Затворено стреме, вътрешни размери в см. */
  | { kind: 'stirrup'; a: number; b: number };

export type BarItem = {
  mark: string;
  label: string;
  d: number;
  count: number;
  /** Дължина на един прът, м (със снаждания, ако е по-дълъг от търговския). */
  length: number;
  shape: BarShape;
};

export type ElementResult = {
  concrete: number;
  formwork: number;
  bars: BarItem[];
  rebarKg: number;
  masonryArea: number;
  blocks: number;
  mortar: number;
  plaster: number;
};

const STEEL_DENSITY = 7850;

/** Тегло на прът, кг/м. */
export function barWeightPerMeter(d: number): number {
  return (Math.PI * (d / 1000) ** 2 * STEEL_DENSITY) / 4;
}

export function lapLength(d: number, s: CalcSettings): number {
  return (s.lapFactor * d) / 1000;
}

export function anchorLength(d: number, s: CalcSettings): number {
  return (s.anchorFactor * d) / 1000;
}

/** Добавя снаждания, когато прътът е по-дълъг от търговския. */
export function withLaps(length: number, d: number, s: CalcSettings): number {
  if (length <= s.stockLength) return length;
  const lap = lapLength(d, s);
  const pieces = Math.ceil((length - lap) / (s.stockLength - lap));
  return length + (pieces - 1) * lap;
}

/** Брой пръти, разпределени на стъпка `spacing` (см) по дължина `length` (м). */
export function countAt(length: number, spacing: number): number {
  if (length <= 0 || spacing <= 0) return 0;
  return Math.floor((length * 100) / spacing) + 1;
}

function stirrupLength(a: number, b: number, d: number, s: CalcSettings): number {
  return (2 * (a + b)) / 100 + (2 * s.hookFactor * d) / 1000;
}

function round(x: number, digits = 2): number {
  const f = 10 ** digits;
  return Math.round(x * f) / f;
}

function straight(mark: string, label: string, d: number, count: number, length: number, s: CalcSettings): BarItem {
  return { mark, label, d, count, length: round(withLaps(length, d, s)), shape: { kind: 'straight' } };
}

function stirrup(
  mark: string,
  label: string,
  d: number,
  count: number,
  a: number,
  b: number,
  s: CalcSettings
): BarItem {
  return {
    mark,
    label,
    d,
    count,
    length: round(stirrupLength(a, b, d, s)),
    shape: { kind: 'stirrup', a: round(a, 1), b: round(b, 1) },
  };
}

function elementBars(e: Element, s: CalcSettings): BarItem[] {
  const c = s.cover;
  switch (e.type) {
    case 'column': {
      const n = e.count;
      const ia = e.b - 2 * c;
      const ib = e.h - 2 * c;
      return [
        straight('1', 'Надлъжни пръти (+ снаждане за горния етаж)', e.bars.d, e.bars.n * n, e.height + lapLength(e.bars.d, s), s),
        stirrup('2', 'Стремена', e.stirrup.d, countAt(e.height, e.stirrup.s) * n, ia, ib, s),
      ];
    }
    case 'beam': {
      const n = e.count;
      const out: BarItem[] = [];
      if (e.bottom.n > 0)
        out.push(straight('1', 'Долни пръти', e.bottom.d, e.bottom.n * n, e.length + 2 * anchorLength(e.bottom.d, s), s));
      if (e.top.n > 0)
        out.push(straight('2', 'Горни пръти', e.top.d, e.top.n * n, e.length + 2 * anchorLength(e.top.d, s), s));
      out.push(stirrup('3', 'Стремена', e.stirrup.d, countAt(e.length, e.stirrup.s) * n, e.b - 2 * c, e.h - 2 * c, s));
      return out;
    }
    case 'slab': {
      const n = e.count;
      const lx = e.lx - (2 * c) / 100;
      const ly = e.ly - (2 * c) / 100;
      const out = [
        straight('1', 'Долна мрежа — по дългата страна', e.bottom.d, countAt(ly, e.bottom.s) * n, lx, s),
        straight('2', 'Долна мрежа — по късата страна', e.bottom.d, countAt(lx, e.bottom.s) * n, ly, s),
      ];
      if (e.top) {
        out.push(
          straight('3', 'Горна мрежа — по дългата страна', e.top.d, countAt(ly, e.top.s) * n, lx, s),
          straight('4', 'Горна мрежа — по късата страна', e.top.d, countAt(lx, e.top.s) * n, ly, s)
        );
      }
      return out;
    }
    case 'wall': {
      const n = e.count;
      const faces = 2 * n;
      return [
        straight('1', 'Вертикални пръти (двете страни)', e.vertical.d, countAt(e.length, e.vertical.s) * faces, e.height + lapLength(e.vertical.d, s), s),
        straight('2', 'Хоризонтални пръти (двете страни)', e.horizontal.d, countAt(e.height, e.horizontal.s) * faces, e.length - (2 * c) / 100, s),
      ];
    }
    case 'stair': {
      const n = e.count;
      const incline = Math.hypot(e.run, e.rise);
      return [
        straight('1', 'Главни пръти (по наклона)', e.main.d, countAt(e.width, e.main.s) * n, incline + 2 * anchorLength(e.main.d, s), s),
        straight('2', 'Разпределителни пръти', e.dist.d, countAt(incline, e.dist.s) * n, e.width - (2 * c) / 100, s),
      ];
    }
    case 'masonry':
      return [];
  }
}

function elementConcrete(e: Element): number {
  switch (e.type) {
    case 'column':
      return (e.b / 100) * (e.h / 100) * e.height * e.count;
    case 'beam':
      return (e.b / 100) * (e.h / 100) * e.length * e.count;
    case 'slab':
      return Math.max(0, e.lx * e.ly - e.openings) * (e.t / 100) * e.count;
    case 'wall':
      return Math.max(0, e.length * e.height - e.openings) * (e.t / 100) * e.count;
    case 'stair': {
      const incline = Math.hypot(e.run, e.rise);
      const slab = incline * e.width * (e.t / 100);
      const steps = e.steps > 0 ? (e.rise * e.run * e.width) / (2 * e.steps) : 0;
      return (slab + steps) * e.count;
    }
    case 'masonry':
      return 0;
  }
}

function elementFormwork(e: Element): number {
  switch (e.type) {
    case 'column':
      return ((2 * (e.b + e.h)) / 100) * e.height * e.count;
    case 'beam':
      return ((e.b + 2 * e.h) / 100) * e.length * e.count;
    case 'slab':
      return (Math.max(0, e.lx * e.ly - e.openings) + 2 * (e.lx + e.ly) * (e.t / 100)) * e.count;
    case 'wall':
      return 2 * Math.max(0, e.length * e.height - e.openings) * e.count;
    case 'stair':
      return (Math.hypot(e.run, e.rise) * e.width + e.rise * e.width) * e.count;
    case 'masonry':
      return 0;
  }
}

export function calcElement(e: Element, s: CalcSettings = DEFAULT_SETTINGS): ElementResult {
  const bars = elementBars(e, s);
  const rebarKg = bars.reduce((sum, b) => sum + b.count * b.length * barWeightPerMeter(b.d), 0);
  let masonryArea = 0;
  let blocks = 0;
  let mortar = 0;
  let plaster = 0;
  if (e.type === 'masonry') {
    masonryArea = Math.max(0, e.length * e.height - e.openings) * e.count;
    blocks = Math.ceil(masonryArea * e.blocksPerM2);
    mortar = (masonryArea * e.mortarPerM2) / 1000;
    plaster = masonryArea * (e.plasterBothSides ? 2 : 1);
  }
  return {
    concrete: round(elementConcrete(e), 3),
    formwork: round(elementFormwork(e)),
    bars,
    rebarKg: round(rebarKg, 1),
    masonryArea: round(masonryArea),
    blocks,
    mortar: round(mortar, 3),
    plaster: round(plaster),
  };
}

export type Summary = {
  concrete: number;
  concreteWithWaste: number;
  concreteByClass: Partial<Record<ConcreteClass, number>>;
  trucks: number;
  formwork: number;
  rebarKg: number;
  rebarByDiameter: Record<number, number>;
  masonryArea: number;
  blocks: number;
  mortar: number;
  plaster: number;
};

export function summarize(elements: Element[], s: CalcSettings = DEFAULT_SETTINGS): Summary {
  const sum: Summary = {
    concrete: 0,
    concreteWithWaste: 0,
    concreteByClass: {},
    trucks: 0,
    formwork: 0,
    rebarKg: 0,
    rebarByDiameter: {},
    masonryArea: 0,
    blocks: 0,
    mortar: 0,
    plaster: 0,
  };
  for (const e of elements) {
    const r = calcElement(e, s);
    sum.concrete += r.concrete;
    if (r.concrete > 0) sum.concreteByClass[e.concreteClass] = (sum.concreteByClass[e.concreteClass] ?? 0) + r.concrete;
    sum.formwork += r.formwork;
    for (const b of r.bars) {
      const kg = b.count * b.length * barWeightPerMeter(b.d);
      sum.rebarByDiameter[b.d] = (sum.rebarByDiameter[b.d] ?? 0) + kg;
      sum.rebarKg += kg;
    }
    sum.masonryArea += r.masonryArea;
    sum.blocks += r.blocks;
    sum.mortar += r.mortar;
    sum.plaster += r.plaster;
  }
  sum.concreteWithWaste = sum.concrete * (1 + s.concreteWaste / 100);
  sum.trucks = sum.concreteWithWaste > 0 ? Math.ceil(sum.concreteWithWaste / s.truckVolume) : 0;
  return sum;
}
