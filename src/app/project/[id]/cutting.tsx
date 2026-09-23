import { useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { Text, View } from 'react-native';

import { Body, Card, Chip, Empty, Label, Row, Screen, Title } from '@/components/ui';
import { useTheme } from '@/hooks/use-theme';
import { calcElement } from '@/lib/calc';
import { cutAll } from '@/lib/cutting';
import { fmt, levelTitle, tonnes } from '@/lib/labels';
import { useProject } from '@/lib/store';

/** „1,06 + 1,06 + 1,36“ → „2 × 1,06 + 1 × 1,36“ */
function describe(pieces: number[]): string {
  const counts = new Map<number, number>();
  for (const x of pieces) counts.set(x, (counts.get(x) ?? 0) + 1);
  return [...counts.entries()].map(([len, n]) => `${n} × ${fmt(len)} м`).join(' + ');
}

const PIECE_COLORS = ['#C53030', '#DD6B20', '#2B6CB0', '#2F855A', '#6B46C1', '#B7791F'];

export default function CuttingScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { project: p } = useProject(id);
  const [levelId, setLevelId] = useState<string | undefined>();
  const t = useTheme();

  const cuts = useMemo(() => {
    if (!p) return [];
    const els = levelId ? p.elements.filter((e) => e.levelId === levelId) : p.elements;
    return cutAll(els.flatMap((e) => calcElement(e, p.settings).bars), p.settings.stockLength);
  }, [p, levelId]);

  if (!p) return <Screen title="Разкрой"><Empty icon="🤷" text="Обектът не е намерен." /></Screen>;
  const stock = p.settings.stockLength;

  return (
    <Screen title="Разкрой">
      <Title sub={`Как да се нарежат прътите по ${fmt(stock)} м с най-малко отпадък`}>
        {levelTitle(p.levels.find((l) => l.id === levelId))}
      </Title>
      <Row>
        <Chip title="Целия обект" selected={!levelId} onPress={() => setLevelId(undefined)} />
        {[...p.levels]
          .sort((a, b) => a.elevation - b.elevation)
          .map((l) => (
            <Chip key={l.id} title={l.name} selected={levelId === l.id} onPress={() => setLevelId(l.id)} />
          ))}
      </Row>

      {cuts.length === 0 ? <Empty icon="✂️" text="Няма армировка за разкрой." /> : null}

      {cuts.map((c) => (
        <Card key={c.d}>
          <Row style={{ justifyContent: 'space-between' }}>
            <Body bold style={{ fontSize: 22 }}>Ø{c.d}</Body>
            <Body bold>
              {c.stockBars} пръта по {fmt(stock)} м · {tonnes(c.weightKg)}
            </Body>
          </Row>
          <Label style={{ textTransform: 'none' }}>Отпадък {fmt(c.wastePercent, 1)}% ({fmt(c.wasteLength, 1)} м)</Label>
          {c.wastePercent > 10 ? (
            <Label style={{ textTransform: 'none', color: '#B7791F' }}>
              ⚠ Голям отпадък — остатъците могат да станат допълнителна армировка, или поръчайте прътите нарязани по
              размер от доставчика.
            </Label>
          ) : null}
          {c.patterns.slice(0, 12).map((pat, i) => (
            <View key={i} style={{ gap: 4, marginTop: 6 }}>
              <Row style={{ justifyContent: 'space-between' }}>
                <Body style={{ flexShrink: 1 }}>{describe(pat.pieces)}</Body>
                <Body bold>{pat.times} пръта</Body>
              </Row>
              <View style={{ flexDirection: 'row', height: 22, borderRadius: 4, overflow: 'hidden', backgroundColor: t.backgroundElement }}>
                {pat.pieces.map((x, k) => (
                  <View
                    key={k}
                    style={{
                      width: `${(x / stock) * 100}%`,
                      backgroundColor: PIECE_COLORS[k % PIECE_COLORS.length],
                      borderRightWidth: 2,
                      borderColor: t.card,
                      justifyContent: 'center',
                    }}>
                    <Text numberOfLines={1} style={{ color: '#fff', fontSize: 11, textAlign: 'center', fontWeight: '700' }}>
                      {fmt(x)}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          ))}
          {c.patterns.length > 12 ? <Label style={{ textTransform: 'none' }}>…и още {c.patterns.length - 12} схеми (виж експорта за Excel)</Label> : null}
        </Card>
      ))}
    </Screen>
  );
}
