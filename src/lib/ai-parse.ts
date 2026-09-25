/**
 * Разчитане на чертеж с AI — частта без мрежа: какво питаме и как проверяваме отговора.
 *
 * AI само ПРЕПИСВА това, което е написано на чертежа. Всяко число минава през проверка
 * за разумни граници; съмнителното се заменя със стойност по подразбиране и се показва
 * на човека като „провери“. Сметките правят формулите в calc.ts, не AI.
 */
import { CONCRETE_CLASSES, DIAMETERS, type ConcreteClass, type Element, type ElementType } from './calc.ts';

const TYPES: ElementType[] = ['column', 'beam', 'slab', 'wall', 'stair', 'masonry'];

export const READ_PROMPT = `Ти си помощник, който преписва данни от строителен чертеж (конструкция или архитектура) на български строителен обект.
Върни САМО JSON с тази форма:
{
  "elements": [ ... ],
  "notes": ["кратки бележки на прост български: какво не се чете, какво липсва"]
}
Всеки елемент е един от тези типове (мерни единици: сечения и дебелини в СМ, дължини и височини в М, диаметри в ММ, разстояния между пръти в СМ, отвори в М²):
- колона: {"type":"column","name":"К1","count":1,"b":30,"h":30,"height":3,"bars":{"n":4,"d":16},"stirrup":{"d":8,"s":15},"concreteClass":"C25/30"}
- греда: {"type":"beam","name":"Г1","count":1,"b":25,"h":30,"length":5,"bottom":{"n":3,"d":16},"top":{"n":2,"d":12},"stirrup":{"d":8,"s":15},"concreteClass":"C25/30"}  (h е височината ПОД плочата)
- плоча: {"type":"slab","name":"П1","count":1,"lx":6,"ly":5,"t":18,"bottom":{"d":10,"s":15},"top":{"d":10,"s":20} или null,"openings":0,"concreteClass":"C25/30"}
- шайба (бетонна стена): {"type":"wall","name":"Ш1","count":1,"length":3,"height":3,"t":20,"vertical":{"d":12,"s":20},"horizontal":{"d":10,"s":20},"openings":0,"concreteClass":"C25/30"}
- стълбище (едно рамо): {"type":"stair","name":"Стълбище","count":1,"run":2.7,"rise":1.5,"width":1.2,"t":15,"steps":9,"main":{"d":12,"s":15},"dist":{"d":8,"s":25},"concreteClass":"C25/30"}
- зидария: {"type":"masonry","name":"Външна стена","count":1,"length":10,"height":2.8,"t":25,"openings":0}
Как се четат надписите: „4Ø16“ = 4 пръта с диаметър 16 мм; „Ø8/15“ = пръти Ø8 през 15 см; „N10 Ø12 L=350“ = позиция 10, пръти Ø12 с дължина 350 см; „30/40“ при колона = 30 на 40 см.
Правила:
- Преписвай само това, което се вижда на чертежа или в таблицата. НЕ измисляй числа.
- Ако дадено поле не се чете, пропусни го (не пиши 0 и не гадай) и го спомени в "notes".
- Ако няколко еднакви елемента са с една марка (напр. К1 ×4), върни един елемент с "count": 4.
- Ако на чертежа няма конструктивни елементи, върни "elements": [] и обясни в "notes".`;

export type ReadItem = {
  element: Element;
  /** Полета, които AI не е дал или са извън разумните граници — човекът трябва да ги провери. */
  doubts: string[];
};

export type ReadResult = { items: ReadItem[]; notes: string[] };

type Rule = { path: string; label: string; min: number; max: number; int?: boolean; dia?: boolean; optional?: boolean };

const RULES: Record<ElementType, Rule[]> = {
  column: [
    { path: 'b', label: 'ширина', min: 10, max: 200 },
    { path: 'h', label: 'дълбочина', min: 10, max: 200 },
    { path: 'height', label: 'височина', min: 1, max: 12 },
    { path: 'bars.n', label: 'брой пръти', min: 4, max: 60, int: true },
    { path: 'bars.d', label: 'диаметър на прътите', min: 0, max: 0, dia: true },
    { path: 'stirrup.d', label: 'диаметър на биглите', min: 0, max: 0, dia: true },
    { path: 'stirrup.s', label: 'разстояние между биглите', min: 5, max: 40 },
  ],
  beam: [
    { path: 'b', label: 'ширина', min: 10, max: 150 },
    { path: 'h', label: 'височина', min: 10, max: 250 },
    { path: 'length', label: 'дължина', min: 0.5, max: 30 },
    { path: 'bottom.n', label: 'брой долни пръти', min: 1, max: 30, int: true },
    { path: 'bottom.d', label: 'диаметър на долните пръти', min: 0, max: 0, dia: true },
    { path: 'top.n', label: 'брой горни пръти', min: 0, max: 30, int: true },
    { path: 'top.d', label: 'диаметър на горните пръти', min: 0, max: 0, dia: true },
    { path: 'stirrup.d', label: 'диаметър на биглите', min: 0, max: 0, dia: true },
    { path: 'stirrup.s', label: 'разстояние между биглите', min: 5, max: 40 },
  ],
  slab: [
    { path: 'lx', label: 'дължина', min: 0.5, max: 60 },
    { path: 'ly', label: 'ширина', min: 0.5, max: 60 },
    { path: 't', label: 'дебелина', min: 8, max: 60 },
    { path: 'openings', label: 'отвори', min: 0, max: 1000, optional: true },
    { path: 'bottom.d', label: 'диаметър на долната мрежа', min: 0, max: 0, dia: true },
    { path: 'bottom.s', label: 'разстояние в долната мрежа', min: 5, max: 40 },
  ],
  wall: [
    { path: 'length', label: 'дължина', min: 0.3, max: 40 },
    { path: 'height', label: 'височина', min: 1, max: 12 },
    { path: 't', label: 'дебелина', min: 10, max: 80 },
    { path: 'openings', label: 'отвори', min: 0, max: 200, optional: true },
    { path: 'vertical.d', label: 'диаметър на вертикалните пръти', min: 0, max: 0, dia: true },
    { path: 'vertical.s', label: 'разстояние на вертикалните пръти', min: 5, max: 40 },
    { path: 'horizontal.d', label: 'диаметър на хоризонталните пръти', min: 0, max: 0, dia: true },
    { path: 'horizontal.s', label: 'разстояние на хоризонталните пръти', min: 5, max: 40 },
  ],
  stair: [
    { path: 'run', label: 'дължина на рамото', min: 0.5, max: 10 },
    { path: 'rise', label: 'височина на рамото', min: 0.3, max: 5 },
    { path: 'width', label: 'ширина', min: 0.6, max: 5 },
    { path: 't', label: 'дебелина', min: 8, max: 40 },
    { path: 'steps', label: 'брой стъпала', min: 2, max: 30, int: true },
    { path: 'main.d', label: 'диаметър на главните пръти', min: 0, max: 0, dia: true },
    { path: 'main.s', label: 'разстояние на главните пръти', min: 5, max: 40 },
    { path: 'dist.d', label: 'диаметър на разпределителните пръти', min: 0, max: 0, dia: true },
    { path: 'dist.s', label: 'разстояние на разпределителните пръти', min: 5, max: 40 },
  ],
  masonry: [
    { path: 'length', label: 'дължина', min: 0.3, max: 300 },
    { path: 'height', label: 'височина', min: 0.5, max: 12 },
    { path: 't', label: 'дебелина', min: 5, max: 60 },
    { path: 'openings', label: 'врати и прозорци', min: 0, max: 1000, optional: true },
  ],
};

function get(o: unknown, path: string): unknown {
  return path.split('.').reduce<unknown>((acc, k) => (acc && typeof acc === 'object' ? (acc as Record<string, unknown>)[k] : undefined), o);
}

function set<T>(o: T, path: string, value: unknown): T {
  const [head, ...rest] = path.split('.');
  const obj = o as Record<string, unknown>;
  return { ...obj, [head]: rest.length ? set(obj[head] ?? {}, rest.join('.'), value) : value } as T;
}

/** „16“, „Ø16“, „16 мм“, „0,15“ → число. */
function toNumber(v: unknown): number | null {
  if (typeof v === 'number') return Number.isFinite(v) ? v : null;
  if (typeof v !== 'string') return null;
  const m = v.replace(',', '.').match(/-?\d+(\.\d+)?/);
  return m ? parseFloat(m[0]) : null;
}

/** Изважда JSON от отговора, дори ако AI го е сложил в ```json ... ``` или е добавил текст около него. */
export function extractJson(text: string): unknown {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const body = fenced ? fenced[1] : text;
  const start = body.indexOf('{');
  const end = body.lastIndexOf('}');
  if (start < 0 || end <= start) throw new Error('AI не върна данни в очаквания вид.');
  return JSON.parse(body.slice(start, end + 1));
}

/**
 * Превръща един елемент от отговора на AI в елемент на приложението.
 * `base` е елемент по подразбиране от същия тип — от него идват стойностите за непрочетените полета.
 */
export function sanitizeElement(raw: Record<string, unknown>, base: Element): ReadItem {
  let e: Element = { ...base };
  const doubts: string[] = [];

  if (typeof raw.name === 'string' && raw.name.trim()) e.name = raw.name.trim().slice(0, 60);
  const count = toNumber(raw.count);
  if (count !== null && Number.isInteger(count) && count >= 1 && count <= 200) e.count = count;

  if (e.type !== 'masonry') {
    const cls = typeof raw.concreteClass === 'string' ? raw.concreteClass.replace(/\s/g, '').toUpperCase() : '';
    if (CONCRETE_CLASSES.includes(cls as ConcreteClass)) e.concreteClass = cls as ConcreteClass;
  }

  // Плоча без горна мрежа — AI връща null.
  if (e.type === 'slab') {
    const top = raw.top;
    if (top === null) e = { ...e, top: null };
    else {
      const d = toNumber(get(top, 'd'));
      const s = toNumber(get(top, 's'));
      if (d !== null && DIAMETERS.includes(d) && s !== null && s >= 5 && s <= 40) e = { ...e, top: { d, s } };
      else if (top !== undefined) doubts.push('горна мрежа');
    }
  }

  for (const r of RULES[e.type]) {
    const v = get(raw, r.path);
    if (v === undefined || v === null) {
      if (!r.optional) doubts.push(r.label);
      continue;
    }
    const n = toNumber(v);
    const ok = n !== null && (r.dia ? DIAMETERS.includes(n) : n >= r.min && n <= r.max && (!r.int || Number.isInteger(n)));
    if (ok) e = set(e, r.path, n);
    else doubts.push(r.label);
  }

  // Греда без горни пръти: брой 0 е валиден, диаметърът тогава няма значение.
  if (e.type === 'beam' && e.top.n === 0) {
    const i = doubts.indexOf('диаметър на горните пръти');
    if (i >= 0) doubts.splice(i, 1);
  }

  return { element: e, doubts };
}

/** Целият отговор на AI → списък елементи за потвърждение. */
export function parseReadResponse(text: string, makeBase: (type: ElementType) => Element): ReadResult {
  const json = extractJson(text) as { elements?: unknown; notes?: unknown };
  const notes = Array.isArray(json.notes) ? json.notes.filter((n): n is string => typeof n === 'string' && !!n.trim()) : [];
  const list = Array.isArray(json.elements) ? json.elements : [];
  const items: ReadItem[] = [];
  for (const raw of list) {
    if (!raw || typeof raw !== 'object') continue;
    const type = (raw as { type?: unknown }).type;
    if (!TYPES.includes(type as ElementType)) continue;
    items.push(sanitizeElement(raw as Record<string, unknown>, makeBase(type as ElementType)));
  }
  return { items, notes };
}
