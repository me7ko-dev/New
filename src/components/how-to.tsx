import { useState } from 'react';
import { View } from 'react-native';

import { Model3D } from '@/components/model-3d';
import { Body, Button, Card, Label, Row } from '@/components/ui';
import type { CalcSettings, Element } from '@/lib/calc';
import { buildGuide, type GuideStep } from '@/lib/guides';

export function DontForget({ items }: { items: string[] }) {
  return (
    <View style={{ backgroundColor: '#FEF3C7', borderRadius: 12, padding: 12, gap: 4 }}>
      <Body bold style={{ color: '#7C4A03' }}>
        ⚠ Не забравяй
      </Body>
      {items.map((x, i) => (
        <Body key={i} style={{ color: '#5B3702' }}>
          • {x}
        </Body>
      ))}
    </View>
  );
}

export function StepText({ step, index, total }: { step: GuideStep; index?: number; total?: number }) {
  return (
    <View style={{ gap: 6 }}>
      <Body bold style={{ fontSize: 19 }}>
        {index !== undefined ? `Стъпка ${index + 1}${total ? ` от ${total}` : ''}: ` : ''}
        {step.title}
      </Body>
      {step.do.map((x, i) => (
        <Body key={i}>• {x}</Body>
      ))}
      {step.dontForget?.length ? <DontForget items={step.dontForget} /> : null}
    </View>
  );
}

/** 3D модел + стъпките „как се прави“, синхронизирани: всяка стъпка показва своя етап в модела. */
export function HowTo({ element, settings }: { element: Element; settings: CalcSettings }) {
  const steps = buildGuide(element, settings);
  const [i, setI] = useState(0);
  const idx = Math.min(i, steps.length - 1);
  return (
    <Card>
      <Label>🧱 Как се прави — стъпка по стъпка, в 3D</Label>
      <Model3D element={element} settings={settings} stage={idx} onStage={setI} />
      <StepText step={steps[idx]} index={idx} total={steps.length} />
      <Row style={{ justifyContent: 'space-between' }}>
        <Button title="◀ Предишна" disabled={idx === 0} onPress={() => setI(idx - 1)} />
        <Button kind="primary" title="Следваща ▶" disabled={idx >= steps.length - 1} onPress={() => setI(idx + 1)} />
      </Row>
    </Card>
  );
}
