import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const recognizeMock = vi.fn();
const terminateMock = vi.fn();
const createWorkerMock = vi.fn();

vi.mock('tesseract.js', () => ({
  createWorker: (lang: string) => createWorkerMock(lang)
}));

async function loadFreshService() {
  vi.resetModules();
  return await import('./ocrImport');
}

function makeFile(size: number, name = 'shot.png'): File {
  const data = new Uint8Array(size);
  return new File([data], name, { type: 'image/png' });
}

describe('extractTextFromImage', () => {
  beforeEach(() => {
    recognizeMock.mockReset();
    terminateMock.mockReset();
    createWorkerMock.mockReset();
    createWorkerMock.mockImplementation(async () => ({
      recognize: recognizeMock,
      terminate: terminateMock
    }));
    recognizeMock.mockResolvedValue({
      data: { text: 'Sample text', confidence: 87 }
    });
  });

  afterEach(() => {
    vi.resetModules();
  });

  it('rejects files larger than 5MB before invoking the worker', async () => {
    const { extractTextFromImage } = await loadFreshService();
    const big = makeFile(5 * 1024 * 1024 + 1);

    await expect(extractTextFromImage(big)).rejects.toThrow(/too large/i);
    expect(createWorkerMock).not.toHaveBeenCalled();
    expect(recognizeMock).not.toHaveBeenCalled();
  });

  it('returns OCR text and normalised confidence (0–1)', async () => {
    const { extractTextFromImage } = await loadFreshService();
    const file = makeFile(1024);

    const result = await extractTextFromImage(file);

    expect(result.text).toBe('Sample text');
    expect(result.confidence).toBeCloseTo(0.87, 5);
  });

  it('lazy-initialises the worker once and reuses it across calls', async () => {
    const { extractTextFromImage } = await loadFreshService();
    const file = makeFile(1024);

    await extractTextFromImage(file);
    await extractTextFromImage(file);
    await extractTextFromImage(file);

    expect(createWorkerMock).toHaveBeenCalledTimes(1);
    expect(recognizeMock).toHaveBeenCalledTimes(3);
  });

  it('rethrows when the worker recognise call throws', async () => {
    recognizeMock.mockRejectedValue(new Error('OCR boom'));
    const { extractTextFromImage } = await loadFreshService();
    const file = makeFile(1024);

    await expect(extractTextFromImage(file)).rejects.toThrow(/OCR boom/);
  });
});
