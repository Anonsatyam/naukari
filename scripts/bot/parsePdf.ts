import { PDFParse } from "pdf-parse";

/**
 * Extracts raw text from a PDF buffer. Returns an empty string (not a
 * throw) on failure — scanned/image-only PDFs have no extractable text
 * at all, and some PDFs are just malformed. Either way, the caller
 * should treat "no text" as "no structured fields available," not as
 * a fatal error for the whole bot run.
 */
export async function extractPdfText(buffer: Buffer): Promise<string> {
  const parser = new PDFParse({ data: buffer });
  try {
    const result = await parser.getText();
    return result.text ?? "";
  } catch {
    return "";
  } finally {
    await parser.destroy();
  }
}
