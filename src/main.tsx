import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { applyTheme, currentThemeId } from './lib/theme';

applyTheme(currentThemeId()); // 初回描画前にテーマ適用（チラつき防止）

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
