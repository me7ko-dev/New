import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';

import { Body, Button, Card, ConfirmButton, Empty, Field, Label, Row, Screen, Title } from '@/components/ui';
import { DEFAULT_SETTINGS, type CalcSettings } from '@/lib/calc';
import { uid } from '@/lib/factory';
import { formatElevation } from '@/lib/labels';
import { useProject, useStore } from '@/lib/store';

const FIELDS: { key: keyof CalcSettings; label: string; unit: string }[] = [
  { key: 'cover', label: 'Бетонно покритие', unit: 'см' },
  { key: 'lapFactor', label: 'Снаждане', unit: '× Ø' },
  { key: 'anchorFactor', label: 'Анкериране', unit: '× Ø' },
  { key: 'hookFactor', label: 'Кука на стреме', unit: '× Ø' },
  { key: 'stockLength', label: 'Дължина на прът', unit: 'м' },
  { key: 'concreteWaste', label: 'Загуба на бетон', unit: '%' },
  { key: 'truckVolume', label: 'Бетоновоз', unit: 'м³' },
];

export default function SettingsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { project: p, update } = useProject(id);
  const { removeProject } = useStore();
  const [vals, setVals] = useState<Record<string, string>>(() =>
    Object.fromEntries(FIELDS.map((f) => [f.key, String(p?.settings[f.key] ?? DEFAULT_SETTINGS[f.key])]))
  );
  if (!p) return <Screen title="Настройки"><Empty icon="🤷" text="Обектът не е намерен." /></Screen>;

  const saveSettings = () => {
    const next = { ...p.settings };
    for (const f of FIELDS) {
      const n = parseFloat(vals[f.key].replace(',', '.'));
      if (Number.isFinite(n) && n > 0) next[f.key] = n;
    }
    update((pr) => ({ ...pr, settings: next }));
  };

  const levels = [...p.levels].sort((a, b) => a.elevation - b.elevation);
  const setLevel = (lid: string, patch: { name?: string; elevation?: number }) =>
    update((pr) => ({ ...pr, levels: pr.levels.map((l) => (l.id === lid ? { ...l, ...patch } : l)) }));

  return (
    <Screen title="Настройки">
      <Title sub="Стойностите по подразбиране са типични — сверете ги с конструктора на обекта.">Сметки</Title>
      <Card>
        <Row>
          {FIELDS.map((f) => (
            <Field key={f.key} label={f.label} unit={f.unit} numeric value={vals[f.key]} onChange={(v) => setVals((s) => ({ ...s, [f.key]: v }))} />
          ))}
        </Row>
        <Button kind="primary" title="💾 Запази" onPress={saveSettings} />
      </Card>

      <Title>Нива и коти</Title>
      <Card>
        {levels.map((l) => (
          <Row key={l.id}>
            <Field label="Име" value={l.name} onChange={(v) => setLevel(l.id, { name: v })} />
            <Field
              label={`Кота (${formatElevation(l.elevation)})`}
              unit="м"
              numeric
              value={String(l.elevation)}
              onChange={(v) => {
                const n = parseFloat(v.replace(',', '.'));
                if (Number.isFinite(n)) setLevel(l.id, { elevation: n });
              }}
            />
            <ConfirmButton
              title="✕"
              confirmTitle={`Изтрий „${l.name}“ с елементите?`}
              onConfirm={() =>
                  update((pr) => ({
                    ...pr,
                    levels: pr.levels.filter((x) => x.id !== l.id),
                    elements: pr.elements.filter((e) => e.levelId !== l.id),
                    tasks: pr.tasks.filter((t) => t.levelId !== l.id),
                    drawings: pr.drawings.map((d) => (d.levelId === l.id ? { ...d, levelId: null } : d)),
                  }))
              }
            />
          </Row>
        ))}
        <Button
          title="＋ Добави ниво"
          onPress={() => {
            const top = levels[levels.length - 1];
            update((pr) => ({
              ...pr,
              levels: [...pr.levels, { id: uid(), name: 'Ново ниво', elevation: top ? Math.round((top.elevation + 3) * 100) / 100 : 0 }],
            }));
          }}
        />
      </Card>

      <Label>Опасна зона</Label>
      <Card>
        <Body>Изтриването на обекта е окончателно.</Body>
        <ConfirmButton
          title="Изтрий обекта"
          confirmTitle={`Изтрий „${p.name}“ завинаги?`}
          onConfirm={() => {
            removeProject(p.id);
            router.dismissAll();
          }}
        />
      </Card>
    </Screen>
  );
}
