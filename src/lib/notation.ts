/**
 * „Преводач“ на надписи от конструктивни чертежи на прости думи.
 * Разпознава само това, в което е сигурен; непознатото се връща като `unknown`,
 * за да не се подведе човек с грешно тълкуване.
 */

export type Explained = { text: string; meaning: string };

type Rule = { re: RegExp; explain: (m: RegExpExecArray) => string };

const PHI = '[ØøФфΦφ⌀]';
const num = (s: string) => s.replace(',', '.');

const RULES: Rule[] = [
  {
    // Ø8/15, ф8 през 15, Ø8@150 (мм)
    re: new RegExp(`${PHI}\\s*(\\d{1,2})\\s*(?:\\/|през|@)\\s*(\\d{1,3})`, 'g'),
    explain: (m) => {
      const d = m[1];
      let s = Number(m[2]);
      const mm = m[0].includes('@') && s >= 50;
      if (mm) s = s / 10;
      return `Пръти (или бигли) с диаметър ${d} мм, поставени на всеки ${s} см${mm ? ' (в чертежа е в мм)' : ''}.`;
    },
  },
  {
    // 4Ø16, 4 ф 16
    re: new RegExp(`(\\d{1,3})\\s*${PHI}\\s*(\\d{1,2})`, 'g'),
    explain: (m) => `${m[1]} ${Number(m[1]) === 1 ? 'прът' : 'пръта'} с диаметър ${m[2]} мм.`,
  },
  {
    re: new RegExp(`${PHI}\\s*(\\d{1,2})`, 'g'),
    explain: (m) => `Прът с диаметър ${m[1]} мм (Ø = диаметър).`,
  },
  {
    re: /\bC\s?(\d{2})\s?\/\s?(\d{2})\b/gi,
    explain: (m) => `Клас на бетона C${m[1]}/${m[2]}. Колкото по-голямо е числото, толкова по-здрав е бетонът. Точно този клас се поръчва.`,
  },
  {
    re: /\bB\s?500\s?([ABC])\b/gi,
    explain: (m) => `Стомана за армировка B500${m[1].toUpperCase()} — оребрени пръти, най-често използваните днес.`,
  },
  {
    re: /\bA-?(III|II|I)\b/g,
    explain: (m) =>
      m[1] === 'I' ? 'Стомана A-I (старо означение) — гладки пръти, обикновено за бигли.' : `Стомана A-${m[1]} (старо означение) — оребрени пръти.`,
  },
  {
    re: /([±+\-−])\s?(\d{1,3}[.,]\d{2,3})\b/g,
    explain: (m) => {
      const v = Number(num(m[2]));
      if (m[1] === '±' || v === 0) return 'Кота ±0.00 — нулата на сградата, обикновено готовият под на първия етаж.';
      const where = m[1] === '+' ? 'над' : 'под';
      return `Кота: ${String(v).replace('.', ',')} м ${where} нулата (±0.00).`;
    },
  },
  {
    re: /\bL\s*=\s*(\d+(?:[.,]\d+)?)/gi,
    explain: (m) => `Дължина на пръта ${m[1]}. Мерната единица е в заглавието на таблицата — обикновено см.`,
  },
  {
    re: /поз\.?\s*(\d+)/gi,
    explain: (m) => `Позиция ${m[1]} — търси този номер в таблицата за армировка, там са броят, дължината и формата.`,
  },
  {
    re: /(?:\bc|покритие)\s*=\s*(\d+(?:[.,]\d+)?)\s*(мм|mm|см|cm)?/gi,
    explain: (m) => `Бетонно покритие ${m[1]} ${m[2] ?? ''} — разстоянието от пръта до външната страна на бетона.`.replace(/\s+—/, ' —'),
  },
  {
    // 25/50, 30x30 — сечение
    re: /\b(\d{2,3})\s*[\/xх×]\s*(\d{2,3})\b/g,
    explain: (m) => `Размер ${m[1]} на ${m[2]} — обикновено сечение в см (ширина × височина).`,
  },
];

export function explainNotation(input: string): { found: Explained[]; unknown: string } {
  const hits: { start: number; end: number; rule: number; m: RegExpExecArray }[] = [];
  RULES.forEach((r, i) => {
    r.re.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = r.re.exec(input))) {
      hits.push({ start: m.index, end: m.index + m[0].length, rule: i, m });
      if (m[0].length === 0) r.re.lastIndex++;
    }
  });
  // По-ранните правила са по-точни — те печелят при застъпване.
  hits.sort((a, b) => a.rule - b.rule || a.start - b.start);
  const taken: typeof hits = [];
  for (const h of hits) {
    if (taken.some((t) => h.start < t.end && t.start < h.end)) continue;
    taken.push(h);
  }
  taken.sort((a, b) => a.start - b.start);
  let unknown = input;
  for (const t of [...taken].sort((a, b) => b.start - a.start)) unknown = unknown.slice(0, t.start) + ' ' + unknown.slice(t.end);
  return {
    found: taken.map((t) => ({ text: t.m[0].trim(), meaning: RULES[t.rule].explain(t.m) })),
    unknown: unknown.replace(/[\s,;.:]+/g, ' ').trim(),
  };
}
