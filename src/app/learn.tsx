import { useState } from 'react';
import { View } from 'react-native';

import { StepText } from '@/components/how-to';
import { Body, Card, Chip, Field, Label, Row, Screen, Title } from '@/components/ui';
import { GLOSSARY, READING_STEPS } from '@/lib/guides';
import { explainNotation } from '@/lib/notation';

const EXAMPLES = ['4Ø16', 'Ø8/15', 'C25/30', '+3.00', 'поз.3 L=520', '30/40', 'B500B'];

export default function LearnScreen() {
  const [text, setText] = useState('Колона 30/30, 4Ø16, бигли Ø8/15, C25/30');
  const [open, setOpen] = useState<number | null>(null);
  const r = explainNotation(text);

  return (
    <Screen title="Как се чете чертежът">
      <Title sub="Препишете надпис от чертежа — ще ви обясним какво значи.">Преводач на надписи</Title>
      <Field label="Надпис от чертежа" value={text} onChange={setText} placeholder="напр. 4Ø16, Ø8/15, C25/30" />
      <Row>
        {EXAMPLES.map((x) => (
          <Chip key={x} title={x} onPress={() => setText(x)} />
        ))}
      </Row>

      <Card>
        {r.found.length === 0 && text.trim() ? <Body>Не разпознах надпис. Опитайте с някой от примерите по-горе.</Body> : null}
        {r.found.map((f, i) => (
          <View key={i} style={{ gap: 2, paddingVertical: 4 }}>
            <Body bold style={{ fontSize: 20 }}>
              {f.text}
            </Body>
            <Body>{f.meaning}</Body>
          </View>
        ))}
        {r.found.length > 0 && r.unknown ? (
          <Label style={{ textTransform: 'none' }}>Обикновени думи или непознато: „{r.unknown}“</Label>
        ) : null}
      </Card>
      <Label style={{ textTransform: 'none' }}>
        Преводачът обяснява само надписи, които разпознава със сигурност. Ако нещо на чертежа не е ясно — питайте
        конструктора, преди да го направите.
      </Label>

      <Title>Как да прочетете чертежа</Title>
      {READING_STEPS.map((s, i) => (
        <Card key={s.title}>
          <StepText step={s} index={i} total={READING_STEPS.length} />
        </Card>
      ))}

      <Title sub="Натиснете дума, за да видите какво значи.">Речник</Title>
      <Card>
        {GLOSSARY.map((g, i) => (
          <View key={g.term} style={{ paddingVertical: 4, gap: 2 }}>
            <Chip title={g.term} selected={open === i} onPress={() => setOpen(open === i ? null : i)} />
            {open === i ? <Body>{g.meaning}</Body> : null}
          </View>
        ))}
      </Card>
    </Screen>
  );
}
