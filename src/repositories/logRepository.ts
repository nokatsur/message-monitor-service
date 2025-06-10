/**
 * Repository層の実装: ログリポジトリ
 */

import { LogRepository } from './interfaces';

export class ConsoleLogRepositoryImpl implements LogRepository {
  info(message: string, data?: any): void {
    console.log(`[INFO] ${message}`, data ? JSON.stringify(data, null, 2) : '');
  }

  error(message: string, error?: Error): void {
    console.error(`[ERROR] ${message}`, error?.message || '', error?.stack || '');
  }

  warn(message: string, data?: any): void {
    console.warn(`[WARN] ${message}`, data ? JSON.stringify(data, null, 2) : '');
  }
}
