import { router, useLocalSearchParams } from 'expo-router';
import { View } from 'react-native';

import { BarShapeSketch, ElementSketch } from '@/components/rebar-sketch';
import { StatusStepper } from '@/components/status-stepper';
import { Body, Button, Card, ConfirmButton, Empty, Label, Row, Screen, Stat, Title } from '@/components/ui';
import { barWeightPerMeter, calcElement } from '@/lib/calc';
import { checklist, ELEMENT_LABEL, elementSize, fmt, levelTitle, tonnes } from '@/lib/labels';
import { can, useProject } from '@/lib/store';

export default function ElementScreen() {
  const { id, elementId } = useLocalSearchParams<{ id: string; elementId: string }>();
  const { project: p, update, role } = useProject(id);
  const e = p?.elements.find((x) => x.id === elementId);
  if (!p || !e) return <Screen title="Елемент"><Empty icon="🤷" text="Елементът не е намерен." /></Screen>;

  const r = calcElement(e, p.settings);
  const level = p.levels.find((l) => l.id === e.levelId);

  return (
    <Screen title={e.name}>
      <Title sub={`${ELEMENT_LABEL[e.type].title} · ${levelTitle(level)}${e.count > 1 ? ` · ${e.count} броя` : ''}`}>
        {e.name}
      </Title>

      <Card>
        <Label>Автоматична скица</Label>
        <ElementSketch element={e} settings={p.settings} />
        <Body>{elementSize(e)}</Body>
      </Card>

      <Card>
        <Label>Докъде е стигнала работата</Label>
        <StatusStepper
          element={e}
          onChange={
            can(role, 'progress')
              ? (status) => update((pr) => ({ ...pr, elements: pr.elements.map((x) => (x.id === e.id ? { ...x, status } : x)) }))
              : undefined
          }
        />
      </Card>

      <Card>
        <Label>✅ Какво да провериш</Label>
        {checklist(e, p.settings).map((line, i) => (
          <Body key={i}>• {line}</Body>
        ))}
      </Card>

      <Row>
        {e.type === 'masonry' ? (
          <>
            <Stat icon="🧱" value={`${fmt(r.masonryArea)} м²`} label="зидария" />
            <Stat icon="🔢" value={`${r.blocks}`} label="тухли/блокчета" />
            <Stat icon="🪣" value={`${fmt(r.mortar, 2)} м³`} label="разтвор" />
            <Stat icon="🖌" value={`${fmt(r.plaster)} м²`} label="мазилка" />
          </>
        ) : (
          <>
            <Stat icon="🧱" value={`${fmt(r.concrete)} м³`} label={`бетон ${e.concreteClass}`} />
            <Stat icon="⛓" value={tonnes(r.rebarKg)} label="армировка" />
            <Stat icon="🪵" value={`${fmt(r.formwork)} м²`} label="кофраж" />
          </>
        )}
      </Row>

      {r.bars.length > 0 ? (
        <Card>
          <Label>Спецификация на армировката</Label>
          {r.bars.map((b) => (
            <View key={b.mark} style={{ gap: 4, paddingVertical: 6 }}>
              <Body bold>
                Поз. {b.mark} — {b.label}
              </Body>
              <Row>
                <BarShapeSketch shape={b.shape} length={b.length} d={b.d} />
                <Body>
                  {b.count} бр. Ø{b.d} × {fmt(b.length)} м = {fmt(b.count * b.length, 1)} м ·{' '}
                  {fmt(b.count * b.length * barWeightPerMeter(b.d), 1)} кг
                </Body>
              </Row>
            </View>
          ))}
        </Card>
      ) : null}

      {e.note ? (
        <Card>
          <Label>Бележка</Label>
          <Body>{e.note}</Body>
        </Card>
      ) : null}

      {can(role, 'edit') ? (
        <Row>
          <Button
            kind="primary"
            title="✏️ Промени"
            onPress={() => router.push({ pathname: '/project/[id]/element/edit', params: { id: p.id, elementId: e.id } })}
          />
          <ConfirmButton
            title="Изтрий"
            confirmTitle={`Изтрий „${e.name}“?`}
            onConfirm={() => {
              update((pr) => ({ ...pr, elements: pr.elements.filter((x) => x.id !== e.id) }));
              router.back();
            }}
          />
        </Row>
      ) : null}
    </Screen>
  );
}
