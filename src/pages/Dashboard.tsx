import { useEffect, useState } from 'react';
import { Target, DollarSign, PhoneCall, Handshake, TrendingUp } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell,
} from 'recharts';
import { Card, KpiCard, Badge } from '../components/Common';
import { api } from '../lib/api';
import { yen, pct, rateColor, round1, cn } from '../lib/utils';
import { useApp } from '../App';
import type { Dashboard as Dash } from '../types';

const PIPE_ORDER = ['リード', 'アプローチ中', 'アポ取得', '長期育成中', 'トライアル準備中', 'トライアル中', '契約準備中', '契約', '休眠', '撤退'];

export default function Dashboard() {
  const { month } = useApp();
  const [d, setD] = useState<Dash | null>(null);
  const [err, setErr] = useState('');

  useEffect(() => {
    api.dashboard(month).then(setD).catch((e) => setErr(e.message));
  }, [month]);

  if (err) return <div className="text-red-600 text-sm">{err}</div>;
  if (!d) return <div className="text-brand-muted text-sm">読み込み中…</div>;

  const t = d.totals;
  const contractPct = pct(t.actual_contracts, t.target_contracts);
  const mrrPct = pct(t.actual_mrr, t.target_mrr);

  const memberChart = d.byMember.map((m) => ({
    name: m.name.slice(0, 3),
    目標: round1(m.target_contracts),
    実績: round1(m.actual_contracts),
  }));

  const pipeline = [...d.pipeline].sort(
    (a, b) => (PIPE_ORDER.indexOf(a.status) + 99) % 999 - ((PIPE_ORDER.indexOf(b.status) + 99) % 999)
  );

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="契約数 (実績/目標)" value={`${round1(t.actual_contracts)} / ${round1(t.target_contracts)}`} icon={Target}
          trend={{ val: `${contractPct}%`, positive: contractPct >= 100 }} />
        <KpiCard label="MRR (実績)" value={yen(t.actual_mrr)} icon={DollarSign}
          trend={{ val: `${mrrPct}%`, positive: mrrPct >= 100 }} />
        <KpiCard label="商談数 (実績/目標)" value={`${round1(t.actual_first_meetings)} / ${round1(t.target_first_meetings)}`} icon={Handshake} />
        <KpiCard label="架電 / 通電" value={`${round1(t.calls)} / ${round1(t.connected)}`} icon={PhoneCall} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card title="メンバー別 契約数" subtitle="目標 vs 実績" icon={TrendingUp}>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={memberChart} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#eef2f6" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="目標" fill="#cbd5e1" radius={[3, 3, 0, 0]} />
              <Bar dataKey="実績" fill="#0F172A" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card title="案件パイプライン" subtitle="Notion同期" icon={TrendingUp}>
          {pipeline.length === 0 ? (
            <p className="text-sm text-brand-muted py-8 text-center">Notion未同期です。「Notion同期」から取得してください。</p>
          ) : (
            <div className="space-y-2">
              {pipeline.map((p) => {
                const max = Math.max(...pipeline.map((x) => x.count), 1);
                return (
                  <div key={p.status} className="flex items-center gap-3">
                    <span className="text-[11px] font-bold text-brand-text w-28 truncate">{p.status}</span>
                    <div className="flex-1 h-5 bg-slate-100 rounded overflow-hidden">
                      <div className="h-full bg-brand-midnight rounded" style={{ width: `${(p.count / max) * 100}%` }} />
                    </div>
                    <span className="text-[11px] font-mono font-bold w-10 text-right">{p.count}</span>
                    <span className="text-[10px] font-mono text-brand-muted w-20 text-right">{yen(p.mrr)}</span>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      </div>

      <Card title="プロダクト別サマリー" noPadding>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-[10px] uppercase tracking-wider text-brand-muted border-b border-brand-border">
              <th className="text-left px-5 py-2 font-black">プロダクト</th>
              <th className="text-right px-3 py-2 font-black">契約 目標</th>
              <th className="text-right px-3 py-2 font-black">契約 実績</th>
              <th className="text-right px-3 py-2 font-black">達成率</th>
              <th className="text-right px-5 py-2 font-black">MRR 実績</th>
            </tr>
          </thead>
          <tbody>
            {d.byProduct.map((p) => {
              const pc = pct(p.actual_contracts, p.target_contracts);
              return (
                <tr key={p.product_id} className="border-b border-brand-border/60 hover:bg-slate-50/50">
                  <td className="px-5 py-2.5 font-bold text-brand-text">{p.name}</td>
                  <td className="px-3 py-2.5 text-right font-mono text-brand-muted">{round1(p.target_contracts)}</td>
                  <td className="px-3 py-2.5 text-right font-mono font-bold">{round1(p.actual_contracts)}</td>
                  <td className={cn('px-3 py-2.5 text-right font-mono font-bold', rateColor(pc))}>{pc}%</td>
                  <td className="px-5 py-2.5 text-right font-mono">{yen(p.actual_mrr)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Card>

      <Card title="メンバー別 詳細" noPadding>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-[10px] uppercase tracking-wider text-brand-muted border-b border-brand-border">
              <th className="text-left px-5 py-2 font-black">メンバー</th>
              <th className="text-right px-3 py-2 font-black">契約 実績/目標</th>
              <th className="text-right px-3 py-2 font-black">達成率</th>
              <th className="text-right px-3 py-2 font-black">MRR</th>
              <th className="text-right px-3 py-2 font-black">商談</th>
              <th className="text-right px-3 py-2 font-black">架電</th>
              <th className="text-right px-5 py-2 font-black">通電</th>
            </tr>
          </thead>
          <tbody>
            {d.byMember.map((m) => {
              const pc = pct(m.actual_contracts, m.target_contracts);
              return (
                <tr key={m.member_id} className="border-b border-brand-border/60 hover:bg-slate-50/50">
                  <td className="px-5 py-2.5 font-bold text-brand-text flex items-center gap-2">
                    {m.name}<Badge variant="info">{m.role}</Badge>
                  </td>
                  <td className="px-3 py-2.5 text-right font-mono">{round1(m.actual_contracts)} / {round1(m.target_contracts)}</td>
                  <td className={cn('px-3 py-2.5 text-right font-mono font-bold', rateColor(pc))}>{pc}%</td>
                  <td className="px-3 py-2.5 text-right font-mono">{yen(m.actual_mrr)}</td>
                  <td className="px-3 py-2.5 text-right font-mono">{round1(m.first_meetings)}</td>
                  <td className="px-3 py-2.5 text-right font-mono">{round1(m.calls)}</td>
                  <td className="px-5 py-2.5 text-right font-mono">{round1(m.connected)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
