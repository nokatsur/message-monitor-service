/**
 * Repository層の実装: 監視設定リポジトリ
 */

import { MonitorConfigRepository, MonitorConfig } from './interfaces';
import { MONITORED_KEYWORDS, MONITORED_URLS, MONITOR_CONFIG } from '../constants';

export class MonitorConfigRepositoryImpl implements MonitorConfigRepository {
  getMonitoredKeywords(): string[] {
    return [...MONITORED_KEYWORDS];
  }

  getMonitoredUrls(): string[] {
    return [...MONITORED_URLS];
  }

  getConfig(): MonitorConfig {
    return {
      caseSensitive: MONITOR_CONFIG.CASE_SENSITIVE,
      partialMatch: MONITOR_CONFIG.PARTIAL_MATCH,
      checkFullUrl: MONITOR_CONFIG.CHECK_FULL_URL,
      checkDomainOnly: MONITOR_CONFIG.CHECK_DOMAIN_ONLY,
      slackChannel: MONITOR_CONFIG.SLACK_CHANNEL
    };
  }
}
