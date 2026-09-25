/**
 * Разчитане на чертеж с AI: Gemini (основен) и Mistral (резерва).
 * Ключовете се пазят само на това устройство — отделно от данните на обектите,
 * за да не попаднат в експорт или в кода.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

import { parseReadResponse, READ_PROMPT, type ReadResult } from './ai-parse';
import { newElement } from './factory';
import { readBase64 } from './files';
import type { Drawing } from './types';

const KEYS = 'obekt-plan/ai-keys';

export type AiKeys = { gemini: string; mistral: string };
export type Provider = 'gemini' | 'mistral';

export const PROVIDER_LABEL: Record<Provider, string> = { gemini: 'Gemini', mistral: 'Mistral' };

export async function loadKeys(): Promise<AiKeys> {
  try {
    const raw = await AsyncStorage.getItem(KEYS);
    const k = raw ? (JSON.parse(raw) as Partial<AiKeys>) : {};
    return { gemini: k.gemini ?? '', mistral: k.mistral ?? '' };
  } catch {
    return { gemini: '', mistral: '' };
  }
}

export async function saveKeys(k: AiKeys) {
  await AsyncStorage.setItem(KEYS, JSON.stringify({ gemini: k.gemini.trim(), mistral: k.mistral.trim() }));
}

/** Грешка, след която има смисъл да опитаме следващия модел или услуга. */
class TryNext extends Error {}

/** Имената на моделите се сменят; ако някое бъде спряно, минаваме на следващото. */
const GEMINI_MODELS = ['gemini-flash-latest', 'gemini-3.8-flash', 'gemini-3.5-flash'];

async function askGemini(key: string, mime: string, data: string, prompt: string): Promise<string> {
  let last = '';
  for (const model of GEMINI_MODELS) {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
      body: JSON.stringify({
        contents: [{ parts: [{ inline_data: { mime_type: mime, data } }, { text: prompt }] }],
        generationConfig: { responseMimeType: 'application/json', temperature: 0 },
      }),
    });
    if (res.status === 400 || res.status === 401 || res.status === 403) {
      const body = await res.text();
      if (/API key|API_KEY|permission|PERMISSION/i.test(body)) throw new TryNext('ключът за Gemini не е приет');
      throw new TryNext(`Gemini отказа файла (${res.status})`);
    }
    if (res.status === 404 || res.status === 429 || res.status >= 500) {
      last = res.status === 429 ? 'дневният безплатен лимит на Gemini е свършил' : `Gemini не отговаря (${res.status})`;
      continue;
    }
    if (!res.ok) throw new TryNext(`Gemini: грешка ${res.status}`);
    const json = await res.json();
    const text: string | undefined = json?.candidates?.[0]?.content?.parts?.map((p: { text?: string }) => p.text ?? '').join('');
    if (!text) throw new TryNext('Gemini не върна отговор');
    return text;
  }
  throw new TryNext(last || 'Gemini не отговаря');
}

async function mistralFetch(key: string, path: string, body: unknown) {
  const res = await fetch(`https://api.mistral.ai/v1/${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
    body: JSON.stringify(body),
  });
  if (res.status === 401 || res.status === 403) throw new TryNext('ключът за Mistral не е приет');
  if (res.status === 429) throw new TryNext('безплатният лимит на Mistral е свършил за момента');
  if (!res.ok) throw new TryNext(`Mistral: грешка ${res.status}`);
  return res.json();
}

/**
 * Mistral: първо OCR (най-силното му място — таблици и надписи), после моделът
 * подрежда прочетения текст (и самата снимка) в елементи.
 */
async function askMistral(key: string, mime: string, data: string, prompt: string): Promise<string> {
  const url = `data:${mime};base64,${data}`;
  const isPdf = mime === 'application/pdf';
  const ocr = await mistralFetch(key, 'ocr', {
    model: 'mistral-ocr-latest',
    document: isPdf ? { type: 'document_url', document_url: url } : { type: 'image_url', image_url: url },
  });
  const text = ((ocr?.pages ?? []) as { markdown?: string }[]).map((p) => p.markdown ?? '').join('\n\n').slice(0, 60000);

  const content: unknown[] = [{ type: 'text', text: `${prompt}\n\nТекст, прочетен от чертежа (OCR):\n${text || '(няма)'}` }];
  if (!isPdf) content.push({ type: 'image_url', image_url: url });
  const chat = await mistralFetch(key, 'chat/completions', {
    model: 'mistral-medium-latest',
    temperature: 0,
    response_format: { type: 'json_object' },
    messages: [{ role: 'user', content }],
  });
  const out: string | undefined = chat?.choices?.[0]?.message?.content;
  if (!out) throw new TryNext('Mistral не върна отговор');
  return out;
}

export type ReadOutcome = ReadResult & { provider: Provider; failures: string[] };

/** Разчита чертеж: опитва Gemini, при неуспех — Mistral. */
export async function readDrawing(drawing: Drawing, levelId: string, hint?: string): Promise<ReadOutcome> {
  const keys = await loadKeys();
  if (!keys.gemini && !keys.mistral) throw new Error('Няма въведен ключ. Отворете „AI за чертежи“ и поставете поне един ключ.');
  const { mime, data } = await readBase64(drawing.uri, drawing.kind);
  const prompt = hint?.trim() ? `${READ_PROMPT}\n\nПотребителят уточнява: ${hint.trim()}` : READ_PROMPT;
  const makeBase = (t: Parameters<typeof newElement>[0]) => newElement(t, levelId);

  const failures: string[] = [];
  const order: [Provider, string, typeof askGemini][] = [
    ['gemini', keys.gemini, askGemini],
    ['mistral', keys.mistral, askMistral],
  ];
  for (const [provider, key, ask] of order) {
    if (!key) continue;
    try {
      const text = await ask(key, mime, data, prompt);
      return { ...parseReadResponse(text, makeBase), provider, failures };
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      // Мрежова грешка (няма интернет) или „опитай следващия“ — продължаваме.
      failures.push(`${PROVIDER_LABEL[provider]}: ${e instanceof TryNext ? msg : `няма връзка или неразбираем отговор (${msg})`}`);
    }
  }
  throw new Error(failures.join('\n'));
}

/** Кратка проверка, че ключът работи (без чертеж). */
export async function testKey(provider: Provider, key: string): Promise<string> {
  if (!key.trim()) return 'Няма ключ.';
  try {
    if (provider === 'gemini') {
      const res = await fetch('https://generativelanguage.googleapis.com/v1beta/models?pageSize=1', { headers: { 'x-goog-api-key': key.trim() } });
      return res.ok ? '✅ Работи' : `❌ Не е приет (${res.status})`;
    }
    const res = await fetch('https://api.mistral.ai/v1/models', { headers: { Authorization: `Bearer ${key.trim()}` } });
    return res.ok ? '✅ Работи' : `❌ Не е приет (${res.status})`;
  } catch {
    return '❌ Няма връзка с интернет';
  }
}
