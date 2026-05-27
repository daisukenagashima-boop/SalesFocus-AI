import { useEffect, useState } from 'react';
import { FileSpreadsheet, Save } from 'lucide-react';
import { Card, Badge } from '../components/Common';
import { api } from '../lib/api';
import { round1, cn } from '../lib/utils';
import { useApp } from '../App';
import type { Target } from '../types';

export default function Targets() {
  const { month, meta, reloadMeta } = useApp();
  const [rows, setRows] = useState<Target[]>([]);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');

  const load = () => api.targets(month).then(setRows);
  useEffect(() => { load(); }, [month]);

  const cellKey = (memberId: number, productId: number) =>
    rows.find((r) => r.member_id === memberId && r.product_id === productId);

  const update = (memberId: number, productId: number, field: keyof Target, value: number) => {
    setRows((prev) => {
      const existing = prev.find((r) => r.member_id === memberId && r.product_id === productId);
      if (existing) {
        return prev.map((r) => (r === existing ? { ...r, [field]: value } : r));
      }
      const member = meta!.members.find((m) => m.id === memberId)!;
      const product = meta!.products.find((p) => p.id === productId)!;
      return [...prev, {
        id: 0, member_id: memberId, product_id: productId, month,
        contracts: 0, close_rate: null, trials: 0, first_meetings: 0,
        member_name: member.name, product_name: product.name, product_code: product.code,
        [field]: value,
      } as Target];
    });
  };

  const saveRow = async (memberId: number, productId: number) => {
    const r = cellKey(memberId, productId);
    if (!r) return;
    await api.saveTarget({
      member_id: memberId, product_id: productId, month,
      contracts: r.contracts, close_rate: r.close_rate, trials: r.trials, first_meetings: r.first_meetings,
    });
    setMsg('保存しました');
    setTimeout(() => setMsg(''), 1500);
  };

  const importExcel = async () => {
    setBusy(true); setMsg('');
    try {
      const res = await api.importExcel(meta!.defaultExcelPath || undefined);
      setMsg(`インポート完了: 目標 ${res.targets} 件 / IS ${res.isTargets} 件`);
      reloadMeta();
      load();
    } catch (e: any) {
      setMsg(`エラー: ${e.message}`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-[11px] text-brand-muted">
          <FileSpreadsheet className="w-4 h-4" />
          <span className="font-mono truncate max-w-[460px]">{meta?.defaultExcelPath || 'Excelパス未設定 (.env)'}</span>
        </div>
        <div className="flex items-center gap-3">
          {msg && <span className="text-[11px] font-bold text-brand-midnight">{msg}</span>}
          <button onClick={importExcel} disabled={busy}
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-brand-midnight text-white text-[11px] font-black uppercase tracking-wider hover:opacity-90 disabled:opacity-50">
            <FileSpreadsheet className="w-3.5 h-3.5" />
            {busy ? 'インポート中…' : 'Excelから再インポート'}
          </button>
        </div>
      </div>

      <Card noPadding>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-[10px] uppercase tracking-wider text-brand-muted border-b border-brand-border bg-slate-50/40">
              <th className="text-left px-5 py-2.5 font-black">メンバー</th>
              <th className="text-left px-3 py-2.5 font-black">プロダクト</th>
              <th className="text-right px-3 py-2.5 font-black">契約目標</th>
              <th className="text-right px-3 py-2.5 font-black">必要トライアル</th>
              <th className="text-right px-3 py-2.5 font-black">必要商談</th>
              <th className="px-3 py-2.5"></th>
            </tr>
          </thead>
          <tbody>
            {meta!.members.map((m) =>
              meta!.products.map((p, pi) => {
                const r = cellKey(m.id, p.id);
                return (
                  <tr key={`${m.id}-${p.id}`} className="border-b border-brand-border/50 hover:bg-slate-50/40">
                    {pi === 0 && (
                      <td rowSpan={meta!.products.length} className="px-5 py-2 font-bold text-brand-text align-top border-r border-brand-border/50">
                        <div className="flex items-center gap-2">{m.name}<Badge variant="info">{m.role}</Badge></div>
                      </td>
                    )}
                    <td className="px-3 py-1.5 text-brand-muted">{p.name}</td>
                    <NumCell value={r?.contracts ?? 0} onChange={(v) => update(m.id, p.id, 'contracts', v)} />
                    <NumCell value={round1(r?.trials ?? 0)} onChange={(v) => update(m.id, p.id, 'trials', v)} />
                    <NumCell value={round1(r?.first_meetings ?? 0)} onChange={(v) => update(m.id, p.id, 'first_meetings', v)} />
                    <td className="px-3 py-1.5 text-right">
                      <button onClick={() => saveRow(m.id, p.id)} className="text-brand-muted hover:text-brand-midnight" title="保存">
                        <Save className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

function NumCell({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <td className="px-3 py-1.5 text-right">
      <input
        type="number"
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-20 text-right font-mono text-sm px-2 py-1 rounded border border-transparent hover:border-brand-border focus:border-brand-midnight focus:outline-none bg-transparent"
      />
    </td>
  );
}
