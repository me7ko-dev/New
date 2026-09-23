import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Model3D } from '@/components/model-3d';
import { ElementSketch } from '@/components/rebar-sketch';
import { nextStatus, StatusStepper } from '@/components/status-stepper';
import { Body, Button, Card, Chip, Empty, Label, Row, Screen } from '@/components/ui';
import { useTheme } from '@/hooks/use-theme';
import type { Element, ElementType } from '@/lib/calc';
import { checklist, ELEMENT_LABEL, formatElevation, STATUS_LABEL } from '@/lib/labels';
import { can, useProject } from '@/lib/store';
import type { Drawing, Level, Project } from '@/lib/types';

/** Ред на изпълнение: първо вертикалните елементи, после хоризонталните, накрая зидарията. */
const BUILD_ORDER: ElementType[] = ['column', 'wall', 'stair', 'beam', 'slab', 'masonry'];

type Step = { level: Level } & ({ kind: 'drawing'; drawing: Drawing } | { kind: 'element'; element: Element });

function buildSteps(p: Project, levelId?: string): Step[] {
  const levels = [...p.levels].sort((a, b) => a.elevation - b.elevation).filter((l) => !levelId || l.id === levelId);
  const steps: Step[] = [];
  for (const level of levels) {
    for (const d of p.drawings.filter((x) => x.levelId === level.id && x.kind === 'image')) {
      steps.push({ level, kind: 'drawing', drawing: d });
    }
    const els = p.elements
      .filter((e) => e.levelId === level.id)
      .sort((a, b) => BUILD_ORDER.indexOf(a.type) - BUILD_ORDER.indexOf(b.type));
    for (const element of els) steps.push({ level, kind: 'element', element });
  }
  return steps;
}

/** Мини-сграда: показва на кой етаж сме. */
function WhereAmI({ levels, current }: { levels: Level[]; current: string }) {
  const t = useTheme();
  const top = [...levels].sort((a, b) => b.elevation - a.elevation);
  return (
    <View style={{ gap: 3, minWidth: 120 }}>
      <Label>📍 Къде е</Label>
      {top.map((l) => {
        const on = l.id === current;
        return (
          <View
            key={l.id}
            style={[
              styles.floor,
              { backgroundColor: on ? t.accent : t.backgroundElement, borderColor: on ? t.accent : t.border },
            ]}>
            <Text style={{ color: on ? t.accentText : t.textSecondary, fontWeight: on ? '700' : '500', fontSize: 13 }}>
              {l.name} {formatElevation(l.elevation)}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

export default function ShowScreen() {
  const { id, levelId } = useLocalSearchParams<{ id: string; levelId?: string }>();
  const { project: p, update, role } = useProject(id);
  const [filter, setFilter] = useState<string | undefined>(levelId);
  const [i, setI] = useState(0);
  const [mode, setMode] = useState<'3d' | 'sketch'>('3d');
  const t = useTheme();
  if (!p) return <Screen title="Покажи"><Empty icon="🤷" text="Обектът не е намерен." /></Screen>;

  const steps = buildSteps(p, filter);
  const idx = Math.min(i, Math.max(0, steps.length - 1));
  const step = steps[idx];

  const setStatus = (el: Element, status: Element['status']) =>
    update((pr) => ({ ...pr, elements: pr.elements.map((x) => (x.id === el.id ? { ...x, status } : x)) }));

  return (
    <Screen title="Покажи">
      <Row>
        <Chip title="Целия обект" selected={!filter} onPress={() => { setFilter(undefined); setI(0); }} />
        {[...p.levels]
          .sort((a, b) => a.elevation - b.elevation)
          .map((l) => (
            <Chip key={l.id} title={l.name} selected={filter === l.id} onPress={() => { setFilter(l.id); setI(0); }} />
          ))}
      </Row>

      {!step ? (
        <Empty icon="🏗" text="Няма какво да се покаже — добавете елементи или снимки на чертежи за това ниво." />
      ) : (
        <>
          <Row style={{ justifyContent: 'space-between' }}>
            <Body bold style={{ fontSize: 20, flexShrink: 1 }}>
              {step.level.name} ›{' '}
              {step.kind === 'element' ? `${ELEMENT_LABEL[step.element.type].icon} ${step.element.name}` : `🗺 ${step.drawing.name}`}
            </Body>
            <Label>
              Стъпка {idx + 1} / {steps.length}
            </Label>
          </Row>

          <Card>
            {step.kind === 'element' ? (
              <>
                <Row style={{ justifyContent: 'space-between' }}>
                  <Label>Така трябва да изглежда</Label>
                  <Row>
                    <Chip title="🧊 3D" selected={mode === '3d'} onPress={() => setMode('3d')} />
                    <Chip title="📐 Скица" selected={mode === 'sketch'} onPress={() => setMode('sketch')} />
                  </Row>
                </Row>
                {mode === '3d' ? (
                  <Model3D key={step.element.id} element={step.element} settings={p.settings} />
                ) : (
                  <ElementSketch element={step.element} settings={p.settings} />
                )}
                <Button
                  title="🧱 Как се прави — стъпка по стъпка"
                  onPress={() =>
                    router.push({ pathname: '/project/[id]/element/[elementId]', params: { id: p.id, elementId: step.element.id } })
                  }
                />
              </>
            ) : (
              <Pressable
                onPress={() =>
                  router.push({ pathname: '/project/[id]/drawing/[drawingId]', params: { id: p.id, drawingId: step.drawing.id } })
                }>
                <Image source={{ uri: step.drawing.uri }} style={{ width: '100%', aspectRatio: 4 / 3 }} contentFit="contain" />
                <Label style={{ textAlign: 'center' }}>Натиснете за увеличение</Label>
              </Pressable>
            )}
          </Card>

          <Row style={{ alignItems: 'flex-start' }}>
            <Card style={{ flexGrow: 1, flexBasis: 260 }}>
              {step.kind === 'element' ? (
                <>
                  <Label>✅ Какво да провериш</Label>
                  {checklist(step.element, p.settings).map((line, k) => (
                    <Body key={k}>• {line}</Body>
                  ))}
                </>
              ) : (
                <Body>Разгледайте чертежа за {step.level.name.toLowerCase()} преди да започнете.</Body>
              )}
            </Card>
            <Card style={{ flexGrow: 0 }}>
              <WhereAmI levels={p.levels} current={step.level.id} />
            </Card>
          </Row>

          {step.kind === 'element' ? (
            <Card>
              <Label>Докъде сме</Label>
              <StatusStepper
                element={step.element}
                onChange={can(role, 'progress') ? (s) => setStatus(step.element, s) : undefined}
              />
              {can(role, 'progress') && step.element.status !== 'done' ? (
                <Button
                  kind="primary"
                  title={`✔ Отбележи: ${STATUS_LABEL[nextStatus(step.element)].title}`}
                  onPress={() => setStatus(step.element, nextStatus(step.element))}
                />
              ) : null}
            </Card>
          ) : null}

          <View style={styles.nav}>
            <Button title="◀ Назад" disabled={idx === 0} onPress={() => setI(idx - 1)} />
            <View style={styles.dots}>
              {steps.length <= 20 ? (
                steps.map((_, k) => (
                  <View key={k} style={[styles.dot, { backgroundColor: k === idx ? t.accent : t.backgroundSelected }]} />
                ))
              ) : (
                <Label>{Math.round(((idx + 1) / steps.length) * 100)}%</Label>
              )}
            </View>
            <Button kind="primary" title="Напред ▶" disabled={idx >= steps.length - 1} onPress={() => setI(idx + 1)} />
          </View>
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  floor: { borderWidth: 1, borderRadius: 6, paddingVertical: 4, paddingHorizontal: 8 },
  nav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  dots: { flex: 1, flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 6 },
  dot: { width: 10, height: 10, borderRadius: 5 },
});
