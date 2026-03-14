import { PDFParse } from "pdf-parse";

/**
 * Extract text from a PDF buffer using pdf-parse v2.
 */
export async function extractTextFromPDF(buffer: Buffer): Promise<string> {
  const parser = new PDFParse({ data: new Uint8Array(buffer) });
  const result = await parser.getText();
  return result.text;
}

/**
 * Split text into overlapping chunks for better LLM context.
 * Uses 1000-character chunks with 200-character overlap to prevent
 * context loss at chunk boundaries.
 */
export function chunkText(
  text: string,
  chunkSize: number = 1000,
  overlap: number = 200
): string[] {
  const chunks: string[] = [];
  const cleanedText = text.replace(/\s+/g, " ").trim();

  if (cleanedText.length <= chunkSize) {
    return [cleanedText];
  }

  let start = 0;
  while (start < cleanedText.length) {
    const end = Math.min(start + chunkSize, cleanedText.length);
    const chunk = cleanedText.slice(start, end).trim();

    if (chunk.length > 0) {
      chunks.push(chunk);
    }

    // Move forward by (chunkSize - overlap) to create overlapping windows
    start += chunkSize - overlap;
  }

  return chunks;
}
