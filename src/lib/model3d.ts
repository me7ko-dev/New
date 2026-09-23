/**
 * 3D модел на елемент като прости примитиви (линии = пръти, многоъгълници = бетон/кофраж),
 * разделен на етапи на изпълнение. Всички размери са в см.
 * x — надясно, y — навътре, z — нагоре.
 */
import { anchorLength, lapLength, type CalcSettings, type Element } from './calc';

export type V3 = [number, number, number];

export type Layer = 'bars' | 'stirrups' | 'formwork' | 'concrete' | 'masonry';

export type Prim =
  | { t: 'line'; a: V3; b: V3; layer: Layer; w: number }
  | { t: 'poly'; pts: V3[]; layer: Layer };

export type Stage = { title: string; layers: Layer[] };

export type Model = { prims: Prim[]; stages: Stage[]; partial?: string };

const STD_STAGES: Stage[] = [
  { title: 'Пръти', layers: ['bars'] },
  { title: 'Бигли', layers: ['bars', 'stirrups'] },
  { title: 'Кофраж', layers: ['bars', 'stirrups', 'formwork'] },
  { title: 'Бетон', layers: ['bars', 'stirrups', 'concrete'] },
];

function box(x0: number, y0: number, z0: number, x1: number, y1: number, z1: number, layer: Layer, faces?: ('bottom' | 'top' | 'front' | 'back' | 'left' | 'right')[]): Prim[] {
  const f = {
    bottom: [[x0, y0, z0], [x1, y0, z0], [x1, y1, z0], [x0, y1, z0]],
    top: [[x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1]],
    front: [[x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1]],
    back: [[x0, y1, z0], [x1, y1, z0], [x1, y1, z1], [x0, y1, z1]],
    left: [[x0, y0, z0], [x0, y1, z0], [x0, y1, z1], [x0, y0, z1]],
    right: [[x1, y0, z0], [x1, y1, z0], [x1, y1, z1], [x1, y0, z1]],
  } as Record<string, V3[]>;
  return (faces ?? (Object.keys(f) as (keyof typeof f)[])).map((k) => ({ t: 'poly' as const, pts: f[k], layer }));
}

function line(a: V3, b: V3, layer: Layer, d: number): Prim {
  return { t: 'line', a, b, layer, w: d / 10 };
}

/** Затворена бигла в равнина: 4 страни + кука на 135° в ъгъла. */
function stirrupRing(corners: [V3, V3, V3, V3], d: number, hookDir: V3): Prim[] {
  const out: Prim[] = [];
  for (let i = 0; i < 4; i++) out.push(line(corners[i], corners[(i + 1) % 4], 'stirrups', d));
  const c = corners[0];
  out.push(line(c, [c[0] + hookDir[0], c[1] + hookDir[1], c[2] + hookDir[2]], 'stirrups', d));
  return out;
}

/** Показва на всеки k-ти, ако са твърде много — за да не стане на петно. */
function positions(length: number, spacing: number, max: number): number[] {
  const n = Math.floor(length / spacing) + 1;
  const step = Math.max(1, Math.ceil(n / max));
  const out: number[] = [];
  for (let i = 0; i < n; i += step) out.push(Math.min(length, i * spacing));
  return out;
}

function perimeterBars(n: number, w: number, h: number): [number, number][] {
  const pts: [number, number][] = [[0, 0], [w, 0], [w, h], [0, h]];
  const rest = Math.max(0, n - 4);
  if (rest === 0) return pts.slice(0, Math.max(0, n));
  const perB = Math.min(Math.floor(rest / 2), Math.round(((rest / 2) * w) / (w + h)));
  const perH = Math.floor((rest - 2 * perB) / 2);
  const leftover = rest - 2 * perB - 2 * perH;
  const side = (x0: number, y0: number, x1: number, y1: number, k: number) => {
    for (let i = 1; i <= k; i++) pts.push([x0 + ((x1 - x0) * i) / (k + 1), y0 + ((y1 - y0) * i) / (k + 1)]);
  };
  side(0, 0, w, 0, perB + leftover);
  side(0, h, w, h, perB);
  side(0, 0, 0, h, perH);
  side(w, 0, w, h, perH);
  return pts;
}

const FW = 3; // дебелина на кофражната плоскост в модела, см

export function buildModel(e: Element, s: CalcSettings): Model {
  const c = s.cover;
  switch (e.type) {
    case 'column': {
      const full = e.height * 100;
      // Висока и тънка колона изглежда като клечка — показваме долната част, за да се виждат биглите.
      const H = Math.min(full, 140);
      const lap = lapLength(e.bars.d, s) * 100;
      const inset = c + e.stirrup.d / 10 + e.bars.d / 20;
      const prims: Prim[] = [];
      for (const [px, py] of perimeterBars(e.bars.n, e.b - 2 * inset, e.h - 2 * inset)) {
        prims.push(line([inset + px, inset + py, 0], [inset + px, inset + py, H + (full <= 140 ? lap : 20)], 'bars', e.bars.d));
      }
      for (const z of positions(H - 10, e.stirrup.s, 30)) {
        const zz = z + 5;
        prims.push(
          ...stirrupRing(
            [
              [c, c, zz],
              [e.b - c, c, zz],
              [e.b - c, e.h - c, zz],
              [c, e.h - c, zz],
            ],
            e.stirrup.d,
            [6, 6, -3]
          )
        );
      }
      prims.push(...box(-FW, -FW, 0, e.b + FW, 0, H, 'formwork'), ...box(-FW, e.h, 0, e.b + FW, e.h + FW, H, 'formwork'));
      prims.push(...box(-FW, 0, 0, 0, e.h, H, 'formwork'), ...box(e.b, 0, 0, e.b + FW, e.h, H, 'formwork'));
      prims.push(...box(0, 0, 0, e.b, e.h, H, 'concrete'));
      return {
        prims,
        stages: STD_STAGES,
        partial: full > 140 ? `Показана е долната част ${fmtM(H)} от колоната (цялата е ${fmtM(full)}).` : undefined,
      };
    }
    case 'beam': {
      const full = e.length * 100;
      const L = Math.min(full, 200);
      const anchor = full <= 200 ? anchorLength(e.bottom.d, s) * 100 : 0;
      const prims: Prim[] = [];
      const row = (n: number, d: number, z: number) => {
        for (let i = 0; i < n; i++) {
          const y = n === 1 ? e.b / 2 : c + d / 20 + (i * (e.b - 2 * c - d / 10)) / (n - 1);
          prims.push(line([-anchor, y, z], [L + anchor, y, z], 'bars', d));
        }
      };
      row(e.bottom.n, e.bottom.d, c + e.stirrup.d / 10 + e.bottom.d / 20);
      if (e.top.n > 0) row(e.top.n, e.top.d, e.h - c - e.stirrup.d / 10 - e.top.d / 20);
      for (const x of positions(L - 10, e.stirrup.s, 30)) {
        const xx = x + 5;
        prims.push(
          ...stirrupRing(
            [
              [xx, c, e.h - c],
              [xx, e.b - c, e.h - c],
              [xx, e.b - c, c],
              [xx, c, c],
            ],
            e.stirrup.d,
            [-3, 6, -6]
          )
        );
      }
      prims.push(...box(0, -FW, -FW, L, e.b + FW, 0, 'formwork'), ...box(0, -FW, 0, L, 0, e.h, 'formwork'), ...box(0, e.b, 0, L, e.b + FW, e.h, 'formwork'));
      prims.push(...box(0, 0, 0, L, e.b, e.h, 'concrete'));
      return { prims, stages: STD_STAGES, partial: full > 200 ? `Показана е част от ${fmtM(L)} от гредата (цялата е ${fmtM(full)}).` : undefined };
    }
    case 'slab': {
      const fx = e.lx * 100;
      const fy = e.ly * 100;
      const W = Math.min(fx, 240);
      const D = Math.min(fy, 240);
      const t = e.t;
      const prims: Prim[] = [];
      const mesh = (d: number, sp: number, z: number, layer: Layer) => {
        for (const y of positions(D - 2 * c, sp, 16)) prims.push(line([c, c + y, z], [W - c, c + y, z], layer, d));
        for (const x of positions(W - 2 * c, sp, 16)) prims.push(line([c + x, c, z + d / 10], [c + x, D - c, z + d / 10], layer, d));
      };
      mesh(e.bottom.d, e.bottom.s, c, 'bars');
      if (e.top) mesh(e.top.d, e.top.s, t - c - e.top.d / 5, 'stirrups');
      prims.push(...box(0, 0, -FW, W, D, 0, 'formwork'));
      prims.push(...box(0, 0, 0, W, D, t, 'concrete'));
      const partial = fx > 240 || fy > 240 ? `Показано е парче ${fmtM(W)} × ${fmtM(D)} от плочата (цялата е ${fmtM(fx)} × ${fmtM(fy)}).` : undefined;
      return {
        prims,
        partial,
        stages: [
          { title: 'Кофраж', layers: ['formwork'] },
          { title: 'Долна мрежа', layers: ['formwork', 'bars'] },
          { title: e.top ? 'Горна мрежа' : 'Проверка', layers: ['formwork', 'bars', 'stirrups'] },
          { title: 'Бетон', layers: ['bars', 'stirrups', 'concrete'] },
        ],
      };
    }
    case 'wall': {
      const full = e.length * 100;
      const L = Math.min(full, 300);
      const H = e.height * 100;
      const lap = lapLength(e.vertical.d, s) * 100;
      const prims: Prim[] = [];
      for (const face of [c + e.horizontal.d / 10, e.t - c - e.horizontal.d / 10]) {
        for (const x of positions(L - 2 * c, e.vertical.s, 20)) prims.push(line([c + x, face, 0], [c + x, face, H + lap], 'bars', e.vertical.d));
      }
      for (const face of [c, e.t - c]) {
        for (const z of positions(H - 10, e.horizontal.s, 20)) prims.push(line([c, face, z + 5], [L - c, face, z + 5], 'stirrups', e.horizontal.d));
      }
      prims.push(...box(0, -FW, 0, L, 0, H, 'formwork'), ...box(0, e.t, 0, L, e.t + FW, H, 'formwork'));
      prims.push(...box(0, 0, 0, L, e.t, H, 'concrete'));
      return {
        prims,
        partial: full > 300 ? `Показана е част от ${fmtM(L)} от стената (цялата е ${fmtM(full)}).` : undefined,
        stages: [
          { title: 'Вертикални', layers: ['bars'] },
          { title: 'Хоризонтални', layers: ['bars', 'stirrups'] },
          { title: 'Кофраж', layers: ['bars', 'stirrups', 'formwork'] },
          { title: 'Бетон', layers: ['bars', 'stirrups', 'concrete'] },
        ],
      };
    }
    case 'stair': {
      const run = e.run * 100;
      const rise = e.rise * 100;
      const w = e.width * 100;
      const n = Math.max(1, e.steps);
      const len = Math.hypot(run, rise);
      const tt = e.t;
      const nx = (rise / len) * tt;
      const nz = (-run / len) * tt;
      const prims: Prim[] = [];
      // наклонена плоча
      const a: V3 = [0, 0, 0];
      const b: V3 = [run, 0, rise];
      prims.push(
        { t: 'poly', pts: [a, b, [b[0], w, b[2]], [0, w, 0]], layer: 'concrete' },
        { t: 'poly', pts: [[nx, 0, nz], [run + nx, 0, rise + nz], [run + nx, w, rise + nz], [nx, w, nz]], layer: 'concrete' },
        { t: 'poly', pts: [a, b, [run + nx, 0, rise + nz], [nx, 0, nz]], layer: 'concrete' }
      );
      for (let i = 0; i < n; i++) {
        const x0 = (i * run) / n;
        const x1 = ((i + 1) * run) / n;
        const z0 = (i * rise) / n;
        const z1 = ((i + 1) * rise) / n;
        prims.push(
          { t: 'poly', pts: [[x0, 0, z0], [x0, 0, z1], [x1, 0, z1]], layer: 'concrete' },
          { t: 'poly', pts: [[x0, 0, z1], [x1, 0, z1], [x1, w, z1], [x0, w, z1]], layer: 'concrete' },
          { t: 'poly', pts: [[x0, 0, z0], [x0, 0, z1], [x0, w, z1], [x0, w, z0]], layer: 'concrete' }
        );
      }
      const k = (c + e.main.d / 20) / tt;
      const ox = nx * (1 - k);
      const oz = nz * (1 - k);
      const anchor = anchorLength(e.main.d, s) * 100;
      const ux = run / len;
      const uz = rise / len;
      for (const y of positions(w - 2 * c, e.main.s, 14)) {
        prims.push(line([ox - ux * anchor, c + y, oz - uz * anchor], [run + ox + ux * anchor, c + y, rise + oz + uz * anchor], 'bars', e.main.d));
      }
      for (const d of positions(len, e.dist.s, 16)) {
        const px = ux * d + ox * 0.93;
        const pz = uz * d + oz * 0.93;
        prims.push(line([px, c, pz], [px, w - c, pz], 'stirrups', e.dist.d));
      }
      prims.push({ t: 'poly', pts: [[nx - 2, -1, nz - 2], [run + nx - 2, -1, rise + nz - 2], [run + nx - 2, w + 1, rise + nz - 2], [nx - 2, w + 1, nz - 2]], layer: 'formwork' });
      return {
        prims,
        stages: [
          { title: 'Кофраж', layers: ['formwork'] },
          { title: 'Главни пръти', layers: ['formwork', 'bars'] },
          { title: 'Разпределителни', layers: ['formwork', 'bars', 'stirrups'] },
          { title: 'Бетон', layers: ['bars', 'stirrups', 'concrete'] },
        ],
      };
    }
    case 'masonry': {
      const full = e.length * 100;
      const L = Math.min(full, 250);
      const H = Math.min(e.height * 100, 160);
      const bh = 24;
      const bl = e.t >= 20 ? 37.5 : 50;
      const prims: Prim[] = [];
      prims.push(...box(-2, -2, -2, L + 2, e.t + 2, 0, 'formwork'));
      const rows = Math.floor(H / bh);
      for (let r = 0; r < rows; r++) {
        const off = r % 2 ? bl / 2 : 0;
        for (let x = -off; x < L; x += bl) {
          const x0 = Math.max(0, x);
          const x1 = Math.min(L, x + bl) - 0.8;
          if (x1 - x0 < 2) continue;
          prims.push(...box(x0, 0, r * bh, x1, e.t, (r + 1) * bh - 1, r === 0 ? 'bars' : 'masonry', ['front', 'top', 'right', 'left']));
        }
      }
      return {
        prims,
        partial: `Показано е парче ${fmtM(L)} × ${fmtM(H)} от стената.`,
        stages: [
          { title: 'Хидроизолация', layers: ['formwork'] },
          { title: 'Първи ред', layers: ['formwork', 'bars'] },
          { title: 'Зидане', layers: ['formwork', 'bars', 'masonry'] },
        ],
      };
    }
  }
}

function fmtM(cm: number): string {
  return `${(cm / 100).toLocaleString('bg-BG', { maximumFractionDigits: 2 })} м`;
}

// ————— Проекция —————

export type Projected =
  | { t: 'line'; x1: number; y1: number; x2: number; y2: number; depth: number; layer: Layer; w: number }
  | { t: 'poly'; points: string; depth: number; layer: Layer; shade: number };

/** Ортографска проекция: завъртане около вертикалата (yaw), после наклон (pitch). */
export function project(prims: Prim[], layers: Layer[], yaw: number, pitch: number, size: number, zoom = 1): Projected[] {
  const visible = prims.filter((p) => layers.includes(p.layer));
  if (visible.length === 0) return [];
  // Център и размер от всички примитиви, за да не „скача“ моделът между етапите.
  let min: V3 = [Infinity, Infinity, Infinity];
  let max: V3 = [-Infinity, -Infinity, -Infinity];
  for (const p of prims) {
    for (const v of p.t === 'line' ? [p.a, p.b] : p.pts) {
      min = [Math.min(min[0], v[0]), Math.min(min[1], v[1]), Math.min(min[2], v[2])];
      max = [Math.max(max[0], v[0]), Math.max(max[1], v[1]), Math.max(max[2], v[2])];
    }
  }
  const ctr: V3 = [(min[0] + max[0]) / 2, (min[1] + max[1]) / 2, (min[2] + max[2]) / 2];
  const diag = Math.hypot(max[0] - min[0], max[1] - min[1], max[2] - min[2]) || 1;
  const k = ((size * 0.92) / diag) * zoom;
  const cy = Math.cos(yaw);
  const sy = Math.sin(yaw);
  const cp = Math.cos(pitch);
  const sp = Math.sin(pitch);
  const tr = (v: V3) => {
    const x = v[0] - ctr[0];
    const y = v[1] - ctr[1];
    const z = v[2] - ctr[2];
    const x1 = x * cy - y * sy;
    const y1 = x * sy + y * cy;
    const y2 = y1 * cp - z * sp;
    const z2 = y1 * sp + z * cp;
    return { sx: size / 2 + x1 * k, sy: size / 2 - z2 * k, d: y2 };
  };
  const light: V3 = [0.4, -0.5, 0.75];
  const out: Projected[] = [];
  for (const p of visible) {
    if (p.t === 'line') {
      const a = tr(p.a);
      const b = tr(p.b);
      out.push({ t: 'line', x1: a.sx, y1: a.sy, x2: b.sx, y2: b.sy, depth: (a.d + b.d) / 2 - 0.5, layer: p.layer, w: Math.max(1.5, p.w * k) });
    } else {
      const pts = p.pts.map(tr);
      const [a, b, c2] = p.pts;
      const u: V3 = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
      const v: V3 = [c2[0] - a[0], c2[1] - a[1], c2[2] - a[2]];
      const nrm: V3 = [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]];
      const len = Math.hypot(...nrm) || 1;
      const shade = Math.abs((nrm[0] * light[0] + nrm[1] * light[1] + nrm[2] * light[2]) / len);
      out.push({
        t: 'poly',
        points: pts.map((q) => `${q.sx.toFixed(1)},${q.sy.toFixed(1)}`).join(' '),
        depth: pts.reduce((sum, q) => sum + q.d, 0) / pts.length,
        layer: p.layer,
        shade,
      });
    }
  }
  // Художников алгоритъм: от най-далечното към най-близкото.
  return out.sort((a, b) => b.depth - a.depth);
}
