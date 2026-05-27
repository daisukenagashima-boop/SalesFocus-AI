import { useEffect, useState } from 'react';
import { UserPlus, Save } from 'lucide-react';
import { Card, Badge } from '../components/Common';
import { api } from '../lib/api';
import { useApp } from '../App';
import type { Member } from '../types';

export default function Members() {
  const { reloadMeta } = useApp();
  const [members, setMembers] = useState<Member[]>([]);
  const [adding, setAdding] = useState({ name: '', short_name: '', role: 'FS' });
  const [msg, setMsg] = useState('');

  const load = () => api.members().then(setMembers);
  useEffect(() => { load(); }, []);

  const save = async (m: Member) => {
    await api.updateMember(m.id, { name: m.name, short_name: m.short_name, role: m.role, email: m.email, active: m.active });
    setMsg(`${m.name} を更新しました`); setTimeout(() => setMsg(''), 1500);
    reloadMeta();
  };
  const add = async () => {
    if (!adding.name) return;
    await api.addMember(adding);
    setAdding({ name: '', short_name: '', role: 'FS' });
    load(); reloadMeta();
  };
  const set = (id: number, field: keyof Member, value: any) =>
    setMembers((prev) => prev.map((m) => (m.id === id ? { ...m, [field]: value } : m)));

  return (
    <div className="space-y-4 max-w-3xl">
      {msg && <span className="text-[11px] font-bold text-brand-midnight">{msg}</span>}
      <Card title="メンバー" subtitle="Notion氏名と一致させると自動マッチします" icon={UserPlus} noPadding>
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
                <td className="px-5 py-1.5">
                  <input value={m.name} onChange={(e) => set(m.id, 'name', e.target.value)}
                    className="w-32 text-sm px-2 py-1 rounded border border-transparent hover:border-brand-border focus:border-brand-midnight focus:outline-none" />
                </td>
                <td className="px-3 py-1.5">
                  <input value={m.short_name ?? ''} onChange={(e) => set(m.id, 'short_name', e.target.value)}
                    className="w-20 text-sm px-2 py-1 rounded border border-transparent hover:border-brand-border focus:border-brand-midnight focus:outline-none" />
                </td>
                <td className="px-3 py-1.5">
                  <select value={m.role} onChange={(e) => set(m.id, 'role', e.target.value)}
                    className="text-sm px-2 py-1 rounded border border-brand-border bg-white">
                    <option>FS</option><option>IS</option><option>Manager</option>
                  </select>
                </td>
                <td className="px-3 py-1.5 text-center">
                  {m.notion_person_id ? <Badge variant="success">済</Badge> : <Badge>未</Badge>}
                </td>
                <td className="px-3 py-1.5 text-center">
                  <input type="checkbox" checked={!!m.active} onChange={(e) => set(m.id, 'active', e.target.checked ? 1 : 0)} />
                </td>
                <td className="px-3 py-1.5 text-right">
                  <button onClick={() => save(m)} className="text-brand-muted hover:text-brand-midnight"><Save className="w-3.5 h-3.5" /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      <Card title="メンバー追加">
        <div className="flex items-end gap-3">
          <label className="flex flex-col gap-1">
            <span className="text-[10px] font-black text-brand-muted uppercase">氏名</span>
            <input value={adding.name} onChange={(e) => setAdding({ ...adding, name: e.target.value })}
              className="w-36 text-sm px-2 py-1.5 rounded border border-brand-border focus:border-brand-midnight focus:outline-none" />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-[10px] font-black text-brand-muted uppercase">略称</span>
            <input value={adding.short_name} onChange={(e) => setAdding({ ...adding, short_name: e.target.value })}
              className="w-24 text-sm px-2 py-1.5 rounded border border-brand-border focus:border-brand-midnight focus:outline-none" />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-[10px] font-black text-brand-muted uppercase">役割</span>
            <select value={adding.role} onChange={(e) => setAdding({ ...adding, role: e.target.value })}
              className="text-sm px-2 py-1.5 rounded border border-brand-border bg-white">
              <option>FS</option><option>IS</option><option>Manager</option>
            </select>
          </label>
          <button onClick={add} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-brand-midnight text-white text-[11px] font-black uppercase tracking-wider hover:opacity-90">
            <UserPlus className="w-3.5 h-3.5" />追加
          </button>
        </div>
      </Card>
    </div>
  );
}
