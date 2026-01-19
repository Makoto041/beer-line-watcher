import type { CrawledItem } from "./types";
import { fetchOgImagesForUrls } from "../utils/ogImageFetcher";

const SOURCE_ID = "beergirl-calendar";
const CALENDAR_ID = "c_dqr8sohvevefk6cc4pndppmv6c@group.calendar.google.com";
const ICAL_URL = `https://calendar.google.com/calendar/ical/${encodeURIComponent(CALENDAR_ID)}/public/basic.ics`;

/**
 * Parse iCal date string to JavaScript Date
 * Supports formats: YYYYMMDD and YYYYMMDDTHHmmssZ
 */
function parseICalDate(dateStr: string): Date | null {
  // Remove VALUE=DATE: prefix if present
  const cleanDate = dateStr.replace(/VALUE=DATE:/, "").trim();

  // Format: YYYYMMDD
  if (/^\d{8}$/.test(cleanDate)) {
    const year = parseInt(cleanDate.substring(0, 4));
    const month = parseInt(cleanDate.substring(4, 6)) - 1; // JS months are 0-indexed
    const day = parseInt(cleanDate.substring(6, 8));
    return new Date(year, month, day);
  }

  // Format: YYYYMMDDTHHmmssZ (ISO-like with optional time and Z suffix)
  if (/^\d{8}T\d{6}Z?$/.test(cleanDate)) {
    const year = parseInt(cleanDate.substring(0, 4));
    const month = parseInt(cleanDate.substring(4, 6)) - 1;
    const day = parseInt(cleanDate.substring(6, 8));

    // Extract time portion (HHmmss) after the 'T'
    const hour = parseInt(cleanDate.substring(9, 11)) || 0;
    const minute = parseInt(cleanDate.substring(11, 13)) || 0;
    const second = parseInt(cleanDate.substring(13, 15)) || 0;

    // Check if string ends with 'Z' (UTC indicator)
    const isUTC = cleanDate.endsWith('Z');

    if (isUTC) {
      // Create UTC timestamp
      return new Date(Date.UTC(year, month, day, hour, minute, second));
    } else {
      // Create local time
      return new Date(year, month, day, hour, minute, second);
    }
  }

  return null;
}

/**
 * Unfold iCal lines according to RFC 5545
 * Lines that start with a space or tab are continuation lines
 * and should be appended to the previous line
 */
function unfoldICalLines(text: string): string {
  const lines = text.split("\n");
  const unfolded: string[] = [];

  for (const line of lines) {
    // Check if line starts with space or tab (continuation line)
    if (line.length > 0 && (line[0] === " " || line[0] === "\t")) {
      // Append to previous line, removing the leading space/tab
      if (unfolded.length > 0) {
        unfolded[unfolded.length - 1] += line.substring(1);
      }
    } else {
      // Normal line, add to array
      unfolded.push(line);
    }
  }

  return unfolded.join("\n");
}

/**
 * Parse iCal format and extract events
 */
function parseICalEvents(icalText: string): CrawledItem[] {
  const items: CrawledItem[] = [];
  const events = icalText.split("BEGIN:VEVENT");

  for (const eventBlock of events.slice(1)) {
    // Skip first empty split
    try {
      // Unfold continuation lines before parsing
      const unfoldedBlock = unfoldICalLines(eventBlock);
      const lines = unfoldedBlock.split("\n");
      let summary = "";
      let dtstart = "";
      let dtend = "";
      let description = "";
      let uid = "";
      let recurrenceId = "";

      for (const line of lines) {
        const trimmed = line.trim();

        if (trimmed.startsWith("SUMMARY:")) {
          summary = trimmed.substring(8).trim();
        } else if (trimmed.startsWith("DTSTART")) {
          // Handle both DTSTART:20240101 and DTSTART;VALUE=DATE:20240101
          const colonIndex = trimmed.indexOf(":");
          if (colonIndex > 0) {
            dtstart = trimmed.substring(colonIndex + 1).trim();
          }
        } else if (trimmed.startsWith("DTEND")) {
          // Handle DTEND:20240102 and DTEND;VALUE=DATE:20240102
          const colonIndex = trimmed.indexOf(":");
          if (colonIndex > 0) {
            dtend = trimmed.substring(colonIndex + 1).trim();
          }
        } else if (trimmed.startsWith("DESCRIPTION:")) {
          description = trimmed.substring(12).trim();
        } else if (trimmed.startsWith("UID:")) {
          uid = trimmed.substring(4).trim();
        } else if (trimmed.startsWith("RECURRENCE-ID")) {
          // Handle RECURRENCE-ID:20240101 and RECURRENCE-ID;TZID=...:...
          const colonIndex = trimmed.indexOf(":");
          if (colonIndex > 0) {
            recurrenceId = trimmed.substring(colonIndex + 1).trim();
          }
        }
      }

      if (!summary || !uid) continue;

      // Create unique external ID by combining UID and RECURRENCE-ID (if present)
      // This ensures recurring event instances are treated as separate events
      const externalId = recurrenceId ? `${uid}::${recurrenceId}` : uid;

      // Extract URL from description (format: <a href="URL">...</a>)
      let url = "";
      const urlMatch = description.match(/<a\s+href="([^"]+)"/i);
      if (urlMatch && urlMatch[1]) {
        url = urlMatch[1];
      }

      // If no URL in description, create a fallback URL
      if (!url) {
        url = `https://beergirl.net/beer-event-matome-2017_e/#${uid}`;
      }

      // Parse event dates
      const eventDate = dtstart ? parseICalDate(dtstart) : null;
      const eventEndDate = dtend ? parseICalDate(dtend) : null;

      // Only include future events or events from the last 30 days
      if (eventDate) {
        const now = new Date();
        const thirtyDaysAgo = new Date(
          now.getTime() - 30 * 24 * 60 * 60 * 1000
        );
        if (eventDate < thirtyDaysAgo) {
          continue; // Skip old events
        }
      }

      // For all-day multi-day events, adjust end date (iCal DTEND is exclusive for VALUE=DATE)
      // e.g., 1/24-1/26 event has DTEND=1/27, so subtract 1 day
      // Only apply this for date-only values (YYYYMMDD), not for timed events (YYYYMMDDTHHmmss)
      let adjustedEndDate = eventEndDate;
      const isDateOnly = dtend && /^\d{8}$/.test(dtend);
      if (isDateOnly && eventDate && eventEndDate && eventEndDate > eventDate) {
        adjustedEndDate = new Date(eventEndDate.getTime() - 24 * 60 * 60 * 1000);
        // Only keep end date if it's different from start date
        if (adjustedEndDate.getTime() === eventDate.getTime()) {
          adjustedEndDate = null;
        }
      }

      items.push({
        externalId,
        title: summary,
        url,
        sourceId: SOURCE_ID,
        eventDate: eventDate || undefined,
        eventEndDate: adjustedEndDate || undefined,
      });
    } catch (error) {
      console.error("Error parsing event block:", error);
      continue;
    }
  }

  return items;
}

/**
 * Crawl Beergirl Google Calendar
 */
export async function crawlBeergirlCalendar(): Promise<CrawledItem[]> {
  try {
    console.log(`Fetching calendar from: ${ICAL_URL}`);
    const res = await fetch(ICAL_URL);

    if (!res.ok) {
      console.error("Calendar fetch error", res.status);
      return [];
    }

    const icalText = await res.text();
    const items = parseICalEvents(icalText);

    console.log(`Parsed ${items.length} events from Google Calendar`);

    // 各イベントページからOGP画像を取得
    try {
      const urls = items.map((item) => item.url);
      const ogImages = await fetchOgImagesForUrls(urls, 3);

      for (const item of items) {
        const ogImage = ogImages.get(item.url);
        if (ogImage) {
          item.imageUrl = ogImage;
        }
      }
      console.log(`Fetched OG images for ${ogImages.size} events`);
    } catch (error) {
      console.error("Error fetching OG images:", error);
    }

    return items;
  } catch (error) {
    console.error("Error crawling Beergirl calendar:", error);
    return [];
  }
}
