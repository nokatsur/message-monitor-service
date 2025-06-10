/**
 * Interactor層: ビジネスロジックを実行するインタラクター
 */

import { Message, Detection, Notification, DetectionType } from '../entities';
import { 
  SlackNotificationRepository, 
  MonitorConfigRepository, 
  LogRepository 
} from '../repositories/interfaces';

// メッセージ監視インタラクター
export class MessageMonitorInteractor {
  constructor(
    private slackRepo: SlackNotificationRepository,
    private configRepo: MonitorConfigRepository,
    private logRepo: LogRepository
  ) {}

  /**
   * メッセージを監視し、必要に応じて通知を送信
   */
  async processMessage(message: Message): Promise<ProcessMessageResult> {
    try {
      this.logRepo.info('Processing message', { 
        user: message.getUserInfo(), 
        timestamp: message.timestamp 
      });

      // メッセージが空の場合は処理しない
      if (message.isEmpty()) {
        return {
          success: true,
          detections: [],
          notificationSent: false
        };
      }

      // メッセージを解析して検出を実行
      const detections = this.analyzeMessage(message);

      // 検出があった場合は通知を送信
      if (detections.length > 0) {
        await this.sendNotifications(detections, message.getUserInfo());
        
        this.logRepo.info(`Processed message with ${detections.length} detections`, {
          user: message.getUserInfo(),
          detections: detections.map(d => ({ type: d.type, detected: d.detectedItems }))
        });

        return {
          success: true,
          detections,
          notificationSent: true
        };
      }

      return {
        success: true,
        detections: [],
        notificationSent: false
      };

    } catch (error) {
      this.logRepo.error('Error processing message', error as Error);
      throw error;
    }
  }

  /**
   * 複数のメッセージを一括処理
   */
  async processMessages(messages: Message[]): Promise<ProcessMessagesResult> {
    const results: ProcessMessageResult[] = [];
    
    for (const message of messages) {
      const result = await this.processMessage(message);
      results.push(result);
    }
    
    return {
      success: true,
      results,
      totalProcessed: messages.length,
      totalNotifications: results.filter(r => r.notificationSent).length
    };
  }

  /**
   * テスト用メッセージ処理（通知なし）
   */
  testMessage(message: Message): TestMessageResult {
    if (message.isEmpty()) {
      return {
        success: true,
        detections: [],
        message: message.getContent()
      };
    }

    const detections = this.analyzeMessage(message);
    
    return {
      success: true,
      detections,
      message: message.getContent()
    };
  }

  /**
   * サービス初期化
   */
  async initialize(): Promise<boolean> {
    try {
      this.logRepo.info('Initializing Message Monitor Interactor...');
      
      // Slack接続テスト
      const slackConnectionOk = await this.slackRepo.testConnection();
      if (!slackConnectionOk) {
        throw new Error('Slack connection failed');
      }
      
      // 監視設定の確認
      const config = this.configRepo.getConfig();
      const keywords = this.configRepo.getMonitoredKeywords();
      const urls = this.configRepo.getMonitoredUrls();
      
      this.logRepo.info('Monitor configuration loaded', {
        keywordCount: keywords.length,
        urlCount: urls.length,
        channel: this.slackRepo.getChannel()
      });
      
      this.logRepo.info('Message Monitor Interactor initialized successfully');
      return true;
    } catch (error) {
      this.logRepo.error('Failed to initialize Message Monitor Interactor', error as Error);
      return false;
    }
  }

  /**
   * メッセージ解析（プライベートメソッド）
   */
  private analyzeMessage(message: Message): Detection[] {
    const detections: Detection[] = [];
    const content = message.getContent();
    
    // キーワード検出
    const detectedKeywords = this.detectKeywords(content);
    if (detectedKeywords.length > 0) {
      detections.push(new Detection(
        DetectionType.KEYWORD,
        detectedKeywords,
        content,
        message.timestamp
      ));
    }
    
    // URL検出
    const detectedUrls = this.detectUrls(content);
    if (detectedUrls.length > 0) {
      detections.push(new Detection(
        DetectionType.URL,
        detectedUrls,
        content,
        message.timestamp
      ));
    }
    
    return detections;
  }

  /**
   * キーワード検出（プライベートメソッド）
   */
  private detectKeywords(content: string): string[] {
    const config = this.configRepo.getConfig();
    const keywords = this.configRepo.getMonitoredKeywords();
    const detectedKeywords: string[] = [];
    
    const searchText = config.caseSensitive ? content : content.toLowerCase();
    
    for (const keyword of keywords) {
      const searchKeyword = config.caseSensitive ? keyword : keyword.toLowerCase();
      
      if (config.partialMatch) {
        if (searchText.includes(searchKeyword)) {
          detectedKeywords.push(keyword);
        }
      } else {
        // 完全一致の場合（単語境界を考慮）
        const regex = new RegExp(`\\b${this.escapeRegExp(searchKeyword)}\\b`, 
          config.caseSensitive ? 'g' : 'gi');
        if (regex.test(searchText)) {
          detectedKeywords.push(keyword);
        }
      }
    }
    
    return detectedKeywords;
  }

  /**
   * URL検出（プライベートメソッド）
   */
  private detectUrls(content: string): string[] {
    const config = this.configRepo.getConfig();
    const monitoredUrls = this.configRepo.getMonitoredUrls();
    const detectedUrls: string[] = [];
    
    // URLを抽出する正規表現
    const urlRegex = /https?:\/\/[^\s]+|www\.[^\s]+|[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
    const foundUrls = content.match(urlRegex) || [];
    
    for (const foundUrl of foundUrls) {
      for (const monitoredUrl of monitoredUrls) {
        if (this.isUrlMatch(foundUrl, monitoredUrl, config)) {
          detectedUrls.push(foundUrl);
          break; // 同じURLを重複して追加しないため
        }
      }
    }
    
    return detectedUrls;
  }

  /**
   * URL一致判定（プライベートメソッド）
   */
  private isUrlMatch(foundUrl: string, monitoredUrl: string, config: any): boolean {
    const cleanFoundUrl = foundUrl.toLowerCase()
      .replace(/^https?:\/\//, '')
      .replace(/^www\./, '')
      .replace(/\/.*$/, ''); // パスを除去
    
    const cleanMonitoredUrl = monitoredUrl.toLowerCase()
      .replace(/^https?:\/\//, '')
      .replace(/^www\./, '');
    
    if (config.checkDomainOnly) {
      return cleanFoundUrl.includes(cleanMonitoredUrl) || 
             cleanMonitoredUrl.includes(cleanFoundUrl);
    }
    
    if (config.checkFullUrl) {
      return foundUrl.toLowerCase().includes(monitoredUrl.toLowerCase());
    }
    
    return false;
  }

  /**
   * 正規表現エスケープ（プライベートメソッド）
   */
  private escapeRegExp(string: string): string {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  /**
   * 通知送信（プライベートメソッド）
   */
  private async sendNotifications(detections: Detection[], userInfo?: { id?: string; name?: string }): Promise<void> {
    for (const detection of detections) {
      const notification = new Notification(detection, userInfo, this.slackRepo.getChannel());
      await this.slackRepo.sendNotification(notification);
    }
  }
}

// レスポンス型定義
export interface ProcessMessageResult {
  success: boolean;
  detections: Detection[];
  notificationSent: boolean;
}

export interface ProcessMessagesResult {
  success: boolean;
  results: ProcessMessageResult[];
  totalProcessed: number;
  totalNotifications: number;
}

export interface TestMessageResult {
  success: boolean;
  detections: Detection[];
  message: string;
}
