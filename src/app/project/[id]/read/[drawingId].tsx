import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';

import { ElementSketch } from '@/components/rebar-sketch';
import { BigButton, Body, Button, Card, Chip, Empty, Field, Label, Row, Screen, Title } from '@/components/ui';
import { PROVIDER_LABEL, readDrawing, type ReadOutcome } from '@/lib/ai';
import { ELEMENT_LABEL, elementSize } from '@/lib/labels';
import { useProject } from '@/lib/store';

const WARN = '#B7791F';

export default function ReadDrawing() {
  const { id, drawingId } = useLocalSearchParams<{ id: string; drawingId: string }>();
  const { project: p, update } = useProject(id);
  const d = p?.drawings.find((x) => x.id === drawingId);
  const [levelId, setLevelId] = useState(d?.levelId ?? p?.levels[0]?.id ?? '');
  const [hint, setHint] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ReadOutcome | null>(null);
  const [skip, setSkip] = useState<Set<number>>(new Set());

  if (!p || !d) return <Screen title="Разчитане"><Empty icon="🤷" text="Чертежът не е намерен." /></Screen>;

  const run = async () => {
    setBusy(true);
    setError(null);
    setResult(null);
    setSkip(new Set());
    try {
      setResult(await readDrawing(d, levelId, hint));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  const chosen = result ? result.items.filter((_, i) => !skip.has(i)) : [];
  const add = () => {
    // Нивото може да е сменено след разчитането — прилагаме текущия избор.
    const els = chosen.map((it) => ({ ...it.element, levelId, note: it.element.note ?? `Разчетено с AI от „${d.name}“` }));
    update((pr) => ({ ...pr, elements: [...pr.elements, ...els] }));
    router.replace({ pathname: '/project/[id]/level/[levelId]', params: { id: p.id, levelId } });
  };

  return (
    <Screen title="Разчети с AI">
      <Card>
        {d.kind === 'image' ? (
          <Image source={{ uri: d.uri }} style={{ width: '100%', height: 180, borderRadius: 8 }} contentFit="contain" />
        ) : (
          <Text style={{ fontSize: 56, textAlign: 'center' }}>📄</Text>
        )}
        <Body bold>{d.name}</Body>
      </Card>

      <Label>Елементите са за етаж</Label>
      <Row>
        {p.levels.map((l) => (
          <Chip key={l.id} title={l.name} selected={levelId === l.id} onPress={() => setLevelId(l.id)} />
        ))}
      </Row>
      <Field label="Уточнение (по желание)" value={hint} placeholder="напр. само таблицата за армировка на колоните" onChange={setHint} />

      {busy ? (
        <Card>
          <ActivityIndicator size="large" />
          <Body style={{ textAlign: 'center' }}>AI чете чертежа… обикновено 10–40 секунди.</Body>
        </Card>
      ) : (
        <Button kind="primary" title={result ? '🔁 Разчети отново' : '🤖 Разчети'} onPress={run} />
      )}

      {error ? (
        <Card>
          <Body bold style={{ color: '#C53030' }}>Не успях да разчета чертежа</Body>
          <Body>{error}</Body>
          <BigButton icon="🔑" title="AI за чертежи" hint="Ключове и проверка" onPress={() => router.push('/ai')} />
        </Card>
      ) : null}

      {result ? (
        <>
          <Title sub={`Прочетено с ${PROVIDER_LABEL[result.provider]}. Проверете всяко число с чертежа — AI може да сбърка.`}>
            Намерих {result.items.length} {result.items.length === 1 ? 'елемент' : 'елемента'}
          </Title>
          {result.failures.length > 0 ? <Label style={{ textTransform: 'none' }}>Резерва, защото: {result.failures.join('; ')}</Label> : null}
          {result.notes.length > 0 ? (
            <Card>
              <Label>Бележки от AI</Label>
              {result.notes.map((n, i) => (
                <Body key={i}>• {n}</Body>
              ))}
            </Card>
          ) : null}

          {result.items.length === 0 ? <Empty icon="🔍" text="Не открих колони, греди, плочи или стени. Опитайте по-ясна снимка или уточнение." /> : null}

          {result.items.map((it, i) => {
            const on = !skip.has(i);
            const e = it.element;
            return (
              <Card key={i} style={!on ? { opacity: 0.5 } : undefined}>
                <Row style={{ justifyContent: 'space-between' }}>
                  <View style={{ flex: 1, minWidth: 180 }}>
                    <Body bold>
                      {ELEMENT_LABEL[e.type].icon} {e.name}
                      {e.count > 1 ? ` ×${e.count}` : ''}
                    </Body>
                    <Label style={{ textTransform: 'none' }}>
                      {ELEMENT_LABEL[e.type].title} · {elementSize(e)}
                    </Label>
                  </View>
                  <Chip
                    title={on ? '✓ Добави' : 'Пропусни'}
                    selected={on}
                    onPress={() =>
                      setSkip((s) => {
                        const n = new Set(s);
                        if (n.has(i)) n.delete(i);
                        else n.add(i);
                        return n;
                      })
                    }
                  />
                </Row>
                <ElementSketch element={e} settings={p.settings} />
                {it.doubts.length > 0 ? (
                  <Body style={{ color: WARN }}>
                    ⚠️ Не се чете ясно: {it.doubts.join(', ')}. Сложих типична стойност — поправете я след добавяне.
                  </Body>
                ) : (
                  <Body style={{ color: '#2F855A' }}>✓ Всички размери са прочетени — сверете ги с чертежа.</Body>
                )}
              </Card>
            );
          })}

          {chosen.length > 0 ? (
            <Button kind="primary" title={`💾 Добави ${chosen.length} към ${p.levels.find((l) => l.id === levelId)?.name ?? 'етажа'}`} onPress={add} />
          ) : null}
        </>
      ) : null}
    </Screen>
  );
}
