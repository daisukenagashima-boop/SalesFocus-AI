import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Line, LineChart } from 'recharts';
import { User, Clock, MessageSquare, Save, TrendingUp, Target as TargetIcon, DollarSign, PhoneCall, Handshake } from 'lucide-react';
import { Card, Badge, ProgressBar } from '../components/Common';
import { api } from '../lib/api';
import { yen, yenMan, intRound, pct, remaining, rateColor, rateBg, round1, cn } from '../lib/utils';
import { useApp } from '../App';
import type { MemberDetail } from '../types';

export default function MemberDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { month, meta } = useApp();
  const [data, setData] = useState<MemberDetail | null>(null);
  const [note, setNote] = useState('');
  const [hours, setHours] = useState<number | null>(null);
  const [hoursNote, setHoursNote] = useState('');
  const [msg, setMsg] = useState('');

  const memberId = Number(id);
  useEffect(() => {
    if (!memberId || !month) return;
    api.memberDetail(memberId, month).then((d) => {
      setData(d);
      setNote(d.progress_note);
      setHours(d.working_hours);
      setHoursNote(d.working_hours_note);
    });
  }, [memberId, month]);

  const flash = (t: string) => { setMsg(t); setTimeout(() => setMsg(''), 1500); };

  const saveNote = async () => {
    if (!data) return;
    if (note === data.progress_note) return;
    await api.saveProgressNote({ member_id: memberId, month, content: note });
    flash('進捗共有を保存');
    api.memberDetail(memberId, month).then(setData);
  };
  const saveHours = async () => {
    if (!data) return;
    if (hours === data.working_hours && hoursNote === data.working_hours_note) return;
    await api.saveWorkingHours({ member_id: memberId, month, hours: hours ?? 0, note: hoursNote || null });
    flash('稼働時間を保存');
    api.memberDetail(memberId, month).then(setData);
  };

  if (!data) return <div className="text-brand-muted text-sm">読み込み中…</div>;

  // 合計集計
  const totalTarget = data.byProduct.reduce((s, p) => s + p.target_contracts, 0);
  const totalActual = data.byProduct.reduce((s, p) => s + p.actual_contracts, 0);
  const totalActualMrr = data.byProduct.reduce((s, p) => s + p.actual_mrr, 0);
  const totalTargetMrr = data.byProduct.reduce((s, p) => s + p.target_contracts * p.base_price, 0);
  const totalTargetMeetings = data.byProduct.reduce((s, p) => s + p.target_first_meetings, 0);
  const totalTargetTrials = data.byProduct.reduce((s, p) => s + p.target_trials, 0);

  const contractPct = pct(totalActual, totalTarget);
  const mrrPct = pct(totalActualMrr, totalTargetMrr);
  const meetingPct = pct(data.activity.first_meetings, totalTargetMeetings);
  const hoursPct = data.available_hours && hours != null ? pct(hours, data.available_hours) : 0;

  return (
    <div className="space-y-6">
      {/* ===== メンバー切替 ===== */}
      <div className="flex items-center gap-3">
        <User className="w-4 h-4 text-brand-muted" />
        <select
          value={memberId}
          onChange={(e) => navigate(`/member/${e.target.value}`)}
          className="text-sm font-bold px-3 py-1.5 rounded-lg border border-brand-border bg-white"
        >
          {meta!.members.map((m) => (
            <option key={m.id} value={m.id}>{m.name} ({m.role})</option>
          ))}
        </select>
        <Badge variant="info">{data.member.role}</Badge>
        {msg && <span className="text-[11px] font-bold text-brand-midnight ml-auto">{msg}</span>}
      </div>

      {/* ===== 当月サマリー ===== */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <SmallKpi label="契約数" icon={TargetIcon}
          main={`${intRound(totalActual, { keepZero: true })}件`}
          sub={`目標 ${intRound(totalTarget, { keepZero: true })}件`}
          rate={contractPct} remain={remaining(totalActual, totalTarget)} remainSuffix="件" />
        <SmallKpi label="MRR" icon={DollarSign}
          main={yenMan(totalActualMrr)}
          sub={`目標 ${yenMan(totalTargetMrr)}`}
          rate={mrrPct} fullTitle={`実績 ${yen(totalActualMrr)} / 目標 ${yen(totalTargetMrr)}`} />
        <SmallKpi label="商談数" icon={Handshake}
          main={`${intRound(data.activity.first_meetings, { keepZero: true })}件`}
          sub={`目標 ${intRound(totalTargetMeetings, { keepZero: true })}件`}
          rate={meetingPct} />
        <SmallKpi label="架電 / 通電" icon={PhoneCall}
          main={`${intRound(data.activity.calls, { keepZero: true })} / ${intRound(data.activity.connected, { keepZero: true })}`}
          sub={`FAX ${intRound(data.activity.faxes, { keepZero: true })}`} />
      </div>

      {/* ===== プロダクト別ファネル進捗 ===== */}
      <Card title="プロダクト別 進捗" subtitle="契約 / 必要トライアル / 必要商談">
        <div className="space-y-4">
          {data.byProduct.map((p) => {
            const pc = pct(p.actual_contracts, p.target_contracts);
            return (
              <div key={p.product_id} className="grid grid-cols-12 gap-3 items-center">
                <div className="col-span-3 font-bold text-brand-text text-sm">{p.name}</div>
                <div className="col-span-2 text-[10px] text-brand-muted font-bold">契約</div>
                <div className="col-span-4">
                  <ProgressBar percent={pc} barClass={rateBg(pc)} thickness="thin" />
                </div>
                <div className={cn('col-span-1 text-right font-mono text-sm font-black', rateColor(pc))}>{pc}%</div>
                <div className="col-span-2 text-right text-[11px] font-mono">
                  <span className="font-bold">{intRound(p.actual_contracts, { keepZero: true })}</span>
                  <span className="text-brand-muted"> / {intRound(p.target_contracts, { keepZero: true })}</span>
                </div>
                <div className="col-span-3"></div>
                <div className="col-span-2 text-[10px] text-brand-muted">必要トライアル</div>
                <div className="col-span-2 text-[11px] font-mono text-brand-muted">{intRound(p.target_trials, { keepZero: true })}件</div>
                <div className="col-span-2 text-[10px] text-brand-muted">必要商談</div>
                <div className="col-span-2 text-[11px] font-mono text-brand-muted">{intRound(p.target_first_meetings, { keepZero: true })}件</div>
                <div className="col-span-1 text-right text-[11px] font-mono" title={yen(p.actual_mrr)}>{yenMan(p.actual_mrr)}</div>
              </div>
            );
          })}
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* ===== 月次推移 ===== */}
        <Card title="月次推移" subtitle="直近6ヶ月" icon={TrendingUp}>
          {data.trend.length === 0 ? (
            <p className="text-sm text-brand-muted py-6 text-center">データがありません</p>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={data.trend} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#eef2f6" />
                  <XAxis dataKey="month" tick={{ fontSize: 10 }} tickFormatter={(m) => m.slice(5)} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip />
                  <Bar dataKey="target_contracts" name="目標" fill="#cbd5e1" radius={[3, 3, 0, 0]} />
                  <Bar dataKey="actual_contracts" name="実績" fill="var(--color-brand-midnight)" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
              <ResponsiveContainer width="100%" height={120}>
                <LineChart data={data.trend} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#eef2f6" />
                  <XAxis dataKey="month" tick={{ fontSize: 10 }} tickFormatter={(m) => m.slice(5)} />
                  <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => yenMan(v)} />
                  <Tooltip formatter={(v: any) => yen(Number(v))} />
                  <Line type="monotone" dataKey="actual_mrr" name="MRR" stroke="var(--color-brand-midnight)" strokeWidth={2} dot />
                </LineChart>
              </ResponsiveContainer>
            </>
          )}
        </Card>

        {/* ===== 稼働時間 ===== */}
        <Card title="稼働時間" subtitle="月単位の実績" icon={Clock}>
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-bold text-brand-muted">目標</span>
                <span className="text-sm font-mono font-bold">
                  {data.available_hours != null ? `${round1(data.available_hours)}h` : '—'}
                </span>
              </div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-bold text-brand-muted">実績</span>
                <input type="number" step="0.5" value={hours ?? ''} onChange={(e) => setHours(e.target.value === '' ? null : Number(e.target.value))} onBlur={saveHours}
                  className="w-24 text-right font-mono text-sm px-2 py-1 rounded border border-brand-border focus:border-brand-midnight focus:outline-none" />
              </div>
              {data.available_hours != null && hours != null && (
                <>
                  <ProgressBar percent={hoursPct} barClass={rateBg(hoursPct)} thickness="thick" />
                  <p className={cn('text-[11px] font-bold mt-1 text-right', rateColor(hoursPct))}>{hoursPct}% 達成</p>
                </>
              )}
            </div>
            <div>
              <label className="text-[10px] font-black text-brand-muted uppercase tracking-widest">メモ</label>
              <input type="text" value={hoursNote} onChange={(e) => setHoursNote(e.target.value)} onBlur={saveHours}
                placeholder="残業理由・有給など（任意）"
                className="w-full mt-1 text-sm px-3 py-1.5 rounded border border-brand-border focus:border-brand-midnight focus:outline-none" />
            </div>
            {data.working_hours_updated_at && (
              <p className="text-[10px] text-brand-muted">最終更新: {new Date(data.working_hours_updated_at).toLocaleString('ja-JP')}</p>
            )}
          </div>
        </Card>
      </div>

      {/* ===== 進捗共有 ===== */}
      <Card title="進捗共有" subtitle="数字以外の状況・課題・相談" icon={MessageSquare}>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          onBlur={saveNote}
          maxLength={2000}
          rows={6}
          placeholder={`今月の仕込み状況、滞留案件、相談ごとなど自由に記入（2,000文字まで）`}
          className="w-full text-sm px-3 py-2 rounded border border-brand-border focus:border-brand-midnight focus:outline-none font-sans leading-relaxed"
        />
        <div className="flex items-center justify-between mt-2 text-[10px] text-brand-muted">
          <span>{note.length} / 2,000 文字</span>
          {data.progress_note_updated_at && (
            <span>最終更新: {new Date(data.progress_note_updated_at).toLocaleString('ja-JP')}</span>
          )}
        </div>
      </Card>

      <div className="text-center">
        <Link to="/" className="text-[11px] font-bold text-brand-muted hover:text-brand-midnight">← ダッシュボードに戻る</Link>
      </div>
    </div>
  );
}

function SmallKpi({ label, icon: Icon, main, sub, rate, remain, remainSuffix, fullTitle }:
  { label: string; icon: any; main: string; sub: string; rate?: number; remain?: number; remainSuffix?: string; fullTitle?: string }) {
  return (
    <div className="bg-white p-4 rounded-xl border border-brand-border shadow-sm" title={fullTitle}>
      <div className="flex items-center gap-2 mb-1.5">
        <Icon className="w-3.5 h-3.5 text-brand-muted" />
        <p className="text-[10px] font-black text-brand-muted uppercase tracking-wider">{label}</p>
      </div>
      <p className="text-xl font-black text-brand-text font-mono">{main}</p>
      <p className="text-[10px] text-brand-muted font-bold mt-1 flex items-center gap-2">
        {sub}
        {rate != null && <span className={cn('font-mono font-black', rateColor(rate))}>{rate}%</span>}
      </p>
      {rate != null && (
        <div className="mt-2"><ProgressBar percent={rate} barClass={rateBg(rate)} thickness="thin" /></div>
      )}
      {remain != null && remain > 0 && (
        <p className="text-[10px] text-brand-muted font-bold mt-1">あと {remain}{remainSuffix ?? ''}</p>
      )}
    </div>
  );
}
