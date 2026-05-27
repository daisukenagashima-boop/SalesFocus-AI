import 'dotenv/config';
import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { db } from './db.js';
import { importExcel } from './excel.js';
import { syncNotion, notionConfigured } from './notion.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
app.use(express.json());

const PORT = Number(process.env.API_PORT) || 8787;

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
    return {
      member_id: m.id, name: m.name, role: m.role,
      target_contracts: tContracts, actual_contracts: aContracts,
      target_mrr: tMrr, actual_mrr: aMrr,
      calls: act.calls || 0, connected: act.connected || 0,
      first_meetings: act.first_meetings || 0, faxes: act.faxes || 0,
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

  const pipeline = db.prepare('SELECT status, count, mrr FROM pipeline ORDER BY count DESC').all();
  res.json({ month, totals, byMember, byProduct, pipeline });
});

// ---------- notion ----------
app.post('/api/notion/sync', async (_req, res) => {
  if (!notionConfigured()) return res.status(400).json({ error: 'NOTION_API_KEY が未設定です' });
  try {
    const result = await syncNotion();
    res.json({ ok: true, ...result });
  } catch (e: any) {
    db.prepare('INSERT INTO sync_log (synced_at, source, status, detail) VALUES (?,?,?,?)').run(
      new Date().toISOString(), 'notion', 'error', e.message
    );
    res.status(500).json({ error: e.message });
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

app.listen(PORT, () => {
  console.log(`SalesFocus API: http://localhost:${PORT}  (Notion: ${notionConfigured() ? '設定済み' : '未設定'})`);
});
