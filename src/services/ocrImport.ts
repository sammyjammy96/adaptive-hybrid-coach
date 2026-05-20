import { createWorker } from 'tesseract.js';

export interface OcrResult {
  text: string;
  /** Normalised to 0–1. Tesseract returns 0–100. */
  confidence: number;
}

const MAX_BYTES = 5 * 1024 * 1024;

type TesseractWorker = Awaited<ReturnType<typeof createWorker>>;

let workerPromise: Promise<TesseractWorker> | null = null;

function getWorker(): Promise<TesseractWorker> {
  if (!workerPromise) {
    workerPromise = createWorker('eng');
  }
  return workerPromise;
}

export async function extractTextFromImage(file: File): Promise<OcrResult> {
  if (file.size > MAX_BYTES) {
    throw new Error('Image too large (5MB max).');
  }
  const worker = await getWorker();
  const { data } = await worker.recognize(file);
  return {
    text: data.text ?? '',
    confidence: typeof data.confidence === 'number' ? data.confidence / 100 : 0
  };
}
