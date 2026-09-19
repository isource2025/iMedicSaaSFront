'use client';

import { getDocument, GlobalWorkerOptions, type PDFDocumentProxy } from 'pdfjs-dist';

let workerConfigured = false;

export function ensurePdfWorker() {
  if (workerConfigured || typeof window === 'undefined') return;
  GlobalWorkerOptions.workerSrc = '/pdfjs/pdf.worker.min.mjs';
  workerConfigured = true;
}

export async function loadPdfFromBlob(blob: Blob): Promise<PDFDocumentProxy> {
  ensurePdfWorker();
  const data = new Uint8Array(await blob.arrayBuffer());
  const task = getDocument({ data, useSystemFonts: true });
  return task.promise;
}

export async function loadPdfFromUrl(url: string): Promise<PDFDocumentProxy> {
  ensurePdfWorker();
  const res = await fetch(url);
  if (!res.ok) throw new Error('No se pudo cargar el PDF');
  const data = new Uint8Array(await res.arrayBuffer());
  const task = getDocument({ data, useSystemFonts: true });
  return task.promise;
}

export async function renderPdfPageToCanvas(
  pdf: PDFDocumentProxy,
  pageNumber: number,
  canvas: HTMLCanvasElement,
  scale: number
): Promise<void> {
  const page = await pdf.getPage(pageNumber);
  const viewport = page.getViewport({ scale });
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas no disponible');

  const outputScale = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.floor(viewport.width * outputScale);
  canvas.height = Math.floor(viewport.height * outputScale);
  canvas.style.width = `${Math.floor(viewport.width)}px`;
  canvas.style.height = `${Math.floor(viewport.height)}px`;

  const transform = outputScale !== 1 ? [outputScale, 0, 0, outputScale, 0, 0] : undefined;
  await page.render({
    canvasContext: ctx,
    viewport,
    transform,
  }).promise;
}

export async function renderPdfFirstPageDataUrl(
  blob: Blob,
  maxWidth = 360
): Promise<string | null> {
  const pdf = await loadPdfFromBlob(blob);
  try {
    const page = await pdf.getPage(1);
    const base = page.getViewport({ scale: 1 });
    const scale = Math.min(maxWidth / base.width, 1.2);
    const viewport = page.getViewport({ scale });
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    canvas.width = Math.floor(viewport.width);
    canvas.height = Math.floor(viewport.height);
    await page.render({ canvasContext: ctx, viewport }).promise;
    return canvas.toDataURL('image/jpeg', 0.82);
  } finally {
    await pdf.destroy();
  }
}
