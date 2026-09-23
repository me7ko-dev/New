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
