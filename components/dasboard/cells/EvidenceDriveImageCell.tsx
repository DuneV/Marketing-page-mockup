// src/components/dashboard/cells/EvidenceDriveImageCell.tsx
import React from "react";
import { extractDriveFileId, drivePreviewUrls } from "@/lib/data/driveLinks";

export function EvidenceDriveImageCell({ value }: { value: unknown }) {
  const url = typeof value === "string" ? value.trim() : "";
  if (!url) return <span style={{ opacity: 0.6 }}>—</span>;

  const fileId = extractDriveFileId(url);

  // Si no parece Drive, muéstralo como link normal
  if (!fileId) {
    return (
      <a href={url} target="_blank" rel="noreferrer">
        Ver evidencia
      </a>
    );
  }

  const { thumbUrl, openUrl } = drivePreviewUrls(fileId);

  return (
    <a
      href={openUrl}
      target="_blank"
      rel="noreferrer"
      style={{ display: "inline-flex", alignItems: "center", gap: 10 }}
      title="Abrir evidencia en Drive"
    >
      <img
        src={thumbUrl}
        alt="Evidencia"
        style={{
          width: 56,
          height: 56,
          objectFit: "cover",
          borderRadius: 10,
          border: "1px solid rgba(0,0,0,0.12)",
        }}
        loading="lazy"
      />
      <span>Ver</span>
    </a>
  );
}