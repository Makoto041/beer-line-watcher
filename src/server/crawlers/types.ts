// クロールタイプ定義

export type CrawledItem = {
  externalId: string; // URLなど一意キー
  title: string;
  url: string;
  sourceId: string;
  eventDate?: Date; // イベント開催日（オプション）
  eventEndDate?: Date; // イベント終了日（複数日イベント用）
};
