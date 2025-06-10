/**
 * アプリケーションのメインエントリーポイント
 * 依存性注入とExpressサーバーの設定
 */

import express from 'express';
import dotenv from 'dotenv';

// 依存性注入
import { MessageMonitorInteractor } from './interactors/messageMonitorInteractor';
import { MessageMonitorController } from './controllers/messageMonitorController';
import { SlackNotificationRepositoryImpl } from './repositories/slackNotificationRepository';
import { MonitorConfigRepositoryImpl } from './repositories/monitorConfigRepository';
import { ConsoleLogRepositoryImpl } from './repositories/logRepository';

// 環境変数を読み込み
dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

// JSON解析ミドルウェア
app.use(express.json());

// CORS設定（必要に応じて）
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  next();
});

// 依存性注入の設定
let controller: MessageMonitorController;
let interactor: MessageMonitorInteractor;

async function initializeDependencies() {
  const slackToken = process.env.SLACK_BOT_TOKEN;
  const slackChannel = process.env.SLACK_CHANNEL;
  
  if (!slackToken) {
    console.error('SLACK_BOT_TOKEN is required');
    process.exit(1);
  }
  
  // リポジトリの初期化
  const slackRepo = new SlackNotificationRepositoryImpl(slackToken, slackChannel);
  const configRepo = new MonitorConfigRepositoryImpl();
  const logRepo = new ConsoleLogRepositoryImpl();
  
  // インタラクターの初期化
  interactor = new MessageMonitorInteractor(slackRepo, configRepo, logRepo);
  
  // コントローラーの初期化
  controller = new MessageMonitorController(interactor);
  
  // サービス初期化
  const initialized = await interactor.initialize();
  if (!initialized) {
    console.error('Failed to initialize message monitor service');
    process.exit(1);
  }
}

// ルート設定
function setupRoutes() {
  // ヘルスチェックエンドポイント
  app.get('/health', (req, res) => controller.health(req, res));

  // サービス状態取得エンドポイント
  app.get('/status', (req, res) => controller.getStatus(req, res));

  // メッセージ処理エンドポイント（メイン機能）
  app.post('/monitor/message', (req, res) => controller.processMessage(req, res));

  // 複数メッセージ処理エンドポイント
  app.post('/monitor/messages', (req, res) => controller.processMessages(req, res));

  // テスト用エンドポイント（通知なし）
  app.post('/monitor/test', (req, res) => controller.testMessage(req, res));

  // 404ハンドラー
  app.use('*', (req, res) => {
    res.status(404).json({ error: 'Endpoint not found' });
  });

  // エラーハンドラー
  app.use((error: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error('Unhandled error:', error);
    res.status(500).json({ error: 'Internal server error' });
  });
}

// サーバー起動
async function startServer() {
  try {
    await initializeDependencies();
    setupRoutes();
    
    app.listen(port, () => {
      console.log(`Message Monitor Server (Interactor Pattern) is running on port ${port}`);
      console.log(`Health check: http://localhost:${port}/health`);
      console.log(`Status: http://localhost:${port}/status`);
      console.log('Architecture: Clean Architecture with Interactor Pattern');
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

// プロセス終了時のクリーンアップ
process.on('SIGINT', () => {
  console.log('\nShutting down server...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\nShutting down server...');
  process.exit(0);
});

// サーバー開始
if (require.main === module) {
  startServer();
}

export default app;
