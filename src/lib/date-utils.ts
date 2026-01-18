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
 */
export function getEventStatusJST(eventDate: Date | null): 'today' | 'soon' | 'upcoming' | null {
  if (!eventDate) return null;

  const diffDays = getDaysFromTodayJST(eventDate);

  if (diffDays === 0) return 'today';
  if (diffDays > 0 && diffDays <= 3) return 'soon';
  if (diffDays > 0 && diffDays <= 7) return 'upcoming';
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
