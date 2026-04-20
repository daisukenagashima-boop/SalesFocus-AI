import React, { useState } from 'react';
import { useData } from '../lib/DataContext';
import { db } from '../lib/firebase';
import { collection, addDoc, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { UserPlus, User, Mail, Shield, Trash2, Edit2, X, Check, Users } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Card, Badge } from '../components/Common';

export default function Members() {
  const { members, loading } = useData();
  const [isAdding, setIsAdding] = useState(false);
  const [form, setForm] = useState({ name: '', role: '営業担当', email: '' });
  const [editingId, setEditingId] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingId) {
        await updateDoc(doc(db, 'members', editingId), form);
        setEditingId(null);
      } else {
        await addDoc(collection(db, 'members'), form);
        setIsAdding(false);
      }
      setForm({ name: '', role: '営業担当', email: '' });
    } catch (error) {
           console.error('Error with member:', error);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('担当者情報を削除しますか？')) return;
    try {
      await deleteDoc(doc(db, 'members', id));
    } catch (error) {
      console.error('Error deleting member:', error);
    }
  };

  const startEdit = (m: any) => {
    setForm({ name: m.name, role: m.role, email: m.email });
    setEditingId(m.id);
    setIsAdding(true);
  };

  if (loading) return null;

  return (
    <div className="space-y-6 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-brand-text tracking-tight uppercase flex items-center gap-2">
            <Users className="w-5 h-5 text-brand-midnight" />
            担当者・構成マスタ
          </h1>
          <p className="text-[11px] text-brand-muted font-bold uppercase tracking-wider">ヒューマン・リソース管理コンソール</p>
        </div>
        
        <button
          onClick={() => {
            setIsAdding(!isAdding);
            if (!isAdding) setEditingId(null);
          }}
          className="flex items-center gap-2 px-4 py-2 bg-brand-midnight text-white text-[10px] font-black uppercase rounded shadow-lg shadow-brand-midnight/20 hover:opacity-90 transition-all tracking-[0.2em]"
        >
          {isAdding ? <X className="w-3.5 h-3.5" /> : <UserPlus className="w-3.5 h-3.5" />}
          {isAdding ? '閉じる' : '新規登録'}
        </button>
      </div>

      <AnimatePresence>
        {isAdding && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <Card 
              className="mb-4"
              title={editingId ? 'プロファイルを編集' : '新規登録の初期化'}
              icon={editingId ? Edit2 : UserPlus}
            >
              <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-4 gap-6 items-end">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                    <User className="w-3 h-3" /> 氏名
                  </label>
                  <input
                    type="text"
                    required
                    value={form.name}
                    onChange={e => setForm({ ...form, name: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-brand-border rounded outline-none text-xs font-bold transition-all focus:bg-white focus:border-brand-midnight"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                    <Mail className="w-3 h-3" /> メール
                  </label>
                  <input
                    type="email"
                    required
                    value={form.email}
                    onChange={e => setForm({ ...form, email: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-brand-border rounded outline-none text-xs font-bold transition-all focus:bg-white focus:border-brand-midnight"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                    <Shield className="w-3 h-3" /> 役割
                  </label>
                  <select
                    value={form.role}
                    onChange={e => setForm({ ...form, role: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-brand-border rounded outline-none text-xs font-bold transition-all focus:bg-white focus:border-brand-midnight cursor-pointer"
                  >
                    <option value="営業担当">営業担当</option>
                    <option value="リーダー">チームリーダー</option>
                    <option value="マネージャー">営業部長</option>
                  </select>
                </div>
                <button
                  type="submit"
                  className="py-2.5 bg-brand-midnight text-white text-[10px] font-black uppercase rounded shadow hover:opacity-95 transition-all flex items-center justify-center gap-2"
                >
                  <Check className="w-3.5 h-3.5" /> 保存
                </button>
              </form>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {members.map(member => (
          <Card key={member.id} noPadding className="hover:border-brand-midnight transition-colors">
            <div className="p-5 flex flex-col items-center text-center">
              <div className="w-12 h-12 rounded bg-slate-50 border border-slate-100 text-slate-400 flex items-center justify-center text-sm font-black uppercase mb-4 transition-colors group-hover:bg-brand-midnight group-hover:text-white">
                {member.name.charAt(0)}
              </div>
              <h3 className="text-xs font-black text-brand-text uppercase tracking-tight mb-1">{member.name}</h3>
              <Badge variant={member.role.includes('マネージャー') ? 'success' : 'info'} className="mb-4">
                 {member.role.toUpperCase()}
              </Badge>
              <div className="flex items-center gap-1.5 text-slate-400 text-[10px] font-bold truncate w-full justify-center">
                <Mail className="w-3 h-3" /> {member.email}
              </div>
            </div>
            <div className="border-t border-slate-50 p-2 flex justify-center gap-2">
              <button 
                onClick={() => startEdit(member)}
                className="p-1.5 text-slate-300 hover:text-brand-midnight hover:bg-slate-50 rounded transition-all"
              >
                <Edit2 className="w-3.5 h-3.5" />
              </button>
              <button 
                onClick={() => handleDelete(member.id)}
                className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded transition-all"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </Card>
        ))}
        
        {members.length === 0 && !isAdding && (
          <div className="col-span-full border-2 border-dashed border-slate-200 rounded-xl p-16 text-center bg-white/50">
            <User className="w-8 h-8 text-slate-200 mx-auto mb-3" />
            <p className="text-slate-400 font-black text-[10px] uppercase tracking-widest text-center italic">登録担当者不在</p>
          </div>
        )}
      </div>
    </div>
  );
}
