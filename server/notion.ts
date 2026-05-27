import { Client } from '@notionhq/client';
import { db } from './db.js';

const DEALS_DB = process.env.NOTION_DEALS_DB_ID || 'b2eaa45a-3f13-83bc-bb6e-812739cff3a5';
const ACT_DB = process.env.NOTION_ACTIVITIES_DB_ID || 'c80aa45a-3f13-839c-b0be-019a9989992e';

export function notionConfigured() {
  return Boolean(process.env.NOTION_API_KEY);
}

function client() {
  if (!process.env.NOTION_API_KEY) throw new Error('NOTION_API_KEY が未設定です（.env を設定してください）');
  return new Client({ auth: process.env.NOTION_API_KEY });
}

type Member = { id: number; name: string; short_name: string | null; notion_person_id: string | null };

function loadMembers(): Member[] {
  return db.prepare('SELECT id, name, short_name, notion_person_id FROM members WHERE active = 1').all() as Member[];
}

function buildMatcher() {
  const members = loadMembers();
  const byNotionId = new Map<string, number>();
  for (const m of members) if (m.notion_person_id) byNotionId.set(m.notion_person_id, m.id);

  const learn = db.prepare('UPDATE members SET notion_person_id = ? WHERE id = ?');

  return (personId: string | undefined, personName: string | undefined): number | null => {
    if (personId && byNotionId.has(personId)) return byNotionId.get(personId)!;
    if (!personName) return personId && byNotionId.size ? null : null;
    const norm = personName.replace(/\s/g, '');
    for (const m of members) {
      const full = m.name.replace(/\s/g, '');
      const short = (m.short_name || '').replace(/\s/g, '');
      if (full === norm || (short && norm.includes(short)) || (full && norm.includes(full)) || full.includes(norm)) {
        if (personId && !m.notion_person_id) {
          learn.run(personId, m.id);
          byNotionId.set(personId, m.id);
        }
        return m.id;
      }
    }
    return null;
  };
}

function productByNotionName() {
  const rows = db.prepare('SELECT id, notion_name FROM products').all() as { id: number; notion_name: string }[];
  const map = new Map<string, number>();
  for (const r of rows) if (r.notion_name) map.set(r.notion_name, r.id);
  return map;
}

async function queryAll(databaseId: string): Promise<any[]> {
  const c = client();
  const pages: any[] = [];
  let cursor: string | undefined = undefined;
  do {
    const resp: any = await c.databases.query({ database_id: databaseId, start_cursor: cursor, page_size: 100 });
    pages.push(...resp.results);
    cursor = resp.has_more ? resp.next_cursor : undefined;
  } while (cursor);
  return pages;
}

const sel = (p: any, key: string): string | undefined => p?.[key]?.select?.name;
const numProp = (p: any, key: string): number => (typeof p?.[key]?.number === 'number' ? p[key].number : 0);
const dateProp = (p: any, key: string): string | undefined => p?.[key]?.date?.start;
const firstPerson = (p: any, ...keys: string[]): { id?: string; name?: string } => {
  for (const key of keys) {
    const arr = p?.[key]?.people;
    if (Array.isArray(arr) && arr.length) return { id: arr[0].id, name: arr[0].name };
  }
  return {};
};

export interface SyncResult {
  deals: number;
  activities: number;
  contractsRows: number;
  activityRows: number;
  pipeline: { status: string; count: number; mrr: number }[];
  unmatched: string[];
}

export async function syncNotion(): Promise<SyncResult> {
  const match = buildMatcher();
  const productMap = productByNotionName();
  const unmatched = new Set<string>();
  const now = new Date().toISOString();

  // ===== 案件DB → 受注実績 + パイプライン =====
  const deals = await queryAll(DEALS_DB);
  const contractAgg = new Map<string, { member_id: number; product_id: number; month: string; contracts: number; mrr: number }>();
  const pipeAgg = new Map<string, { status: string; count: number; mrr: number }>();

  for (const page of deals) {
    const p = page.properties;
    const status = sel(p, '営業ステータス') || '未設定';
    const mrr = numProp(p, '想定MRR');
    const pipe = pipeAgg.get(status) || { status, count: 0, mrr: 0 };
    pipe.count++;
    pipe.mrr += mrr;
    pipeAgg.set(status, pipe);

    if (status !== '契約') continue;
    const close = dateProp(p, '受注日');
    if (!close) continue;
    const month = close.slice(0, 7);
    const person = firstPerson(p, '営業担当者', 'メンバー');
    const memberId = match(person.id, person.name);
    if (!memberId) {
      if (person.name) unmatched.add(person.name);
      continue;
    }
    const productName = sel(p, '対象プロダクト');
    const productId = productName ? productMap.get(productName) : undefined;
    if (!productId) continue;
    const key = `${memberId}|${productId}|${month}`;
    const agg = contractAgg.get(key) || { member_id: memberId, product_id: productId, month, contracts: 0, mrr: 0 };
    agg.contracts++;
    agg.mrr += mrr;
    contractAgg.set(key, agg);
  }

  // ===== 活動DB → 活動実績 =====
  const activities = await queryAll(ACT_DB);
  const actAgg = new Map<string, { member_id: number; month: string; calls: number; connected: number; faxes: number; first_meetings: number }>();

  for (const page of activities) {
    const p = page.properties;
    const date = dateProp(p, '活動日時') || page.created_time;
    if (!date) continue;
    const month = date.slice(0, 7);
    const person = firstPerson(p, '営業担当者', 'メンバー');
    const memberId = match(person.id, person.name);
    if (!memberId) {
      if (person.name) unmatched.add(person.name);
      continue;
    }
    const type = sel(p, '活動タイプ');
    const dir = sel(p, '通話方向');
    const result = sel(p, '通話結果');
    const dealType = sel(p, '商談種別');

    const key = `${memberId}|${month}`;
    const agg = actAgg.get(key) || { member_id: memberId, month, calls: 0, connected: 0, faxes: 0, first_meetings: 0 };
    if (type === '電話' && dir === '発信') {
      agg.calls++;
      if (result === '応答済み' || result === '接続済み') agg.connected++;
    }
    if (type === 'FAX送信') agg.faxes++;
    if (type === '商談議事録' || dealType === '営業商談') agg.first_meetings++;
    actAgg.set(key, agg);
  }

  // ===== 書き込み（トランザクション）=====
  const write = db.transaction(() => {
    // 手入力(manual)行は保護。Notion由来の行のみ入れ替える。
    db.prepare('DELETE FROM actuals WHERE source = ?').run('notion');
    const insA = db.prepare(`
      INSERT INTO actuals (member_id, product_id, month, contracts, mrr, source, updated_at)
      VALUES (@member_id, @product_id, @month, @contracts, @mrr, 'notion', @updated_at)
      ON CONFLICT(member_id, product_id, month) DO UPDATE SET
        contracts = excluded.contracts, mrr = excluded.mrr, source='notion', updated_at = excluded.updated_at
        WHERE actuals.source != 'manual'
    `);
    for (const a of contractAgg.values()) insA.run({ ...a, updated_at: now });

    db.prepare('DELETE FROM activity_actuals WHERE source = ?').run('notion');
    const insB = db.prepare(`
      INSERT INTO activity_actuals (member_id, month, calls, connected, faxes, first_meetings, source, updated_at)
      VALUES (@member_id, @month, @calls, @connected, @faxes, @first_meetings, 'notion', @updated_at)
      ON CONFLICT(member_id, month) DO UPDATE SET
        calls=excluded.calls, connected=excluded.connected, faxes=excluded.faxes,
        first_meetings=excluded.first_meetings, source='notion', updated_at=excluded.updated_at
        WHERE activity_actuals.source != 'manual'
    `);
    for (const a of actAgg.values()) insB.run({ ...a, updated_at: now });

    db.prepare('DELETE FROM pipeline').run();
    const insP = db.prepare('INSERT INTO pipeline (status, count, mrr, updated_at) VALUES (?, ?, ?, ?)');
    for (const pp of pipeAgg.values()) insP.run(pp.status, pp.count, pp.mrr, now);

    db.prepare('INSERT INTO sync_log (synced_at, source, status, detail) VALUES (?, ?, ?, ?)').run(
      now,
      'notion',
      'ok',
      `deals=${deals.length}, activities=${activities.length}, contractRows=${contractAgg.size}, unmatched=${[...unmatched].join('/') || 'none'}`
    );
  });
  write();

  return {
    deals: deals.length,
    activities: activities.length,
    contractsRows: contractAgg.size,
    activityRows: actAgg.size,
    pipeline: [...pipeAgg.values()].sort((a, b) => b.count - a.count),
    unmatched: [...unmatched],
  };
}
