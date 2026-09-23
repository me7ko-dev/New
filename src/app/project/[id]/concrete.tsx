import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, Text } from 'react-native';

import { Body, Card, Chip, Empty, Label, Row, Screen, Stat, Title } from '@/components/ui';
import { summarize, type ConcreteClass } from '@/lib/calc';
import { CONCRETE_GUIDE } from '@/lib/guides';
import { fmt, levelTitle } from '@/lib/labels';
import { useProject } from '@/lib/store';
import { useTheme } from '@/hooks/use-theme';

export default function ConcreteScreen() {
  const { id, levelId: initial } = useLocalSearchParams<{ id: string; levelId?: string }>();
  const { project: p } = useProject(id);
  const [levelId, setLevelId] = useState<string | undefined>(initial);
  const [done, setDone] = useState<Record<string, boolean>>({});
  const t = useTheme();
  if (!p) return <Screen title="Бетонът идва"><Empty icon="🤷" text="Обектът не е намерен." /></Screen>;

  const level = p.levels.find((l) => l.id === levelId);
  const els = (level ? p.elements.filter((e) => e.levelId === level.id) : p.elements).filter((e) => e.type !== 'masonry');
  const s = summarize(els, p.settings);
  const truck = p.settings.truckVolume;

  return (
    <Screen title="Бетонът идва">
      <Title sub="Колко да поръчате и какво да проверите">{levelTitle(level)}</Title>
      <Row>
        <Chip title="Целия обект" selected={!levelId} onPress={() => setLevelId(undefined)} />
        {[...p.levels]
          .sort((a, b) => a.elevation - b.elevation)
          .map((l) => (
            <Chip key={l.id} title={l.name} selected={levelId === l.id} onPress={() => setLevelId(l.id)} />
          ))}
      </Row>

      <Row>
        <Stat icon="🧱" value={`${fmt(s.concreteWithWaste, 1)} м³`} label={`за поръчка (с ${p.settings.concreteWaste}% резерв)`} />
        <Stat icon="🚚" value={`${s.trucks}`} label={`бетоновоза по ${truck} м³`} />
      </Row>
      <Card>
        <Label>Какво да кажете при поръчката</Label>
        {(Object.entries(s.concreteByClass) as [ConcreteClass, number][]).map(([c, v]) => (
          <Body key={c}>
            • <Body bold>{c}</Body> — {fmt(v * (1 + p.settings.concreteWaste / 100), 1)} м³
          </Body>
        ))}
        {Object.keys(s.concreteByClass).length === 0 ? <Body>Няма въведени бетонни елементи за това ниво.</Body> : null}
        <Body>• Ден и час, адрес, дали трябва помпа.</Body>
        <Body>• Консистенция и едрина на зърната — по проекта или както каже конструкторът.</Body>
        {s.trucks > 1 ? (
          <Label style={{ textTransform: 'none' }}>
            Бетоновозите да идват един след друг — така бетонът не стяга между двата пласта.
          </Label>
        ) : null}
      </Card>

      <Title sub="Отмятайте, докато работите — списъкът се нулира, когато излезете.">Списък за деня</Title>
      {CONCRETE_GUIDE.map((day) => (
        <Card key={day.title}>
          <Label>{day.title}</Label>
          {day.items.map((item) => {
            const key = `${day.title}|${item}`;
            const on = !!done[key];
            return (
              <Pressable
                key={key}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: on }}
                onPress={() => setDone((d) => ({ ...d, [key]: !d[key] }))}
                style={{ flexDirection: 'row', gap: 10, paddingVertical: 6 }}>
                <Text style={{ fontSize: 20 }}>{on ? '✅' : '⬜'}</Text>
                <Text style={{ flex: 1, fontSize: 17, lineHeight: 24, color: on ? t.textSecondary : t.text, textDecorationLine: on ? 'line-through' : 'none' }}>
                  {item}
                </Text>
              </Pressable>
            );
          })}
        </Card>
      ))}
      <Label style={{ textTransform: 'none' }}>
        Това са общи правила. Проектът и техническият ръководител на обекта винаги са с предимство.
      </Label>
    </Screen>
  );
}
