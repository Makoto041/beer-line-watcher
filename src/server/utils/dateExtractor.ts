/**
 * Extract date from text (e.g., title or description)
 * Supports formats like:
 * - "2025年11月9日"
 * - "11月9日"
 * - "11/9"
 * - "2025/11/9"
 */
export function extractDateFromText(text: string): Date | null {
  const currentYear = new Date().getFullYear();

  // Pattern: YYYY年MM月DD日
  const pattern1 = /(\d{4})年(\d{1,2})月(\d{1,2})日/;
  const match1 = text.match(pattern1);
  if (match1) {
    const year = parseInt(match1[1]);
    const month = parseInt(match1[2]) - 1; // JavaScript months are 0-indexed
    const day = parseInt(match1[3]);
    return new Date(year, month, day);
  }

  // Pattern: MM月DD日
  const pattern2 = /(\d{1,2})月(\d{1,2})日/;
  const match2 = text.match(pattern2);
  if (match2) {
    const month = parseInt(match2[1]) - 1;
    const day = parseInt(match2[2]);
    return new Date(currentYear, month, day);
  }

  // Pattern: YYYY/MM/DD
  const pattern3 = /(\d{4})\/(\d{1,2})\/(\d{1,2})/;
  const match3 = text.match(pattern3);
  if (match3) {
    const year = parseInt(match3[1]);
    const month = parseInt(match3[2]) - 1;
    const day = parseInt(match3[3]);
    return new Date(year, month, day);
  }

  // Pattern: MM/DD
  const pattern4 = /(\d{1,2})\/(\d{1,2})/;
  const match4 = text.match(pattern4);
  if (match4) {
    const month = parseInt(match4[1]) - 1;
    const day = parseInt(match4[2]);
    return new Date(currentYear, month, day);
  }

  return null;
}
