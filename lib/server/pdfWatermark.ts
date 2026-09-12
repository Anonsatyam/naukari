import { PDFDocument, StandardFonts, degrees, rgb } from "pdf-lib";

const WATERMARK_TEXT = "Sarkari Naukri - naukari-lac.vercel.app";

export async function watermarkPdf(bytes: ArrayBuffer | Uint8Array): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.load(bytes, { ignoreEncryption: true });
  const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const fontSize = 16;
  const textWidth = font.widthOfTextAtSize(WATERMARK_TEXT, fontSize);
  const stepX = textWidth + 70;
  const stepY = 130;

  for (const page of pdfDoc.getPages()) {
    const { width, height } = page.getSize();
    for (let y = -height; y < height * 1.5; y += stepY) {
      for (let x = -width; x < width * 1.5; x += stepX) {
        page.drawText(WATERMARK_TEXT, {
          x,
          y,
          size: fontSize,
          font,
          color: rgb(0.5, 0.5, 0.5),
          opacity: 0.16,
          rotate: degrees(45),
        });
      }
    }
  }

  return pdfDoc.save();
}
