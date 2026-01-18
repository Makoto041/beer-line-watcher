/**
 * Date utilities with JST (Japan Standard Time) support
 * All date comparisons use JST to ensure consistency between server and client
 */

const JST_OFFSET = 9 * 60; // JST is UTC+9

/**
 * Get current time in JST
 */
export function getNowJST(): Date {
  const now = new Date();
  const utc = now.getTime() + now.getTimezoneOffset() * 60000;
  return new Date(utc + JST_OFFSET * 60000);
}

/**
 * Convert a date to JST
 */
export function toJST(date: Date): Date {
  const utc = date.getTime() + date.getTimezoneOffset() * 60000;
  return new Date(utc + JST_OFFSET * 60000);
}

/**
 * Get start of today in JST (00:00:00)
 */
export function getStartOfTodayJST(): Date {
  const jstNow = getNowJST();
  jstNow.setHours(0, 0, 0, 0);
  return jstNow;
}

/**
 * Get the date part only (year, month, day) in JST for comparison
 * Returns the number of days since epoch in JST
 */
export function getJSTDateValue(date: Date): number {
  const jst = toJST(date);
  return Math.floor(jst.getTime() / (1000 * 60 * 60 * 24));
}

/**
 * Calculate days difference between event date and today in JST
 */
export function getDaysFromTodayJST(eventDate: Date): number {
  const todayValue = getJSTDateValue(new Date());
  const eventValue = getJSTDateValue(eventDate);
  return eventValue - todayValue;
}

/**
 * Check event status based on days from today (in JST)
 * For multi-day events, considers the full date range:
 * - 'today': Event is happening today (start <= today <= end)
 * - 'soon': Event starts within 3 days
 * - 'upcoming': Event starts within 7 days
 * - null: Event is in the past or more than 7 days away
 */
export function getEventStatusJST(
  eventDate: Date | null,
  eventEndDate?: Date | null
): 'today' | 'soon' | 'upcoming' | null {
  if (!eventDate) return null;

  const startDiffDays = getDaysFromTodayJST(eventDate);
  const endDiffDays = eventEndDate ? getDaysFromTodayJST(eventEndDate) : startDiffDays;

  // For multi-day events: if today is between start and end, it's happening today
  if (startDiffDays <= 0 && endDiffDays >= 0) return 'today';

  // Single day or future events
  if (startDiffDays === 0) return 'today';
  if (startDiffDays > 0 && startDiffDays <= 3) return 'soon';
  if (startDiffDays > 0 && startDiffDays <= 7) return 'upcoming';
  return null;
}

/**
 * Format date for display (in JST)
 */
export function formatDateJST(date: Date): { month: number; day: number; weekday: string; full: string } {
  const jst = toJST(date);
  const weekdays = ['日', '月', '火', '水', '木', '金', '土'];
  return {
    month: jst.getMonth() + 1,
    day: jst.getDate(),
    weekday: weekdays[jst.getDay()] ?? '',
    full: `${jst.getMonth() + 1}月${jst.getDate()}日(${weekdays[jst.getDay()]})`,
  };
}

/**
 * Format datetime for display (in JST)
 */
export function formatDateTimeJST(date: Date): string {
  const jst = toJST(date);
  const month = jst.getMonth() + 1;
  const day = jst.getDate();
  const hours = jst.getHours().toString().padStart(2, '0');
  const minutes = jst.getMinutes().toString().padStart(2, '0');
  return `${month}/${day} ${hours}:${minutes}`;
}

/**
 * Format date range for multi-day events (in JST)
 * Returns a compact representation: "1/24-26" or "1/24-2/5" for cross-month
 */
export function formatDateRangeJST(
  startDate: Date,
  endDate: Date | null | undefined
): { start: string; end: string | null; range: string } {
  const start = formatDateJST(startDate);
  const startStr = `${start.month}/${start.day}`;

  if (!endDate) {
    return { start: startStr, end: null, range: startStr };
  }

  const end = formatDateJST(endDate);
  const endStr = `${end.month}/${end.day}`;

  // Same month: "1/24-26"
  if (start.month === end.month) {
    return {
      start: startStr,
      end: endStr,
      range: `${start.month}/${start.day}-${end.day}`,
    };
  }

  // Different months: "1/24-2/5"
  return {
    start: startStr,
    end: endStr,
    range: `${startStr}-${endStr}`,
  };
}
