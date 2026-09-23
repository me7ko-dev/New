import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Text, View } from 'react-native';

import { Body, Button, Card, Chip, Empty, Label, Row, Screen } from '@/components/ui';
import { uid } from '@/lib/factory';
import { pickDrawing, type PickedFile } from '@/lib/files';
import { DISCIPLINE_LABEL } from '@/lib/labels';
import { can, useProject } from '@/lib/store';
import type { Discipline } from '@/lib/types';

export default function DrawingsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { project: p, update, role } = useProject(id);
  const [level, setLevel] = useState<string | 'all'>('all');
  const [disc, setDisc] = useState<Discipline | 'all'>('all');
  const [picked, setPicked] = useState<PickedFile | null>(null);
  const [pLevel, setPLevel] = useState<string | null>(null);
  const [pDisc, setPDisc] = useState<Discipline>('arch');
  const [error, setError] = useState<string | null>(null);
  if (!p) return <Screen title="Чертежи"><Empty icon="🤷" text="Обектът не е намерен." /></Screen>;

  const list = p.drawings.filter((d) => (level === 'all' || d.levelId === level) && (disc === 'all' || d.discipline === disc));

  const add = async () => {
    setError(null);
    try {
      const f = await pickDrawing();
      if (f) {
        setPicked(f);
        setPLevel(level === 'all' ? null : level);
      }
    } catch (e) {
      setError(`Файлът не може да се отвори: ${String(e)}`);
    }
  };

  const save = () => {
    if (!picked) return;
    update((pr) => ({
      ...pr,
      drawings: [
        ...pr.drawings,
        { id: uid(), name: picked.name, kind: picked.kind, uri: picked.uri, levelId: pLevel, discipline: pDisc, addedAt: new Date().toISOString() },
      ],
    }));
    setPicked(null);
  };

  return (
    <Screen title="Чертежи и снимки">
      <Label>Етаж</Label>
      <Row>
        <Chip title="Всички" selected={level === 'all'} onPress={() => setLevel('all')} />
        {p.levels.map((l) => (
          <Chip key={l.id} title={l.name} selected={level === l.id} onPress={() => setLevel(l.id)} />
        ))}
      </Row>
      <Label>Какво показва</Label>
      <Row>
        <Chip title="Всичко" selected={disc === 'all'} onPress={() => setDisc('all')} />
        {(Object.keys(DISCIPLINE_LABEL) as Discipline[]).map((d) => (
          <Chip key={d} title={`${DISCIPLINE_LABEL[d].icon} ${DISCIPLINE_LABEL[d].title}`} selected={disc === d} onPress={() => setDisc(d)} />
        ))}
      </Row>

      {picked ? (
        <Card>
          <Body bold>Нов файл: {picked.name}</Body>
          <Label>За кой етаж е?</Label>
          <Row>
            <Chip title="Целия обект" selected={pLevel === null} onPress={() => setPLevel(null)} />
            {p.levels.map((l) => (
              <Chip key={l.id} title={l.name} selected={pLevel === l.id} onPress={() => setPLevel(l.id)} />
            ))}
          </Row>
          <Label>Какво показва?</Label>
          <Row>
            {(Object.keys(DISCIPLINE_LABEL) as Discipline[]).map((d) => (
              <Chip key={d} title={`${DISCIPLINE_LABEL[d].icon} ${DISCIPLINE_LABEL[d].title}`} selected={pDisc === d} onPress={() => setPDisc(d)} />
            ))}
          </Row>
          <Row>
            <Button kind="primary" title="💾 Запази" onPress={save} />
            <Button title="Отказ" onPress={() => setPicked(null)} />
          </Row>
        </Card>
      ) : can(role, 'edit') ? (
        <Button kind="primary" title="＋ Качи чертеж (PDF) или снимка" onPress={add} />
      ) : null}
      {error ? <Body style={{ color: '#C53030' }}>{error}</Body> : null}

      {list.length === 0 ? <Empty icon="🗺" text="Няма чертежи тук. Ръководителят може да качи PDF или снимки." /> : null}
      <Row style={{ alignItems: 'stretch' }}>
        {list.map((d) => {
          const lvl = p.levels.find((l) => l.id === d.levelId);
          return (
            <Card
              key={d.id}
              style={{ flexBasis: 220, flexGrow: 1 }}
              onPress={() => router.push({ pathname: '/project/[id]/drawing/[drawingId]', params: { id: p.id, drawingId: d.id } })}>
              {d.kind === 'image' ? (
                <Image source={{ uri: d.uri }} style={{ width: '100%', height: 140, borderRadius: 8 }} contentFit="cover" />
              ) : (
                <View style={{ height: 140, alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={{ fontSize: 56 }}>📄</Text>
                </View>
              )}
              <Body bold>{d.name}</Body>
              <Label style={{ textTransform: 'none' }}>
                {DISCIPLINE_LABEL[d.discipline].icon} {DISCIPLINE_LABEL[d.discipline].title} · {lvl ? lvl.name : 'Целия обект'}
              </Label>
            </Card>
          );
        })}
      </Row>
    </Screen>
  );
}
