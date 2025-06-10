/**
 * Controller層: HTTPリクエストの処理とレスポンスの生成
 */

import { Request, Response } from 'express';
import { MessageMonitorInteractor } from '../interactors/messageMonitorInteractor';
import { Message } from '../entities';

export class MessageMonitorController {
  constructor(private interactor: MessageMonitorInteractor) {}

  /**
   * ヘルスチェックエンドポイント
   */
  async health(req: Request, res: Response): Promise<void> {
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      service: 'message-monitor-interactor'
    });
  }

  /**
   * サービス状態取得エンドポイント
   */
  async getStatus(req: Request, res: Response): Promise<void> {
    try {
      // インタラクターから設定情報を取得する方法を追加する必要がある
      res.json({
        status: 'operational',
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      res.status(500).json({
        error: 'Failed to get status',
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * メッセージ監視エンドポイント（メイン機能）
   */
  async processMessage(req: Request, res: Response): Promise<void> {
    try {
      const { content, user } = req.body;

      if (!content || typeof content !== 'string') {
        res.status(400).json({ error: 'Message content is required' });
        return;
      }

      const message = new Message(
        content,
        user?.id,
        user?.name,
        new Date()
      );

      const result = await this.interactor.processMessage(message);

      res.json({
        success: result.success,
        detected: result.detections.length > 0,
        detectionCount: result.detections.length,
        notificationSent: result.notificationSent,
        results: result.detections.map(d => ({
          type: d.type,
          detected: d.detectedItems,
          timestamp: d.timestamp
        }))
      });
    } catch (error) {
      console.error('Error processing message:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * 複数メッセージ監視エンドポイント
   */
  async processMessages(req: Request, res: Response): Promise<void> {
    try {
      const { messages } = req.body;

      if (!Array.isArray(messages)) {
        res.status(400).json({ error: 'Messages array is required' });
        return;
      }

      const messageEntities = messages.map(msg => new Message(
        msg.content,
        msg.user?.id,
        msg.user?.name,
        msg.timestamp ? new Date(msg.timestamp) : new Date()
      ));

      const result = await this.interactor.processMessages(messageEntities);

      res.json({
        success: result.success,
        processedCount: result.totalProcessed,
        notificationCount: result.totalNotifications,
        results: result.results.map(r => ({
          detected: r.detections.length > 0,
          detectionCount: r.detections.length,
          notificationSent: r.notificationSent,
          detections: r.detections.map(d => ({
            type: d.type,
            detected: d.detectedItems,
            timestamp: d.timestamp
          }))
        }))
      });
    } catch (error) {
      console.error('Error processing messages:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * テスト用エンドポイント（通知なし）
   */
  async testMessage(req: Request, res: Response): Promise<void> {
    try {
      const { message: messageContent } = req.body;

      if (!messageContent || typeof messageContent !== 'string') {
        res.status(400).json({ error: 'Test message is required' });
        return;
      }

      const message = new Message(messageContent);
      const result = this.interactor.testMessage(message);

      res.json({
        success: result.success,
        message: result.message,
        detected: result.detections.length > 0,
        results: result.detections.map(d => ({
          type: d.type,
          detected: d.detectedItems
        }))
      });
    } catch (error) {
      console.error('Error testing message:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
}
