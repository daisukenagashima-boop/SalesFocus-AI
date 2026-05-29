import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, '..', 'data');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

export const db = new Database(path.join(DATA_DIR, 'sales.db'));
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
CREATE TABLE IF NOT EXISTS members (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  short_name TEXT,
  role TEXT DEFAULT 'FS',
  email TEXT,
  notion_person_id TEXT,
  sort_order INTEGER DEFAULT 0,
  active INTEGER DEFAULT 1
);

CREATE TABLE IF NOT EXISTS products (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  excel_name TEXT,
  notion_name TEXT,
  base_price INTEGER DEFAULT 0,
  sort_order INTEGER DEFAULT 0
);

-- 目標 (Excel が所有): member × product × month
CREATE TABLE IF NOT EXISTS targets (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  member_id INTEGER NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  month TEXT NOT NULL,
  contracts REAL DEFAULT 0,
  close_rate REAL,
  trials REAL DEFAULT 0,
  first_meetings REAL DEFAULT 0,
  UNIQUE(member_id, product_id, month)
);

-- 受注実績 (Notion案件DBが所有): member × product × month
CREATE TABLE IF NOT EXISTS actuals (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  member_id INTEGER NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  month TEXT NOT NULL,
  contracts REAL DEFAULT 0,      -- 受注日ベースの契約数
  mrr REAL DEFAULT 0,            -- 想定MRR合計
  source TEXT DEFAULT 'notion',
  updated_at TEXT,
  UNIQUE(member_id, product_id, month)
);

-- 活動実績 (Notion活動DBが所有): member × month（プロダクト非依存）
CREATE TABLE IF NOT EXISTS activity_actuals (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  member_id INTEGER NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  month TEXT NOT NULL,
  calls REAL DEFAULT 0,          -- 架電数(発信)
  connected REAL DEFAULT 0,      -- 通電数(応答/接続)
  faxes REAL DEFAULT 0,          -- FAX送信数
  first_meetings REAL DEFAULT 0, -- 商談(営業商談)数
  source TEXT DEFAULT 'notion',
  updated_at TEXT,
  UNIQUE(member_id, month)
);

-- 案件パイプラインのスナップショット (Notion同期が所有)
CREATE TABLE IF NOT EXISTS pipeline (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  status TEXT NOT NULL,
  product_id INTEGER REFERENCES products(id) ON DELETE SET NULL,
  member_id INTEGER REFERENCES members(id) ON DELETE SET NULL,
  count INTEGER DEFAULT 0,
  mrr REAL DEFAULT 0,
  updated_at TEXT
);

-- IS目標 (Excel が所有): month × channel
CREATE TABLE IF NOT EXISTS is_targets (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  month TEXT NOT NULL,
  channel TEXT NOT NULL,
  appointments REAL DEFAULT 0,
  calls REAL DEFAULT 0,
  budget REAL DEFAULT 0,
  UNIQUE(month, channel)
);

-- IS実績 (手入力が所有): month × channel
CREATE TABLE IF NOT EXISTS is_actuals (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  month TEXT NOT NULL,
  channel TEXT NOT NULL,
  appointments REAL DEFAULT 0,
  calls REAL DEFAULT 0,
  budget REAL DEFAULT 0,
  note TEXT,
  updated_at TEXT,
  UNIQUE(month, channel)
);

CREATE TABLE IF NOT EXISTS sync_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  synced_at TEXT NOT NULL,
  source TEXT,
  status TEXT,
  detail TEXT
);

-- 進捗共有（テキスト）: メンバー × 月 で1セル
CREATE TABLE IF NOT EXISTS progress_notes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  member_id INTEGER NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  month TEXT NOT NULL,
  content TEXT NOT NULL DEFAULT '',
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(member_id, month)
);

-- 稼働時間実績: メンバー × 月
CREATE TABLE IF NOT EXISTS working_hours (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  member_id INTEGER NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  month TEXT NOT NULL,
  hours REAL NOT NULL DEFAULT 0,
  note TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(member_id, month)
);

-- パイプライン履歴（同期ごとのスナップショット。トレンド・前回比に使用）
CREATE TABLE IF NOT EXISTS pipeline_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  synced_at TEXT NOT NULL,
  status TEXT NOT NULL,
  count INTEGER DEFAULT 0,
  mrr REAL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_pipeline_history_synced ON pipeline_history(synced_at);

-- メンバー目標（プロダクト非依存・月単位）: 月営業可能時間など
CREATE TABLE IF NOT EXISTS member_targets (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  member_id INTEGER NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  month TEXT NOT NULL,
  available_hours REAL,
  UNIQUE(member_id, month)
);
`);

const PRODUCTS = [
  { code: 'gijiroku', name: 'ながらかいご議事録', excel_name: '議事録', notion_name: 'ながらかいご議事録', base_price: 4000, sort_order: 1 },
  { code: 'kiroku', name: 'ながらかいご記録', excel_name: '記録', notion_name: 'ながらかいご記録', base_price: 30000, sort_order: 2 },
  { code: 'income', name: 'ながらかいごインカム', excel_name: 'インカム', notion_name: '決定版介護ソフト', base_price: 0, sort_order: 3 },
];

const MEMBERS = [
  { name: '岡田一輝', short_name: '岡田', role: 'FS', sort_order: 1 },
  { name: '酒井優聖', short_name: '酒井', role: 'FS', sort_order: 2 },
  { name: '長嶋乃祐', short_name: '長嶋', role: 'FS', sort_order: 3 },
  { name: '吉田菜智', short_name: '吉田', role: 'FS', sort_order: 4 },
  { name: '山口謙介', short_name: '山口', role: 'FS', sort_order: 5 },
];

export function seed() {
  const pInsert = db.prepare(
    `INSERT INTO products (code, name, excel_name, notion_name, base_price, sort_order)
     VALUES (@code, @name, @excel_name, @notion_name, @base_price, @sort_order)
     ON CONFLICT(code) DO NOTHING`
  );
  for (const p of PRODUCTS) pInsert.run(p);

  // 既存DBの旧名称を修正（表示名のみ。Notion名は実際の選択肢「決定版介護ソフト」に合わせる）
  db.prepare("UPDATE products SET name='ながらかいごインカム' WHERE code='income' AND name='決定版介護ソフト'").run();
  db.prepare("UPDATE products SET notion_name='決定版介護ソフト' WHERE code='income' AND notion_name='ながらかいごインカム'").run();

  const count = db.prepare('SELECT COUNT(*) AS n FROM members').get() as { n: number };
  if (count.n === 0) {
    const mInsert = db.prepare(
      `INSERT INTO members (name, short_name, role, sort_order) VALUES (@name, @short_name, @role, @sort_order)`
    );
    for (const m of MEMBERS) mInsert.run(m);
  }
}

seed();
