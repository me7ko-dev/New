import * as DocumentPicker from 'expo-document-picker';

export type PickedFile = { name: string; kind: 'pdf' | 'image'; uri: string };

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
  const blob = await (await fetch(a.uri)).blob();
  const kind = a.mimeType === 'application/pdf' || a.name.toLowerCase().endsWith('.pdf') ? 'pdf' : 'image';
  return { name: a.name.replace(/\.[^.]+$/, ''), kind, uri: await toDataUrl(blob) };
}

export function deleteDrawingFile(_uri: string) {}

export async function openExternally(uri: string) {
  const blob = await (await fetch(uri)).blob();
  window.open(URL.createObjectURL(blob), '_blank');
}

export async function shareTextFile(name: string, content: string, mimeType: string) {
  // BOM, за да отвори Excel кирилицата правилно.
  const blob = new Blob(['\ufeff' + content], { type: mimeType });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}
