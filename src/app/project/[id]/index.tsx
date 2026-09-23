import { router, useLocalSearchParams } from 'expo-router';
import { View } from 'react-native';

import { BigButton, Body, Card, Empty, Label, Progress, Row, Screen, Title } from '@/components/ui';
import { formatElevation } from '@/lib/labels';
import { levelProgress, pct, projectProgress } from '@/lib/progress';
import { can, useProject } from '@/lib/store';

export default function ProjectScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { project: p, role } = useProject(id);
  if (!p) return <Screen title="Обект"><Empty icon="🤷" text="Обектът не е намерен." /></Screen>;

  const go = (pathname: string, params: Record<string, string> = {}) =>
    router.push({ pathname: pathname as never, params: { id: p.id, ...params } });
  const prog = projectProgress(p);
  const levelsTopDown = [...p.levels].sort((a, b) => b.elevation - a.elevation);

  return (
    <Screen title={p.name}>
      <Title sub={p.address}>{p.name}</Title>
      <Card>
        <Row style={{ justifyContent: 'space-between' }}>
          <Body bold>Готовност на обекта</Body>
          <Body bold style={{ fontSize: 22 }}>{pct(prog)}</Body>
        </Row>
        <Progress value={prog} />
      </Card>

      <BigButton kind="primary" icon="▶️" title="Покажи" hint="Стъпка по стъпка — как трябва да изглежда" onPress={() => go('/project/[id]/show')} />
      <BigButton icon="🗺" title="Чертежи и снимки" hint={`${p.drawings.length} файла — PDF и снимки`} onPress={() => go('/project/[id]/drawings')} />
      <BigButton icon="📅" title="График" hint="Какво кога се прави и какво е свършено" onPress={() => go('/project/[id]/schedule')} />
      <BigButton icon="🧮" title="Количества" hint="Бетон, армировка, кофраж, тухли — от ±0.00 до покрива" onPress={() => go('/project/[id]/quantities')} />
      <BigButton icon="🚚" title="Бетонът идва" hint="Колко да поръчам и какво да проверя, когато дойде" onPress={() => go('/project/[id]/concrete')} />
      <BigButton icon="📖" title="Как се чете чертежът" hint="Преводач на надписите и речник с прости думи" onPress={() => router.push('/learn')} />
      {can(role, 'progress') ? (
        <BigButton icon="✂️" title="Разкрой на желязото" hint="Как да се нарежат прътите с най-малко отпадък" onPress={() => go('/project/[id]/cutting')} />
      ) : null}

      <Label>Сградата по етажи</Label>
      <View style={{ gap: 6 }}>
        {levelsTopDown.map((l) => {
          const lp = levelProgress(p, l.id);
          const count = p.elements.filter((e) => e.levelId === l.id).length;
          return (
            <Card key={l.id} onPress={() => go('/project/[id]/level/[levelId]', { levelId: l.id })} style={{ paddingVertical: 12 }}>
              <Row style={{ justifyContent: 'space-between' }}>
                <Body bold>
                  {l.name === 'Покрив' ? '🔺' : '🟫'} {l.name}
                </Body>
                <Label style={{ textTransform: 'none' }}>
                  кота {formatElevation(l.elevation)} · {count} елем. · {pct(lp)}
                </Label>
              </Row>
              <Progress value={lp} />
            </Card>
          );
        })}
      </View>

      {can(role, 'edit') ? (
        <BigButton icon="⚙️" title="Настройки на обекта" hint="Етажи, коти, покритие, снаждане, бетоновоз" onPress={() => go('/project/[id]/settings')} />
      ) : null}
    </Screen>
  );
}
