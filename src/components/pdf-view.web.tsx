import { useEffect, useState } from 'react';

/** В браузъра PDF се показва директно, с вградените бутони за страници и увеличение. */
export function PdfView({ uri }: { uri: string }) {
  const [src, setSrc] = useState<string | null>(null);

  useEffect(() => {
    // Някои браузъри не показват дълги data: адреси в iframe — превръщаме го в blob.
    let url: string | null = null;
    fetch(uri)
      .then((r) => r.blob())
      .then((b) => {
        url = URL.createObjectURL(new Blob([b], { type: 'application/pdf' }));
        setSrc(url);
      })
      .catch(() => setSrc(uri));
    return () => {
      if (url) URL.revokeObjectURL(url);
    };
  }, [uri]);

  if (!src) return null;
  return <iframe src={src} title="PDF" style={{ flex: 1, width: '100%', height: '100%', border: 0 }} />;
}
