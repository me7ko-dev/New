import {
  anchorLength,
  lapLength,
  type CalcSettings,
  type Element,
  type ElementStatus,
  type ElementType,
} from './calc';
import type { Discipline, Level, Role, Task, TaskStatus } from './types';

export const ROLE_LABEL: Record<Role, { title: string; hint: string; icon: string }> = {
  client: { title: 'Клиент', hint: 'Виждам как върви и как ще изглежда', icon: '🏠' },
  worker: { title: 'Работник', hint: 'Виждам какво да правя и отбелязвам готовото', icon: '👷' },
  manager: { title: 'Ръководител', hint: 'Управлявам всичко: чертежи, количества, график', icon: '📋' },
};

export const ELEMENT_LABEL: Record<ElementType, { title: string; icon: string }> = {
  column: { title: 'Колона', icon: '▮' },
  beam: { title: 'Греда', icon: '▬' },
  slab: { title: 'Плоча', icon: '▭' },
  wall: { title: 'Шайба (бетонна стена)', icon: '▯' },
  stair: { title: 'Стълбище', icon: '⌸' },
  masonry: { title: 'Зидария (тухлена стена)', icon: '🧱' },
};

export const STATUS_LABEL: Record<ElementStatus, { title: string; color: string }> = {
  todo: { title: 'Предстои', color: '#8A8F98' },
  formwork: { title: 'Кофраж', color: '#B7791F' },
  rebar: { title: 'Армировка', color: '#2B6CB0' },
  concrete: { title: 'Бетониран', color: '#6B46C1' },
  done: { title: 'Готово', color: '#2F855A' },
};

export const MASONRY_STATUS: ElementStatus[] = ['todo', 'done'];

export const TASK_STATUS_LABEL: Record<TaskStatus, { title: string; color: string }> = {
  todo: { title: 'Предстои', color: '#8A8F98' },
  doing: { title: 'В процес', color: '#2B6CB0' },
  done: { title: 'Готово', color: '#2F855A' },
};

export const LATE_COLOR = '#C53030';

export const DISCIPLINE_LABEL: Record<Discipline, { title: string; icon: string }> = {
  arch: { title: 'Архитектура', icon: '🏛' },
  struct: { title: 'Конструкция', icon: '🧱' },
  elec: { title: 'Ток', icon: '⚡' },
  plumb: { title: 'Вода и канал', icon: '💧' },
  hvac: { title: 'Отопление', icon: '🔥' },
  other: { title: 'Друго', icon: '📄' },
};

export function formatElevation(m: number): string {
  if (Math.abs(m) < 0.005) return '±0.00';
  return (m > 0 ? '+' : '−') + Math.abs(m).toFixed(2);
}

export function levelTitle(level: Level | undefined): string {
  if (!level) return 'Целия обект';
  return `${level.name} (${formatElevation(level.elevation)})`;
}

export function fmt(x: number, digits = 2): string {
  return x.toLocaleString('bg-BG', { minimumFractionDigits: 0, maximumFractionDigits: digits });
}

export function tonnes(kg: number): string {
  return kg >= 1000 ? `${fmt(kg / 1000, 2)} т` : `${fmt(kg, 0)} кг`;
}

export function isTaskLate(t: Task, today = new Date()): boolean {
  if (t.status === 'done') return false;
  const end = new Date(t.start);
  end.setDate(end.getDate() + t.days);
  return end < today;
}

/** Размери на елемента с прости думи. */
export function elementSize(e: Element): string {
  switch (e.type) {
    case 'column':
      return `${e.b}×${e.h} см, височина ${fmt(e.height)} м`;
    case 'beam':
      return `${e.b}×${e.h} см, дължина ${fmt(e.length)} м`;
    case 'slab':
      return `${fmt(e.lx)}×${fmt(e.ly)} м, дебелина ${e.t} см`;
    case 'wall':
      return `${fmt(e.length)} м дълга, ${fmt(e.height)} м висока, ${e.t} см дебела`;
    case 'stair':
      return `рамо ${fmt(e.run)} м, изкачва ${fmt(e.rise)} м, ${e.steps} стъпала, ширина ${fmt(e.width)} м`;
    case 'masonry':
      return `${fmt(e.length)} м дълга, ${fmt(e.height)} м висока, ${e.t} см дебела`;
  }
}

/** „Какво да провериш“ — генерира се автоматично от данните на елемента. */
export function checklist(e: Element, s: CalcSettings): string[] {
  const cover = `Бетонно покритие ${fmt(s.cover)} см — сложи дистанционери, желязото да не опира в кофража`;
  const lap = (d: number) => `${fmt(lapLength(d, s) * 100, 0)} см`;
  const anchor = (d: number) => `${fmt(anchorLength(d, s) * 100, 0)} см`;
  switch (e.type) {
    case 'column':
      return [
        `Размер ${e.b}×${e.h} см, височина ${fmt(e.height)} м`,
        `${e.bars.n} пръта Ø${e.bars.d} — по един във всеки ъгъл, останалите на равни разстояния`,
        `Стремена Ø${e.stirrup.d} през ${e.stirrup.s} см, куките да са на различни ъгли`,
        `Прътите да стърчат ${lap(e.bars.d)} над плочата — за снаждане с горния етаж`,
        cover,
      ];
    case 'beam':
      return [
        `Сечение ${e.b}×${e.h} см под плочата, дължина ${fmt(e.length)} м`,
        `Долу: ${e.bottom.n} пръта Ø${e.bottom.d}`,
        e.top.n > 0 ? `Горе: ${e.top.n} пръта Ø${e.top.d}` : 'Горе: без пръти по проект',
        `Стремена Ø${e.stirrup.d} през ${e.stirrup.s} см`,
        `Прътите влизат в колоните поне ${anchor(e.bottom.d)}`,
        cover,
      ];
    case 'slab':
      return [
        `Плоча ${fmt(e.lx)}×${fmt(e.ly)} м, дебелина ${e.t} см`,
        `Долна мрежа: Ø${e.bottom.d} през ${e.bottom.s} см в двете посоки`,
        e.top ? `Горна мрежа: Ø${e.top.d} през ${e.top.s} см в двете посоки — на столчета` : 'Без горна мрежа по проект',
        e.openings > 0 ? `Отвори общо ${fmt(e.openings)} м² — обшиват се с допълнителни пръти` : 'Без отвори',
        'Провери тръбите за ток и вода преди бетона',
        cover,
      ];
    case 'wall':
      return [
        `Стена ${fmt(e.length)}×${fmt(e.height)} м, дебелина ${e.t} см`,
        `Вертикални пръти Ø${e.vertical.d} през ${e.vertical.s} см от двете страни`,
        `Хоризонтални пръти Ø${e.horizontal.d} през ${e.horizontal.s} см от двете страни`,
        `Вертикалните стърчат ${lap(e.vertical.d)} за горния етаж`,
        cover,
      ];
    case 'stair':
      return [
        `${e.steps} стъпала, ширина ${fmt(e.width)} м, плоча ${e.t} см`,
        `Главни пръти Ø${e.main.d} през ${e.main.s} см по наклона`,
        `Разпределителни Ø${e.dist.d} през ${e.dist.s} см напречно`,
        'Всички стъпала да са еднакво високи',
        cover,
      ];
    case 'masonry':
      return [
        `Стена ${fmt(e.length)}×${fmt(e.height)} м, тухла ${e.t} см`,
        'Първият ред върху хидроизолация, точно по конец',
        'Фугите да се разминават с поне половин тухла',
        e.openings > 0 ? `Отвори общо ${fmt(e.openings)} м² — над всеки отвор се слага щурц` : 'Без отвори',
      ];
  }
}
