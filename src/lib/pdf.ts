import { truncateText } from "./utils";

export async function extractTextFromPDF(buffer: Buffer): Promise<string> {
  // Dynamic import to avoid issues with edge runtime
  const pdfParse = (await import("pdf-parse")).default;

  const data = await pdfParse(buffer, {
    // Limit parsing to first 200 pages for performance
    max: 200,
  });

  const text = data.text.trim();

  if (!text || text.length < 50) {
    throw new Error(
      "Could not extract meaningful text from this PDF. It may be a scanned image or password-protected."
    );
  }

  // Truncate to avoid AI token limits (~120k chars ≈ ~30k tokens)
  return truncateText(text, 120000);
}
