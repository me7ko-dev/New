import { useEffect, useState } from 'react';
import { Linking } from 'react-native';

import { Body, Button, Card, Field, Label, Row, Screen, Title } from '@/components/ui';
import { loadKeys, saveKeys, testKey, type AiKeys, type Provider } from '@/lib/ai';

const INFO: Record<Provider, { title: string; role: string; url: string; steps: string }> = {
  gemini: {
    title: 'Gemini (Google)',
    role: 'Основен — най-добре разбира снимки и PDF чертежи',
    url: 'https://aistudio.google.com/apikey',
    steps: 'Влезте с Google акаунт → „Create API key“ → копирайте ключа. Безплатно, без карта.',
  },
  mistral: {
    title: 'Mistral',
    role: 'Резерва — ползва се, ако Gemini откаже или лимитът свърши. Силен в таблиците.',
    url: 'https://console.mistral.ai/api-keys',
    steps: 'Регистрация → план „Experiment“ (безплатен) → „API Keys“ → „Create new key“.',
  },
};

export default function AiSettings() {
  const [keys, setKeys] = useState<AiKeys>({ gemini: '', mistral: '' });
  const [status, setStatus] = useState<Partial<Record<Provider, string>>>({});
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    loadKeys().then(setKeys);
  }, []);

  const save = async () => {
    await saveKeys(keys);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <Screen title="AI за чертежи">
      <Title sub="Снимате или качвате чертеж, AI преписва колоните, гредите и плочите, а вие проверявате и потвърждавате. Скиците и стъпките прави приложението.">
        🤖 AI за чертежи
      </Title>
      <Card>
        <Body>🔒 Ключовете се пазят само на този телефон. Чертежът се изпраща към услугата само когато натиснете „Разчети с AI“.</Body>
        <Body>⚠️ Безплатните услуги може да ползват изпратените файлове за подобряване на своя AI. Не изпращайте чертежи, които трябва да останат тайна.</Body>
      </Card>

      {(Object.keys(INFO) as Provider[]).map((p) => (
        <Card key={p}>
          <Body bold style={{ fontSize: 19 }}>{INFO[p].title}</Body>
          <Label style={{ textTransform: 'none' }}>{INFO[p].role}</Label>
          <Body>{INFO[p].steps}</Body>
          <Button title="🔑 Вземи ключ" onPress={() => Linking.openURL(INFO[p].url)} />
          <Field label="Ключ" secure value={keys[p]} placeholder="поставете ключа тук" onChange={(v) => setKeys((k) => ({ ...k, [p]: v }))} />
          <Row>
            <Button
              title="Провери"
              onPress={async () => {
                setStatus((s) => ({ ...s, [p]: '…' }));
                const r = await testKey(p, keys[p]);
                setStatus((s) => ({ ...s, [p]: r }));
              }}
            />
            {status[p] ? <Body>{status[p]}</Body> : null}
          </Row>
        </Card>
      ))}

      <Button kind="primary" title={saved ? '✅ Запазено' : '💾 Запази'} onPress={save} />
    </Screen>
  );
}
