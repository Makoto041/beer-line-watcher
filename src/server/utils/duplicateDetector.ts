/**
 * Event duplicate detection using string similarity
 * No external AI API required - uses local algorithms
 */

interface EventCandidate {
  title: string;
  url: string;
  eventDate?: Date;
  sourceId: string;
}

/**
 * Normalize text for comparison
 * - Convert to lowercase
 * - Remove special characters and extra spaces
 * - Normalize Japanese characters
 */
function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .replace(/[\s\u3000]+/g, " ") // Normalize whitespace (including Japanese space)
    .replace(/[【】「」『』（）()［］\[\]]/g, "") // Remove brackets
    .replace(/[、。！？!?,.：:@＠]/g, "") // Remove punctuation
    .replace(/第(\d+)回/g, "$1") // Normalize "第N回" to just number
    .replace(/ビアフェス|ビールフェス|ビールフェスティバル|beer\s*fest(?:ival)?/gi, "ビアフェス")
    .replace(/オクトーバーフェスト|oktoberfest/gi, "オクトーバーフェスト")
    // Remove location prefixes like "神奈川：" or "東京："
    .replace(/^(東京|神奈川|大阪|愛知|福岡|北海道|埼玉|千葉|兵庫|京都|静岡|広島|宮城)[：:]?\s*/g, "")
    // Remove venue suffixes like "@横浜大さん橋ホール"
    .replace(/@.+$/, "")
    .trim();
}

/**
 * Extract key terms from event title for comparison
 */
function extractKeyTerms(title: string): Set<string> {
  const normalized = normalizeText(title);
  const terms = new Set<string>();

  // Extract location keywords (common Tokyo areas)
  const locations = [
    "渋谷", "新宿", "池袋", "六本木", "銀座", "恵比寿", "代官山",
    "横浜", "みなとみらい", "大阪", "梅田", "難波", "名古屋", "福岡",
    "札幌", "神戸", "京都", "広島", "仙台", "お台場", "豊洲", "日比谷"
  ];
  for (const loc of locations) {
    if (normalized.includes(loc)) {
      terms.add(loc);
    }
  }

  // Extract event type keywords
  const eventTypes = [
    "ビアフェス", "ビアガーデン", "オクトーバーフェスト", "クラフトビール",
    "地ビール", "ブルワリー", "醸造", "試飲", "飲み比べ", "タップ",
    "フェスティバル", "フェス", "祭", "マルシェ", "フェア",
    // English event names
    "brewers cup", "ブルワーズカップ", "japan brewers", "beer week",
    "craft beer", "beer festival", "beer garden"
  ];
  for (const type of eventTypes) {
    if (normalized.includes(type)) {
      terms.add(type);
    }
  }

  // Extract well-known event names as a whole
  const knownEvents = [
    "japan brewers cup", "ジャパンブルワーズカップ",
    "けやきひろば", "大江戸ビール祭り", "よこはまビール祭り",
    "ビアフェス信越", "ビアフェス横浜", "クラフトビア横浜"
  ];
  for (const event of knownEvents) {
    if (normalized.includes(event)) {
      terms.add(event);
    }
  }

  // Extract numbers (often year or edition)
  const numbers = normalized.match(/\d+/g);
  if (numbers) {
    numbers.forEach((n) => terms.add(n));
  }

  return terms;
}

/**
 * Calculate Jaccard similarity between two sets
 */
function jaccardSimilarity(set1: Set<string>, set2: Set<string>): number {
  if (set1.size === 0 && set2.size === 0) return 1;
  if (set1.size === 0 || set2.size === 0) return 0;

  const intersection = new Set([...set1].filter((x) => set2.has(x)));
  const union = new Set([...set1, ...set2]);

  return intersection.size / union.size;
}

/**
 * Calculate simple character-based similarity (bigram)
 */
function bigramSimilarity(s1: string, s2: string): number {
  const getBigrams = (s: string): Set<string> => {
    const bigrams = new Set<string>();
    for (let i = 0; i < s.length - 1; i++) {
      bigrams.add(s.slice(i, i + 2));
    }
    return bigrams;
  };

  const bigrams1 = getBigrams(normalizeText(s1));
  const bigrams2 = getBigrams(normalizeText(s2));

  return jaccardSimilarity(bigrams1, bigrams2);
}

/**
 * Check if two events are on the same date (or within a close range)
 */
function isSameDate(date1?: Date, date2?: Date): boolean {
  if (!date1 || !date2) return false;

  // Same day
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  );
}

/**
 * Check if one normalized title contains the other (substring match)
 */
function containsOther(title1: string, title2: string): boolean {
  const norm1 = normalizeText(title1);
  const norm2 = normalizeText(title2);
  // One title is substantially contained in the other
  return norm1.includes(norm2) || norm2.includes(norm1);
}

/**
 * Check if two events are likely duplicates
 * Returns a confidence score between 0 and 1
 */
export function calculateDuplicateScore(
  event1: EventCandidate,
  event2: EventCandidate
): number {
  // Same source = not considered duplicate (already deduped within source)
  if (event1.sourceId === event2.sourceId) return 0;

  // If one title contains the other (after normalization), check dates
  if (containsOther(event1.title, event2.title)) {
    // If dates match, definitely duplicate
    if (isSameDate(event1.eventDate, event2.eventDate)) {
      return 0.9;
    }
    // If one date is missing, still consider it a likely duplicate
    if (!event1.eventDate || !event2.eventDate) {
      return 0.7;
    }
    // Both dates present but different - probably different events (annual, different city)
    // Return low score to avoid false positives
    return 0.4;
  }

  // Calculate term similarity
  const terms1 = extractKeyTerms(event1.title);
  const terms2 = extractKeyTerms(event2.title);
  const termSimilarity = jaccardSimilarity(terms1, terms2);

  // Calculate bigram similarity
  const titleSimilarity = bigramSimilarity(event1.title, event2.title);

  // Date match bonus
  const dateMatch = isSameDate(event1.eventDate, event2.eventDate) ? 0.2 : 0;

  // Combined score (weighted average)
  const score =
    termSimilarity * 0.4 + // Key terms are important
    titleSimilarity * 0.4 + // Title similarity
    dateMatch; // Date match bonus

  return Math.min(score, 1);
}

/**
 * Find duplicate events in a list
 * Returns events with duplicates marked
 */
export function findDuplicates(
  events: EventCandidate[],
  threshold: number = 0.6
): Array<EventCandidate & { duplicateOf?: string; score?: number }> {
  const result: Array<EventCandidate & { duplicateOf?: string; score?: number }> = [];
  const processed: EventCandidate[] = [];

  for (const event of events) {
    let isDuplicate = false;
    let bestMatch: { event: EventCandidate; score: number } | null = null;

    for (const existing of processed) {
      const score = calculateDuplicateScore(event, existing);
      if (score >= threshold) {
        if (!bestMatch || score > bestMatch.score) {
          bestMatch = { event: existing, score };
        }
        isDuplicate = true;
      }
    }

    if (isDuplicate && bestMatch) {
      result.push({
        ...event,
        duplicateOf: bestMatch.event.title,
        score: bestMatch.score,
      });
    } else {
      result.push(event);
      processed.push(event);
    }
  }

  return result;
}

/**
 * Filter out duplicate events, keeping only unique ones
 * Priority: beergirl-calendar > walkerplus > beerfestival > alwayslovebeer
 */
export function removeDuplicates(
  events: EventCandidate[],
  threshold: number = 0.6
): EventCandidate[] {
  // Sort by priority (lower index = higher priority)
  const priorityOrder = [
    "beergirl-calendar",
    "walkerplus-liquor-kanto",
    "beerfestival-info",
    "alwayslovebeer-calendar",
  ];

  const sortedEvents = [...events].sort((a, b) => {
    const priorityA = priorityOrder.indexOf(a.sourceId);
    const priorityB = priorityOrder.indexOf(b.sourceId);
    return (
      (priorityA === -1 ? 999 : priorityA) -
      (priorityB === -1 ? 999 : priorityB)
    );
  });

  const unique: EventCandidate[] = [];

  for (const event of sortedEvents) {
    let isDuplicate = false;

    for (const existing of unique) {
      const score = calculateDuplicateScore(event, existing);
      if (score >= threshold) {
        console.log(
          `Duplicate detected (${(score * 100).toFixed(1)}%): "${event.title}" ≈ "${existing.title}"`
        );
        isDuplicate = true;
        break;
      }
    }

    if (!isDuplicate) {
      unique.push(event);
    }
  }

  console.log(
    `Duplicate removal: ${events.length} events -> ${unique.length} unique`
  );

  return unique;
}
