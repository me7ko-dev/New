import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';

import { ElementSketch } from '@/components/rebar-sketch';
import { BigButton, Body, Button, Card, Chip, Empty, Field, Label, Row, Screen, Title } from '@/components/ui';
import { calcElement, CONCRETE_CLASSES, DIAMETERS, type Element, type ElementType } from '@/lib/calc';
import { newElement } from '@/lib/factory';
import { ELEMENT_LABEL, fmt, tonnes } from '@/lib/labels';
import { useProject } from '@/lib/store';

type Spec =
  | { kind: 'num'; path: string; label: string; unit?: string; int?: boolean }
  | { kind: 'dia'; path: string; label: string }
  | { kind: 'section'; label: string };

const SPECS: Record<ElementType, Spec[]> = {
  column: [
    { kind: 'section', label: 'Размери' },
    { kind: 'num', path: 'b', label: 'Ширина', unit: 'см' },
    { kind: 'num', path: 'h', label: 'Дълбочина', unit: 'см' },
    { kind: 'num', path: 'height', label: 'Височина', unit: 'м' },
    { kind: 'section', label: 'Надлъжни пръти' },
    { kind: 'num', path: 'bars.n', label: 'Брой пръти', int: true },
    { kind: 'dia', path: 'bars.d', label: 'Диаметър' },
    { kind: 'section', label: 'Стремена' },
    { kind: 'dia', path: 'stirrup.d', label: 'Диаметър' },
    { kind: 'num', path: 'stirrup.s', label: 'През', unit: 'см' },
  ],
  beam: [
    { kind: 'section', label: 'Размери' },
    { kind: 'num', path: 'b', label: 'Ширина', unit: 'см' },
    { kind: 'num', path: 'h', label: 'Височина под плочата', unit: 'см' },
    { kind: 'num', path: 'length', label: 'Дължина', unit: 'м' },
    { kind: 'section', label: 'Долни пръти' },
    { kind: 'num', path: 'bottom.n', label: 'Брой', int: true },
    { kind: 'dia', path: 'bottom.d', label: 'Диаметър' },
    { kind: 'section', label: 'Горни пръти' },
    { kind: 'num', path: 'top.n', label: 'Брой (0 = няма)', int: true },
    { kind: 'dia', path: 'top.d', label: 'Диаметър' },
    { kind: 'section', label: 'Стремена' },
    { kind: 'dia', path: 'stirrup.d', label: 'Диаметър' },
    { kind: 'num', path: 'stirrup.s', label: 'През', unit: 'см' },
  ],
  slab: [
    { kind: 'section', label: 'Размери' },
    { kind: 'num', path: 'lx', label: 'Дължина', unit: 'м' },
    { kind: 'num', path: 'ly', label: 'Ширина', unit: 'м' },
    { kind: 'num', path: 't', label: 'Дебелина', unit: 'см' },
    { kind: 'num', path: 'openings', label: 'Отвори общо', unit: 'м²' },
    { kind: 'section', label: 'Долна мрежа (в двете посоки)' },
    { kind: 'dia', path: 'bottom.d', label: 'Диаметър' },
    { kind: 'num', path: 'bottom.s', label: 'През', unit: 'см' },
  ],
  wall: [
    { kind: 'section', label: 'Размери' },
    { kind: 'num', path: 'length', label: 'Дължина', unit: 'м' },
    { kind: 'num', path: 'height', label: 'Височина', unit: 'м' },
    { kind: 'num', path: 't', label: 'Дебелина', unit: 'см' },
    { kind: 'num', path: 'openings', label: 'Отвори общо', unit: 'м²' },
    { kind: 'section', label: 'Вертикални пръти (от двете страни)' },
    { kind: 'dia', path: 'vertical.d', label: 'Диаметър' },
    { kind: 'num', path: 'vertical.s', label: 'През', unit: 'см' },
    { kind: 'section', label: 'Хоризонтални пръти (от двете страни)' },
    { kind: 'dia', path: 'horizontal.d', label: 'Диаметър' },
    { kind: 'num', path: 'horizontal.s', label: 'През', unit: 'см' },
  ],
  stair: [
    { kind: 'section', label: 'Размери на рамото' },
    { kind: 'num', path: 'run', label: 'Дължина в план', unit: 'м' },
    { kind: 'num', path: 'rise', label: 'Изкачва', unit: 'м' },
    { kind: 'num', path: 'width', label: 'Ширина', unit: 'м' },
    { kind: 'num', path: 't', label: 'Дебелина на плочата', unit: 'см' },
    { kind: 'num', path: 'steps', label: 'Брой стъпала', int: true },
    { kind: 'section', label: 'Главни пръти (по наклона)' },
    { kind: 'dia', path: 'main.d', label: 'Диаметър' },
    { kind: 'num', path: 'main.s', label: 'През', unit: 'см' },
    { kind: 'section', label: 'Разпределителни пръти' },
    { kind: 'dia', path: 'dist.d', label: 'Диаметър' },
    { kind: 'num', path: 'dist.s', label: 'През', unit: 'см' },
  ],
  masonry: [
    { kind: 'section', label: 'Размери' },
    { kind: 'num', path: 'length', label: 'Дължина', unit: 'м' },
    { kind: 'num', path: 'height', label: 'Височина', unit: 'м' },
    { kind: 'num', path: 't', label: 'Дебелина', unit: 'см' },
    { kind: 'num', path: 'openings', label: 'Врати и прозорци общо', unit: 'м²' },
    { kind: 'section', label: 'Материал' },
    { kind: 'num', path: 'blocksPerM2', label: 'Тухли на м²', unit: 'бр.' },
    { kind: 'num', path: 'mortarPerM2', label: 'Разтвор на м²', unit: 'л' },
  ],
};

function getPath(o: unknown, path: string): number {
  return path.split('.').reduce<any>((acc, k) => (acc == null ? acc : acc[k]), o) as number;
}

function setPath<T>(o: T, path: string, value: unknown): T {
  const [head, ...rest] = path.split('.');
  const obj = o as Record<string, unknown>;
  return { ...obj, [head]: rest.length ? setPath(obj[head] ?? {}, rest.join('.'), value) : value } as T;
}

function NumField({ label, unit, value, int, onChange }: { label: string; unit?: string; value: number; int?: boolean; onChange: (n: number) => void }) {
  const [text, setText] = useState(String(value ?? ''));
  return (
    <Field
      label={label}
      unit={unit}
      numeric
      value={text}
      onChange={(t) => {
        setText(t);
        const n = int ? parseInt(t, 10) : parseFloat(t.replace(',', '.'));
        if (Number.isFinite(n) && n >= 0) onChange(n);
      }}
    />
  );
}

function DiaPicker({ label, value, onChange }: { label: string; value: number; onChange: (d: number) => void }) {
  return (
    <>
      <Label>{label}</Label>
      <Row>
        {DIAMETERS.map((d) => (
          <Chip key={d} title={`Ø${d}`} selected={d === value} onPress={() => onChange(d)} />
        ))}
      </Row>
    </>
  );
}

function TypePicker({ onPick }: { onPick: (t: ElementType) => void }) {
  return (
    <>
      <Title sub="Какво ще въвеждаме?">Нов елемент</Title>
      {(Object.keys(ELEMENT_LABEL) as ElementType[]).map((t) => (
        <BigButton key={t} icon={ELEMENT_LABEL[t].icon} title={ELEMENT_LABEL[t].title} onPress={() => onPick(t)} />
      ))}
    </>
  );
}

export default function EditElement() {
  const { id, elementId, levelId } = useLocalSearchParams<{ id: string; elementId?: string; levelId?: string }>();
  const { project: p, update } = useProject(id);
  const existing = p?.elements.find((e) => e.id === elementId);
  const [draft, setDraft] = useState<Element | null>(existing ?? null);

  if (!p) return <Screen title="Елемент"><Empty icon="🤷" text="Обектът не е намерен." /></Screen>;

  if (!draft) {
    return (
      <Screen title="Нов елемент">
        <TypePicker onPick={(t) => setDraft(newElement(t, levelId ?? p.levels[0]?.id ?? ''))} />
      </Screen>
    );
  }

  const r = calcElement(draft, p.settings);
  const set = (path: string, v: unknown) => setDraft((d) => (d ? setPath(d, path, v) : d));

  const save = () => {
    update((pr) => ({
      ...pr,
      elements: existing ? pr.elements.map((e) => (e.id === draft.id ? draft : e)) : [...pr.elements, draft],
    }));
    router.back();
  };

  return (
    <Screen title={existing ? 'Промяна' : ELEMENT_LABEL[draft.type].title}>
      <Card>
        <Label>Скицата се чертае сама, докато пишете</Label>
        <ElementSketch element={draft} settings={p.settings} />
        <Body bold>
          {draft.type === 'masonry'
            ? `${fmt(r.masonryArea)} м² · ${r.blocks} тухли`
            : `${fmt(r.concrete)} м³ бетон · ${tonnes(r.rebarKg)} желязо · ${fmt(r.formwork)} м² кофраж`}
        </Body>
      </Card>

      <Field label="Име" value={draft.name} onChange={(v) => set('name', v)} />
      <NumField label="Еднакви броя" value={draft.count} int onChange={(n) => set('count', Math.max(1, n))} />

      <Label>Ниво</Label>
      <Row>
        {p.levels.map((l) => (
          <Chip key={l.id} title={l.name} selected={draft.levelId === l.id} onPress={() => set('levelId', l.id)} />
        ))}
      </Row>

      {SPECS[draft.type].map((s, i) => {
        if (s.kind === 'section') return <Label key={i} style={{ marginTop: 8, fontSize: 15 }}>{s.label}</Label>;
        if (s.kind === 'dia') return <DiaPicker key={s.path} label={s.label} value={getPath(draft, s.path)} onChange={(d) => set(s.path, d)} />;
        return <NumField key={s.path} label={s.label} unit={s.unit} int={s.int} value={getPath(draft, s.path)} onChange={(n) => set(s.path, n)} />;
      })}

      {draft.type === 'slab' ? (
        <>
          <Label style={{ marginTop: 8, fontSize: 15 }}>Горна мрежа</Label>
          <Row>
            <Chip title="Няма" selected={!draft.top} onPress={() => set('top', null)} />
            <Chip title="Има" selected={!!draft.top} onPress={() => set('top', draft.top ?? { d: 10, s: 20 })} />
          </Row>
          {draft.top ? (
            <>
              <DiaPicker label="Диаметър" value={draft.top.d} onChange={(d) => set('top.d', d)} />
              <NumField label="През" unit="см" value={draft.top.s} onChange={(n) => set('top.s', n)} />
            </>
          ) : null}
        </>
      ) : null}

      {draft.type === 'masonry' ? (
        <Row>
          <Chip title="Мазилка от 1 страна" selected={!draft.plasterBothSides} onPress={() => set('plasterBothSides', false)} />
          <Chip title="Мазилка от 2 страни" selected={draft.plasterBothSides} onPress={() => set('plasterBothSides', true)} />
        </Row>
      ) : (
        <>
          <Label style={{ marginTop: 8, fontSize: 15 }}>Клас бетон</Label>
          <Row>
            {CONCRETE_CLASSES.map((c) => (
              <Chip key={c} title={c} selected={draft.concreteClass === c} onPress={() => set('concreteClass', c)} />
            ))}
          </Row>
        </>
      )}

      <Field label="Бележка (по желание)" value={draft.note ?? ''} onChange={(v) => set('note', v)} />
      <Button kind="primary" title="💾 Запази" disabled={!draft.name.trim()} onPress={save} />
    </Screen>
  );
}
