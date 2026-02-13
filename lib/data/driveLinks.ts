// src/lib/data/driveLinks.ts
export function extractDriveFileId(url: string): string | null {
  try {
    const u = new URL(url);

    // 1) https://drive.google.com/open?id=FILEID
    const idParam = u.searchParams.get("id");
    if (idParam) return idParam;

    // 2) https://drive.google.com/file/d/FILEID/view
    const m1 = u.pathname.match(/\/file\/d\/([^/]+)/);
    if (m1?.[1]) return m1[1];

    // 3) https://drive.google.com/uc?export=view&id=FILEID
    // (igual cae arriba por searchParams)

    return null;
  } catch {
    return null;
  }
}

export function drivePreviewUrls(fileId: string) {
  // “uc?export=view” es una forma común de servir el archivo para mostrarlo en apps :contentReference[oaicite:2]{index=2}
  const viewUrl = `https://drive.google.com/uc?export=view&id=${encodeURIComponent(fileId)}`;

  // thumbnails: útil para mostrar miniatura rápida (según disponibilidad/permisos) :contentReference[oaicite:3]{index=3}
  const thumbUrl = `https://drive.google.com/thumbnail?id=${encodeURIComponent(fileId)}&sz=w800`;

  // link “humano” para abrir en nueva pestaña
  const openUrl = `https://drive.google.com/open?id=${encodeURIComponent(fileId)}`;

  return { viewUrl, thumbUrl, openUrl };
}