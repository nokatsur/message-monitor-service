/**
 * Repository層の実装: Slack通知リポジトリ
 */

import { WebClient } from '@slack/web-api';
import { Notification } from '../entities';
import { SlackNotificationRepository } from './interfaces';

export class SlackNotificationRepositoryImpl implements SlackNotificationRepository {
  private slackClient: WebClient;
  private channel: string;

  constructor(token: string, channel: string = '#alerts') {
    this.slackClient = new WebClient(token);
    this.channel = channel;
  }

  async sendNotification(notification: Notification): Promise<void> {
    try {
      const message = notification.formatMessage();
      
      await this.slackClient.chat.postMessage({
        channel: this.channel,
        text: message.text,
        blocks: message.blocks,
        unfurl_links: false,
        unfurl_media: false
      });

      console.log(`Slack notification sent for ${notification.detection.type} detection:`, 
        notification.detection.detectedItems);
    } catch (error) {
      console.error('Failed to send Slack notification:', error);
      throw error;
    }
  }

  async testConnection(): Promise<boolean> {
    try {
      const response = await this.slackClient.auth.test();
      console.log('Slack connection test successful:', response.user);
      return true;
    } catch (error) {
      console.error('Slack connection test failed:', error);
      return false;
    }
  }

  setChannel(channel: string): void {
    this.channel = channel;
  }

  getChannel(): string {
    return this.channel;
  }
}
