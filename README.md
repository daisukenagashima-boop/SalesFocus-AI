# SalesFocus AI 🚀

営業成績の可視化、リアルタイム進捗管理、およびAIによる個別改善提案を行う営業支援ダッシュボードです。

## 🌟 主な機能

- **ダッシュボード**: リアルタイムな成約率、売上推移、進捗状況の可視化
- **実績入力**: ログインユーザーと紐付いたスマートな成約データ入力
- **成績管理**: 週次・月次の詳細なパフォーマンス管理と目標設定
- **AI分析 (Gemini API)**: 過去の実績データに基づいた、AIによるパーソナライズされた営業改善提案
- **マスタ管理**: プロダクト、担当者（認証メール対応）の柔軟な管理

## 🛠️ 技術スタック

- **Frontend**: React, TypeScript, Tailwind CSS, Lucide React, Framer Motion
- **Backend/Database**: Firebase (Authentication, Firestore)
- **AI**: Google Gemini API (@google/genai)
- **Tooling**: Vite, date-fns, Recharts

## 🚀 始め方

1. **GitHubからのエクスポート**: Google AI StudioからGitHubへエクスポートします。
2. **依存関係のインストール**:
   ```bash
   npm install
   ```
3. **Firebaseの設定**: 
   - `firebase-applet-config.json` に有効なFirebase設定を構成してください。
   - `.env` ファイルに `GEMINI_API_KEY` を設定してください。
4. **開発サーバーの起動**:
   ```bash
   npm run dev
   ```

---

## English Overview

SalesFocus AI is a sales support dashboard that visualizes performance, tracks progress in real-time, and provides personalized AI-driven improvement suggestions.

### Key Features
- **Dashboard**: Real-time visualization of conversion rates and revenue.
- **Entries**: Smart achievement input linked to logged-in users.
- **Performance**: Detailed weekly/monthly tracking and target setting.
- **AI Analysis**: Personalized improvement tips powered by Google Gemini.
- **Master Data**: Management of products and members with email authentication.

### Tech Stack
- Frontend: React, TypeScript, Tailwind CSS, Lucide React, Framer Motion
- Backend/DB: Firebase (Auth, Firestore)
- AI: Google Gemini API
