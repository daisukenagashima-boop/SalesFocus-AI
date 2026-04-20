import React, { useState } from 'react';
import { useData } from '../lib/DataContext';
import { db } from '../lib/firebase';
import { collection, addDoc, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { Package, Plus, Trash2, Edit2, X, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Card, Badge } from '../components/Common';

export default function Products() {
  const { products, loading } = useData();
  const [isAdding, setIsAdding] = useState(false);
  const [form, setForm] = useState({ name: '', basePrice: 0, yearlyPrice: 0 });
  const [editingId, setEditingId] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingId) {
        await updateDoc(doc(db, 'products', editingId), form);
        setEditingId(null);
      } else {
        await addDoc(collection(db, 'products'), form);
        setIsAdding(false);
      }
      setForm({ name: '', basePrice: 0, yearlyPrice: 0 });
    } catch (error) {
      console.error('Error with product:', error);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('このプロダクトを削除してもよろしいですか？')) return;
    try {
      await deleteDoc(doc(db, 'products', id));
    } catch (error) {
      console.error('Error deleting product:', error);
    }
  };

  const startEdit = (p: any) => {
    setForm({ name: p.name, basePrice: p.basePrice || 0, yearlyPrice: p.yearlyPrice || 0 });
    setEditingId(p.id);
    setIsAdding(true);
  };

  if (loading) return null;

  return (
    <div className="space-y-6 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-brand-text tracking-tight uppercase flex items-center gap-2">
            <Package className="w-5 h-5 text-brand-midnight" />
            プロダクト・アセット構成
          </h1>
          <p className="text-[11px] text-brand-muted font-bold uppercase tracking-wider">SaaS製品およびサービス・レジストリの管理</p>
        </div>
        
        <button
          onClick={() => {
            setIsAdding(!isAdding);
            if (!isAdding) setEditingId(null);
          }}
          className="flex items-center gap-2 px-4 py-2 bg-brand-midnight text-white text-[10px] font-black uppercase rounded shadow-lg shadow-brand-midnight/20 hover:opacity-90 transition-all tracking-[0.2em]"
        >
          {isAdding ? <X className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
          {isAdding ? '閉じる' : '新規プロダクト'}
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
              title={editingId ? 'プロダクト構成を編集' : '新規プロダクトの定義'}
              icon={editingId ? Edit2 : Plus}
            >
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-1.5 flex-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                      プロダクト名称
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="例：ながらかいご分析レポート"
                      value={form.name}
                      onChange={e => setForm({ ...form, name: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 border border-brand-border rounded outline-none text-xs font-bold transition-all focus:bg-white focus:border-brand-midnight"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                        月払い単価 (¥)
                      </label>
                      <input
                        type="number"
                        value={form.basePrice}
                        onChange={e => setForm({ ...form, basePrice: parseInt(e.target.value) || 0 })}
                        className="w-full px-3 py-2 bg-slate-50 border border-brand-border rounded outline-none text-xs font-black transition-all focus:bg-white focus:border-brand-midnight font-mono"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                        年払い単価 (¥)
                      </label>
                      <input
                        type="number"
                        value={form.yearlyPrice}
                        onChange={e => setForm({ ...form, yearlyPrice: parseInt(e.target.value) || 0 })}
                        className="w-full px-3 py-2 bg-slate-50 border border-brand-border rounded outline-none text-xs font-black transition-all focus:bg-white focus:border-brand-midnight font-mono"
                      />
                    </div>
                  </div>
                </div>
                <div className="flex justify-end">
                  <button
                    type="submit"
                    className="px-8 py-2.5 bg-brand-midnight text-white text-[10px] font-black uppercase rounded shadow hover:opacity-95 transition-all flex items-center justify-center gap-2"
                  >
                     <Check className="w-3.5 h-3.5" /> 構成を保存
                  </button>
                </div>
              </form>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {products.map(product => (
          <Card key={product.id} noPadding className="hover:border-brand-midnight group transition-colors">
            <div className="p-6">
              <div className="w-10 h-10 rounded bg-slate-50 border border-slate-100 text-slate-400 flex items-center justify-center mb-4 group-hover:bg-brand-midnight group-hover:border-brand-midnight group-hover:text-white transition-all shadow-sm">
                <Package className="w-5 h-5" />
              </div>
              <h3 className="text-xs font-black text-brand-text uppercase tracking-tight mb-2 truncate">{product.name}</h3>
              <div className="space-y-3 pt-3 border-t border-slate-50 mt-4">
                 <div className="flex items-center justify-between">
                   <span className="text-[9px] font-black text-slate-400 uppercase">Monthly</span>
                   <span className="text-xs font-black font-mono text-brand-midnight">
                     ¥{product.basePrice?.toLocaleString()}
                   </span>
                 </div>
                 <div className="flex items-center justify-between">
                   <span className="text-[9px] font-black text-slate-400 uppercase">Yearly</span>
                   <span className="text-xs font-black font-mono text-brand-midnight">
                     ¥{product.yearlyPrice?.toLocaleString() || '---'}
                   </span>
                 </div>
              </div>
            </div>
            <div className="bg-slate-50/50 p-2 border-t border-brand-border/10 flex justify-end gap-1 opacity-60 group-hover:opacity-100 transition-opacity">
              <button 
                onClick={() => startEdit(product)}
                className="p-1 px-1.5 text-slate-400 hover:text-brand-midnight hover:bg-white rounded transition-all"
              >
                <Edit2 className="w-3.5 h-3.5" />
              </button>
              <button 
                onClick={() => handleDelete(product.id)}
                className="p-1 px-1.5 text-slate-400 hover:text-red-500 hover:bg-white rounded transition-all"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </Card>
        ))}
        
        {products.length === 0 && !isAdding && (
          <div className="col-span-full border-2 border-dashed border-slate-200 rounded-xl p-20 text-center bg-white/50">
            <Package className="w-10 h-10 text-slate-200 mx-auto mb-3" />
            <p className="text-slate-400 font-black text-[10px] uppercase tracking-widest text-center italic">プロダクト・レジストリ不在</p>
          </div>
        )}
      </div>
    </div>
  );
}
