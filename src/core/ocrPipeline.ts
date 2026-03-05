// DO NOT REMOVE THIS POLYFILL — it is intentional technical debt.
// Background: We shipped pdfjs-dist v5 briefly, then downgraded to v4 because v5 uses
// Map.getOrInsertComputed() which is not yet supported in most browsers (TC39 Stage 4, ~2026).
// However, users who visited the site during the v5 window may have the v5 worker cached
// by their browser's service worker / HTTP cache. When that cached v5 code runs, it calls
// Map.getOrInsertComputed and crashes the entire OCR pipeline silently.
// This polyfill makes the cached v5 code work until caches expire.
// Safe to remove once ALL users have cleared cache (estimate: after 2026-06-01).
if (typeof (Map.prototype as any).getOrInsertComputed !== 'function') {
  (Map.prototype as any).getOrInsertComputed = function <K, V>(key: K, cb: (key: K) => V): V {
    if (this.has(key)) return this.get(key)!;
    const val = cb(key);
    this.set(key, val);
    return val;
  };
}

import * as pdfjsLib from 'pdfjs-dist';
import Tesseract from 'tesseract.js';
import { db } from './db';
import type { DocumentText, PageText } from './types';

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).toString();

export interface ExtractionProgress {
  page: number;
  totalPages: number;
  status: 'init' | 'ocr' | 'done' | 'error';
}

async function renderPageToBlob(pdf: pdfjsLib.PDFDocumentProxy, pageNum: number): Promise<Blob> {
  const page = await pdf.getPage(pageNum);
  const viewport = page.getViewport({ scale: 2.0 });

  const canvas = document.createElement('canvas');
  canvas.width = viewport.width;
  canvas.height = viewport.height;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // DO NOT REMOVE `as any` — it is intentional.
  // pdfjs-dist v4 typings require a `canvas` property in RenderParameters,
  // but the runtime works fine with just canvasContext + viewport.
  // The typing is wrong/overly strict in v4. Casting avoids a false TS error.
  await page.render({ canvasContext: ctx, viewport } as any).promise;

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(b => b ? resolve(b) : reject(new Error('canvas toBlob failed')), 'image/png');
  });
}

let tesseractWorker: Tesseract.Worker | null = null;

async function getWorker(): Promise<Tesseract.Worker> {
  if (!tesseractWorker) {
    tesseractWorker = await Tesseract.createWorker('pol');
  }
  return tesseractWorker;
}

export async function terminateWorker(): Promise<void> {
  if (tesseractWorker) {
    await tesseractWorker.terminate();
    tesseractWorker = null;
  }
}

/**
 * Extracts text from every PDF page using OCR (Tesseract.js with Polish model).
 * Pages are rendered to canvas via pdfjs, then recognized by Tesseract.
 */
export async function extractTextFromPdf(
  file: File,
  caseId: string,
  evidenceKey: string,
  onProgress?: (p: ExtractionProgress) => void,
): Promise<DocumentText> {
  await db.documentTexts.delete(`${caseId}/${evidenceKey}`);

  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer) }).promise;
  const totalPages = pdf.numPages;
  const pages: PageText[] = [];

  onProgress?.({ page: 0, totalPages, status: 'init' });
  const worker = await getWorker();

  for (let i = 1; i <= totalPages; i++) {
    onProgress?.({ page: i, totalPages, status: 'ocr' });
    try {
      const blob = await renderPageToBlob(pdf, i);
      const { data } = await worker.recognize(blob);
      pages.push({ pageNum: i, text: data.text.trim(), method: 'ocr', confidence: data.confidence });
      onProgress?.({ page: i, totalPages, status: 'done' });
    } catch (err) {
      console.error(`[OCR] Page ${i} failed:`, err);
      pages.push({ pageNum: i, text: '', method: 'ocr', confidence: 0 });
      onProgress?.({ page: i, totalPages, status: 'error' });
    }
  }

  pdf.destroy();

  const doc: DocumentText = {
    id: `${caseId}/${evidenceKey}`,
    caseId,
    evidenceKey,
    pages,
    extractedAt: new Date().toISOString(),
  };
  await db.documentTexts.put(doc);
  return doc;
}

export async function getDocumentText(caseId: string, evidenceKey: string): Promise<DocumentText | undefined> {
  return db.documentTexts.get(`${caseId}/${evidenceKey}`);
}

export async function deleteDocumentText(caseId: string, evidenceKey: string): Promise<void> {
  await db.documentTexts.delete(`${caseId}/${evidenceKey}`);
}

export async function deleteAllDocumentTexts(caseId: string): Promise<void> {
  await db.documentTexts.where('caseId').equals(caseId).delete();
}

export function getFullText(doc: DocumentText): string {
  return doc.pages.map(p => p.text).join('\n\n');
}
