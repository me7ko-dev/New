/**
 * Автоматична скица на елемент: сечение/изглед с бетона, прътите и стремената,
 * начертана директно от въведените размери.
 */
import { useState, type ReactNode } from 'react';
import { Platform, View } from 'react-native';
import Svg, { Circle, G, Line, Path, Polygon, Rect, Text as SvgText } from 'react-native-svg';

import { useTheme } from '@/hooks/use-theme';
import type { BarShape, CalcSettings, Element } from '@/lib/calc';
import { fmt } from '@/lib/labels';

type Colors = ReturnType<typeof useTheme>;

const W = 600;
const FONT = Platform.select({ ios: 'Helvetica', android: 'sans-serif', default: 'Helvetica, Arial, sans-serif' });

/** Скицата винаги е широка колкото екрана, височината следва пропорцията. */
function Frame({ h, children }: { h: number; children: ReactNode }) {
  const [width, setWidth] = useState(0);
  return (
    <View style={{ width: '100%', maxWidth: 720, alignSelf: 'center' }} onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
      {width > 0 ? (
        <Svg width={width} height={(width * h) / W} viewBox={`0 0 ${W} ${h}`}>
          {children}
        </Svg>
      ) : null}
    </View>
  );
}

/** Разпределя n пръта по периметъра на сечение w×h: ъглите първо, после по страните. */
export function columnBarPositions(n: number, w: number, h: number): [number, number][] {
  const pts: [number, number][] = [
    [0, 0],
    [w, 0],
    [w, h],
    [0, h],
  ];
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

function Dim({ x1, y1, x2, y2, text, c, vertical }: { x1: number; y1: number; x2: number; y2: number; text: string; c: Colors; vertical?: boolean }) {
  const mx = (x1 + x2) / 2;
  const my = (y1 + y2) / 2;
  return (
    <G>
      <Line x1={x1} y1={y1} x2={x2} y2={y2} stroke={c.textSecondary} strokeWidth={1} />
      <Line x1={x1 - (vertical ? 5 : 0)} y1={y1 - (vertical ? 0 : 5)} x2={x1 + (vertical ? 5 : 0)} y2={y1 + (vertical ? 0 : 5)} stroke={c.textSecondary} />
      <Line x1={x2 - (vertical ? 5 : 0)} y1={y2 - (vertical ? 0 : 5)} x2={x2 + (vertical ? 5 : 0)} y2={y2 + (vertical ? 0 : 5)} stroke={c.textSecondary} />
      <SvgText
        x={vertical ? mx - 8 : mx}
        y={vertical ? my : my - 6}
        fill={c.textSecondary}
        fontSize={20}
        fontFamily={FONT}
        textAnchor={vertical ? 'end' : 'middle'}
        alignmentBaseline="middle">
        {text}
      </SvgText>
    </G>
  );
}

function Tag({ x, y, text, color, anchor = 'start' }: { x: number; y: number; text: string; color: string; anchor?: 'start' | 'middle' | 'end' }) {
  return (
    <SvgText x={x} y={y} fill={color} fontSize={22} fontWeight="700" fontFamily={FONT} textAnchor={anchor}>
      {text}
    </SvgText>
  );
}

function ColumnSketch({ e, s, c }: { e: Extract<Element, { type: 'column' }>; s: CalcSettings; c: Colors }) {
  const box = 220;
  const k = box / Math.max(e.b, e.h);
  const w = e.b * k;
  const h = e.h * k;
  const x0 = 90;
  const y0 = 20;
  const cov = s.cover * k;
  const r = Math.max(5, (e.bars.d / 20) * k);
  const inset = cov + (e.stirrup.d / 10) * k + r;
  const pos = columnBarPositions(e.bars.n, w - 2 * inset, h - 2 * inset);
  const tx = x0 + w + 30;
  return (
    <Frame h={y0 + h + 60}>
      <Rect x={x0} y={y0} width={w} height={h} fill={c.sketchConcrete} stroke={c.sketchLine} strokeWidth={2} />
      <Rect x={x0 + cov} y={y0 + cov} width={w - 2 * cov} height={h - 2 * cov} fill="none" stroke={c.sketchStirrup} strokeWidth={4} rx={6} />
      <Line x1={x0 + cov + 4} y1={y0 + cov + 4} x2={x0 + cov + 24} y2={y0 + cov + 24} stroke={c.sketchStirrup} strokeWidth={4} />
      {pos.map(([px, py], i) => (
        <Circle key={i} cx={x0 + inset + px} cy={y0 + inset + py} r={r} fill={c.sketchRebar} />
      ))}
      <Dim x1={x0} y1={y0 + h + 22} x2={x0 + w} y2={y0 + h + 22} text={`${e.b} см`} c={c} />
      <Dim x1={x0 - 22} y1={y0} x2={x0 - 22} y2={y0 + h} text={`${e.h}`} c={c} vertical />
      <Tag x={tx} y={y0 + 40} text={`${e.bars.n} × Ø${e.bars.d}`} color={c.sketchRebar} />
      <Tag x={tx} y={y0 + 80} text={`бигли Ø${e.stirrup.d}/${e.stirrup.s}`} color={c.sketchStirrup} />
      <Tag x={tx} y={y0 + 120} text={`покритие ${fmt(s.cover)}`} color={c.textSecondary} />
      <Tag x={tx} y={y0 + 160} text={`h = ${fmt(e.height)} м`} color={c.textSecondary} />
    </Frame>
  );
}

function BeamSketch({ e, s, c }: { e: Extract<Element, { type: 'beam' }>; s: CalcSettings; c: Colors }) {
  const x0 = 30;
  const L = W - 2 * x0;
  const y0 = 40;
  const H = Math.min(120, Math.max(70, (e.h / (e.length * 100)) * L * 3));
  const cov = Math.max(8, (s.cover / e.h) * H);
  const nTicks = Math.floor((e.length * 100) / e.stirrup.s) + 1;
  const step = Math.max(1, Math.ceil(nTicks / 40));
  const ticks: number[] = [];
  for (let i = 0; i < nTicks; i += step) ticks.push(x0 + (i * e.stirrup.s * L) / (e.length * 100));

  const sk = 130 / Math.max(e.b, e.h);
  const sw = e.b * sk;
  const sh = e.h * sk;
  const sx = W - x0 - sw;
  const sy = y0 + H + 60;
  const scov = s.cover * sk;
  const r = 7;
  const barsRow = (n: number, y: number) =>
    Array.from({ length: n }, (_, i) => (
      <Circle
        key={`${y}-${i}`}
        cx={sx + scov + r + (n === 1 ? (sw - 2 * scov - 2 * r) / 2 : (i * (sw - 2 * scov - 2 * r)) / (n - 1))}
        cy={y}
        r={r}
        fill={c.sketchRebar}
      />
    ));
  return (
    <Frame h={sy + sh + 40}>
      <Tag x={x0} y={y0 - 14} text={e.top.n > 0 ? `горе ${e.top.n} × Ø${e.top.d}` : 'горе — без пръти'} color={c.sketchRebar} />
      <Rect x={x0} y={y0} width={L} height={H} fill={c.sketchConcrete} stroke={c.sketchLine} strokeWidth={2} />
      {ticks.map((x, i) => (
        <Line key={i} x1={x} y1={y0 + cov} x2={x} y2={y0 + H - cov} stroke={c.sketchStirrup} strokeWidth={2} />
      ))}
      <Line x1={x0 - 10} y1={y0 + H - cov} x2={x0 + L + 10} y2={y0 + H - cov} stroke={c.sketchRebar} strokeWidth={5} />
      {e.top.n > 0 ? <Line x1={x0 - 10} y1={y0 + cov} x2={x0 + L + 10} y2={y0 + cov} stroke={c.sketchRebar} strokeWidth={4} /> : null}
      <Dim x1={x0} y1={y0 + H + 24} x2={x0 + L} y2={y0 + H + 24} text={`${fmt(e.length)} м`} c={c} />

      <Tag x={x0} y={sy + 26} text={`долу ${e.bottom.n} × Ø${e.bottom.d}`} color={c.sketchRebar} />
      <Tag x={x0} y={sy + 64} text={`бигли Ø${e.stirrup.d}`} color={c.sketchStirrup} />
      <Tag x={x0} y={sy + 96} text={`през ${e.stirrup.s} см`} color={c.sketchStirrup} />
      <Rect x={sx} y={sy} width={sw} height={sh} fill={c.sketchConcrete} stroke={c.sketchLine} strokeWidth={2} />
      <Rect x={sx + scov} y={sy + scov} width={sw - 2 * scov} height={sh - 2 * scov} fill="none" stroke={c.sketchStirrup} strokeWidth={3} rx={4} />
      {barsRow(e.bottom.n, sy + sh - scov - r - 2)}
      {e.top.n > 0 ? barsRow(e.top.n, sy + scov + r + 2) : null}
      <SvgText x={sx + sw / 2} y={sy + sh + 28} fill={c.textSecondary} fontSize={20} fontFamily={FONT} textAnchor="middle">
        {`${e.b}×${e.h} см`}
      </SvgText>
    </Frame>
  );
}

function meshLines(count: number, max: number) {
  const n = Math.min(count, max);
  return Array.from({ length: n }, (_, i) => (n === 1 ? 0.5 : i / (n - 1)));
}

function SlabSketch({ e, c }: { e: Extract<Element, { type: 'slab' }>; c: Colors }) {
  const k = Math.min(500 / e.lx, 300 / e.ly);
  const w = e.lx * k;
  const h = e.ly * k;
  const x0 = 70;
  const y0 = 16;
  const botX = meshLines(Math.floor((e.lx * 100) / e.bottom.s) + 1, 18);
  const botY = meshLines(Math.floor((e.ly * 100) / e.bottom.s) + 1, 14);
  const topX = e.top ? meshLines(Math.floor((e.lx * 100) / e.top.s) + 1, 9) : [];
  const topY = e.top ? meshLines(Math.floor((e.ly * 100) / e.top.s) + 1, 7) : [];
  const hole = e.openings > 0 ? Math.sqrt(e.openings) * k : 0;
  const ty = y0 + h + 76;
  return (
    <Frame h={ty + (e.top ? 76 : 40)}>
      <Rect x={x0} y={y0} width={w} height={h} fill={c.sketchConcrete} stroke={c.sketchLine} strokeWidth={2} />
      {botX.map((f, i) => (
        <Line key={`bx${i}`} x1={x0 + 8 + f * (w - 16)} y1={y0 + 8} x2={x0 + 8 + f * (w - 16)} y2={y0 + h - 8} stroke={c.sketchRebar} strokeWidth={1.5} />
      ))}
      {botY.map((f, i) => (
        <Line key={`by${i}`} x1={x0 + 8} y1={y0 + 8 + f * (h - 16)} x2={x0 + w - 8} y2={y0 + 8 + f * (h - 16)} stroke={c.sketchRebar} strokeWidth={1.5} />
      ))}
      {topX.map((f, i) => (
        <Line key={`tx${i}`} x1={x0 + 14 + f * (w - 28)} y1={y0 + 14} x2={x0 + 14 + f * (w - 28)} y2={y0 + h - 14} stroke={c.sketchStirrup} strokeWidth={2.5} strokeDasharray="10 6" />
      ))}
      {topY.map((f, i) => (
        <Line key={`ty${i}`} x1={x0 + 14} y1={y0 + 14 + f * (h - 28)} x2={x0 + w - 14} y2={y0 + 14 + f * (h - 28)} stroke={c.sketchStirrup} strokeWidth={2.5} strokeDasharray="10 6" />
      ))}
      {hole > 0 ? (
        <G>
          <Rect x={x0 + w / 2 - hole / 2} y={y0 + h / 2 - hole / 2} width={hole} height={hole} fill={c.card} stroke={c.sketchLine} strokeWidth={2} />
          <Line x1={x0 + w / 2 - hole / 2} y1={y0 + h / 2 - hole / 2} x2={x0 + w / 2 + hole / 2} y2={y0 + h / 2 + hole / 2} stroke={c.sketchLine} />
          <Line x1={x0 + w / 2 + hole / 2} y1={y0 + h / 2 - hole / 2} x2={x0 + w / 2 - hole / 2} y2={y0 + h / 2 + hole / 2} stroke={c.sketchLine} />
        </G>
      ) : null}
      <Dim x1={x0} y1={y0 + h + 24} x2={x0 + w} y2={y0 + h + 24} text={`${fmt(e.lx)} м`} c={c} />
      <Dim x1={x0 - 22} y1={y0} x2={x0 - 22} y2={y0 + h} text={`${fmt(e.ly)}`} c={c} vertical />
      <Tag x={x0} y={ty} text={`— долна мрежа Ø${e.bottom.d}/${e.bottom.s}`} color={c.sketchRebar} />
      {e.top ? <Tag x={x0} y={ty + 36} text={`- - горна мрежа Ø${e.top.d}/${e.top.s}`} color={c.sketchStirrup} /> : null}
      <Tag x={W - 20} y={ty} text={`d = ${e.t} см`} color={c.textSecondary} anchor="end" />
    </Frame>
  );
}

function WallSketch({ e, c }: { e: Extract<Element, { type: 'wall' }>; c: Colors }) {
  const x0 = 70;
  const y0 = 30;
  const kx = 480 / e.length;
  const ky = Math.min(260 / e.height, Math.max(kx, 140 / e.height));
  const w = e.length * kx;
  const h = e.height * ky;
  const vs = meshLines(Math.floor((e.length * 100) / e.vertical.s) + 1, 24);
  const hs = meshLines(Math.floor((e.height * 100) / e.horizontal.s) + 1, 16);
  const ty = y0 + h + 76;
  return (
    <Frame h={ty + 76}>
      <Rect x={x0} y={y0} width={w} height={h} fill={c.sketchConcrete} stroke={c.sketchLine} strokeWidth={2} />
      {vs.map((f, i) => (
        <Line key={`v${i}`} x1={x0 + 8 + f * (w - 16)} y1={y0 - 18} x2={x0 + 8 + f * (w - 16)} y2={y0 + h - 6} stroke={c.sketchRebar} strokeWidth={2} />
      ))}
      {hs.map((f, i) => (
        <Line key={`h${i}`} x1={x0 + 4} y1={y0 + 8 + f * (h - 16)} x2={x0 + w - 4} y2={y0 + 8 + f * (h - 16)} stroke={c.sketchStirrup} strokeWidth={2} />
      ))}
      <Dim x1={x0} y1={y0 + h + 24} x2={x0 + w} y2={y0 + h + 24} text={`${fmt(e.length)} м`} c={c} />
      <Dim x1={x0 - 22} y1={y0} x2={x0 - 22} y2={y0 + h} text={`${fmt(e.height)}`} c={c} vertical />
      <Tag x={x0} y={ty} text={`| вертикални Ø${e.vertical.d}/${e.vertical.s}`} color={c.sketchRebar} />
      <Tag x={x0} y={ty + 36} text={`— хоризонтални Ø${e.horizontal.d}/${e.horizontal.s}`} color={c.sketchStirrup} />
      <Tag x={W - 20} y={ty} text={`d = ${e.t} см`} color={c.textSecondary} anchor="end" />
    </Frame>
  );
}

function StairSketch({ e, c }: { e: Extract<Element, { type: 'stair' }>; c: Colors }) {
  const k = Math.min(460 / e.run, 240 / e.rise);
  const run = e.run * k;
  const rise = e.rise * k;
  const x0 = 80;
  const yb = 20 + rise;
  const n = Math.max(1, e.steps);
  let d = `M ${x0} ${yb}`;
  for (let i = 0; i < n; i++) {
    d += ` L ${x0 + (i * run) / n} ${yb - ((i + 1) * rise) / n} L ${x0 + ((i + 1) * run) / n} ${yb - ((i + 1) * rise) / n}`;
  }
  const len = Math.hypot(run, rise);
  const tt = Math.max(14, (e.t / 100) * k);
  const ox = (rise / len) * tt;
  const oy = (run / len) * tt;
  const poly = `${x0},${yb} ${x0 + run},${yb - rise} ${x0 + run + ox},${yb - rise + oy} ${x0 + ox},${yb + oy}`;
  const bar = 0.7;
  const ty = yb + oy + 76;
  return (
    <Frame h={ty + 40}>
      <Polygon points={poly} fill={c.sketchConcrete} stroke={c.sketchLine} strokeWidth={2} />
      <Path d={`${d} L ${x0 + run} ${yb - rise} Z`} fill={c.sketchConcrete} stroke={c.sketchLine} strokeWidth={2} />
      <Line x1={x0 + ox * bar - 14} y1={yb + oy * bar + 8} x2={x0 + run + ox * bar + 14} y2={yb - rise + oy * bar - 8} stroke={c.sketchRebar} strokeWidth={5} />
      <Dim x1={x0} y1={yb + oy + 26} x2={x0 + run} y2={yb + oy + 26} text={`${fmt(e.run)} м`} c={c} />
      <Dim x1={x0 - 22} y1={yb - rise} x2={x0 - 22} y2={yb} text={`${fmt(e.rise)}`} c={c} vertical />
      <Tag x={x0} y={ty} text={`главни Ø${e.main.d}/${e.main.s}`} color={c.sketchRebar} />
      <Tag x={W - 20} y={ty} text={`${e.steps} стъпала`} color={c.textSecondary} anchor="end" />
    </Frame>
  );
}

function MasonrySketch({ e, c }: { e: Extract<Element, { type: 'masonry' }>; c: Colors }) {
  const x0 = 70;
  const y0 = 16;
  const kx = 480 / e.length;
  const ky = Math.min(240 / e.height, Math.max(kx, 150 / e.height));
  const w = e.length * kx;
  const h = e.height * ky;
  const rows = Math.min(16, Math.max(6, Math.round(h / 18)));
  const rh = h / rows;
  const bw = rh * 2.2;
  const bricks = [];
  for (let r = 0; r < rows; r++) {
    const off = r % 2 ? bw / 2 : 0;
    for (let x = -off; x < w; x += bw) {
      const bx = Math.max(0, x);
      const bwid = Math.min(w, x + bw) - bx;
      bricks.push(<Rect key={`${r}-${x}`} x={x0 + bx} y={y0 + r * rh} width={bwid} height={rh} fill="#C8764A" stroke={c.card} strokeWidth={2} />);
    }
  }
  const side = e.openings > 0 ? Math.sqrt(e.openings) : 0;
  const hw = Math.min(w * 0.4, side * kx);
  const hh = Math.min(h * 0.6, side * ky);
  const ty = y0 + h + 76;
  return (
    <Frame h={ty + 30}>
      {bricks}
      {side > 0 ? <Rect x={x0 + w / 2 - hw / 2} y={y0 + h * 0.2} width={hw} height={hh} fill={c.card} stroke={c.sketchLine} strokeWidth={2} /> : null}
      <Dim x1={x0} y1={y0 + h + 24} x2={x0 + w} y2={y0 + h + 24} text={`${fmt(e.length)} м`} c={c} />
      <Dim x1={x0 - 22} y1={y0} x2={x0 - 22} y2={y0 + h} text={`${fmt(e.height)}`} c={c} vertical />
      <Tag x={x0} y={ty} text={`тухла ${e.t} см`} color={c.textSecondary} />
      {side > 0 ? <Tag x={W - 20} y={ty} text={`отвори ${fmt(e.openings)} м²`} color={c.textSecondary} anchor="end" /> : null}
    </Frame>
  );
}

export function ElementSketch({ element, settings }: { element: Element; settings: CalcSettings }) {
  const c = useTheme();
  switch (element.type) {
    case 'column':
      return <ColumnSketch e={element} s={settings} c={c} />;
    case 'beam':
      return <BeamSketch e={element} s={settings} c={c} />;
    case 'slab':
      return <SlabSketch e={element} c={c} />;
    case 'wall':
      return <WallSketch e={element} c={c} />;
    case 'stair':
      return <StairSketch e={element} c={c} />;
    case 'masonry':
      return <MasonrySketch e={element} c={c} />;
  }
}

/** Малка скица на формата на един прът за спецификацията. */
export function BarShapeSketch({ shape, length, d }: { shape: BarShape; length: number; d: number }) {
  const c = useTheme();
  const [w, setW] = useState(160);
  if (shape.kind === 'stirrup') {
    const k = 44 / Math.max(shape.a, shape.b);
    const a = shape.a * k;
    const b = shape.b * k;
    return (
      <Svg width={120} height={64} viewBox="0 0 120 64">
        <Rect x={10} y={8} width={a} height={b} fill="none" stroke={c.sketchStirrup} strokeWidth={3} rx={3} />
        <Line x1={12} y1={10} x2={24} y2={22} stroke={c.sketchStirrup} strokeWidth={3} />
        <SvgText x={14 + a} y={20} fill={c.textSecondary} fontSize={11}>{`${shape.a}×${shape.b}`}</SvgText>
        <SvgText x={14 + a} y={36} fill={c.textSecondary} fontSize={11}>{`Ø${d}`}</SvgText>
      </Svg>
    );
  }
  return (
    <View style={{ flex: 1, minWidth: 100 }} onLayout={(ev) => setW(ev.nativeEvent.layout.width)}>
      <Svg width={w} height={36}>
        <Line x1={4} y1={20} x2={w - 4} y2={20} stroke={c.sketchRebar} strokeWidth={4} strokeLinecap="round" />
        <SvgText x={w / 2} y={12} fill={c.textSecondary} fontSize={11} textAnchor="middle">
          {`${fmt(length)} м`}
        </SvgText>
      </Svg>
    </View>
  );
}
