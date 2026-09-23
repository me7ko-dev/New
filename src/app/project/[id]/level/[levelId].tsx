import { router, useLocalSearchParams } from 'expo-router';

import { BigButton, Body, Button, Card, Chip, Empty, Label, Row, Screen, Title } from '@/components/ui';
import { calcElement, summarize } from '@/lib/calc';
import { ELEMENT_LABEL, elementSize, fmt, levelTitle, STATUS_LABEL, tonnes } from '@/lib/labels';
import { can, useProject } from '@/lib/store';

export default function LevelScreen() {
  const { id, levelId } = useLocalSearchParams<{ id: string; levelId: string }>();
  const { project: p, role } = useProject(id);
  const level = p?.levels.find((l) => l.id === levelId);
  if (!p || !level) return <Screen title="Етаж"><Empty icon="🤷" text="Нивото не е намерено." /></Screen>;

  const elements = p.elements.filter((e) => e.levelId === level.id);
  const sum = summarize(elements, p.settings);
  const drawings = p.drawings.filter((d) => d.levelId === level.id);

  return (
    <Screen title={level.name}>
      <Title sub={`🧱 ${fmt(sum.concrete)} м³ бетон · ⛓ ${tonnes(sum.rebarKg)} желязо · 🚚 ${sum.trucks} бетоновоза`}>
        {levelTitle(level)}
      </Title>

      <BigButton
        kind="primary"
        icon="▶️"
        title="Покажи този етаж"
        hint="Стъпка по стъпка"
        onPress={() => router.push({ pathname: '/project/[id]/show', params: { id: p.id, levelId: level.id } })}
      />

      <BigButton
        icon="🚚"
        title="Бетонът за този етаж"
        hint={`${fmt(sum.concreteWithWaste, 1)} м³ — какво да поръчам и проверя`}
        onPress={() => router.push({ pathname: '/project/[id]/concrete', params: { id: p.id, levelId: level.id } })}
      />

      {drawings.length > 0 ? (
        <>
          <Label>Чертежи за етажа</Label>
          <Row>
            {drawings.map((d) => (
              <Chip
                key={d.id}
                title={`${d.kind === 'pdf' ? '📄' : '🖼'} ${d.name}`}
                onPress={() => router.push({ pathname: '/project/[id]/drawing/[drawingId]', params: { id: p.id, drawingId: d.id } })}
              />
            ))}
          </Row>
        </>
      ) : null}

      <Label>Елементи</Label>
      {elements.length === 0 ? <Empty icon="🏗" text="Още няма въведени елементи на това ниво." /> : null}
      {elements.map((e) => {
        const r = calcElement(e, p.settings);
        const st = STATUS_LABEL[e.status];
        return (
          <Card
            key={e.id}
            onPress={() => router.push({ pathname: '/project/[id]/element/[elementId]', params: { id: p.id, elementId: e.id } })}>
            <Row style={{ justifyContent: 'space-between' }}>
              <Body bold>
                {ELEMENT_LABEL[e.type].icon} {e.name}
                {e.count > 1 ? `  ×${e.count}` : ''}
              </Body>
              <Chip title={st.title} color={st.color} />
            </Row>
            <Label style={{ textTransform: 'none' }}>
              {ELEMENT_LABEL[e.type].title} · {elementSize(e)}
            </Label>
            <Label style={{ textTransform: 'none' }}>
              {e.type === 'masonry'
                ? `${fmt(r.masonryArea)} м² · ${r.blocks} тухли`
                : `${fmt(r.concrete)} м³ бетон · ${tonnes(r.rebarKg)} желязо · ${fmt(r.formwork)} м² кофраж`}
            </Label>
          </Card>
        );
      })}

      {can(role, 'edit') ? (
        <Button
          kind="primary"
          title="＋ Добави елемент"
          onPress={() => router.push({ pathname: '/project/[id]/element/edit', params: { id: p.id, levelId: level.id } })}
        />
      ) : null}
    </Screen>
  );
}
