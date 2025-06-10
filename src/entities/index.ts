/**
 * Entity層: ビジネスロジックの核となるエンティティ
 */

// メッセージエンティティ
export class Message {
  constructor(
    public readonly content: string,
    public readonly userId?: string,
    public readonly userName?: string,
    public readonly timestamp: Date = new Date()
  ) {}

  public isEmpty(): boolean {
    return !this.content || this.content.trim().length === 0;
  }

  public getContent(): string {
    return this.content;
  }

  public getUserInfo(): { id?: string; name?: string } {
    return {
      id: this.userId,
      name: this.userName
    };
  }
}

// 検出結果エンティティ
export class Detection {
  constructor(
    public readonly type: DetectionType,
    public readonly detectedItems: string[],
    public readonly originalMessage: string,
    public readonly timestamp: Date = new Date()
  ) {}

  public hasDetections(): boolean {
    return this.detectedItems.length > 0;
  }

  public getDetectionSummary(): string {
    return `${this.type}: ${this.detectedItems.join(', ')}`;
  }
}

// 通知エンティティ
export class Notification {
  constructor(
    public readonly detection: Detection,
    public readonly userInfo?: { id?: string; name?: string },
    public readonly channel: string = '#alerts'
  ) {}

  public formatMessage(): NotificationMessage {
    const timestamp = this.detection.timestamp.toLocaleString('ja-JP', {
      timeZone: 'Asia/Tokyo',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });

    const title = this.detection.type === DetectionType.KEYWORD 
      ? '⚠️ 監視対象キーワードが検出されました'
      : '🚨 注意すべきURLが検出されました';

    const detectedItems = this.detection.detectedItems.join(', ');
    
    return {
      title,
      text: `${title}\n検出項目: ${detectedItems}\n元メッセージ: ${this.detection.originalMessage}`,
      blocks: this.createBlocks(title, timestamp, detectedItems)
    };
  }

  private createBlocks(title: string, timestamp: string, detectedItems: string) {
    const blocks = [
      {
        type: 'header',
        text: {
          type: 'plain_text',
          text: title
        }
      },
      {
        type: 'section',
        fields: [
          {
            type: 'mrkdwn',
            text: `*検出タイプ:*\n${this.detection.type === DetectionType.KEYWORD ? 'キーワード' : 'URL'}`
          },
          {
            type: 'mrkdwn',
            text: `*検出時刻:*\n${timestamp}`
          }
        ]
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*検出項目:*\n\`${detectedItems}\``
        }
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*元メッセージ:*\n> ${this.detection.originalMessage}`
        }
      }
    ];

    if (this.userInfo) {
      blocks.push({
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*送信者:* ${this.userInfo.name || this.userInfo.id || '不明'}`
        }
      });
    }

    blocks.push({ type: 'divider' });

    return blocks;
  }
}

// 型定義
export enum DetectionType {
  KEYWORD = 'keyword',
  URL = 'url'
}

export interface NotificationMessage {
  title: string;
  text: string;
  blocks: any[];
}
