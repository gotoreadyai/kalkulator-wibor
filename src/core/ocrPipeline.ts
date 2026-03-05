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

export type ProgressCallback = (p: ExtractionProgress) => void;

async function renderPageToBlob(pdf: pdfjsLib.PDFDocumentProxy, pageNum: number): Promise<Blob> {
  const page = await pdf.getPage(pageNum);
  const viewport = page.getViewport({ scale: 2.0 });

  const canvas = document.createElement('canvas');
  canvas.width = viewport.width;
  canvas.height = viewport.height;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  await page.render({ canvasContext: ctx, viewport } as any).promise;

  const sample = ctx.getImageData(Math.floor(viewport.width / 2), Math.floor(viewport.height / 2), 1, 1).data;
  console.log(`[OCR] Page ${pageNum}: canvas ${canvas.width}x${canvas.height}, center pixel rgba(${sample.join(',')})`);

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(b => b ? resolve(b) : reject(new Error('canvas toBlob failed')), 'image/png');
  });
}

let tesseractWorker: Tesseract.Worker | null = null;

async function getWorker(): Promise<Tesseract.Worker> {
  if (!tesseractWorker) {
    console.log('[Tesseract] Creating worker with pol language...');
    tesseractWorker = await Tesseract.createWorker('pol', undefined, {
      logger: (m: { status: string; progress: number }) => {
        console.log(`[Tesseract] ${m.status} ${(m.progress * 100).toFixed(0)}%`);
      },
    });
    console.log('[Tesseract] Worker ready');
  }
  return tesseractWorker;
}

/**
 * ALWAYS uses OCR for every page. No text layer extraction.
 * PDF pages are rendered to canvas images, then Tesseract OCR processes them.
 */
export async function extractTextFromPdf(
  file: File,
  caseId: string,
  evidenceKey: string,
  onProgress?: ProgressCallback,
): Promise<DocumentText> {
  // Delete old result first
  await db.documentTexts.delete(`${caseId}/${evidenceKey}`);

  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer) }).promise;
  const totalPages = pdf.numPages;
  const pages: PageText[] = [];

  // Init Tesseract worker up front (downloads language data)
  onProgress?.({ page: 0, totalPages, status: 'init' });
  const worker = await getWorker();

  for (let i = 1; i <= totalPages; i++) {
    onProgress?.({ page: i, totalPages, status: 'ocr' });
    try {
      const blob = await renderPageToBlob(pdf, i);
      console.log(`[OCR] Page ${i}: blob size ${blob.size} bytes`);

      const { data } = await worker.recognize(blob);
      console.log(`[OCR] Page ${i}: text length ${data.text.length}, confidence ${data.confidence}`);

      pages.push({ pageNum: i, text: data.text.trim(), method: 'ocr', confidence: data.confidence });
      onProgress?.({ page: i, totalPages, status: 'done' });
    } catch (err) {
      console.error(`[OCR] Page ${i} FAILED:`, err);
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
