/**
 * Region filter for LINE event delivery.
 *
 * Events carry no structured location, so the region is inferred from the
 * title. Policy (per product decision):
 *  - Keep events detectably in the Kanto area.
 *  - Keep events with NO detectable region (lenient — don't drop unknowns).
 *  - Drop events clearly in another region (Hokkaido, Osaka, Nagoya, ...),
 *    UNLESS they also mention a Kanto location (e.g. a multi-city tour that
 *    includes Tokyo).
 *
 * This is applied to LINE deliveries only (cron notifications + webhook
 * event replies). The website event list is intentionally left nationwide.
 */

// Keywords that mark an event as Kanto. If any is present the event is kept,
// even when an other-region keyword also appears.
// NOTE: "東京" must be detected here so that "東京都" is never mistaken for
// "京都" (Kyoto) by the other-region list below.
const KANTO_KEYWORDS = [
  // Prefectures / region
  "東京", "関東", "首都圏", "神奈川", "埼玉", "千葉", "茨城", "栃木", "群馬",
  // Major Kanto cities / areas
  "横浜", "川崎", "みなとみらい", "大宮", "浦和", "渋谷", "新宿", "池袋",
  "六本木", "銀座", "恵比寿", "代官山", "お台場", "豊洲", "日比谷", "上野",
  "秋葉原", "品川", "立川", "吉祥寺", "町田", "鎌倉", "横須賀", "柏",
  "船橋", "高崎", "宇都宮", "つくば",
];

// Keywords that mark an event as clearly NOT Kanto.
const OTHER_REGION_KEYWORDS = [
  // Hokkaido / Tohoku
  "北海道", "札幌", "青森", "岩手", "宮城", "仙台", "秋田", "山形", "福島",
  // Chubu / Koshinetsu / Tokai
  "新潟", "富山", "石川", "金沢", "福井", "山梨", "長野", "岐阜", "静岡",
  "愛知", "名古屋",
  // Kansai
  "三重", "滋賀", "京都", "大阪", "梅田", "難波", "心斎橋", "兵庫", "神戸",
  "奈良", "和歌山",
  // Chugoku / Shikoku
  "鳥取", "島根", "岡山", "広島", "山口", "徳島", "香川", "愛媛", "高知",
  // Kyushu / Okinawa
  "福岡", "博多", "佐賀", "長崎", "熊本", "大分", "宮崎", "鹿児島", "沖縄", "那覇",
];

/**
 * Whether an event should be delivered over LINE based on its title region.
 */
export function isDeliverableRegion(title: string): boolean {
  if (!title) return true; // no title to judge → keep (lenient)
  const hasKanto = KANTO_KEYWORDS.some((k) => title.includes(k));
  if (hasKanto) return true; // Kanto detected → keep
  const hasOther = OTHER_REGION_KEYWORDS.some((k) => title.includes(k));
  return !hasOther; // unknown → keep; clearly another region → drop
}

/**
 * Filter a list of title-bearing items down to deliverable (Kanto/unknown) ones.
 */
export function filterDeliverableByRegion<T extends { title: string }>(
  items: T[]
): T[] {
  return items.filter((item) => isDeliverableRegion(item.title));
}
