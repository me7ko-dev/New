import { router } from 'expo-router';
import { useState } from 'react';

import { Body, Button, Field, Row, Screen, Title } from '@/components/ui';
import { newProject } from '@/lib/factory';
import { useStore } from '@/lib/store';

export default function NewProject() {
  const { addProject } = useStore();
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [floors, setFloors] = useState('3');
  const [height, setHeight] = useState('3');

  const f = Math.max(1, Math.min(40, parseInt(floors, 10) || 0));
  const h = parseFloat(height.replace(',', '.')) || 3;

  return (
    <Screen title="Нов обект">
      <Title sub="Само основното — останалото се добавя после.">Нов обект</Title>
      <Field label="Име на обекта" value={name} onChange={setName} placeholder="напр. Къща Иванови" />
      <Field label="Адрес" value={address} onChange={setAddress} placeholder="град, улица" />
      <Row>
        <Field label="Брой етажи" value={floors} onChange={setFloors} numeric />
        <Field label="Височина на етаж" value={height} onChange={setHeight} numeric unit="м" />
      </Row>
      <Body>
        Ще се създадат нива от кота ±0.00 до покрива (+{(f * h).toFixed(2)}) и типов график за всеки етаж.
      </Body>
      <Button
        kind="primary"
        title="Създай обекта"
        disabled={!name.trim()}
        onPress={() => {
          const p = newProject(name.trim(), address.trim(), f, h);
          addProject(p);
          router.replace({ pathname: '/project/[id]', params: { id: p.id } });
        }}
      />
    </Screen>
  );
}
