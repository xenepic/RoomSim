import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Analytics } from '@vercel/analytics/react';
import './index.css';
import App from './App';

// Analytics は Vercel 本番環境でのみ実際に計測される。
// ローカル開発時はスクリプトを読み込まず動作確認のみ（計測データは送信されない）。
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
    <Analytics />
  </StrictMode>,
);
