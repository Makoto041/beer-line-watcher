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
  const today = new Date();
  const startOfToday = new Date(today);
  startOfToday.setHours(0, 0, 0, 0);

  // Pattern: YYYY年MM月DD日
  const pattern1 = /(\d{4})年(\d{1,2})月(\d{1,2})日/;
  const match1 = text.match(pattern1);
  if (match1 && match1[1] && match1[2] && match1[3]) {
    const year = parseInt(match1[1]);
    const month = parseInt(match1[2]) - 1; // JavaScript months are 0-indexed
    const day = parseInt(match1[3]);
    return new Date(year, month, day);
  }

  // Pattern: MM月DD日
  const pattern2 = /(\d{1,2})月(\d{1,2})日/;
  const match2 = text.match(pattern2);
  if (match2 && match2[1] && match2[2]) {
    const month = parseInt(match2[1]) - 1;
    const day = parseInt(match2[2]);
    let year = currentYear;
    const candidate = new Date(year, month, day);
    candidate.setHours(0, 0, 0, 0);

    // 年越しをまたぐ場合は翌年扱いにする（すでに今年の日付が過ぎている場合）
    if (candidate < startOfToday) {
      year = currentYear + 1;
    }

    return new Date(year, month, day);
  }

  // Pattern: YYYY/MM/DD
  const pattern3 = /(\d{4})\/(\d{1,2})\/(\d{1,2})/;
  const match3 = text.match(pattern3);
  if (match3 && match3[1] && match3[2] && match3[3]) {
    const year = parseInt(match3[1]);
    const month = parseInt(match3[2]) - 1;
    const day = parseInt(match3[3]);
    return new Date(year, month, day);
  }

  // Pattern: MM/DD
  const pattern4 = /(\d{1,2})\/(\d{1,2})/;
  const match4 = text.match(pattern4);
  if (match4 && match4[1] && match4[2]) {
    const month = parseInt(match4[1]) - 1;
    const day = parseInt(match4[2]);
    let year = currentYear;
    const candidate = new Date(year, month, day);
    candidate.setHours(0, 0, 0, 0);

    if (candidate < startOfToday) {
      year = currentYear + 1;
    }

    return new Date(year, month, day);
  }

  return null;
}
