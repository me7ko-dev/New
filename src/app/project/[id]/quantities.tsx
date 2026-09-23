import * as Clipboard from 'expo-clipboard';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { Body, Button, Card, Chip, Empty, Label, Progress, Row, Screen, Stat, Title } from '@/components/ui';
import { summarize, type ConcreteClass } from '@/lib/calc';
import { projectCsv } from '@/lib/export';
import { shareTextFile } from '@/lib/files';
import { fmt, formatElevation, levelTitle, tonnes } from '@/lib/labels';
import { useProject } from '@/lib/store';

export default function QuantitiesScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { project: p } = useProject(id);
  const [levelId, setLevelId] = useState<string | undefined>();
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  if (!p) return <Screen title="Количества"><Empty icon="🤷" text="Обектът не е намерен." /></Screen>;

  const level = p.levels.find((l) => l.id === levelId);
  const elements = level ? p.elements.filter((e) => e.levelId === level.id) : p.elements;
  const s = summarize(elements, p.settings);
  const perLevel = [...p.levels]
    .sort((a, b) => b.elevation - a.elevation)
    .map((l) => ({ l, s: summarize(p.elements.filter((e) => e.levelId === l.id), p.settings) }));
  const maxConcrete = Math.max(1, ...perLevel.map((x) => x.s.concrete));

  const exportCsv = async () => {
    setError(null);
    try {
      // Латиница в името — някои браузъри не приемат кирилица в името на сваления файл.
      await shareTextFile(`kolichestva-${new Date().toISOString().slice(0, 10)}.csv`, projectCsv(p), 'text/csv');
    } catch (e) {
      setError(`Експортът не успя: ${String(e)}`);
    }
  };

  const copyTable = async () => {
    setError(null);
    try {
      await Clipboard.setStringAsync(projectCsv(p, '\t'));
      setCopied(true);
    } catch (e) {
      setError(`Копирането не успя: ${e instanceof Error ? e.message : String(e)}`);
    }
  };

  return (
    <Screen title="Количества">
      <Title sub="От кота ±0.00 до покрива">{levelTitle(level)}</Title>
      <Row>
        <Chip title="Целия обект" selected={!levelId} onPress={() => setLevelId(undefined)} />
        {[...p.levels]
          .sort((a, b) => a.elevation - b.elevation)
          .map((l) => (
            <Chip key={l.id} title={l.name} selected={levelId === l.id} onPress={() => setLevelId(l.id)} />
          ))}
      </Row>

      <Row>
        <Stat icon="🧱" value={`${fmt(s.concreteWithWaste, 1)} м³`} label={`бетон (с ${p.settings.concreteWaste}% загуба)`} />
        <Stat icon="🚚" value={`${s.trucks}`} label={`бетоновоза по ${p.settings.truckVolume} м³`} />
        <Stat icon="⛓" value={tonnes(s.rebarKg)} label="армировка" />
        <Stat icon="🪵" value={`${fmt(s.formwork, 0)} м²`} label="кофраж" />
        <Stat icon="🧱" value={`${fmt(s.masonryArea, 0)} м²`} label={`зидария · ${s.blocks} тухли`} />
        <Stat icon="🖌" value={`${fmt(s.plaster, 0)} м²`} label={`мазилка · ${fmt(s.mortar, 1)} м³ разтвор`} />
      </Row>

      <Card>
        <Label>Бетон по клас</Label>
        {Object.keys(s.concreteByClass).length === 0 ? <Body>—</Body> : null}
        {(Object.entries(s.concreteByClass) as [ConcreteClass, number][]).map(([c, v]) => (
          <Row key={c} style={{ justifyContent: 'space-between' }}>
            <Body>{c}</Body>
            <Body bold>{fmt(v, 2)} м³</Body>
          </Row>
        ))}
      </Card>

      <Card>
        <Label>Армировка по диаметър</Label>
        {Object.keys(s.rebarByDiameter).length === 0 ? <Body>—</Body> : null}
        {Object.entries(s.rebarByDiameter)
          .sort(([a], [b]) => Number(a) - Number(b))
          .map(([d, kg]) => (
            <View key={d} style={{ gap: 4 }}>
              <Row style={{ justifyContent: 'space-between' }}>
                <Body>Ø{d}</Body>
                <Body bold>{tonnes(kg)}</Body>
              </Row>
              <Progress value={kg / Math.max(1, s.rebarKg)} color="#C53030" />
            </View>
          ))}
      </Card>

      {!levelId ? (
        <Card>
          <Label>По етажи — от покрива до ±0.00</Label>
          {perLevel.map(({ l, s: ls }) => (
            <View key={l.id} style={{ gap: 4, paddingVertical: 4 }}>
              <Row style={{ justifyContent: 'space-between' }}>
                <Body bold>
                  {l.name} <Label style={{ textTransform: 'none' }}>{formatElevation(l.elevation)}</Label>
                </Body>
                <Body>
                  {fmt(ls.concrete, 1)} м³ · {tonnes(ls.rebarKg)} · 🚚 {ls.trucks}
                </Body>
              </Row>
              <Progress value={ls.concrete / maxConcrete} color="#8A8F98" />
            </View>
          ))}
        </Card>
      ) : null}

      <Row>
        <Button kind="primary" title="📋 Копирай за Excel" onPress={copyTable} />
        <Button title="📊 Свали файл" onPress={exportCsv} />
        <Button title="✂️ Разкрой на желязото" onPress={() => router.push({ pathname: '/project/[id]/cutting', params: { id: p.id } })} />
      </Row>
      {copied ? <Body style={{ color: '#2F855A' }}>✔ Копирано. Отворете Excel и поставете с Ctrl+V.</Body> : null}
      {error ? <Body style={{ color: '#C53030' }}>{error}</Body> : null}
      <Label style={{ textTransform: 'none' }}>
        Количествата се смятат по въведените размери от конструктивния проект. Оразмеряването на конструкцията остава
        отговорност на инженер-конструктор.
      </Label>
    </Screen>
  );
}
