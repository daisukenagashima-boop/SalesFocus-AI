import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Target as TargetIcon, DollarSign, PhoneCall, Handshake, FlaskConical, GitBranch, ChevronRight, Clock, MessageSquare } from 'lucide-react';
import { Card, Badge, ProgressBar } from '../components/Common';
import { api } from '../lib/api';
import { yen, yenMan, intRound, pct, rateColor, rateBg, remaining, deltaText, round1, cn } from '../lib/utils';
import { useApp } from '../App';
import type { Dashboard as Dash, ManagementRow } from '../types';

const PIPE_ORDER = [
  'リード', 'アプローチ中', 'アポ取得', '長期育成中',
  'トライアル準備中', 'トライアル中', '契約準備中', '契約',
  '休眠', '撤退',
];

export default function Dashboard() {
  const { month } = useApp();
  const [d, setD] = useState<Dash | null>(null);
  const [mgmt, setMgmt] = useState<ManagementRow[]>([]);
  const [err, setErr] = useState('');

  useEffect(() => {
    api.dashboard(month).then(setD).catch((e) => setErr(e.message));
    api.management(month).then(setMgmt).catch(() => {});
  }, [month]);

  if (err) return <div className="text-red-600 text-sm">{err}</div>;
  if (!d) return <div className="text-brand-muted text-sm">読み込み中…</div>;

  const t = d.totals;
  const contractPct = pct(t.actual_contracts, t.target_contracts);
  const mrrPct = pct(t.actual_mrr, t.target_mrr);
  const meetingPct = pct(t.actual_first_meetings, t.target_first_meetings);

  // pipeline 並び替え + 集計
  const pipeMap = new Map(d.pipeline.map((p) => [p.status, p]));
  const pipeOrdered = [
    ...PIPE_ORDER.map((s) => pipeMap.get(s)).filter(Boolean) as typeof d.pipeline,
    ...d.pipeline.filter((p) => !PIPE_ORDER.includes(p.status)),
  ];
  const pipeMax = Math.max(...pipeOrdered.map((p) => p.count), 1);
  const pipeTotalActive = pipeOrdered
    .filter((p) => !['撤退', '休眠'].includes(p.status))
    .reduce((s, p) => s + p.count, 0);
  const trialNow = (pipeMap.get('トライアル中')?.count || 0) + (pipeMap.get('トライアル準備中')?.count || 0);

  return (
    <div className="space-y-6">
      {/* ====== メインKPI (大きく) ====== */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <MainKpi label="契約数" icon={TargetIcon}
          actual={intRound(t.actual_contracts, { keepZero: true, suffix: '件' })}
          target={`${intRound(t.target_contracts, { keepZero: true })}件 目標`}
          actualRaw={t.actual_contracts} targetRaw={t.target_contracts}
          percent={contractPct} fullDetail={`実績 ${t.actual_contracts.toFixed(1)} / 目標 ${t.target_contracts.toFixed(1)}`}
        />
        <MainKpi label="MRR" icon={DollarSign}
          actual={yenMan(t.actual_mrr)}
          target={`${yenMan(t.target_mrr)} 目標`}
          actualRaw={t.actual_mrr} targetRaw={t.target_mrr}
          percent={mrrPct} fullDetail={`実績 ${yen(t.actual_mrr)} / 目標 ${yen(t.target_mrr)}`}
          remainingFmt={(n) => yenMan(n)}
        />
      </div>

      {/* ====== サブKPI (横並び) ====== */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <SubKpi label="商談数" icon={Handshake}
          main={`${intRound(t.actual_first_meetings, { keepZero: true })}件`}
          sub={`目標 ${intRound(t.target_first_meetings, { keepZero: true })}件`}
          rate={meetingPct} />
        <SubKpi label="架電 / 通電" icon={PhoneCall}
          main={`${intRound(t.calls, { keepZero: true })} / ${intRound(t.connected, { keepZero: true })}`}
          sub="" />
        <SubKpi label="案件パイプ計" icon={GitBranch}
          main={`${pipeTotalActive}件`}
          sub="撤退・休眠を除く" />
        <SubKpi label="トライアル中" icon={FlaskConical}
          main={`${trialNow}件`}
          sub="準備中含む" />
      </div>

      {/* ====== メンバー別 契約進捗 ====== */}
      <Card title="メンバー別 契約進捗" subtitle="目標 vs 実績" noPadding>
        <div className="divide-y divide-brand-border/50">
          {d.byMember.filter((m) => m.target_contracts > 0 || m.actual_contracts > 0).map((m) => {
            const p = pct(m.actual_contracts, m.target_contracts);
            const rem = remaining(m.actual_contracts, m.target_contracts);
            return (
              <Link key={m.member_id} to={`/member/${m.member_id}`}
                className="grid grid-cols-12 gap-3 items-center px-5 py-3 hover:bg-slate-50/70 transition-colors">
                <div className="col-span-3 font-bold text-brand-text flex items-center gap-2 min-w-0">
                  <span className="whitespace-nowrap">{m.name}</span><Badge variant="info">{m.role}</Badge>
                </div>
                <div className="col-span-3">
                  <ProgressBar percent={p} barClass={rateBg(p)} thickness="normal" />
                </div>
                <div className={cn('col-span-1 text-right font-mono font-black text-sm', rateColor(p))}>{p}%</div>
                <div className="col-span-2 text-right font-mono text-sm whitespace-nowrap">
                  <span className="font-bold">{intRound(m.actual_contracts, { keepZero: true })}</span>
                  <span className="text-brand-muted"> / {intRound(m.target_contracts, { keepZero: true })}件</span>
                </div>
                <div className="col-span-2 text-right text-[11px] text-brand-muted whitespace-nowrap">
                  {rem > 0 ? `あと ${rem} 件` : '✓ 達成'}
                </div>
                <ChevronRight className="col-span-1 w-4 h-4 text-brand-muted justify-self-end" />
              </Link>
            );
          })}
          {d.byMember.every((m) => m.target_contracts === 0 && m.actual_contracts === 0) && (
            <div className="px-5 py-6 text-center text-brand-muted text-sm">この月の目標・実績データがありません</div>
          )}
        </div>
      </Card>

      {/* ====== マネジメント一覧（稼働時間 + 進捗共有） ====== */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card title="メンバー稼働時間" subtitle="目標 vs 実績" icon={Clock} noPadding>
          <div className="divide-y divide-brand-border/50">
            {mgmt.filter((r) => r.available_hours != null || r.working_hours != null).map((r) => {
              const p = r.available_hours ? pct(r.working_hours || 0, r.available_hours) : 0;
              return (
                <Link key={r.id} to={`/member/${r.id}`} className="grid grid-cols-12 gap-3 items-center px-5 py-2.5 hover:bg-slate-50/70">
                  <div className="col-span-3 font-bold text-brand-text text-sm">{r.name}</div>
                  <div className="col-span-5"><ProgressBar percent={p} barClass={rateBg(p)} thickness="thin" /></div>
                  <div className={cn('col-span-1 text-right text-[11px] font-mono font-black', rateColor(p))}>{p}%</div>
                  <div className="col-span-2 text-right font-mono text-[11px] whitespace-nowrap">
                    {r.working_hours != null ? <span className="font-bold">{round1(r.working_hours)}h</span> : <span className="text-brand-muted">—</span>}
                    <span className="text-brand-muted"> / {r.available_hours != null ? round1(r.available_hours) + 'h' : '—'}</span>
                  </div>
                  <ChevronRight className="col-span-1 w-3.5 h-3.5 text-brand-muted justify-self-end" />
                </Link>
              );
            })}
            {mgmt.every((r) => r.available_hours == null && r.working_hours == null) && (
              <div className="px-5 py-6 text-center text-brand-muted text-sm">この月の稼働時間データがありません</div>
            )}
          </div>
        </Card>

        <Card title="メンバー進捗共有" subtitle="最終更新順" icon={MessageSquare} noPadding>
          <div className="divide-y divide-brand-border/50">
            {(() => {
              const withNotes = mgmt.filter((r) => r.note && r.note.trim()).sort((a, b) =>
                (b.note_updated_at || '').localeCompare(a.note_updated_at || '')
              );
              if (withNotes.length === 0) {
                return <div className="px-5 py-6 text-center text-brand-muted text-sm">この月の進捗共有はまだありません</div>;
              }
              return withNotes.map((r) => (
                <Link key={r.id} to={`/member/${r.id}`} className="block px-5 py-3 hover:bg-slate-50/70">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-sm text-brand-text">{r.name}</span>
                    <span className="text-[10px] text-brand-muted">{r.note_updated_at ? new Date(r.note_updated_at).toLocaleString('ja-JP') : ''}</span>
                  </div>
                  <p className="text-[12px] text-brand-text leading-relaxed line-clamp-2">{r.note}</p>
                </Link>
              ));
            })()}
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* ====== 案件パイプライン ====== */}
        <Card title="案件パイプライン" subtitle="営業ステージ順 / 前回同期比" icon={GitBranch}>
          {pipeOrdered.length === 0 ? (
            <p className="text-sm text-brand-muted py-8 text-center">Notion未同期です。</p>
          ) : (
            <div className="space-y-2">
              {pipeOrdered.map((p) => {
                const d2 = deltaText(p.delta);
                return (
                  <div key={p.status} className="flex items-center gap-3">
                    <span className="text-[11px] font-bold text-brand-text w-28 truncate">{p.status}</span>
                    <div className="flex-1 h-5 bg-slate-100 rounded overflow-hidden">
                      <div className="h-full bg-brand-midnight" style={{ width: `${(p.count / pipeMax) * 100}%` }} />
                    </div>
                    <span className="text-[11px] font-mono font-bold w-10 text-right">{p.count}</span>
                    <span className="text-[10px] font-mono text-brand-muted w-16 text-right" title={yen(p.mrr)}>{yenMan(p.mrr)}</span>
                    <span className={cn('text-[10px] font-mono w-12 text-right', d2.color)}>{d2.text}</span>
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        {/* ====== プロダクト別 ====== */}
        <Card title="プロダクト別 契約進捗" noPadding>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-[10px] uppercase tracking-wider text-brand-muted border-b border-brand-border">
                <th className="text-left px-5 py-2 font-black">プロダクト</th>
                <th className="text-right px-3 py-2 font-black">実績/目標</th>
                <th className="text-right px-3 py-2 font-black">達成率</th>
                <th className="text-right px-5 py-2 font-black">MRR</th>
              </tr>
            </thead>
            <tbody>
              {d.byProduct.map((p) => {
                const ppc = pct(p.actual_contracts, p.target_contracts);
                return (
                  <tr key={p.product_id} className="border-b border-brand-border/50 hover:bg-slate-50/40">
                    <td className="px-5 py-2 font-bold text-brand-text">{p.name}</td>
                    <td className="px-3 py-2 text-right font-mono">
                      <span className="font-bold">{intRound(p.actual_contracts, { keepZero: true })}</span>
                      <span className="text-brand-muted"> / {intRound(p.target_contracts, { keepZero: true })}</span>
                    </td>
                    <td className={cn('px-3 py-2 text-right font-mono font-bold', rateColor(ppc))}>{ppc}%</td>
                    <td className="px-5 py-2 text-right font-mono" title={yen(p.actual_mrr)}>{yenMan(p.actual_mrr)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>
      </div>
    </div>
  );
}

// ===== 内部コンポーネント =====

interface MainKpiProps {
  label: string;
  icon: any;
  actual: string;
  target: string;
  actualRaw: number;
  targetRaw: number;
  percent: number;
  fullDetail?: string;
  remainingFmt?: (n: number) => string;
}
function MainKpi({ label, icon: Icon, actual, target, actualRaw, targetRaw, percent, fullDetail, remainingFmt }: MainKpiProps) {
  const rem = Math.max(0, targetRaw - actualRaw);
  const remText = remainingFmt ? remainingFmt(rem) : `${intRound(rem, { keepZero: true })}件`;
  return (
    <div className="bg-white p-5 rounded-xl border border-brand-border shadow-sm" title={fullDetail}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-brand-midnight">
            <Icon className="w-4 h-4 text-white" />
          </div>
          <p className="text-[11px] font-black text-brand-muted uppercase tracking-widest">{label}</p>
        </div>
        <span className={cn('text-[13px] font-black font-mono', rateColor(percent))}>{percent}%</span>
      </div>
      <div className="flex items-baseline gap-2 mb-3">
        <span className="text-3xl font-black text-brand-text font-mono">{actual}</span>
        <span className="text-[11px] text-brand-muted font-bold">/ {target}</span>
      </div>
      <ProgressBar percent={percent} barClass={rateBg(percent)} thickness="thick" />
      <p className="text-[11px] text-brand-muted font-bold mt-2">
        {rem > 0 ? `あと ${remText}` : '✓ 目標達成'}
      </p>
    </div>
  );
}

function SubKpi({ label, icon: Icon, main, sub, rate }: { label: string; icon: any; main: string; sub: string; rate?: number }) {
  return (
    <div className="bg-white p-4 rounded-xl border border-brand-border shadow-sm">
      <div className="flex items-center gap-2 mb-1.5">
        <Icon className="w-3.5 h-3.5 text-brand-muted" />
        <p className="text-[10px] font-black text-brand-muted uppercase tracking-wider">{label}</p>
      </div>
      <p className="text-xl font-black text-brand-text font-mono">{main}</p>
      <p className="text-[10px] text-brand-muted font-bold mt-1 flex items-center gap-2">
        {sub}
        {rate != null && <span className={cn('font-mono font-black', rateColor(rate))}>{rate}%</span>}
      </p>
    </div>
  );
}
