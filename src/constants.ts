/**
 * 監視対象の設定定数
 * URL、キーワードを定義し、新しい監視対象を簡単に追加できるように管理
 */

// 監視対象キーワード
export const MONITORED_KEYWORDS = [
  '問題',
  'エラー',
  '障害',
  'バグ',
  '不具合',
  '緊急',
  'ヘルプ',
  'サポート'
] as const;

// 監視対象URL（危険なサイトやスパムサイトなど）
export const MONITORED_URLS = [
  'example-suspicious-site.com',
  'spam-site.net',
  'malicious-domain.org',
  'phishing-example.com'
] as const;

// 監視設定
export const MONITOR_CONFIG = {
  // キーワードマッチング設定
  CASE_SENSITIVE: false, // 大文字小文字を区別するか
  PARTIAL_MATCH: true,   // 部分一致を許可するか
  
  // URL監視設定
  CHECK_FULL_URL: true,  // 完全なURLをチェックするか
  CHECK_DOMAIN_ONLY: true, // ドメイン名のみをチェックするか
  
  // 通知設定
  SLACK_CHANNEL: process.env.SLACK_CHANNEL || '#alerts',
  NOTIFICATION_TEMPLATE: {
    KEYWORD: '⚠️ 監視対象キーワードが検出されました',
    URL: '🚨 注意すべきURLが検出されました'
  }
} as const;

// 監視ルールの型定義
export type MonitoredKeyword = typeof MONITORED_KEYWORDS[number];
export type MonitoredUrl = typeof MONITORED_URLS[number];

export interface DetectionResult {
  type: 'keyword' | 'url';
  detected: string[];
  originalMessage: string;
  timestamp: Date;
}
