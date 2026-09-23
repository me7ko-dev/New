import { DEFAULT_SETTINGS, type Element, type ElementType } from './calc';
import type { Level, Project, Task } from './types';

export function uid(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
}

export function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function addDays(iso: string, days: number): string {
  const d = new Date(iso);
  d.setDate(d.getDate() + days);
  return isoDate(d);
}

/** Нива от кота ±0.00 до покрива. */
export function makeLevels(floors: number, floorHeight: number): Level[] {
  const levels: Level[] = [];
  for (let i = 0; i < floors; i++) {
    levels.push({ id: uid(), name: `Етаж ${i + 1}`, elevation: Math.round(i * floorHeight * 100) / 100 });
  }
  levels.push({ id: uid(), name: 'Покрив', elevation: Math.round(floors * floorHeight * 100) / 100 });
  return levels;
}

/** Типов график: за всеки етаж — кофраж, армировка, бетон, зидария. */
export function makeTasks(levels: Level[], start: string): Task[] {
  const tasks: Task[] = [];
  let day = start;
  for (const l of levels) {
    const steps: [string, number][] =
      l.name === 'Покрив'
        ? [
            ['Покривна плоча — кофраж и армировка', 7],
            ['Бетониране на покривната плоча', 1],
            ['Хидро- и топлоизолация на покрива', 5],
          ]
        : [
            ['Колони и шайби — армировка и кофраж', 5],
            ['Бетониране на колоните', 1],
            ['Плоча и греди — кофраж и армировка', 7],
            ['Бетониране на плочата', 1],
            ['Зидария', 6],
          ];
    for (const [title, days] of steps) {
      tasks.push({ id: uid(), title: `${l.name}: ${title}`, levelId: l.id, start: day, days, status: 'todo' });
      day = addDays(day, days);
    }
  }
  return tasks;
}

export function newProject(name: string, address: string, floors: number, floorHeight: number): Project {
  const levels = makeLevels(floors, floorHeight);
  return {
    id: uid(),
    name,
    address,
    levels,
    drawings: [],
    elements: [],
    tasks: makeTasks(levels, isoDate(new Date())),
    settings: { ...DEFAULT_SETTINGS },
    createdAt: new Date().toISOString(),
  };
}

export function newElement(type: ElementType, levelId: string): Element {
  const base = { id: uid(), levelId, count: 1, concreteClass: 'C25/30' as const, status: 'todo' as const };
  switch (type) {
    case 'column':
      return { ...base, type, name: 'Колона К1', b: 30, h: 30, height: 3, bars: { n: 4, d: 16 }, stirrup: { d: 8, s: 15 } };
    case 'beam':
      return {
        ...base,
        type,
        name: 'Греда Г1',
        b: 25,
        h: 30,
        length: 5,
        bottom: { n: 3, d: 16 },
        top: { n: 2, d: 12 },
        stirrup: { d: 8, s: 15 },
      };
    case 'slab':
      return {
        ...base,
        type,
        name: 'Плоча П1',
        lx: 6,
        ly: 5,
        t: 18,
        bottom: { d: 10, s: 15 },
        top: { d: 10, s: 20 },
        openings: 0,
      };
    case 'wall':
      return {
        ...base,
        type,
        name: 'Шайба Ш1',
        length: 3,
        t: 20,
        height: 3,
        vertical: { d: 12, s: 20 },
        horizontal: { d: 10, s: 20 },
        openings: 0,
      };
    case 'stair':
      return {
        ...base,
        type,
        name: 'Стълбище',
        run: 2.7,
        rise: 1.5,
        width: 1.2,
        t: 15,
        steps: 9,
        main: { d: 12, s: 15 },
        dist: { d: 8, s: 25 },
      };
    case 'masonry':
      return {
        ...base,
        type,
        name: 'Външна стена',
        length: 10,
        height: 2.8,
        t: 25,
        openings: 0,
        blocksPerM2: 11.2,
        mortarPerM2: 22,
        plasterBothSides: true,
      };
  }
}

/** Примерен обект, за да се види веднага как работи всичко. */
export function demoProject(): Project {
  const p = newProject('Жилищна сграда — пример', 'гр. София, ул. Примерна 1', 3, 3);
  const start = new Date();
  start.setDate(start.getDate() - 20);
  p.tasks = makeTasks(p.levels, isoDate(start));
  p.tasks.forEach((t, i) => {
    if (i < 5) t.status = 'done';
    else if (i < 7) t.status = 'doing';
  });

  const els: Element[] = [];
  p.levels.forEach((l, i) => {
    const roof = l.name === 'Покрив';
    const set = <T extends Element>(e: T, patch: Partial<T>): T => ({ ...e, ...patch });
    if (!roof) {
      els.push(
        set(newElement('column', l.id), { name: 'Колони К1 (ъглови)', count: 4, status: i === 0 ? 'done' : 'todo' }),
        set(newElement('column', l.id), {
          name: 'Колони К2 (средни)',
          count: 2,
          b: 30,
          h: 40,
          bars: { n: 6, d: 16 },
          status: i === 0 ? 'done' : 'todo',
        }),
        set(newElement('wall', l.id), { name: 'Шайба при стълбите', status: i === 0 ? 'concrete' : 'todo' }),
        set(newElement('stair', l.id), { name: 'Стълбищно рамо', count: 2, status: i === 0 ? 'rebar' : 'todo' }),
        set(newElement('masonry', l.id), { name: 'Външни стени', length: 36, openings: 14 }),
        set(newElement('masonry', l.id), {
          name: 'Вътрешни стени',
          length: 22,
          t: 12,
          blocksPerM2: 8.4,
          mortarPerM2: 9,
          openings: 6,
        })
      );
    }
    els.push(
      set(newElement('beam', l.id), {
        name: 'Греди по контура',
        count: 4,
        length: 9,
        bottom: { n: 3, d: 16 },
        status: i === 0 ? 'rebar' : 'todo',
      }),
      set(newElement('slab', l.id), {
        name: roof ? 'Покривна плоча' : `Плоча над ${l.name.toLowerCase()}`,
        lx: 10,
        ly: 9,
        t: roof ? 16 : 18,
        openings: roof ? 0 : 4.5,
        status: i === 0 ? 'formwork' : 'todo',
      })
    );
  });
  p.elements = els;
  return p;
}
