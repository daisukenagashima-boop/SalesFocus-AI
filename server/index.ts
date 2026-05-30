import 'dotenv/config';
import express from 'express';
import path from 'path';
import fs from 'fs';
import os from 'os';
import { fileURLToPath } from 'url';
import { db } from './db.js';
import { importExcel } from './excel.js';
import { syncNotion, notionConfigured } from './notion.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
app.use(express.json());

const PORT = Number(process.env.API_PORT) || 8787;
// 既定はループバックのみ（自PC内からのアクセスに限定）。LAN公開したい場合のみ API_HOST=0.0.0.0
const HOST = process.env.API_HOST || '127.0.0.1';
// Excel読み込みを許可するベースディレクトリ（任意ファイル読み取りを防ぐ）
const EXCEL_BASE = path.resolve(process.env.EXCEL_BASE_DIR || os.homedir());
const ALLOWED_EXCEL_EXT = new Set(['.xlsx', '.xlsm', '.csv']);

// ---------- helpers ----------
function distinctMonths(): string[] {
  const rows = db
    .prepare(
      `SELECT month FROM targets UNION SELECT month FROM actuals
       UNION SELECT month FROM is_targets UNION SELECT month FROM activity_actuals
       ORDER BY month`
    )
    .all() as { month: string }[];
  return rows.map((r) => r.month);
}

const members = () =>
  db.prepare('SELECT * FROM members WHERE active = 1 ORDER BY sort_order, id').all();
const products = () => db.prepare('SELECT * FROM products ORDER BY sort_order, id').all();

// ---------- meta ----------
app.get('/api/meta', (_req, res) => {
  res.json({
    members: members(),
    products: products(),
    months: distinctMonths(),
    notionConfigured: notionConfigured(),
    defaultExcelPath: process.env.TARGET_EXCEL_PATH || '',
  });
});

// ---------- members ----------
app.get('/api/members', (_req, res) => res.json(members()));
app.post('/api/members', (req, res) => {
  const { name, short_name, role, email } = req.body;
  if (!name) return res.status(400).json({ error: 'name は必須です' });
  const max = db.prepare('SELECT COALESCE(MAX(sort_order),0) AS m FROM members').get() as { m: number };
  const info = db
    .prepare('INSERT INTO members (name, short_name, role, email, sort_order) VALUES (?, ?, ?, ?, ?)')
    .run(name, short_name || name, role || 'FS', email || null, max.m + 1);
  res.json({ id: info.lastInsertRowid });
});
app.put('/api/members/:id', (req, res) => {
  const { name, short_name, role, email, active } = req.body;
  db.prepare(
    `UPDATE members SET name=COALESCE(?,name), short_name=COALESCE(?,short_name),
     role=COALESCE(?,role), email=COALESCE(?,email), active=COALESCE(?,active) WHERE id=?`
  ).run(name ?? null, short_name ?? null, role ?? null, email ?? null, active ?? null, req.params.id);
  res.json({ ok: true });
});

// ---------- products ----------
app.get('/api/products', (_req, res) => res.json(products()));
app.post('/api/products', (req, res) => {
  const { name, excel_name, notion_name, base_price } = req.body;
  if (!name) return res.status(400).json({ error: 'name は必須です' });
  const code = (req.body.code as string) || `prod_${Date.now()}`;
  const dup = db.prepare('SELECT id FROM products WHERE code = ?').get(code);
  if (dup) return res.status(400).json({ error: 'code が重複しています' });
  const max = db.prepare('SELECT COALESCE(MAX(sort_order),0) AS m FROM products').get() as { m: number };
  const info = db
    .prepare('INSERT INTO products (code, name, excel_name, notion_name, base_price, sort_order) VALUES (?, ?, ?, ?, ?, ?)')
    .run(code, name, excel_name || null, notion_name || name, base_price ?? 0, max.m + 1);
  res.json({ id: info.lastInsertRowid });
});
app.put('/api/products/:id', (req, res) => {
  const { name, excel_name, notion_name, base_price } = req.body;
  db.prepare(
    `UPDATE products SET name=COALESCE(?,name), excel_name=COALESCE(?,excel_name),
     notion_name=COALESCE(?,notion_name), base_price=COALESCE(?,base_price) WHERE id=?`
  ).run(name ?? null, excel_name ?? null, notion_name ?? null, base_price ?? null, req.params.id);
  res.json({ ok: true });
});
app.delete('/api/products/:id', (req, res) => {
  // 関連する目標・実績も連鎖削除される（FK ON DELETE CASCADE）
  db.prepare('DELETE FROM products WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

// ---------- excel import ----------
app.post('/api/import/excel', async (req, res) => {
  const filePath = (req.body?.path as string) || process.env.TARGET_EXCEL_PATH;
  if (!filePath) return res.status(400).json({ error: 'Excelのパスが指定されていません' });
  if (!fs.existsSync(filePath)) return res.status(404).json({ error: `ファイルが見つかりません: ${filePath}` });
  // 任意ファイル読み取り防止: 許可ベース配下＆Excel拡張子のみ（シンボリックリンクは実体解決して判定）
  const resolved = fs.realpathSync(path.resolve(filePath));
  if (!(resolved === EXCEL_BASE || resolved.startsWith(EXCEL_BASE + path.sep))) {
    return res.status(403).json({ error: `許可範囲外のパスです（${EXCEL_BASE} 配下のみ許可）` });
  }
  if (!ALLOWED_EXCEL_EXT.has(path.extname(resolved).toLowerCase())) {
    return res.status(403).json({ error: 'Excel/CSVファイル(.xlsx/.xlsm/.csv)のみ読み込めます' });
  }
  try {
    const result = await importExcel(filePath);
    res.json({ ok: true, ...result });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// ---------- targets ----------
app.get('/api/targets', (req, res) => {
  const month = req.query.month as string;
  const rows = db
    .prepare(
      `SELECT t.*, m.name AS member_name, p.name AS product_name, p.code AS product_code
       FROM targets t JOIN members m ON m.id=t.member_id JOIN products p ON p.id=t.product_id
       WHERE t.month = ? ORDER BY m.sort_order, p.sort_order`
    )
    .all(month);
  res.json(rows);
});
app.put('/api/targets', (req, res) => {
  const { member_id, product_id, month, contracts, close_rate, trials, first_meetings } = req.body;
  db.prepare(
    `INSERT INTO targets (member_id, product_id, month, contracts, close_rate, trials, first_meetings)
     VALUES (@member_id, @product_id, @month, @contracts, @close_rate, @trials, @first_meetings)
     ON CONFLICT(member_id, product_id, month) DO UPDATE SET
       contracts=excluded.contracts, close_rate=excluded.close_rate,
       trials=excluded.trials, first_meetings=excluded.first_meetings`
  ).run({
    member_id,
    product_id,
    month,
    contracts: contracts ?? 0,
    close_rate: close_rate ?? null,
    trials: trials ?? 0,
    first_meetings: first_meetings ?? 0,
  });
  res.json({ ok: true });
});

// ---------- IS (channel) ----------
app.get('/api/is', (req, res) => {
  const month = req.query.month as string;
  const targets = db.prepare('SELECT * FROM is_targets WHERE month=? ORDER BY channel').all(month);
  const actuals = db.prepare('SELECT * FROM is_actuals WHERE month=? ORDER BY channel').all(month);
  res.json({ targets, actuals });
});
app.put('/api/is/actual', (req, res) => {
  const { month, channel, appointments, calls, budget, note } = req.body;
  if (!month || !channel) return res.status(400).json({ error: 'month と channel は必須です' });
  db.prepare(
    `INSERT INTO is_actuals (month, channel, appointments, calls, budget, note, updated_at)
     VALUES (@month, @channel, @appointments, @calls, @budget, @note, @updated_at)
     ON CONFLICT(month, channel) DO UPDATE SET
       appointments=excluded.appointments, calls=excluded.calls,
       budget=excluded.budget, note=excluded.note, updated_at=excluded.updated_at`
  ).run({
    month,
    channel,
    appointments: appointments ?? 0,
    calls: calls ?? 0,
    budget: budget ?? 0,
    note: note ?? null,
    updated_at: new Date().toISOString(),
  });
  res.json({ ok: true });
});

// ---------- 受注・活動実績（手入力 / Notion由来の閲覧） ----------
app.get('/api/actuals', (req, res) => {
  const month = req.query.month as string;
  const actuals = db
    .prepare(
      `SELECT a.*, m.name AS member_name, p.name AS product_name, p.code AS product_code
       FROM actuals a JOIN members m ON m.id=a.member_id JOIN products p ON p.id=a.product_id
       WHERE a.month=? ORDER BY m.sort_order, p.sort_order`
    )
    .all(month);
  const activity = db
    .prepare(
      `SELECT av.*, m.name AS member_name FROM activity_actuals av
       JOIN members m ON m.id=av.member_id WHERE av.month=? ORDER BY m.sort_order`
    )
    .all(month);
  res.json({ actuals, activity });
});

app.put('/api/actuals', (req, res) => {
  const { member_id, product_id, month, contracts, mrr } = req.body;
  if (!member_id || !product_id || !month) return res.status(400).json({ error: 'member_id, product_id, month は必須です' });
  db.prepare(
    `INSERT INTO actuals (member_id, product_id, month, contracts, mrr, source, updated_at)
     VALUES (@member_id, @product_id, @month, @contracts, @mrr, 'manual', @updated_at)
     ON CONFLICT(member_id, product_id, month) DO UPDATE SET
       contracts=excluded.contracts, mrr=excluded.mrr, source='manual', updated_at=excluded.updated_at`
  ).run({ member_id, product_id, month, contracts: contracts ?? 0, mrr: mrr ?? 0, updated_at: new Date().toISOString() });
  res.json({ ok: true });
});

app.put('/api/activity', (req, res) => {
  const { member_id, month, calls, connected, faxes, first_meetings } = req.body;
  if (!member_id || !month) return res.status(400).json({ error: 'member_id, month は必須です' });
  db.prepare(
    `INSERT INTO activity_actuals (member_id, month, calls, connected, faxes, first_meetings, source, updated_at)
     VALUES (@member_id, @month, @calls, @connected, @faxes, @first_meetings, 'manual', @updated_at)
     ON CONFLICT(member_id, month) DO UPDATE SET
       calls=excluded.calls, connected=excluded.connected, faxes=excluded.faxes,
       first_meetings=excluded.first_meetings, source='manual', updated_at=excluded.updated_at`
  ).run({
    member_id, month,
    calls: calls ?? 0, connected: connected ?? 0, faxes: faxes ?? 0, first_meetings: first_meetings ?? 0,
    updated_at: new Date().toISOString(),
  });
  res.json({ ok: true });
});

// ---------- 進捗共有 / 稼働時間 ----------
app.put('/api/progress-notes', (req, res) => {
  const { member_id, month, content } = req.body;
  if (!member_id || !month) return res.status(400).json({ error: 'member_id, month は必須です' });
  if (typeof content === 'string' && content.length > 2000) return res.status(400).json({ error: '2000文字以内' });
  const now = new Date().toISOString();
  db.prepare(
    `INSERT INTO progress_notes (member_id, month, content, created_at, updated_at)
     VALUES (@member_id, @month, @content, @now, @now)
     ON CONFLICT(member_id, month) DO UPDATE SET content=excluded.content, updated_at=excluded.updated_at`
  ).run({ member_id, month, content: content ?? '', now });
  res.json({ ok: true, updated_at: now });
});

app.put('/api/working-hours', (req, res) => {
  const { member_id, month, hours, note } = req.body;
  if (!member_id || !month) return res.status(400).json({ error: 'member_id, month は必須です' });
  const now = new Date().toISOString();
  db.prepare(
    `INSERT INTO working_hours (member_id, month, hours, note, created_at, updated_at)
     VALUES (@member_id, @month, @hours, @note, @now, @now)
     ON CONFLICT(member_id, month) DO UPDATE SET hours=excluded.hours, note=excluded.note, updated_at=excluded.updated_at`
  ).run({ member_id, month, hours: hours ?? 0, note: note ?? null, now });
  res.json({ ok: true, updated_at: now });
});

// ---------- 個人ページ ----------
app.get('/api/member/:id', (req, res) => {
  const memberId = Number(req.params.id);
  const month = req.query.month as string;
  if (!month) return res.status(400).json({ error: 'month は必須です' });
  const ps = products() as any[];

  const member = db.prepare('SELECT * FROM members WHERE id = ?').get(memberId);
  if (!member) return res.status(404).json({ error: 'メンバーが見つかりません' });

  // 月内: メンバー×プロダクトの目標と実績
  const byProduct = ps.map((p) => {
    const t = db.prepare('SELECT * FROM targets WHERE member_id=? AND product_id=? AND month=?').get(memberId, p.id, month) as any;
    const a = db.prepare('SELECT * FROM actuals WHERE member_id=? AND product_id=? AND month=?').get(memberId, p.id, month) as any;
    return {
      product_id: p.id, name: p.name, code: p.code, base_price: p.base_price,
      target_contracts: t?.contracts || 0,
      target_trials: t?.trials || 0,
      target_first_meetings: t?.first_meetings || 0,
      actual_contracts: a?.contracts || 0,
      actual_mrr: a?.mrr || 0,
    };
  });

  const memTarget = db.prepare('SELECT * FROM member_targets WHERE member_id=? AND month=?').get(memberId, month) as any;
  const activity = db.prepare('SELECT * FROM activity_actuals WHERE member_id=? AND month=?').get(memberId, month) as any;
  const wh = db.prepare('SELECT * FROM working_hours WHERE member_id=? AND month=?').get(memberId, month) as any;
  const note = db.prepare('SELECT * FROM progress_notes WHERE member_id=? AND month=?').get(memberId, month) as any;

  // 月次トレンド: 選択月を含む直近6ヶ月
  const months = db.prepare(
    `SELECT DISTINCT month FROM (
       SELECT month FROM targets WHERE member_id=? UNION SELECT month FROM actuals WHERE member_id=?
     ) WHERE month <= ? ORDER BY month DESC LIMIT 6`
  ).all(memberId, memberId, month) as { month: string }[];
  const sortedMonths = months.map((r) => r.month).sort();
  const trend = sortedMonths.map((m) => {
    const t = db.prepare('SELECT SUM(contracts) AS c FROM targets WHERE member_id=? AND month=?').get(memberId, m) as { c: number };
    const a = db.prepare('SELECT SUM(contracts) AS c, SUM(mrr) AS mrr FROM actuals WHERE member_id=? AND month=?').get(memberId, m) as { c: number; mrr: number };
    return { month: m, target_contracts: t.c || 0, actual_contracts: a.c || 0, actual_mrr: a.mrr || 0 };
  });

  res.json({
    member,
    month,
    byProduct,
    available_hours: memTarget?.available_hours ?? null,
    working_hours: wh?.hours ?? null,
    working_hours_note: wh?.note ?? '',
    working_hours_updated_at: wh?.updated_at ?? null,
    activity: {
      calls: activity?.calls || 0,
      connected: activity?.connected || 0,
      faxes: activity?.faxes || 0,
      first_meetings: activity?.first_meetings || 0,
    },
    progress_note: note?.content ?? '',
    progress_note_updated_at: note?.updated_at ?? null,
    trend,
  });
});

// ---------- マネジメント一覧 ----------
app.get('/api/management', (req, res) => {
  const month = req.query.month as string;
  if (!month) return res.status(400).json({ error: 'month は必須です' });
  const rows = db
    .prepare(
      `SELECT m.id, m.name, m.role,
              mt.available_hours,
              wh.hours AS working_hours,
              wh.updated_at AS hours_updated_at,
              pn.content AS note,
              pn.updated_at AS note_updated_at
       FROM members m
       LEFT JOIN member_targets mt ON mt.member_id=m.id AND mt.month=?
       LEFT JOIN working_hours wh ON wh.member_id=m.id AND wh.month=?
       LEFT JOIN progress_notes pn ON pn.member_id=m.id AND pn.month=?
       WHERE m.active=1 ORDER BY m.sort_order, m.id`
    )
    .all(month, month, month);
  res.json(rows);
});

// ---------- dashboard ----------
app.get('/api/dashboard', (req, res) => {
  const month = req.query.month as string;
  const ms = members() as any[];
  const ps = products() as any[];
  const priceById = new Map(ps.map((p) => [p.id, p.base_price]));

  const tRows = db.prepare('SELECT * FROM targets WHERE month=?').all(month) as any[];
  const aRows = db.prepare('SELECT * FROM actuals WHERE month=?').all(month) as any[];
  const actRows = db.prepare('SELECT * FROM activity_actuals WHERE month=?').all(month) as any[];

  const tKey = (r: any) => `${r.member_id}|${r.product_id}`;
  const tMap = new Map(tRows.map((r) => [tKey(r), r]));
  const aMap = new Map(aRows.map((r) => [tKey(r), r]));
  const actMap = new Map(actRows.map((r) => [r.member_id, r]));

  const memTargetRows = db.prepare('SELECT * FROM member_targets WHERE month=?').all(month) as any[];
  const whRows = db.prepare('SELECT * FROM working_hours WHERE month=?').all(month) as any[];
  const memTargetMap = new Map(memTargetRows.map((r) => [r.member_id, r]));
  const whMap = new Map(whRows.map((r) => [r.member_id, r]));

  // per member
  const byMember = ms.map((m) => {
    let tContracts = 0, aContracts = 0, tMrr = 0, aMrr = 0;
    for (const p of ps) {
      const t = tMap.get(`${m.id}|${p.id}`);
      const a = aMap.get(`${m.id}|${p.id}`);
      if (t) { tContracts += t.contracts || 0; tMrr += (t.contracts || 0) * (priceById.get(p.id) || 0); }
      if (a) { aContracts += a.contracts || 0; aMrr += a.mrr || 0; }
    }
    const act = actMap.get(m.id) || {};
    const mt = memTargetMap.get(m.id);
    const wh = whMap.get(m.id);
    return {
      member_id: m.id, name: m.name, role: m.role,
      target_contracts: tContracts, actual_contracts: aContracts,
      target_mrr: tMrr, actual_mrr: aMrr,
      calls: act.calls || 0, connected: act.connected || 0,
      first_meetings: act.first_meetings || 0, faxes: act.faxes || 0,
      available_hours: mt?.available_hours ?? null,
      working_hours: wh?.hours ?? null,
    };
  });

  // per product
  const byProduct = ps.map((p) => {
    let tContracts = 0, aContracts = 0, aMrr = 0;
    for (const m of ms) {
      const t = tMap.get(`${m.id}|${p.id}`);
      const a = aMap.get(`${m.id}|${p.id}`);
      if (t) tContracts += t.contracts || 0;
      if (a) { aContracts += a.contracts || 0; aMrr += a.mrr || 0; }
    }
    return {
      product_id: p.id, name: p.name, code: p.code,
      target_contracts: tContracts, actual_contracts: aContracts,
      target_mrr: tContracts * (priceById.get(p.id) || 0), actual_mrr: aMrr,
    };
  });

  const sum = (arr: any[], k: string) => arr.reduce((s, x) => s + (x[k] || 0), 0);
  const totals = {
    target_contracts: sum(byMember, 'target_contracts'),
    actual_contracts: sum(byMember, 'actual_contracts'),
    target_mrr: sum(byMember, 'target_mrr'),
    actual_mrr: sum(byMember, 'actual_mrr'),
    target_first_meetings: sum(tRows, 'first_meetings'),
    actual_first_meetings: sum(actRows, 'first_meetings'),
    target_trials: sum(tRows, 'trials'),
    calls: sum(actRows, 'calls'),
    connected: sum(actRows, 'connected'),
  };

  // パイプライン + 前回スナップショットからの差分
  const pipeline = db.prepare('SELECT status, count, mrr FROM pipeline').all() as { status: string; count: number; mrr: number }[];
  const lastTwo = db
    .prepare('SELECT DISTINCT synced_at FROM pipeline_history ORDER BY synced_at DESC LIMIT 2')
    .all() as { synced_at: string }[];
  let prevMap = new Map<string, number>();
  if (lastTwo.length === 2) {
    const prev = db.prepare('SELECT status, count FROM pipeline_history WHERE synced_at=?').all(lastTwo[1].synced_at) as { status: string; count: number }[];
    prevMap = new Map(prev.map((r) => [r.status, r.count]));
  }
  const pipelineWithDiff = pipeline.map((p) => ({
    ...p,
    prev_count: prevMap.has(p.status) ? prevMap.get(p.status)! : null,
    delta: prevMap.has(p.status) ? p.count - (prevMap.get(p.status) || 0) : null,
  }));

  res.json({ month, totals, byMember, byProduct, pipeline: pipelineWithDiff });
});

// ---------- notion ----------
app.post('/api/notion/sync', async (_req, res) => {
  if (!notionConfigured()) return res.status(400).json({ error: 'NOTION_API_KEY が未設定です' });
  try {
    const result = await syncNotion();
    res.json({ ok: true, ...result });
  } catch (e: any) {
    const raw = e.message || '';
    let friendly = raw;
    if (/Could not find database|not shared|Make sure the relevant/i.test(raw)) {
      friendly =
        'Notionインテグレーションが案件・活動DBに接続されていません。' +
        'Notionで対象DB（またはSales DBページ）を開き「•••→コネクト」から連携を追加してください。' +
        '（管理者制限で「コネクト」が出ない場合は管理者に接続を依頼してください）';
    } else if (/unauthorized|API token is invalid|restricted/i.test(raw)) {
      friendly = 'Notionトークンが無効です。.env の NOTION_API_KEY を確認してください。';
    }
    db.prepare('INSERT INTO sync_log (synced_at, source, status, detail) VALUES (?,?,?,?)').run(
      new Date().toISOString(), 'notion', 'error', raw
    );
    res.status(500).json({ error: friendly });
  }
});
app.get('/api/sync-log', (_req, res) => {
  res.json(db.prepare('SELECT * FROM sync_log ORDER BY id DESC LIMIT 20').all());
});

// ---------- static (production) ----------
const dist = path.join(__dirname, '..', 'dist');
if (fs.existsSync(dist)) {
  app.use(express.static(dist));
  app.get('*', (_req, res) => res.sendFile(path.join(dist, 'index.html')));
}

app.listen(PORT, HOST, () => {
  console.log(`SalesFocus API: http://${HOST}:${PORT}  (Notion: ${notionConfigured() ? '設定済み' : '未設定'} / bind: ${HOST})`);
});
