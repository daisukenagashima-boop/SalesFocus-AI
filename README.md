# SalesFocus AI — 営業数値管理（ローカル運用版）

部署の営業数値（目標・実績）を一元管理するローカルWebアプリです。
**目標はExcelから取り込み、受注・活動の実績はNotion案件CRMから自動集計**します。

- 目標数値 … `営業計画_目標_統合版.xlsx`（個別管理・IS管理シート）からインポート
- 受注実績・MRR・パイプライン・架電/商談数 … Notion「DB05_案件（CRM）」「DB06_活動（CRM）」から同期
- IS活動の実績（アポ数・コール/送付数・予算消化） … アプリ上で手入力

データはローカルの SQLite（`data/sales.db`）に永続化されます。

## 技術構成

- フロント: React 19 + TypeScript + Vite + Tailwind CSS + Recharts
- バックエンド: Express + better-sqlite3（SQLite）
- 連携: Notion API（`@notionhq/client`）/ Excel（`exceljs`）

## セットアップ

```bash
cd ~/SalesFocus-AI
npm install
cp .env.example .env   # 初回のみ。中身を環境に合わせて編集
```

### .env の設定

| 変数 | 説明 |
|------|------|
| `NOTION_API_KEY` | Notionインテグレーションのトークン（空でも起動可・同期のみ無効） |
| `NOTION_DEALS_DB_ID` | 案件CRMのDB ID（既定値設定済み） |
| `NOTION_ACTIVITIES_DB_ID` | 活動CRMのDB ID（既定値設定済み） |
| `API_PORT` | バックエンドAPIのポート（既定 8787） |
| `TARGET_EXCEL_PATH` | 目標Excelの絶対パス（「再インポート」で使用） |

## 起動

```bash
npm run dev
```

- フロント: http://localhost:5180
- API: http://localhost:8787

> ポート3000は別アプリ(KeyFlow)が使用するため5180を使用しています。

本番風に1コマンドで動かす場合（ビルド済みフロントをAPIサーバーが配信）:

```bash
npm run build
npm start            # http://localhost:8787 で全機能
```

## 使い方

1. **目標管理** → 「Excelから再インポート」で目標を取り込み（`.env`の`TARGET_EXCEL_PATH`を読む）。値はその場で編集・保存も可能。
2. **受注・活動実績** → メンバー×プロダクトの契約数・MRR、メンバー別の架電/通電/商談/FAXを手入力。**Notionが無くてもここだけで実績管理が完結します。**
3. **IS実績入力** → インサイドセールスのチャネル別にアポ数・コール数・予算消化を手入力。
4. **Notion同期** → 「今すぐ同期」で案件・活動から実績を取得。`NOTION_API_KEY`設定後に有効。手入力した実績は同期で上書きされません（手入力優先）。
5. **ダッシュボード** → 月次の目標 vs 実績、メンバー別・プロダクト別、案件パイプラインを表示。
6. **メンバー** → 氏名・略称・役割の管理。Notionの担当者氏名と一致させると同期時に自動マッチ。

### 運用パターン
- **Notion無し（完全手入力）**: 目標管理でExcel取込 → 受注・活動実績／IS実績入力で毎月手入力 → ダッシュボードで確認。
- **Notion連携（推奨）**: 受注・MRR・架電/商談はNotion同期で自動。アプリ手入力は補正したいセルだけ。

## Notion インテグレーション作成手順

1. https://www.notion.so/my-integrations で「New integration」を作成しトークンを取得。
2. Notionで「営業ホーム > DB > Sales DB」配下の案件・活動DBを開き、`•••` → 「Connections」→ 作成したインテグレーションを接続。
3. トークンを `.env` の `NOTION_API_KEY` に設定し、`npm run dev` を再起動。

## データモデル（所有者を1つに固定）

| テーブル | 所有者 | 内容 |
|----------|--------|------|
| `targets` | Excel | メンバー×プロダクト×月 の目標（契約数/必要トライアル/必要商談） |
| `is_targets` | Excel | チャネル×月 のIS目標（アポ/コール/予算） |
| `actuals` | Notion | メンバー×プロダクト×月 の受注実績・MRR |
| `activity_actuals` | Notion | メンバー×月 の架電/通電/FAX/商談数 |
| `pipeline` | Notion | 営業ステータス別の件数・MRRスナップショット |
| `is_actuals` | 手入力 | チャネル×月 のIS実績 |

同期は各所有者のデータのみ置き換えるため、Notion同期で手入力値が消えることはありません。

## バックアップ

`data/sales.db` をコピーするだけで全データのバックアップになります。
