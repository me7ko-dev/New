/**
 * Разкрой на армировката: как да се нарежат търговските пръти (обикновено 12 м)
 * с възможно най-малко отпадък. Използва се „първо подходящо, по низходящ ред“ (FFD).
 */
import { barWeightPerMeter, type BarItem } from './calc.ts';

export type CutPattern = {
  /** Парчета, които се режат от един търговски прът, м. */
  pieces: number[];
  waste: number;
  /** Колко търговски пръта се режат по тази схема. */
  times: number;
};

export type DiameterCutting = {
  d: number;
  stockBars: number;
  usedLength: number;
  wasteLength: number;
  wastePercent: number;
  weightKg: number;
  patterns: CutPattern[];
};

const EPS = 1e-6;

/** Разделя прът, по-дълъг от търговския, на парчета (снажданията вече са включени в дължината). */
function splitPiece(length: number, stock: number): number[] {
  const out: number[] = [];
  let rest = length;
  while (rest > stock + EPS) {
    out.push(stock);
    rest -= stock;
  }
  if (rest > EPS) out.push(Math.round(rest * 100) / 100);
  return out;
}

export function cutDiameter(d: number, bars: BarItem[], stock: number): DiameterCutting {
  const pieces: number[] = [];
  for (const b of bars) {
    if (b.d !== d) continue;
    const parts = splitPiece(b.length, stock);
    for (let i = 0; i < b.count; i++) pieces.push(...parts);
  }
  pieces.sort((a, b) => b - a);

  const bins: { pieces: number[]; free: number }[] = [];
  for (const p of pieces) {
    let bin = bins.find((x) => x.free + EPS >= p);
    if (!bin) {
      bin = { pieces: [], free: stock };
      bins.push(bin);
    }
    bin.pieces.push(p);
    bin.free -= p;
  }

  const grouped = new Map<string, CutPattern>();
  for (const bin of bins) {
    const key = bin.pieces.map((p) => p.toFixed(2)).join('+');
    const g = grouped.get(key);
    if (g) g.times++;
    else grouped.set(key, { pieces: bin.pieces, waste: Math.max(0, bin.free), times: 1 });
  }

  const usedLength = pieces.reduce((a, b) => a + b, 0);
  const total = bins.length * stock;
  return {
    d,
    stockBars: bins.length,
    usedLength,
    wasteLength: total - usedLength,
    wastePercent: total > 0 ? ((total - usedLength) / total) * 100 : 0,
    weightKg: total * barWeightPerMeter(d),
    patterns: [...grouped.values()].sort((a, b) => b.times - a.times),
  };
}

export function cutAll(bars: BarItem[], stock: number): DiameterCutting[] {
  const diameters = [...new Set(bars.map((b) => b.d))].sort((a, b) => a - b);
  return diameters.map((d) => cutDiameter(d, bars, stock));
}
