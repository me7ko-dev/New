import * as DocumentPicker from 'expo-document-picker';

export type PickedFile = { name: string; kind: 'pdf' | 'image'; uri: string };

/** Браузърът пази данните в localStorage (обикновено ~5 MB общо), затова ограничаваме размера. */
const MAX_BYTES = 3 * 1024 * 1024;

function toDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = () => reject(r.error);
    r.readAsDataURL(blob);
  });
}

/** В браузъра файлът се пази като data URL, за да остане и след презареждане. */
export async function pickDrawing(): Promise<PickedFile | null> {
  const res = await DocumentPicker.getDocumentAsync({ type: ['application/pdf', 'image/*'] });
  if (res.canceled || !res.assets[0]) return null;
  const a = res.assets[0];
  const blob = a.file ?? (await (await fetch(a.uri)).blob());
  if (blob.size > MAX_BYTES) {
    throw new Error(
      `файлът е ${(blob.size / 1024 / 1024).toFixed(1)} MB, а в браузъра се побират до 3 MB. Намалете снимката или разделете PDF-а.`
    );
  }
  const kind = a.mimeType === 'application/pdf' || a.name.toLowerCase().endsWith('.pdf') ? 'pdf' : 'image';
  return { name: a.name.replace(/\.[^.]+$/, ''), kind, uri: await toDataUrl(blob) };
}

export function deleteDrawingFile(_uri: string) {}

export async function openExternally(uri: string) {
  window.open(uri, '_blank');
}

export async function shareTextFile(name: string, content: string, mimeType: string) {
  // BOM, за да отвори Excel кирилицата правилно.
  const blob = new Blob(['﻿' + content], { type: mimeType });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

/** В браузъра чертежът вече е data URL — вадим типа и base64 частта. */
export async function readBase64(uri: string, kind: 'pdf' | 'image'): Promise<{ mime: string; data: string }> {
  const m = uri.match(/^data:([^;,]+)?(;base64)?,(.*)$/s);
  if (m && m[2]) return { mime: m[1] ?? (kind === 'pdf' ? 'application/pdf' : 'image/jpeg'), data: m[3] };
  const blob = await (await fetch(uri)).blob();
  const url = await toDataUrl(blob);
  return { mime: blob.type || (kind === 'pdf' ? 'application/pdf' : 'image/jpeg'), data: url.slice(url.indexOf(',') + 1) };
}
