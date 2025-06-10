/**
 * Repository層のインターフェース
 * データの永続化やサービス間通信のインターフェースを定義
 */

import { Notification, NotificationMessage } from '../entities';

// Slack通知用リポジトリインターフェース
export interface SlackNotificationRepository {
  sendNotification(notification: Notification): Promise<void>;
  testConnection(): Promise<boolean>;
  setChannel(channel: string): void;
  getChannel(): string;
}

// メッセージ監視設定用リポジトリインターフェース
export interface MonitorConfigRepository {
  getMonitoredKeywords(): string[];
  getMonitoredUrls(): string[];
  getConfig(): MonitorConfig;
}

// ログ出力用リポジトリインターフェース
export interface LogRepository {
  info(message: string, data?: any): void;
  error(message: string, error?: Error): void;
  warn(message: string, data?: any): void;
}

// 監視設定の型定義
export interface MonitorConfig {
  caseSensitive: boolean;
  partialMatch: boolean;
  checkFullUrl: boolean;
  checkDomainOnly: boolean;
  slackChannel: string;
}
