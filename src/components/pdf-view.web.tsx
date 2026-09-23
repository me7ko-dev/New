import { useEffect, useRef, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';

import { useTheme } from '@/hooks/use-theme';

/**
 * PDF в браузъра се рисува страница по страница с pdf.js (зарежда се от cdnjs при нужда),
 * за да работи и там, където вградените PDF прегледи са забранени.
 */
const PDFJS = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/';

type PdfJs = {
  GlobalWorkerOptions: { workerSrc: string };
  getDocument: (src: { data: Uint8Array }) => { promise: Promise<PdfDoc> };
};
type PdfDoc = { numPages: number; getPage: (n: number) => Promise<PdfPage> };
type PdfPage = {
  getViewport: (o: { scale: number }) => { width: number; height: number };
  render: (o: { canvasContext: CanvasRenderingContext2D; viewport: unknown }) => { promise: Promise<void> };
};

let loading: Promise<PdfJs> | null = null;

function loadPdfJs(): Promise<PdfJs> {
  const w = window as unknown as { pdfjsLib?: PdfJs };
  if (w.pdfjsLib) return Promise.resolve(w.pdfjsLib);
  loading ??= new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = PDFJS + 'pdf.min.js';
    s.onload = () => {
      if (!w.pdfjsLib) return reject(new Error('pdf.js не се зареди'));
      w.pdfjsLib.GlobalWorkerOptions.workerSrc = PDFJS + 'pdf.worker.min.js';
      resolve(w.pdfjsLib);
    };
    s.onerror = () => {
      loading = null;
      reject(new Error('Няма връзка за зареждане на PDF прегледа'));
    };
    document.head.appendChild(s);
  });
  return loading;
}

function dataUrlToBytes(uri: string): Uint8Array {
  const b64 = uri.slice(uri.indexOf(',') + 1);
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

export function PdfView({ uri }: { uri: string }) {
  const t = useTheme();
  const host = useRef<View>(null);
  const [status, setStatus] = useState('Зареждане на чертежа…');

  useEffect(() => {
    let cancelled = false;
    const el = host.current as unknown as HTMLElement | null;
    if (!el) return;
    el.innerHTML = '';
    (async () => {
      try {
        const pdfjs = await loadPdfJs();
        const doc = await pdfjs.getDocument({ data: dataUrlToBytes(uri) }).promise;
        const width = el.clientWidth || 800;
        for (let n = 1; n <= doc.numPages && !cancelled; n++) {
          const page = await doc.getPage(n);
          const base = page.getViewport({ scale: 1 });
          const ratio = window.devicePixelRatio || 1;
          const viewport = page.getViewport({ scale: (width / base.width) * ratio });
          const canvas = document.createElement('canvas');
          canvas.width = viewport.width;
          canvas.height = viewport.height;
          canvas.style.width = '100%';
          canvas.style.display = 'block';
          canvas.style.marginBottom = '12px';
          canvas.style.background = '#fff';
          const ctx = canvas.getContext('2d');
          if (!ctx) continue;
          await page.render({ canvasContext: ctx, viewport }).promise;
          if (!cancelled) el.appendChild(canvas);
        }
        if (!cancelled) setStatus(doc.numPages > 1 ? `${doc.numPages} страници — превъртете надолу` : '');
      } catch (e) {
        if (!cancelled) setStatus(`PDF-ът не може да се покаже: ${e instanceof Error ? e.message : String(e)}`);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [uri]);

  return (
    <ScrollView contentContainerStyle={{ padding: 12 }} maximumZoomScale={4}>
      {status ? <Text style={{ color: t.textSecondary, marginBottom: 8, fontSize: 14 }}>{status}</Text> : null}
      <View ref={host} />
    </ScrollView>
  );
}
