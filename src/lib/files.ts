import * as DocumentPicker from 'expo-document-picker';
import { Directory, File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';

import { uid } from './factory';

export type PickedFile = { name: string; kind: 'pdf' | 'image'; uri: string };

const TYPES = ['application/pdf', 'image/*'];

function kindOf(name: string, mime?: string): 'pdf' | 'image' {
  return mime === 'application/pdf' || name.toLowerCase().endsWith('.pdf') ? 'pdf' : 'image';
}

/** Избор на чертеж/снимка и копиране в паметта на приложението, за да работи без интернет. */
export async function pickDrawing(): Promise<PickedFile | null> {
  const res = await DocumentPicker.getDocumentAsync({ type: TYPES, copyToCacheDirectory: true });
  if (res.canceled || !res.assets[0]) return null;
  const a = res.assets[0];
  const dir = new Directory(Paths.document, 'drawings');
  dir.create({ intermediates: true, idempotent: true });
  const ext = a.name.includes('.') ? a.name.slice(a.name.lastIndexOf('.')) : '';
  const target = new File(dir, uid() + ext);
  await new File(a.uri).copy(target);
  return { name: a.name.replace(/\.[^.]+$/, ''), kind: kindOf(a.name, a.mimeType), uri: target.uri };
}

export function deleteDrawingFile(uri: string) {
  try {
    const f = new File(uri);
    if (f.exists) f.delete();
  } catch {
    // файлът вече го няма
  }
}

/** Отваря PDF в системния преглед (или изпраща към друго приложение). */
export async function openExternally(uri: string) {
  if (await Sharing.isAvailableAsync()) await Sharing.shareAsync(uri);
}

/** Записва текстов файл (напр. CSV за Excel) и го изпраща. */
export async function shareTextFile(name: string, content: string, mimeType: string) {
  const f = new File(Paths.cache, name);
  if (f.exists) f.delete();
  f.create();
  f.write(content);
  await Sharing.shareAsync(f.uri, { mimeType, dialogTitle: name });
}

const IMAGE_MIME: Record<string, string> = { png: 'image/png', webp: 'image/webp', heic: 'image/heic', heif: 'image/heif', gif: 'image/gif' };

/** Съдържанието на чертежа като base64 — за изпращане към AI. */
export async function readBase64(uri: string, kind: 'pdf' | 'image'): Promise<{ mime: string; data: string }> {
  const ext = uri.slice(uri.lastIndexOf('.') + 1).toLowerCase();
  const mime = kind === 'pdf' ? 'application/pdf' : IMAGE_MIME[ext] ?? 'image/jpeg';
  return { mime, data: await new File(uri).base64() };
}
