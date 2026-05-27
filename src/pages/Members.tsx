import { useEffect, useState } from 'react';
import { UserPlus, Save, Package, Trash2, Plus } from 'lucide-react';
import { Card, Badge } from '../components/Common';
import { api } from '../lib/api';
import { useApp } from '../App';
import type { Member, Product } from '../types';

export default function Members() {
  const { reloadMeta } = useApp();
  const [members, setMembers] = useState<Member[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [addingM, setAddingM] = useState({ name: '', short_name: '', role: 'FS' });
  const [addingP, setAddingP] = useState({ name: '', excel_name: '', notion_name: '', base_price: 0 });
  const [msg, setMsg] = useState('');

  const load = () => {
    api.members().then(setMembers);
    api.products().then(setProducts);
  };
  useEffect(() => { load(); }, []);
  const flash = (m: string) => { setMsg(m); setTimeout(() => setMsg(''), 1500); };

  // --- members ---
  const setM = (id: number, f: keyof Member, v: any) =>
    setMembers((p) => p.map((m) => (m.id === id ? { ...m, [f]: v } : m)));
  const saveM = async (m: Member) => {
    await api.updateMember(m.id, { name: m.name, short_name: m.short_name, role: m.role, email: m.email, active: m.active });
    flash(`${m.name} を更新`); reloadMeta();
  };
  const addM = async () => {
    if (!addingM.name) return;
    await api.addMember(addingM);
    setAddingM({ name: '', short_name: '', role: 'FS' }); load(); reloadMeta();
  };

  // --- products ---
  const setP = (id: number, f: keyof Product, v: any) =>
    setProducts((p) => p.map((x) => (x.id === id ? { ...x, [f]: v } : x)));
  const saveP = async (p: Product) => {
    await api.updateProduct(p.id, { name: p.name, excel_name: p.excel_name, notion_name: p.notion_name, base_price: p.base_price });
    flash(`${p.name} を更新`); reloadMeta();
  };
  const delP = async (p: Product) => {
    if (!confirm(`「${p.name}」を削除します。\nこのプロダクトの目標・実績データもすべて削除されます。よろしいですか？`)) return;
    await api.deleteProduct(p.id);
    flash(`${p.name} を削除`); load(); reloadMeta();
  };
  const addP = async () => {
    if (!addingP.name) return;
    await api.addProduct(addingP);
    setAddingP({ name: '', excel_name: '', notion_name: '', base_price: 0 }); load(); reloadMeta();
  };

  const inp = 'text-sm px-2 py-1 rounded border border-transparent hover:border-brand-border focus:border-brand-midnight focus:outline-none';

  return (
    <div className="space-y-6 max-w-4xl">
      {msg && <span className="text-[11px] font-bold text-brand-midnight">{msg}</span>}

      {/* ===== プロダクト ===== */}
      <Card title="プロダクト" subtitle="名称変更・追加・削除に対応。Excel名/Notion名は取込・同期の一致に使用" icon={Package} noPadding>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-[10px] uppercase tracking-wider text-brand-muted border-b border-brand-border">
              <th className="text-left px-5 py-2 font-black">表示名</th>
              <th className="text-left px-3 py-2 font-black">Excel名</th>
              <th className="text-left px-3 py-2 font-black">Notion名</th>
              <th className="text-right px-3 py-2 font-black">月額(円)</th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {products.map((p) => (
              <tr key={p.id} className="border-b border-brand-border/60">
                <td className="px-5 py-1.5"><input value={p.name} onChange={(e) => setP(p.id, 'name', e.target.value)} className={`w-40 ${inp}`} /></td>
                <td className="px-3 py-1.5"><input value={p.excel_name ?? ''} onChange={(e) => setP(p.id, 'excel_name', e.target.value)} className={`w-24 ${inp}`} /></td>
                <td className="px-3 py-1.5"><input value={p.notion_name ?? ''} onChange={(e) => setP(p.id, 'notion_name', e.target.value)} className={`w-40 ${inp}`} /></td>
                <td className="px-3 py-1.5 text-right"><input type="number" value={p.base_price} onChange={(e) => setP(p.id, 'base_price', Number(e.target.value))} className={`w-24 text-right font-mono ${inp}`} /></td>
                <td className="px-3 py-1.5 text-right whitespace-nowrap">
                  <button onClick={() => saveP(p)} className="text-brand-muted hover:text-brand-midnight mr-3" title="保存"><Save className="w-3.5 h-3.5" /></button>
                  <button onClick={() => delP(p)} className="text-brand-muted hover:text-red-600" title="削除"><Trash2 className="w-3.5 h-3.5" /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="flex items-end gap-3 p-4 border-t border-brand-border bg-slate-50/40">
          <Field label="表示名"><input value={addingP.name} onChange={(e) => setAddingP({ ...addingP, name: e.target.value })} className={`w-40 ${inp} border-brand-border`} placeholder="ながらかいご○○" /></Field>
          <Field label="Excel名"><input value={addingP.excel_name} onChange={(e) => setAddingP({ ...addingP, excel_name: e.target.value })} className={`w-24 ${inp} border-brand-border`} /></Field>
          <Field label="Notion名"><input value={addingP.notion_name} onChange={(e) => setAddingP({ ...addingP, notion_name: e.target.value })} className={`w-40 ${inp} border-brand-border`} /></Field>
          <Field label="月額"><input type="number" value={addingP.base_price} onChange={(e) => setAddingP({ ...addingP, base_price: Number(e.target.value) })} className={`w-24 text-right font-mono ${inp} border-brand-border`} /></Field>
          <button onClick={addP} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-brand-midnight text-white text-[11px] font-black uppercase tracking-wider hover:opacity-90"><Plus className="w-3.5 h-3.5" />追加</button>
        </div>
      </Card>

      {/* ===== メンバー ===== */}
      <Card title="メンバー" subtitle="Notion氏名と一致させると同期時に自動マッチ" icon={UserPlus} noPadding>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-[10px] uppercase tracking-wider text-brand-muted border-b border-brand-border">
              <th className="text-left px-5 py-2 font-black">氏名</th>
              <th className="text-left px-3 py-2 font-black">略称(Excel)</th>
              <th className="text-left px-3 py-2 font-black">役割</th>
              <th className="text-center px-3 py-2 font-black">Notion紐付</th>
              <th className="text-center px-3 py-2 font-black">有効</th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {members.map((m) => (
              <tr key={m.id} className="border-b border-brand-border/60">
                <td className="px-5 py-1.5"><input value={m.name} onChange={(e) => setM(m.id, 'name', e.target.value)} className={`w-32 ${inp}`} /></td>
                <td className="px-3 py-1.5"><input value={m.short_name ?? ''} onChange={(e) => setM(m.id, 'short_name', e.target.value)} className={`w-20 ${inp}`} /></td>
                <td className="px-3 py-1.5">
                  <select value={m.role} onChange={(e) => setM(m.id, 'role', e.target.value)} className="text-sm px-2 py-1 rounded border border-brand-border bg-white">
                    <option>FS</option><option>IS</option><option>Manager</option>
                  </select>
                </td>
                <td className="px-3 py-1.5 text-center">{m.notion_person_id ? <Badge variant="success">済</Badge> : <Badge>未</Badge>}</td>
                <td className="px-3 py-1.5 text-center"><input type="checkbox" checked={!!m.active} onChange={(e) => setM(m.id, 'active', e.target.checked ? 1 : 0)} /></td>
                <td className="px-3 py-1.5 text-right"><button onClick={() => saveM(m)} className="text-brand-muted hover:text-brand-midnight"><Save className="w-3.5 h-3.5" /></button></td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="flex items-end gap-3 p-4 border-t border-brand-border bg-slate-50/40">
          <Field label="氏名"><input value={addingM.name} onChange={(e) => setAddingM({ ...addingM, name: e.target.value })} className={`w-36 ${inp} border-brand-border`} /></Field>
          <Field label="略称"><input value={addingM.short_name} onChange={(e) => setAddingM({ ...addingM, short_name: e.target.value })} className={`w-24 ${inp} border-brand-border`} /></Field>
          <Field label="役割">
            <select value={addingM.role} onChange={(e) => setAddingM({ ...addingM, role: e.target.value })} className="text-sm px-2 py-1.5 rounded border border-brand-border bg-white">
              <option>FS</option><option>IS</option><option>Manager</option>
            </select>
          </Field>
          <button onClick={addM} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-brand-midnight text-white text-[11px] font-black uppercase tracking-wider hover:opacity-90"><UserPlus className="w-3.5 h-3.5" />追加</button>
        </div>
      </Card>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-[10px] font-black text-brand-muted uppercase">{label}</span>
      {children}
    </label>
  );
}
