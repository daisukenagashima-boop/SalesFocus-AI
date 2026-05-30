import { useEffect, useState } from 'react';
import { Save, PhoneCall } from 'lucide-react';
import { Card } from '../components/Common';
import { api } from '../lib/api';
import { yen, pct, rateColor, round1, cn } from '../lib/utils';
import { useApp } from '../App';
import type { IsTarget, IsActual } from '../types';

interface Row {
  channel: string;
  target: IsTarget | null;
  appointments: number;
  calls: number;
  budget: number;
  note: string;
}

export default function Actuals() {
  const { month } = useApp();
  const [rows, setRows] = useState<Row[]>([]);
  const [msg, setMsg] = useState('');

  const load = async () => {
    const { targets, actuals } = await api.is(month);
    const aMap = new Map(actuals.map((a) => [a.channel, a]));
    const channels = new Set<string>([...targets.map((t) => t.channel), ...actuals.map((a) => a.channel)]);
    const list: Row[] = [...channels].map((channel) => {
      const t = targets.find((x) => x.channel === channel) || null;
      const a = aMap.get(channel);
      return {
        channel, target: t,
        appointments: a?.appointments ?? 0,
        calls: a?.calls ?? 0,
        budget: a?.budget ?? 0,
        note: a?.note ?? '',
      };
    });
    setRows(list);
  };
  useEffect(() => { load(); }, [month]);

  const set = (channel: string, field: keyof Row, value: any) =>
    setRows((prev) => prev.map((r) => (r.channel === channel ? { ...r, [field]: value } : r)));

  const save = async (r: Row) => {
    await api.saveIsActual({
      month, channel: r.channel,
      appointments: r.appointments, calls: r.calls, budget: r.budget, note: r.note,
    });
    setMsg(`${r.channel} を保存しました`);
    setTimeout(() => setMsg(''), 1500);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-[11px] text-brand-muted flex items-center gap-2">
          <PhoneCall className="w-4 h-4" />
          インサイドセールスのチャネル別実績（アポ数・コール/送付数・予算消化）を手入力します。目標はExcelインポート値です。
        </p>
        {msg && <span className="text-[11px] font-bold text-brand-midnight">{msg}</span>}
      </div>

      {rows.length === 0 ? (
        <Card><p className="text-sm text-brand-muted py-6 text-center">この月のIS目標がありません。目標管理からExcelをインポートしてください。</p></Card>
      ) : (
        <Card noPadding>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-[10px] uppercase tracking-wider text-brand-muted border-b border-brand-border bg-slate-50/40">
                <th className="text-left px-5 py-2.5 font-black">チャネル</th>
                <th className="text-right px-3 py-2.5 font-black">アポ目標</th>
                <th className="text-right px-3 py-2.5 font-black">アポ実績</th>
                <th className="text-right px-3 py-2.5 font-black">達成率</th>
                <th className="text-right px-3 py-2.5 font-black">コール/送付</th>
                <th className="text-right px-3 py-2.5 font-black">予算実績</th>
                <th className="text-left px-3 py-2.5 font-black">メモ</th>
                <th className="px-3 py-2.5"></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const tgt = r.target?.appointments ?? 0;
                const pc = pct(r.appointments, tgt);
                return (
                  <tr key={r.channel} className="border-b border-brand-border/50 hover:bg-slate-50/40">
                    <td className="px-5 py-1.5 font-bold text-brand-text">{r.channel}</td>
                    <td className="px-3 py-1.5 text-right font-mono text-brand-muted">{round1(tgt)}</td>
                    <td className="px-3 py-1.5 text-right">
                      <input type="number" value={r.appointments} onChange={(e) => set(r.channel, 'appointments', Number(e.target.value))}
                        className="w-16 text-right font-mono text-sm px-2 py-1 rounded border border-transparent hover:border-brand-border focus:border-brand-midnight focus:outline-none" />
                    </td>
                    <td className={cn('px-3 py-1.5 text-right font-mono font-bold', rateColor(pc))}>{pc}%</td>
                    <td className="px-3 py-1.5 text-right">
                      <input type="number" value={r.calls} onChange={(e) => set(r.channel, 'calls', Number(e.target.value))}
                        className="w-20 text-right font-mono text-sm px-2 py-1 rounded border border-transparent hover:border-brand-border focus:border-brand-midnight focus:outline-none" />
                    </td>
                    <td className="px-3 py-1.5 text-right">
                      <input type="number" value={r.budget} onChange={(e) => set(r.channel, 'budget', Number(e.target.value))}
                        className="w-24 text-right font-mono text-sm px-2 py-1 rounded border border-transparent hover:border-brand-border focus:border-brand-midnight focus:outline-none" />
                    </td>
                    <td className="px-3 py-1.5">
                      <input type="text" value={r.note} onChange={(e) => set(r.channel, 'note', e.target.value)}
                        className="w-full text-sm px-2 py-1 rounded border border-transparent hover:border-brand-border focus:border-brand-midnight focus:outline-none" />
                    </td>
                    <td className="px-3 py-1.5 text-right">
                      <button onClick={() => save(r)} className="text-brand-muted hover:text-brand-midnight" title="保存">
                        <Save className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-brand-border font-bold bg-slate-50/40">
                <td className="px-5 py-2">合計</td>
                <td className="px-3 py-2 text-right font-mono">{round1(rows.reduce((s, r) => s + (r.target?.appointments ?? 0), 0))}</td>
                <td className="px-3 py-2 text-right font-mono">{round1(rows.reduce((s, r) => s + r.appointments, 0))}</td>
                <td></td>
                <td className="px-3 py-2 text-right font-mono">{round1(rows.reduce((s, r) => s + r.calls, 0))}</td>
                <td className="px-3 py-2 text-right font-mono">{yen(rows.reduce((s, r) => s + r.budget, 0))}</td>
                <td colSpan={2}></td>
              </tr>
            </tfoot>
          </table>
        </Card>
      )}
    </div>
  );
}
