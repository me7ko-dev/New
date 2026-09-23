import { barWeightPerMeter, calcElement, summarize } from './calc';
import { cutAll } from './cutting';
import { ELEMENT_LABEL, formatElevation } from './labels';
import type { Project } from './types';

function rowWith(cells: (string | number)[], sep: string): string {
  return cells
    .map((c) => {
      const s = typeof c !== 'number' ? c : Number.isInteger(c) ? String(c) : c.toFixed(2).replace('.', ',');
      return /[;\t"\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    })
    .join(sep);
}

/**
 * Количествена сметка + спецификация на армировката + разкрой — една таблица за Excel.
 * `sep` = ';' за CSV файл, '\t' за копиране и поставяне директно в Excel.
 */
export function projectCsv(p: Project, sep = ';'): string {
  const row = (cells: (string | number)[]) => rowWith(cells, sep);
  const s = p.settings;
  const lines: string[] = [row([`Количествена сметка — ${p.name}`]), row([p.address]), ''];

  lines.push(row(['Ниво', 'Кота', 'Елемент', 'Вид', 'Брой', 'Бетон м³', 'Клас', 'Армировка кг', 'Кофраж м²', 'Зидария м²', 'Тухли бр.', 'Мазилка м²']));
  for (const l of p.levels) {
    for (const e of p.elements.filter((x) => x.levelId === l.id)) {
      const r = calcElement(e, s);
      lines.push(
        row([
          l.name,
          formatElevation(l.elevation),
          e.name,
          ELEMENT_LABEL[e.type].title,
          e.count,
          r.concrete,
          r.concrete > 0 ? e.concreteClass : '',
          r.rebarKg,
          r.formwork,
          r.masonryArea,
          r.blocks,
          r.plaster,
        ])
      );
    }
  }

  const sum = summarize(p.elements, s);
  lines.push('', row(['ОБЩО']));
  lines.push(row(['Бетон (нето) м³', sum.concrete]));
  lines.push(row([`Бетон с ${s.concreteWaste}% загуба м³`, sum.concreteWithWaste]));
  lines.push(row(['Бетоновози', sum.trucks]));
  lines.push(row(['Армировка кг', sum.rebarKg]));
  lines.push(row(['Кофраж м²', sum.formwork]));
  lines.push(row(['Зидария м²', sum.masonryArea]));
  lines.push(row(['Тухли бр.', sum.blocks]));
  lines.push(row(['Разтвор м³', sum.mortar]));
  lines.push(row(['Мазилка м²', sum.plaster]));

  lines.push('', row(['СПЕЦИФИКАЦИЯ НА АРМИРОВКАТА']));
  lines.push(row(['Ниво', 'Елемент', 'Поз.', 'Описание', 'Ø мм', 'Брой', 'Дължина м', 'Общо м', 'Тегло кг']));
  const allBars = [];
  for (const l of p.levels) {
    for (const e of p.elements.filter((x) => x.levelId === l.id)) {
      for (const b of calcElement(e, s).bars) {
        allBars.push(b);
        const total = b.count * b.length;
        lines.push(row([l.name, e.name, b.mark, b.label, b.d, b.count, b.length, total, total * barWeightPerMeter(b.d)]));
      }
    }
  }

  lines.push('', row([`РАЗКРОЙ (пръти по ${s.stockLength} м)`]));
  lines.push(row(['Ø мм', 'Търговски пръти', 'Отпадък %', 'Тегло за поръчка кг']));
  for (const c of cutAll(allBars, s.stockLength)) {
    lines.push(row([c.d, c.stockBars, c.wastePercent, c.weightKg]));
  }
  return lines.join('\n');
}
