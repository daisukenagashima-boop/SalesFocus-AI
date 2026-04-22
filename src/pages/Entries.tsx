import React, { useState } from 'react';
import { useData } from '../lib/DataProvider';
import { format, parseISO } from 'date-fns';
import { PlusCircle, Trash2, Calendar, User, Package, Hash, MessageSquare, History, FilterX, Building2, Coins, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { useAuth } from '../lib/AuthContext';
import { Card, Badge } from '../components/Common';
import { MiniCalendar } from '../components/MiniCalendar';

export default function Entries() {
  const { members, products, records, loading } = useData();
  const { user } = useAuth();
  const [selectedDateFilter, setSelectedDateFilter] = useState<string | null>(null);
  const [currentMonth, setCurrentMonth] = useState(format(new Date(), 'yyyy-MM'));
  
  // Find current member based on login email
  const currentMember = React.useMemo(() => {
    return members.find(m => m.email.toLowerCase() === user?.email?.toLowerCase());
  }, [members, user]);

  const [form, setForm] = useState({
    memberId: '',
    productId: '',
    customerName: '',
    paymentPlan: 'monthly' as 'monthly' | 'yearly',
    count: 1,
    unitPrice: 0,
    amount: 0,
    date: format(new Date(), 'yyyy-MM-dd'),
    note: ''
  });

  // Set memberId automatically when currentMember is determined
  React.useEffect(() => {
    if (currentMember) {
      setForm(prev => ({ ...prev, memberId: currentMember.id }));
    }
  }, [currentMember]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const filteredRecords = selectedDateFilter 
    ? records.filter(r => format(parseISO(r.date), 'yyyy-MM-dd') === selectedDateFilter)
    : records;

  // Auto-calculate amount and default unit price when product, plan, or count changes
  React.useEffect(() => {
    if (form.productId) {
      const product = products.find(p => p.id === form.productId);
      if (product) {
        const defaultPrice = form.paymentPlan === 'yearly' && product.yearlyPrice 
          ? product.yearlyPrice 
          : product.basePrice;
        
        // If unitPrice is 0 (new selection) or matches the previous default, update it to the new default
        setForm(prev => {
          const isUnitPriceManuallySet = prev.unitPrice !== 0 && 
            prev.unitPrice !== (prev.paymentPlan === 'yearly' ? product.yearlyPrice : product.basePrice);
          
          const newUnitPrice = isUnitPriceManuallySet ? prev.unitPrice : defaultPrice;
          
          return {
            ...prev,
            unitPrice: newUnitPrice,
            amount: newUnitPrice * prev.count
          };
        });
      }
    }
  }, [form.productId, form.paymentPlan, form.count, products]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.memberId || !form.productId || form.count <= 0) {
      alert('すべての必須項目を入力してください');
      return;
    }

    setIsSubmitting(true);
    try {
      alert('Mock: 実績データの登録をシミュレートしました');
      setForm({ ...form, count: 1, note: '' });
    } catch (error) {
      console.error('Error adding record:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('この実績を削除してもよろしいですか？')) return;
    alert('Mock: レコードを削除しました');
  };

  if (loading) return null;

  return (
    <div className="space-y-4 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-brand-text tracking-tight uppercase">データ入力コンソール</h1>
          <p className="text-[11px] text-brand-muted font-bold uppercase tracking-wider">実績ログの手動登録</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Entry Form & Calendar */}
        <div className="lg:col-span-4 space-y-6">
          <MiniCalendar 
            records={records}
            currentMonth={currentMonth}
            selectedDate={selectedDateFilter || undefined}
            onSelectDate={(date) => setSelectedDateFilter(date === selectedDateFilter ? null : date)}
          />

          <Card 
            title="新規レコードの初期化" 
            subtitle="実績ログのセキュア登録"
            icon={PlusCircle}
          >
            <form onSubmit={handleSubmit} className="space-y-5">
              {!currentMember ? (
                <div className="p-4 bg-rose-50 border border-rose-100 rounded-lg flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <p className="text-xs font-black text-rose-700 uppercase tracking-tight">アカウント未照合</p>
                    <p className="text-[10px] text-rose-600 font-bold leading-relaxed italic">
                      ログイン中のメールアドレス（{user?.email}）が担当者マスタに登録されていません。実績を入力するには、管理者にメールアドレスの登録を依頼してください。
                    </p>
                  </div>
                </div>
              ) : (
                <div className="p-3 bg-brand-midnight/5 border border-brand-midnight/10 rounded-lg flex items-center gap-3">
                  <div className="w-8 h-8 rounded bg-brand-midnight flex items-center justify-center text-white text-[10px] font-black uppercase">
                    {currentMember.name.charAt(0)}
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-brand-midnight uppercase tracking-widest">{currentMember.name} としてログイン中</p>
                    <p className="text-[8px] text-brand-muted font-black uppercase tracking-tighter italic">Authorized to Record Performance</p>
                  </div>
                </div>
              )}

              <input type="hidden" value={form.memberId} />

              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                  <Package className="w-3 h-3" /> 対象プロダクト
                </label>
                <select
                  value={form.productId}
                  onChange={e => setForm({ ...form, productId: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-brand-border rounded outline-none text-xs font-bold focus:bg-white focus:border-brand-midnight transition-all cursor-pointer"
                  required
                >
                  <option value="">製品を選択...</option>
                  {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                  <Calendar className="w-3 h-3" /> 成約日
                </label>
                <input
                  type="date"
                  value={form.date}
                  onChange={e => setForm({ ...form, date: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-brand-border rounded outline-none text-xs font-bold focus:bg-white focus:border-brand-midnight transition-all cursor-pointer uppercase"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                  <Building2 className="w-3 h-3" /> 顧客名
                </label>
                <input
                  type="text"
                  value={form.customerName}
                  onChange={e => setForm({ ...form, customerName: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-brand-border rounded outline-none text-xs font-bold focus:bg-white focus:border-brand-midnight transition-all"
                  placeholder="株式会社〇〇..."
                />
              </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                    お支払いプラン
                  </label>
                  <div className="flex bg-slate-100 p-1 rounded border border-brand-border h-fit">
                    <button 
                      type="button"
                      onClick={() => setForm(prev => ({ ...prev, paymentPlan: 'monthly' }))}
                      className={cn(
                        "flex-1 py-1.5 text-[9px] font-black uppercase tracking-widest rounded transition-all",
                        form.paymentPlan === 'monthly' ? "bg-white text-brand-midnight shadow-sm" : "text-slate-400 hover:text-slate-600"
                      )}
                    >
                      月払い
                    </button>
                    <button 
                      type="button"
                      onClick={() => setForm(prev => ({ ...prev, paymentPlan: 'yearly' }))}
                      className={cn(
                        "flex-1 py-1.5 text-[9px] font-black uppercase tracking-widest rounded transition-all",
                        form.paymentPlan === 'yearly' ? "bg-white text-brand-midnight shadow-sm" : "text-slate-400 hover:text-slate-600"
                      )}
                    >
                      年払い
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                      <Coins className="w-3 h-3" /> 単価 (¥)
                    </label>
                  <input
                    type="number"
                    value={form.unitPrice}
                    onChange={e => setForm({ ...form, unitPrice: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 bg-slate-50 border border-brand-border rounded outline-none text-xs font-black focus:bg-white focus:border-brand-midnight transition-all font-mono"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                    <Hash className="w-3 h-3" /> 成約数量
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={form.count}
                    onChange={e => setForm({ ...form, count: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 bg-slate-50 border border-brand-border rounded outline-none text-xs font-black focus:bg-white focus:border-brand-midnight transition-all font-mono"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                    契約金額 (¥)
                  </label>
                  <input
                    type="number"
                    value={form.amount}
                    onChange={e => setForm({ ...form, amount: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 bg-slate-50 border border-brand-border rounded outline-none text-xs font-black focus:bg-white focus:border-brand-midnight transition-all font-mono text-brand-midnight"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                  <MessageSquare className="w-3 h-3" /> 備考 / メタデータ
                </label>
                <textarea
                  value={form.note}
                  onChange={e => setForm({ ...form, note: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-brand-border rounded outline-none text-xs font-bold focus:bg-white focus:border-brand-midnight transition-all min-h-[100px] resize-none"
                  placeholder="..."
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting || !currentMember}
                className="w-full py-3 bg-brand-midnight text-white text-xs font-black uppercase rounded shadow-lg shadow-brand-midnight/20 hover:opacity-95 active:scale-[0.99] transition-all disabled:opacity-50 tracking-[0.2em] mt-4"
              >
                {isSubmitting ? '認証・同期中...' : '実績データの登録実行'}
              </button>
            </form>
          </Card>
        </div>

        {/* History List */}
        <Card 
          className="lg:col-span-8 h-fit min-h-[500px]"
          title={selectedDateFilter ? `【${selectedDateFilter}】のアクティビティ` : "全期間のアクティビティ・ログ"}
          subtitle={selectedDateFilter ? "特定の日付に絞り込んで表示中" : "リアルタイム・同期フィード"}
          icon={History}
          noPadding
          headerAction={
            <div className="flex items-center gap-2">
              {selectedDateFilter && (
                <button 
                  onClick={() => setSelectedDateFilter(null)}
                  className="flex items-center gap-1 px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-500 rounded text-[9px] font-black uppercase transition-all"
                >
                  <FilterX className="w-3 h-3" /> フィルター解除
                </button>
              )}
              <Badge variant="success">LIVE 同期中</Badge>
            </div>
          }
        >
          <div className="overflow-y-auto max-h-[700px] scrollbar-thin">
            <div className="divide-y divide-slate-50">
              {filteredRecords.map((record) => {
                const member = members.find(m => m.id === record.memberId);
                const product = products.find(p => p.id === record.productId);
                return (
                  <motion.div 
                    layout
                    key={record.id} 
                    className="px-6 py-4 flex items-center justify-between group hover:bg-slate-50/80 transition-all border-l-4 border-transparent hover:border-brand-midnight"
                  >
                    <div className="flex gap-5 items-center">
                      <div className="w-10 h-10 rounded bg-slate-100 flex items-center justify-center text-slate-400 group-hover:bg-brand-midnight group-hover:text-white transition-all shadow-sm">
                         <Calendar className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="flex items-center gap-3 mb-1">
                          <span className="text-xs font-black text-slate-800 uppercase tracking-tight">{member?.name}</span>
                          <span className="text-[9px] font-black text-slate-400 font-mono tracking-tighter bg-slate-100 px-1.5 py-0.5 rounded">
                             {format(new Date(record.date), 'yyyy.MM.dd HH:mm')}
                          </span>
                        </div>
                        <div className="flex items-center gap-3">
                          <Badge variant="info">{product?.name}</Badge>
                          <Badge variant={record.paymentPlan === 'yearly' ? 'success' : 'info'}>
                            {record.paymentPlan === 'yearly' ? '年払い' : '月払い'}
                          </Badge>
                          {record.customerName && (
                            <span className="text-[10px] font-black text-slate-500 uppercase flex items-center gap-1">
                              <Building2 className="w-3 h-3" /> {record.customerName}
                            </span>
                          )}
                          <span className="text-xs font-black text-brand-text font-mono">
                            {record.count} <span className="text-[9px] font-bold text-slate-400 uppercase ml-0.5">UNIT</span>
                          </span>
                          <span className="text-xs font-black text-brand-midnight font-mono">
                            ¥{record.amount?.toLocaleString()} <span className="text-[9px] font-bold text-slate-400 uppercase ml-0.5">JPY</span>
                          </span>
                          {record.unitPrice > 0 && (
                             <span className="text-[9px] font-bold text-slate-300 uppercase tracking-tighter">
                               (@¥{record.unitPrice?.toLocaleString()})
                             </span>
                          )}
                          {record.note && (
                            <span className="text-[10px] text-slate-400 italic font-medium ml-2 border-l border-slate-200 pl-2">
                              {record.note}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => handleDelete(record.id)}
                      className="p-2 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all hover:bg-red-50 rounded"
                      aria-label="レコードを削除"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </motion.div>
                );
              })}
              {records.length === 0 && (
                <div className="p-20 text-center text-slate-300 text-xs font-bold uppercase tracking-widest italic">
                  同期されたレコードが見つかりません
                </div>
              )}
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
