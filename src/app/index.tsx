import { router } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';

import { BigButton, Body, Button, Card, Chip, Label, Progress, Row, Screen, Title } from '@/components/ui';
import { ROLE_LABEL } from '@/lib/labels';
import { pct, projectProgress } from '@/lib/progress';
import { can, useStore } from '@/lib/store';
import type { Role } from '@/lib/types';

function RolePicker({ onPick }: { onPick: (r: Role) => void }) {
  return (
    <>
      <Title sub="Изберете кой сте — приложението ще покаже само това, което ви трябва.">Добре дошли!</Title>
      {(Object.keys(ROLE_LABEL) as Role[]).map((r) => (
        <BigButton key={r} icon={ROLE_LABEL[r].icon} title={ROLE_LABEL[r].title} hint={ROLE_LABEL[r].hint} onPress={() => onPick(r)} />
      ))}
    </>
  );
}

export default function Home() {
  const { ready, role, setRole, projects } = useStore();

  if (!ready) {
    return (
      <Screen title="Обект План">
        <ActivityIndicator size="large" style={{ marginTop: 80 }} />
      </Screen>
    );
  }

  if (!role) {
    return (
      <Screen title="Обект План">
        <RolePicker onPick={setRole} />
      </Screen>
    );
  }

  return (
    <Screen title="Обект План">
      <Row style={{ justifyContent: 'space-between' }}>
        <Title>Моите обекти</Title>
        <Chip title={`${ROLE_LABEL[role].icon} ${ROLE_LABEL[role].title} — смени`} onPress={() => router.push('/role')} />
      </Row>

      {projects.map((p) => {
        const prog = projectProgress(p);
        return (
          <Card key={p.id} onPress={() => router.push({ pathname: '/project/[id]', params: { id: p.id } })}>
            <Row style={{ justifyContent: 'space-between' }}>
              <View style={{ flex: 1, minWidth: 180 }}>
                <Body bold style={{ fontSize: 20 }}>
                  🏗 {p.name}
                </Body>
                <Label style={{ textTransform: 'none' }}>{p.address}</Label>
              </View>
              <Body bold style={{ fontSize: 24 }}>
                {pct(prog)}
              </Body>
            </Row>
            <Progress value={prog} />
            <Label style={{ textTransform: 'none' }}>
              {p.levels.length} нива · {p.drawings.length} чертежа · {p.elements.length} елемента
            </Label>
          </Card>
        );
      })}

      <BigButton icon="📖" title="Как се чете чертежът" hint="Напишете надпис от чертежа — ще ви го обясним" onPress={() => router.push('/learn')} />

      {can(role, 'edit') ? <Button kind="primary" title="＋ Нов обект" onPress={() => router.push('/project/new')} /> : null}
    </Screen>
  );
}
