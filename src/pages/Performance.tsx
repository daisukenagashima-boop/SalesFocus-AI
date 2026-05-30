import { useEffect, useState } from 'react';
import { Save, Trophy, PhoneCall } from 'lucide-react';
import { Card, Badge } from '../components/Common';
import { api } from '../lib/api';
import { yen, round1 } from '../lib/utils';
import { useApp } from '../App';
import type { Actual, ActivityActual } from '../types';

interface CRow { contracts: number; mrr: number; source: string }
interface ARow { calls: number; connected: number; first_meetings: number; faxes: number; source: string }

export default function Performance() {
  const { month, meta } = useApp();
  const [contracts, setContracts] = useState<Map<string, CRow>>(new Map());
  const [activity, setActivity] = useState<Map<number, ARow>>(new Map());
  const [msg, setMsg] = useState('');

  const load = async () => {
    const { actuals, activity: act } = await api.actuals(month);
    const cm = new Map<string, CRow>();
    actuals.forEach((a: Actual) => cm.set(`${a.member_id}|${a.product_id}`, { contracts: a.contracts, mrr: a.mrr, source: a.source }));
    setContracts(cm);
    const am = new Map<number, ARow>();
    act.forEach((a: ActivityActual) =>
      am.set(a.member_id, { calls: a.calls, connected: a.connected, first_meetings: a.first_meetings, faxes: a.faxes, source: a.source }));
    setActivity(am);
  };
  useEffect(() => { load(); }, [month]);

  const flash = (m: string) => { setMsg(m); setTimeout(() => setMsg(''), 1500); };

  const cval = (mid: number, pid: number) => contracts.get(`${mid}|${pid}`) || { contracts: 0, mrr: 0, source: 'manual' };
  const setC = (mid: number, pid: number, field: 'contracts' | 'mrr', v: number) => {
    setContracts((prev) => {
      const n = new Map(prev);
      const cur = n.get(`${mid}|${pid}`) || { contracts: 0, mrr: 0, source: 'manual' };
      n.set(`${mid}|${pid}`, { ...cur, [field]: v });
      return n;
    });
  };
  const saveC = async (mid: number, pid: number) => {
    const v = cval(mid, pid);
    await api.saveActual({ member_id: mid, product_id: pid, month, contracts: v.contracts, mrr: v.mrr });
    flash('保存しました'); load();
  };

  const aval = (mid: number) => activity.get(mid) || { calls: 0, connected: 0, first_meetings: 0, faxes: 0, source: 'manual' };
  const setA = (mid: number, field: keyof ARow, v: number) => {
    setActivity((prev) => {
      const n = new Map(prev);
      const cur = n.get(mid) || { calls: 0, connected: 0, first_meetings: 0, faxes: 0, source: 'manual' };
      n.set(mid, { ...cur, [field]: v } as ARow);
      return n;
    });
  };
  const saveA = async (mid: number) => {
    const v = aval(mid);
    await api.saveActivity({ member_id: mid, month, calls: v.calls, connected: v.connected, first_meetings: v.first_meetings, faxes: v.faxes });
    flash('保存しました'); load();
  };

  const inp = 'w-20 text-right font-mono text-sm px-2 py-1 rounded border border-transparent hover:border-brand-border focus:border-brand-midnight focus:outline-none';

  return (
    <div className="space-y-5">
      <p className="text-[11px] text-brand-muted">
        Notionが無くても、ここで受注・活動の実績を直接入力できます。Notion同期を使う場合は同期値が入りますが、ここで手入力した値は同期で上書きされません（手入力優先）。
      </p>
      {msg && <span className="text-[11px] font-bold text-brand-midnight">{msg}</span>}

      <Card title="受注実績" subtitle="メンバー × プロダクト（契約数・MRR）" icon={Trophy} noPadding>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-[10px] uppercase tracking-wider text-brand-muted border-b border-brand-border bg-slate-50/40">
              <th className="text-left px-5 py-2.5 font-black">メンバー</th>
              <th className="text-left px-3 py-2.5 font-black">プロダクト</th>
              <th className="text-right px-3 py-2.5 font-black">契約数</th>
              <th className="text-right px-3 py-2.5 font-black">MRR(円)</th>
              <th className="text-center px-3 py-2.5 font-black">区分</th>
              <th className="px-3 py-2.5"></th>
            </tr>
          </thead>
          <tbody>
            {meta!.members.map((m) =>
              meta!.products.map((p, pi) => {
                const v = cval(m.id, p.id);
                return (
                  <tr key={`${m.id}-${p.id}`} className="border-b border-brand-border/50 hover:bg-slate-50/40">
                    {pi === 0 && (
                      <td rowSpan={meta!.products.length} className="px-5 py-2 font-bold text-brand-text align-top border-r border-brand-border/50">
                        {m.name}
                      </td>
                    )}
                    <td className="px-3 py-1.5 text-brand-muted">{p.name}</td>
                    <td className="px-3 py-1.5 text-right">
                      <input type="number" value={v.contracts} onChange={(e) => setC(m.id, p.id, 'contracts', Number(e.target.value))} className={inp} />
                    </td>
                    <td className="px-3 py-1.5 text-right">
                      <input type="number" value={v.mrr} onChange={(e) => setC(m.id, p.id, 'mrr', Number(e.target.value))} className="w-28 text-right font-mono text-sm px-2 py-1 rounded border border-transparent hover:border-brand-border focus:border-brand-midnight focus:outline-none" />
                    </td>
                    <td className="px-3 py-1.5 text-center">
                      <Badge variant={v.source === 'notion' ? 'info' : 'default'}>{v.source === 'notion' ? 'Notion' : '手入力'}</Badge>
                    </td>
                    <td className="px-3 py-1.5 text-right">
                      <button onClick={() => saveC(m.id, p.id)} className="text-brand-muted hover:text-brand-midnight"><Save className="w-3.5 h-3.5" /></button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </Card>

      <Card title="活動実績" subtitle="メンバー別（架電・通電・商談・FAX）" icon={PhoneCall} noPadding>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-[10px] uppercase tracking-wider text-brand-muted border-b border-brand-border bg-slate-50/40">
              <th className="text-left px-5 py-2.5 font-black">メンバー</th>
              <th className="text-right px-3 py-2.5 font-black">架電</th>
              <th className="text-right px-3 py-2.5 font-black">通電</th>
              <th className="text-right px-3 py-2.5 font-black">商談</th>
              <th className="text-right px-3 py-2.5 font-black">FAX</th>
              <th className="text-center px-3 py-2.5 font-black">区分</th>
              <th className="px-3 py-2.5"></th>
            </tr>
          </thead>
          <tbody>
            {meta!.members.map((m) => {
              const v = aval(m.id);
              return (
                <tr key={m.id} className="border-b border-brand-border/50 hover:bg-slate-50/40">
                  <td className="px-5 py-1.5 font-bold text-brand-text">{m.name}</td>
                  <td className="px-3 py-1.5 text-right"><input type="number" value={round1(v.calls)} onChange={(e) => setA(m.id, 'calls', Number(e.target.value))} className={inp} /></td>
                  <td className="px-3 py-1.5 text-right"><input type="number" value={round1(v.connected)} onChange={(e) => setA(m.id, 'connected', Number(e.target.value))} className={inp} /></td>
                  <td className="px-3 py-1.5 text-right"><input type="number" value={round1(v.first_meetings)} onChange={(e) => setA(m.id, 'first_meetings', Number(e.target.value))} className={inp} /></td>
                  <td className="px-3 py-1.5 text-right"><input type="number" value={round1(v.faxes)} onChange={(e) => setA(m.id, 'faxes', Number(e.target.value))} className={inp} /></td>
                  <td className="px-3 py-1.5 text-center"><Badge variant={v.source === 'notion' ? 'info' : 'default'}>{v.source === 'notion' ? 'Notion' : '手入力'}</Badge></td>
                  <td className="px-3 py-1.5 text-right"><button onClick={() => saveA(m.id)} className="text-brand-muted hover:text-brand-midnight"><Save className="w-3.5 h-3.5" /></button></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
