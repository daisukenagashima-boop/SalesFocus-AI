import ExcelJS from 'exceljs';
import { db } from './db.js';

type CellVal = ExcelJS.CellValue;

function num(v: CellVal): number | null {
  if (v == null) return null;
  if (typeof v === 'number') return v;
  if (typeof v === 'object') {
    const r = (v as any).result;
    if (typeof r === 'number') return r;
    return null; // formula error (#DIV/0! etc.) or non-numeric
  }
  const n = Number(String(v).replace(/[, %円件]/g, ''));
  return Number.isFinite(n) ? n : null;
}

function text(v: CellVal): string {
  if (v == null) return '';
  if (typeof v === 'object') {
    const o = v as any;
    if (o.richText) return o.richText.map((t: any) => t.text).join('');
    if (o.text) return String(o.text);
    if (o.result != null) return String(o.result);
    if (o.formula) return '';
  }
  return String(v).trim();
}

function toMonth(v: CellVal): string | null {
  if (v == null) return null;
  if (v instanceof Date) {
    return `${v.getFullYear()}-${String(v.getMonth() + 1).padStart(2, '0')}`;
  }
  const s = text(v).trim();
  const m = s.match(/(\d{4})[\/\-.年](\d{1,2})/);
  if (m) return `${m[1]}-${m[2].padStart(2, '0')}`;
  return null;
}

function readMonthHeader(ws: ExcelJS.Worksheet, headerRow: number, startCol: number) {
  const cols: { col: number; month: string }[] = [];
  for (let c = startCol; c <= ws.columnCount; c++) {
    const month = toMonth(ws.getRow(headerRow).getCell(c).value);
    if (month) cols.push({ col: c, month });
  }
  return cols;
}

function getProductMap() {
  const rows = db.prepare('SELECT id, excel_name FROM products').all() as { id: number; excel_name: string }[];
  const map = new Map<string, number>();
  for (const r of rows) if (r.excel_name) map.set(r.excel_name, r.id);
  return map;
}

const NON_MEMBER = /(合算|合計|全体|全員|ギャップ|vs|予定値|実績値|サマリ|目標|小計|平均)/;

function isLikelyMember(name: string): boolean {
  if (!name || name.length > 8) return false;
  if (NON_MEMBER.test(name)) return false;
  if (/^増員/.test(name)) return false; // 増員枠（将来の採用枠）は実在メンバーではない
  return true;
}

function findOrCreateMember(shortName: string): number | null {
  const found = db.prepare('SELECT id FROM members WHERE short_name = ? OR name = ?').get(shortName, shortName) as { id: number } | undefined;
  if (found) return found.id;
  if (!isLikelyMember(shortName)) return null;
  const max = db.prepare('SELECT COALESCE(MAX(sort_order),0) AS m FROM members').get() as { m: number };
  const info = db.prepare('INSERT INTO members (name, short_name, role, sort_order) VALUES (?, ?, ?, ?)').run(shortName, shortName, 'FS', max.m + 1);
  return Number(info.lastInsertRowid);
}

function extractChannel(label: string): string | null {
  const m = label.match(/^[①-⑩]\s*(.+)$/);
  if (!m) return null;
  return m[1].split(/[（(　\s]/)[0].trim();
}

export interface ImportResult {
  months: string[];
  targets: number;
  isTargets: number;
  members: string[];
}

export async function importExcel(filePath: string): Promise<ImportResult> {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(filePath);

  const productMap = getProductMap();
  const monthSet = new Set<string>();
  const memberSet = new Set<string>();
  let targetCount = 0;
  let isCount = 0;

  const upsertTarget = db.prepare(`
    INSERT INTO targets (member_id, product_id, month, contracts, close_rate, trials, first_meetings)
    VALUES (@member_id, @product_id, @month, @contracts, @close_rate, @trials, @first_meetings)
    ON CONFLICT(member_id, product_id, month) DO UPDATE SET
      contracts = COALESCE(excluded.contracts, targets.contracts),
      close_rate = COALESCE(excluded.close_rate, targets.close_rate),
      trials = COALESCE(excluded.trials, targets.trials),
      first_meetings = COALESCE(excluded.first_meetings, targets.first_meetings)
  `);

  const upsertIs = db.prepare(`
    INSERT INTO is_targets (month, channel, appointments, calls, budget)
    VALUES (@month, @channel, @appointments, @calls, @budget)
    ON CONFLICT(month, channel) DO UPDATE SET
      appointments = COALESCE(excluded.appointments, is_targets.appointments),
      calls = COALESCE(excluded.calls, is_targets.calls),
      budget = COALESCE(excluded.budget, is_targets.budget)
  `);

  // --- 個別管理: メンバー × プロダクト × 月の目標 ---
  const indiv = wb.getWorksheet('個別管理');
  if (indiv) {
    const monthCols = readMonthHeader(indiv, 3, 3);
    for (const mc of monthCols) monthSet.add(mc.month);

    let currentMemberId: number | null = null;
    let currentProductId: number | null = null;
    let mode: 'target' | 'actual' = 'target';
    // 目標値を一時バッファ: key=`${product}` → {contracts,...} per month
    const pending = new Map<string, { contracts?: Map<string, number>; close_rate?: Map<string, number>; trials?: Map<string, number>; first_meetings?: Map<string, number> }>();

    const flush = () => {
      if (currentMemberId == null) return;
      for (const [pid, fields] of pending) {
        const productId = Number(pid);
        const months = new Set<string>();
        for (const f of [fields.contracts, fields.close_rate, fields.trials, fields.first_meetings]) {
          if (f) for (const k of f.keys()) months.add(k);
        }
        for (const month of months) {
          upsertTarget.run({
            member_id: currentMemberId,
            product_id: productId,
            month,
            contracts: fields.contracts?.get(month) ?? null,
            close_rate: fields.close_rate?.get(month) ?? null,
            trials: fields.trials?.get(month) ?? null,
            first_meetings: fields.first_meetings?.get(month) ?? null,
          });
          targetCount++;
        }
      }
      pending.clear();
    };

    const rowValues = (r: number) => {
      const out = new Map<string, number>();
      for (const mc of monthCols) {
        const v = num(indiv.getRow(r).getCell(mc.col).value);
        if (v != null) out.set(mc.month, v);
      }
      return out;
    };

    for (let r = 1; r <= indiv.rowCount; r++) {
      const label = text(indiv.getRow(r).getCell(1).value).trim();
      if (!label) continue;

      if (label.startsWith('─') && label.includes('実績')) {
        mode = 'actual';
        continue;
      }

      const arrow = label.match(/^▶\s*(.+)$/);
      if (arrow) {
        const name = arrow[1].trim();
        if (productMap.has(name)) {
          currentProductId = productMap.get(name)!;
        } else {
          // 新しいメンバー区画
          flush();
          mode = 'target';
          currentMemberId = findOrCreateMember(name);
          currentProductId = null;
          memberSet.add(name);
        }
        continue;
      }

      if (mode !== 'target' || currentMemberId == null || currentProductId == null) continue;

      const key = String(currentProductId);
      if (!pending.has(key)) pending.set(key, {});
      const buf = pending.get(key)!;
      if (label === '契約数（新規）') buf.contracts = rowValues(r);
      else if (label === '受注率') buf.close_rate = rowValues(r);
      else if (label === '必要トライアル数') buf.trials = rowValues(r);
      else if (label === '必要初回商談数') buf.first_meetings = rowValues(r);
    }
    flush();
  }

  // --- IS管理: チャネル × 月の目標 ---
  const is = wb.getWorksheet('IS管理');
  if (is) {
    const monthCols = readMonthHeader(is, 3, 3);
    for (const mc of monthCols) monthSet.add(mc.month);
    let currentChannel: string | null = null;
    const buf: Record<string, Map<string, number>> = {};

    const flushChannel = () => {
      if (!currentChannel) return;
      const months = new Set<string>();
      for (const f of Object.values(buf)) for (const k of f.keys()) months.add(k);
      for (const month of months) {
        upsertIs.run({
          month,
          channel: currentChannel,
          appointments: buf.appointments?.get(month) ?? null,
          calls: buf.calls?.get(month) ?? null,
          budget: buf.budget?.get(month) ?? null,
        });
        isCount++;
      }
      for (const k of Object.keys(buf)) delete buf[k];
    };

    const rowValues = (r: number) => {
      const out = new Map<string, number>();
      for (const mc of monthCols) {
        const v = num(is.getRow(r).getCell(mc.col).value);
        if (v != null) out.set(mc.month, v);
      }
      return out;
    };

    for (let r = 1; r <= is.rowCount; r++) {
      const label = text(is.getRow(r).getCell(1).value).trim();
      if (!label) continue;
      const channel = extractChannel(label);
      if (channel) {
        flushChannel();
        currentChannel = channel;
        continue;
      }
      if (!currentChannel) continue;
      if (label === '目標アポ数') buf.appointments = rowValues(r);
      else if (label === '必要コール数' || label === '必要送付数') buf.calls = rowValues(r);
      else if (label === '月間予算') buf.budget = rowValues(r);
    }
    flushChannel();
  }

  db.prepare('INSERT INTO sync_log (synced_at, source, status, detail) VALUES (?, ?, ?, ?)').run(
    new Date().toISOString(),
    'excel',
    'ok',
    `targets=${targetCount}, is=${isCount}`
  );

  return {
    months: [...monthSet].sort(),
    targets: targetCount,
    isTargets: isCount,
    members: [...memberSet],
  };
}
