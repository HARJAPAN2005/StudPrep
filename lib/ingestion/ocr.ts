/**
 * OCR Fallback Interface & Provider Registry
 *
 * Provides an extensible plug-in interface for optical character recognition (OCR)
 * when scanned, photograph-based, or low-text density PDFs are detected during extraction.
 *
 * @module lib/ingestion/ocr
 */

export interface OcrPageResult {
  pageNumber: number;
  text: string;
  confidence: number;
  wordCount: number;
  provider: string;
}

export interface OcrProvider {
  readonly name: string;
  isAvailable(): boolean;
  extractPage(
    imageOrPdfBuffer: Buffer | Uint8Array,
    pageNumber: number
  ): Promise<OcrPageResult>;
}

/**
 * Standard Fallback / Mock OCR Provider
 * Ready to be connected to Google Cloud Vision, Tesseract, or Gemini Multimodal OCR.
 */
export class StubOcrProvider implements OcrProvider {
  readonly name = "stub-ocr-provider";

  isAvailable(): boolean {
    return true;
  }

  async extractPage(
    _imageOrPdfBuffer: Buffer | Uint8Array,
    pageNumber: number
  ): Promise<OcrPageResult> {
    // Stub implementation returning synthesized OCR content for scanned documents
    const text = `[OCR Transcribed Text for Page ${pageNumber}]: Scanned diagram and syllabus notes recorded without native digital text streams.`;
    const words = text.split(/\s+/).filter(Boolean);

    return {
      pageNumber,
      text,
      confidence: 0.92,
      wordCount: words.length,
      provider: this.name,
    };
  }
}

let activeOcrProvider: OcrProvider = new StubOcrProvider();

/**
 * Gets the currently registered OCR provider.
 */
export function getOcrProvider(): OcrProvider {
  return activeOcrProvider;
}

/**
 * Registers a custom OCR provider (e.g. Google Cloud Vision or Tesseract).
 */
export function registerOcrProvider(provider: OcrProvider): void {
  activeOcrProvider = provider;
}

