import React, { useState } from 'react';
import { useData } from '../lib/DataContext';
import { db } from '../lib/firebase';
import { useAuth } from '../lib/AuthContext';
import { doc, setDoc } from 'firebase/firestore';
import { format, parseISO } from 'date-fns';
import { 
  Trophy, 
  ChevronLeft, 
  ChevronRight, 
  User, 
  Package, 
  Calendar,
  Save,
  Edit3,
  CheckCircle2,
  PhoneCall,
  Zap,
  Handshake,
  FileCheck,
  TrendingUp,
  Inbox
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { Card, Badge } from '../components/Common';
import { MonthNavigator } from '../components/MonthNavigator';
import { WeeklyPerformance, PerformanceMetric } from '../types';

const WEEKS = [1, 2, 3, 4, 5];

type MetricKey = keyof WeeklyPerformance;

interface MetricRowDef {
  label: string;
  key: MetricKey;
  icon: any;
  color: string;
  inbound?: boolean;
}

const OUTBOUND_METRICS: MetricRowDef[] = [
  { label: '架電数', key: 'calls', icon: PhoneCall, color: 'text-blue-500' },
  { label: '通電数', key: 'connected', icon: Zap, color: 'text-amber-500' },
  { label: 'アポ数', key: 'appointments', icon: Calendar, color: 'text-emerald-500' },
  { label: '商談数', key: 'negotiations', icon: Handshake, color: 'text-indigo-500' },
  { label: 'トライアル開始', key: 'trialStarts', icon: TrendingUp, color: 'text-violet-500' },
  { label: 'トライアル終了', key: 'trialEnds', icon: TrendingUp, color: 'text-rose-500' },
  { label: '契約数', key: 'contracts', icon: FileCheck, color: 'text-brand-midnight' },
];

const INBOUND_METRICS: MetricRowDef[] = [
  { label: 'インバウンド受付', key: 'inboundEntries', icon: Inbox, color: 'text-blue-500' },
  { label: '初回アポ数', key: 'appointments', icon: Calendar, color: 'text-emerald-500' },
  { label: '商談数', key: 'negotiations', icon: Handshake, color: 'text-indigo-500' },
  { label: 'トライアル開始', key: 'trialStarts', icon: TrendingUp, color: 'text-violet-500' },
  { label: 'トライアル終了', key: 'trialEnds', icon: TrendingUp, color: 'text-rose-500' },
  { label: '契約数', key: 'contracts', icon: FileCheck, color: 'text-brand-midnight' },
];

export default function Performance() {
  const { members, products, targets, records, performanceMetrics, loading } = useData();
  const { user } = useAuth();
  const [selectedMemberId, setSelectedMemberId] = useState('');
  const [selectedProductId, setSelectedProductId] = useState('all');
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), 'yyyy-MM'));
  const [editMode, setEditMode] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Auto-select member based on login
  React.useEffect(() => {
    if (members.length > 0 && !selectedMemberId) {
      const currentMember = members.find(m => m.email.toLowerCase() === user?.email?.toLowerCase());
      setSelectedMemberId(currentMember?.id || members[0].id);
    }
  }, [members, user, selectedMemberId]);

  if (loading) return null;

  const currentMetrics = selectedProductId === 'all' 
    ? performanceMetrics.filter(m => m.memberId === selectedMemberId && m.month === selectedMonth)
    : performanceMetrics.filter(m => m.memberId === selectedMemberId && m.productId === selectedProductId && m.month === selectedMonth);

  const getMetricValue = (week: number, key: MetricKey) => {
    if (selectedProductId === 'all') {
      return currentMetrics.reduce((sum, m) => sum + (m.weeks[week]?.[key] || 0), 0);
    }
    return currentMetrics[0]?.weeks[week]?.[key] || 0;
  };

  const getRowTotal = (metrics: MetricRowDef[], key: MetricKey) => {
    return WEEKS.reduce((sum, week) => sum + getMetricValue(week, key), 0);
  };

  const handleValueChange = async (week: number, key: MetricKey, value: string) => {
    if (selectedProductId === 'all') return;
    const numValue = parseInt(value) || 0;
    const docId = `${selectedMemberId}_${selectedProductId}_${selectedMonth}`;
    const docRef = doc(db, 'performanceMetrics', docId);

    const actualCurrent = currentMetrics[0];

    const newWeeks = { ...(actualCurrent?.weeks || {}) };
    newWeeks[week] = { ...(newWeeks[week] || {}), [key]: numValue };

    setIsSaving(true);
    try {
      await setDoc(docRef, {
        memberId: selectedMemberId,
        productId: selectedProductId,
        month: selectedMonth,
        weeks: newWeeks
      }, { merge: true });
    } catch (e) {
      console.error(e);
    } finally {
      setIsSaving(false);
    }
  };

  const renderTable = (metrics: MetricRowDef[], title: string) => (
    <Card noPadding title={title} className="overflow-hidden">
      {selectedProductId === 'all' && (
        <div className="bg-amber-50/50 px-4 py-2 border-b border-amber-100/50 flex items-center gap-2">
           <div className="bg-amber-100 p-1 rounded">
             <TrendingUp className="w-3 h-3 text-amber-600" />
           </div>
           <span className="text-[9px] font-black text-amber-700 uppercase tracking-widest">全商品合算データ表示中 (閲覧のみ)</span>
        </div>
      )}
      <div className="overflow-x-auto overflow-y-hidden">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b border-brand-border">
              <th className="px-4 py-3 text-left w-40 min-w-40 border-r border-brand-border">
                <span className="text-[10px] font-black text-brand-muted uppercase tracking-[0.2em]">指標</span>
              </th>
              {WEEKS.map(w => (
                <th key={w} className="px-3 py-3 text-center border-r border-brand-border min-w-20">
                  <span className="text-[10px] font-black text-brand-muted uppercase tracking-[0.2em]">{w}W</span>
                </th>
              ))}
              <th className="px-4 py-3 text-center bg-slate-100 min-w-24">
                <span className="text-[10px] font-black text-brand-midnight uppercase tracking-[0.2em]">合計</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {metrics.map(row => (
              <tr key={row.key} className="group hover:bg-slate-50 transition-colors">
                <td className="px-4 py-3 border-r border-brand-border">
                  <div className="flex items-center gap-2">
                    <row.icon className={`w-3.5 h-3.5 ${row.color}`} />
                    <span className="text-[11px] font-black text-brand-text uppercase">{row.label}</span>
                  </div>
                </td>
                {WEEKS.map(w => (
                  <td key={w} className="p-0 border-r border-brand-border text-center align-middle">
   {editMode && selectedProductId !== 'all' ? (
                      <input
                        type="number"
                        className="w-full h-10 px-2 text-center text-xs font-mono font-bold bg-transparent outline-none focus:bg-white focus:ring-2 focus:ring-brand-midnight/10 transition-all [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        value={getMetricValue(w, row.key) || ''}
                        onChange={e => handleValueChange(w, row.key, e.target.value)}
                        onFocus={e => e.target.select()}
                      />
                    ) : (
                      <span className={cn(
                        "text-xs font-mono font-black",
                        selectedProductId === 'all' ? "text-amber-700" : "text-slate-600"
                      )}>
                        {getMetricValue(w, row.key)}
                      </span>
                    )}
                  </td>
                ))}
                <td className="px-4 py-3 text-center bg-slate-50/50">
                  <span className="text-xs font-mono font-black text-brand-midnight">
                    {getRowTotal(metrics, row.key)}
                  </span>
                </td>
              </tr>
            ))}
            {/* Rates */}
            <tr className="bg-slate-50/30">
               <td className="px-4 py-2 border-r border-brand-border">
                 <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">成約率 (契約/商談)</span>
               </td>
               {WEEKS.map(w => {
                 const neg = getMetricValue(w, 'negotiations');
                 const con = getMetricValue(w, 'contracts');
                 const rate = neg ? (con / neg * 100).toFixed(1) : '0.0';
                 return (
                   <td key={w} className="px-3 py-2 text-center border-r border-brand-border">
                     <span className="text-[10px] font-mono font-bold text-slate-400">{rate}%</span>
                   </td>
                 );
               })}
               <td className="px-4 py-2 text-center bg-slate-100/50">
                 {(() => {
                   const neg = getRowTotal(metrics, 'negotiations');
                   const con = getRowTotal(metrics, 'contracts');
                   const rate = neg ? (con / neg * 100).toFixed(1) : '0.0';
                   return <span className="text-[10px] font-mono font-black text-brand-midnight">{rate}%</span>;
                 })()}
               </td>
            </tr>
          </tbody>
        </table>
      </div>
    </Card>
  );

  return (
    <div className="space-y-6 pb-20 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-brand-text tracking-tight uppercase flex items-center gap-2">
            <Trophy className="w-5 h-5 text-brand-midnight" />
            個人成績管理・ファネル分析
          </h1>
          <p className="text-[11px] text-brand-muted font-bold uppercase tracking-wider">週次アクティビティ詳細トラッキング</p>
        </div>
        <div className="flex items-center gap-2 bg-white p-1 rounded-lg border border-brand-border shadow-sm">
           <button 
             onClick={() => setEditMode(!editMode)}
             disabled={selectedProductId === 'all'}
             className={`flex items-center gap-2 px-4 py-1.5 rounded text-[10px] font-black uppercase tracking-widest transition-all ${
               selectedProductId === 'all' ? 'opacity-30 cursor-not-allowed grayscale' :
               editMode 
                 ? 'bg-brand-midnight text-white shadow-lg shadow-brand-midnight/20' 
                 : 'bg-transparent text-brand-muted hover:bg-slate-50'
             }`}
           >
              {editMode ? <CheckCircle2 className="w-3.5 h-3.5 text-blue-400" /> : <Edit3 className="w-3.5 h-3.5" />}
              {editMode ? '編集を完了' : 'データを編集'}
           </button>
           {isSaving && (
             <div className="flex items-center gap-2 px-3 animate-pulse">
               <Save className="w-3 h-3 text-emerald-500" />
               <span className="text-[9px] font-black text-emerald-600 uppercase">Saving...</span>
             </div>
           )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        <Card className="lg:col-span-1" noPadding>
          <div className="p-4 space-y-4">
            <div className="space-y-1.5">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                <User className="w-3 h-3" /> 担当者
              </label>
              <select 
                value={selectedMemberId}
                onChange={e => setSelectedMemberId(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-brand-border rounded text-xs font-black focus:bg-white transition-all outline-none"
              >
                {members.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                <Package className="w-3 h-3" /> プロダクト
              </label>
              <select 
                value={selectedProductId}
                onChange={e => setSelectedProductId(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-brand-border rounded text-xs font-black focus:bg-white transition-all outline-none"
              >
                <option value="all">【全プロダクト合計】</option>
                {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                <Calendar className="w-3 h-3" /> 対象月
              </label>
              <MonthNavigator 
                value={selectedMonth}
                onChange={setSelectedMonth}
                className="w-full"
              />
            </div>
          </div>
        </Card>

        <div className="lg:col-span-3 space-y-6">
          {selectedProductId === 'all' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
               {(() => {
                 const currentMonthTargets = targets.filter(t => t.memberId === selectedMemberId && t.month === selectedMonth);
                 const currentMonthRecords = records.filter(r => r.memberId === selectedMemberId && format(parseISO(r.date), 'yyyy-MM') === selectedMonth);
                 
                 const totalTarget = currentMonthTargets.reduce((sum, t) => sum + t.targetCount, 0);
                 const totalActual = currentMonthRecords.reduce((sum, r) => sum + r.count, 0);
                 const totalTargetAmt = currentMonthTargets.reduce((sum, t) => sum + t.targetAmount, 0);
                 const totalActualAmt = currentMonthRecords.reduce((sum, r) => sum + r.amount, 0);
                 
                 const achievement = totalTarget > 0 ? (totalActual / totalTarget * 100).toFixed(1) : '0';
                 const revenueAch = totalTargetAmt > 0 ? (totalActualAmt / totalTargetAmt * 100).toFixed(1) : '0';

                 return (
                   <>
                     <Card className="bg-slate-900 border-none">
                       <div className="flex flex-col">
                         <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">月間成約件数 合計</span>
                         <div className="flex items-baseline gap-2">
                           <span className="text-2xl font-black text-white font-mono">{totalActual}</span>
                           <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">/ {totalTarget}件</span>
                         </div>
                         <div className="mt-3 w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                           <div className="h-full bg-blue-500" style={{ width: `${Math.min(100, Number(achievement))}%` }} />
                         </div>
                         <span className="mt-2 text-[10px] font-black text-blue-400 uppercase tracking-widest">{achievement}% 達成</span>
                       </div>
                     </Card>
                     <Card className="bg-slate-900 border-none">
                       <div className="flex flex-col">
                         <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">月間売上合計</span>
                         <div className="flex items-baseline gap-2">
                           <span className="text-xl font-black text-white font-mono">¥{totalActualAmt.toLocaleString()}</span>
                           <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">/ ¥{totalTargetAmt.toLocaleString()}</span>
                         </div>
                         <div className="mt-3 w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                           <div className="h-full bg-emerald-500" style={{ width: `${Math.min(100, Number(revenueAch))}%` }} />
                         </div>
                         <span className="mt-2 text-[10px] font-black text-emerald-400 uppercase tracking-widest">{revenueAch}% 達成</span>
                       </div>
                     </Card>
                     <Card className="bg-slate-900 border-none">
                       <div className="flex flex-col">
                         <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">総合パフォーマンス</span>
                         <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-full border-4 border-blue-500/20 border-t-blue-500 flex items-center justify-center">
                              <Trophy className="w-5 h-5 text-blue-400" />
                            </div>
                            <div>
                               <p className="text-[11px] font-black text-white uppercase tracking-tight">個人総合ランク</p>
                               <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest">分析中...</p>
                            </div>
                         </div>
                         <div className="mt-4 flex gap-1">
                            {Array.from({ length: 5 }).map((_, i) => (
                              <div key={i} className={`h-1 flex-1 rounded-full ${i < 4 ? 'bg-blue-500' : 'bg-white/5'}`} />
                            ))}
                         </div>
                       </div>
                     </Card>
                   </>
                 );
               })()}
            </div>
          )}

          {selectedProductId === 'all' && (
            <Card title="商品別実積内訳" subtitle="プロダクト別の達成率・進捗データ" noPadding>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-brand-border">
                      <th className="px-4 py-3 text-left text-[9px] font-black text-brand-muted uppercase tracking-widest">商品名</th>
                      <th className="px-4 py-3 text-right text-[9px] font-black text-brand-muted uppercase tracking-widest">成約目標</th>
                      <th className="px-4 py-3 text-right text-[9px] font-black text-brand-muted uppercase tracking-widest">成約実績</th>
                      <th className="px-4 py-3 text-right text-[9px] font-black text-brand-muted uppercase tracking-widest">達成率</th>
                      <th className="px-4 py-3 text-right text-[9px] font-black text-brand-muted uppercase tracking-widest">売上実績</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 italic">
                    {products.map(p => {
                      const target = targets.find(t => t.memberId === selectedMemberId && t.month === selectedMonth && t.productId === p.id);
                      const actuals = records.filter(r => r.memberId === selectedMemberId && r.productId === p.id && format(parseISO(r.date), 'yyyy-MM') === selectedMonth);
                      
                      const targetCount = target?.targetCount || 0;
                      const actualCount = actuals.reduce((sum, r) => sum + r.count, 0);
                      const actualAmt = actuals.reduce((sum, r) => sum + r.amount, 0);
                      const rate = targetCount > 0 ? (actualCount / targetCount * 100).toFixed(1) : '0.0';

                      return (
                        <tr key={p.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="px-4 py-3 text-[11px] font-black text-brand-text">{p.name}</td>
                          <td className="px-4 py-3 text-right font-mono text-[11px] text-slate-400">{targetCount}</td>
                          <td className="px-4 py-3 text-right font-mono text-[11px] text-brand-midnight font-black">{actualCount}</td>
                          <td className="px-4 py-3 text-right font-mono text-[11px] text-blue-600 font-black">{rate}%</td>
                          <td className="px-4 py-3 text-right font-mono text-[11px] text-emerald-600 font-black">¥{actualAmt.toLocaleString()}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </Card>
          )}

          {renderTable(OUTBOUND_METRICS, '【アウトバウンド】活動サマリー')}
          {renderTable(INBOUND_METRICS, '【インバウンド】活動サマリー')}
        </div>
      </div>
    </div>
  );
}
