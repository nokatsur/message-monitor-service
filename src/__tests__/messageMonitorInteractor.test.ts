/**
 * Interactor層のテスト
 */

import { MessageMonitorInteractor } from '../interactors/messageMonitorInteractor';
import { Message, DetectionType } from '../entities';
import { 
  SlackNotificationRepository, 
  MonitorConfigRepository, 
  LogRepository 
} from '../repositories/interfaces';

// モックリポジトリ
class MockSlackRepository implements SlackNotificationRepository {
  public notifications: any[] = [];
  private channel = '#test';

  async sendNotification(notification: any): Promise<void> {
    this.notifications.push(notification);
  }

  async testConnection(): Promise<boolean> {
    return true;
  }

  setChannel(channel: string): void {
    this.channel = channel;
  }

  getChannel(): string {
    return this.channel;
  }
}

class MockConfigRepository implements MonitorConfigRepository {
  getMonitoredKeywords(): string[] {
    return ['エラー', 'バグ', '問題'];
  }

  getMonitoredUrls(): string[] {
    return ['spam-site.net', 'malicious-domain.org'];
  }

  getConfig() {
    return {
      caseSensitive: false,
      partialMatch: true,
      checkFullUrl: true,
      checkDomainOnly: true,
      slackChannel: '#test'
    };
  }
}

class MockLogRepository implements LogRepository {
  public logs: Array<{type: string, message: string, data?: any}> = [];

  info(message: string, data?: any): void {
    this.logs.push({type: 'info', message, data});
  }

  error(message: string, error?: Error): void {
    this.logs.push({type: 'error', message, data: error});
  }

  warn(message: string, data?: any): void {
    this.logs.push({type: 'warn', message, data});
  }
}

describe('MessageMonitorInteractor', () => {
  let interactor: MessageMonitorInteractor;
  let mockSlackRepo: MockSlackRepository;
  let mockConfigRepo: MockConfigRepository;
  let mockLogRepo: MockLogRepository;

  beforeEach(() => {
    mockSlackRepo = new MockSlackRepository();
    mockConfigRepo = new MockConfigRepository();
    mockLogRepo = new MockLogRepository();
    
    interactor = new MessageMonitorInteractor(
      mockSlackRepo,
      mockConfigRepo,
      mockLogRepo
    );
  });

  describe('processMessage', () => {
    test('キーワードを含むメッセージを正しく検出する', async () => {
      const message = new Message('システムでエラーが発生しました', 'user1', 'テストユーザー');
      
      const result = await interactor.processMessage(message);
      
      expect(result.success).toBe(true);
      expect(result.detections).toHaveLength(1);
      expect(result.detections[0].type).toBe(DetectionType.KEYWORD);
      expect(result.detections[0].detectedItems).toContain('エラー');
      expect(result.notificationSent).toBe(true);
      expect(mockSlackRepo.notifications).toHaveLength(1);
    });

    test('URLを含むメッセージを正しく検出する', async () => {
      const message = new Message('危険なサイト https://spam-site.net にアクセスしないでください');
      
      const result = await interactor.processMessage(message);
      
      expect(result.success).toBe(true);
      expect(result.detections).toHaveLength(1);
      expect(result.detections[0].type).toBe(DetectionType.URL);
      expect(result.detections[0].detectedItems).toContain('https://spam-site.net');
      expect(result.notificationSent).toBe(true);
    });

    test('キーワードとURLの両方を検出する', async () => {
      const message = new Message('エラー: spam-site.net で問題が発生しています');
      
      const result = await interactor.processMessage(message);
      
      expect(result.success).toBe(true);
      expect(result.detections).toHaveLength(2);
      expect(result.detections.find(d => d.type === DetectionType.KEYWORD)).toBeDefined();
      expect(result.detections.find(d => d.type === DetectionType.URL)).toBeDefined();
      expect(result.notificationSent).toBe(true);
      expect(mockSlackRepo.notifications).toHaveLength(2);
    });

    test('監視対象がないメッセージは検出されない', async () => {
      const message = new Message('今日はいい天気ですね');
      
      const result = await interactor.processMessage(message);
      
      expect(result.success).toBe(true);
      expect(result.detections).toHaveLength(0);
      expect(result.notificationSent).toBe(false);
      expect(mockSlackRepo.notifications).toHaveLength(0);
    });

    test('空のメッセージは処理されない', async () => {
      const message = new Message('');
      
      const result = await interactor.processMessage(message);
      
      expect(result.success).toBe(true);
      expect(result.detections).toHaveLength(0);
      expect(result.notificationSent).toBe(false);
    });
  });

  describe('testMessage', () => {
    test('テストメッセージは通知を送信しない', () => {
      const message = new Message('テスト用エラーメッセージ');
      
      const result = interactor.testMessage(message);
      
      expect(result.success).toBe(true);
      expect(result.detections).toHaveLength(1);
      expect(result.message).toBe('テスト用エラーメッセージ');
      expect(mockSlackRepo.notifications).toHaveLength(0); // 通知は送信されない
    });
  });

  describe('processMessages', () => {
    test('複数のメッセージを正しく処理する', async () => {
      const messages = [
        new Message('エラーが発生しました'),
        new Message('今日はいい天気ですね'),
        new Message('バグを発見しました')
      ];
      
      const result = await interactor.processMessages(messages);
      
      expect(result.success).toBe(true);
      expect(result.totalProcessed).toBe(3);
      expect(result.totalNotifications).toBe(2); // 2つのメッセージで検出
      expect(result.results).toHaveLength(3);
    });
  });

  describe('initialize', () => {
    test('正常に初期化される', async () => {
      const result = await interactor.initialize();
      
      expect(result).toBe(true);
      expect(mockLogRepo.logs.some(log => log.message.includes('initialized successfully'))).toBe(true);
    });
  });
});
