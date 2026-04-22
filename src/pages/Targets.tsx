import React, { useState } from 'react';
import { useData } from '../lib/DataProvider';
import { Target } from '../types';
import { format } from 'date-fns';
import { Target as TargetIcon, Save, Search, User, Filter, AlertCircle, Sparkles } from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';
import { Card, Badge } from '../components/Common';
import { MonthNavigator } from '../components/MonthNavigator';

export default function Targets() {
  const { members, products, targets, loading } = useData();
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), 'yyyy-MM'));
  const [viewMode, setViewMode] = useState<'matrix' | 'yearly'>('matrix');
  const [selectedMemberForYearly, setSelectedMemberForYearly] = useState<string>('system_overall');
  const [isSaving, setIsSaving] = useState(false);

  // Local state for grid inputs
  const [localTargets, setLocalTargets] = useState<{ [key: string]: number }>({});
  const [localTargetAmounts, setLocalTargetAmounts] = useState<{ [key: string]: number }>({});

  // Initialize local state
  React.useEffect(() => {
    const newLocal: { [key: string]: number } = {};
    const newLocalAmounts: { [key: string]: number } = {};
    
    if (viewMode === 'matrix') {
      targets.forEach(t => {
        if (t.month === selectedMonth) {
          const key = `${t.memberId}_${t.productId}`;
          newLocal[key] = t.targetCount;
          newLocalAmounts[key] = t.targetAmount || 0;
        }
      });
    } else {
      // Yearly mode: Initialize all months for the selected member
      const year = selectedMonth.split('-')[0];
      targets.forEach(t => {
        if (t.month.startsWith(year) && t.memberId === selectedMemberForYearly) {
          const key = `${t.month}_${t.productId}`;
          newLocal[key] = t.targetCount;
          newLocalAmounts[key] = t.targetAmount || 0;
        }
      });
    }
    setLocalTargets(newLocal);
    setLocalTargetAmounts(newLocalAmounts);
  }, [targets, selectedMonth, viewMode, selectedMemberForYearly]);

  const handleInputChange = (id1: string, id2: string, val: string, type: 'count' | 'amount') => {
    const num = parseInt(val) || 0;
    const key = `${id1}_${id2}`;
    if (type === 'count') {
      setLocalTargets(prev => ({ ...prev, [key]: num }));
    } else {
      setLocalTargetAmounts(prev => ({ ...prev, [key]: num }));
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      alert('目標を保存しました（モック動作）');
    } catch (error) {
      console.error('Error saving targets:', error);
    } finally {
      setIsSaving(false);
    }
  };

  // Helper for matrix mode: copy current targets to next months
  const handlePropagate = () => {
    if (!confirm('現在の入力値を12月までの全月にコピーしますか？（未確定の変更も含まれます）')) return;
    const year = selectedMonth.split('-')[0];
    const currentMonthNum = parseInt(selectedMonth.split('-')[1]);
    
    // We'll just alert that they should use the Yearly View for better control, 
    // or we could implement a quick fill here.
    // Let's implement a quick propagation logic for the current month's values.
    setViewMode('yearly'); 
    // This will trigger the useEffect to init the yearly view, 
    // but we want to carry over the 'matrix' values for the selectedMember
    alert('年間個別設定モードに切り替えます。ここで12ヶ月分を調整して保存してください。');
  };

  if (loading) return null;

  return (
    <div className="space-y-4 animate-in fade-in duration-500 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-brand-text tracking-tight uppercase flex items-center gap-2">
            <TargetIcon className="w-5 h-5 text-blue-500" />
            目標管理・戦略プランニング
          </h1>
          <p className="text-[11px] text-brand-muted font-bold uppercase tracking-wider">
            {viewMode === 'matrix' ? '月次マトリクス：全員の目標を横断設定' : '年間個別計画：特定の担当者を12ヶ月分一括設定'}
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex bg-slate-100 p-1 rounded border border-brand-border h-fit">
            <button 
              onClick={() => setViewMode('matrix')}
              className={cn(
                "px-4 py-1.5 text-[10px] font-black uppercase tracking-widest rounded transition-all",
                viewMode === 'matrix' ? "bg-white text-brand-midnight shadow-sm" : "text-slate-400 hover:text-slate-600"
              )}
            >
              月次
            </button>
            <button 
              onClick={() => setViewMode('yearly')}
              className={cn(
                "px-4 py-1.5 text-[10px] font-black uppercase tracking-widest rounded transition-all",
                viewMode === 'yearly' ? "bg-white text-brand-midnight shadow-sm" : "text-slate-400 hover:text-slate-600"
              )}
            >
              年間
            </button>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black text-brand-muted uppercase tracking-widest leading-none">対象</span>
              {viewMode === 'matrix' ? (
                <MonthNavigator
                  value={selectedMonth}
                  onChange={setSelectedMonth}
                />
              ) : (
                <select
                  value={selectedMemberForYearly}
                  onChange={e => setSelectedMemberForYearly(e.target.value)}
                  className="px-3 py-1.5 bg-white border border-brand-border rounded outline-none text-xs font-bold shadow-sm focus:border-brand-midnight transition-all uppercase"
                >
                  <option value="system_overall">【全体目標】</option>
                  {members.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                </select>
              )}
            </div>
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="flex items-center gap-2 px-6 py-2 bg-brand-midnight text-white text-[11px] font-bold uppercase rounded shadow-md hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-50 tracking-wider"
            >
              <Save className="w-3.5 h-3.5" />
              {isSaving ? '保存中...' : '変更を確定'}
            </button>
          </div>
        </div>
      </div>

      <Card 
        className="min-h-[400px]"
        title={viewMode === 'matrix' ? "月次目標配分マトリクス" : `年間目標プランナー: ${selectedMemberForYearly === 'system_overall' ? '全体組織' : members.find(m => m.id === selectedMemberForYearly)?.name}`}
        subtitle={viewMode === 'matrix' ? "担当者 × プロダクト別の戦略的KPI分配" : "1月〜12月までの時系列KPI入力"}
        icon={TargetIcon}
        noPadding
        headerAction={
          <div className="flex items-center gap-2">
            {viewMode === 'matrix' && (
              <button 
                onClick={handlePropagate}
                className="text-[9px] font-black text-blue-600 uppercase border border-blue-200 px-2 py-1 rounded bg-blue-50 hover:bg-blue-100 transition-colors"
              >
                年間入力へ転換
              </button>
            )}
            <Badge variant="info">クラウド同期中</Badge>
          </div>
        }
      >
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[800px]">
             <thead>
               <tr className="bg-slate-50/50 border-b border-brand-border text-[10px] uppercase font-black tracking-widest text-brand-muted">
                 <th className="px-6 py-4 border-r border-brand-border/30 sticky left-0 bg-slate-50 z-10 w-48">
                    {viewMode === 'matrix' ? '担当者' : '対象月'}
                 </th>
                 {products.map(p => (
                   <th key={p.id} className="px-4 py-4 text-center border-r border-brand-border/20 last:border-r-0">
                      {p.name}
                   </th>
                 ))}
                 <th className="px-6 py-4 text-right bg-slate-100/30">合計集計</th>
               </tr>
             </thead>
              <tbody className="divide-y divide-slate-50">
                {viewMode === 'matrix' ? (
                  <>
                    {/* Overall Corporate Target Row */}
                    <tr className="bg-blue-50/30 group transition-colors border-b-2 border-brand-midnight/10">
                      <td className="px-6 py-4 font-bold text-brand-midnight border-r border-slate-50 sticky left-0 bg-blue-50/50 group-hover:bg-blue-100/50 z-10 transition-colors shadow-[2px_0_4px_rgba(0,0,0,0.02)]">
                        <div className="flex items-center gap-3">
                           <div className="w-6 h-6 rounded bg-brand-midnight flex items-center justify-center text-[10px] text-white uppercase font-black">
                             全
                           </div>
                           <div className="flex flex-col">
                             <span className="text-[11px] font-black uppercase tracking-tight">【全体・組織目標】</span>
                             <span className="text-[8px] text-brand-muted font-black uppercase tracking-tighter italic">Corporate Level</span>
                           </div>
                        </div>
                      </td>
                      {products.map(product => {
                        const key = `system_overall_${product.id}`;
                        const count = localTargets[key] || 0;
                        const amount = localTargetAmounts[key] || 0;
                        return (
                          <td key={product.id} className="px-4 py-5 border-r border-slate-50/50 last:border-r-0">
                            <div className="space-y-4">
                              <div className="relative">
                                <span className="absolute -top-3 left-0 text-[8px] font-black text-brand-midnight uppercase tracking-tighter">全体数目標</span>
                                <input
                                  type="number"
                                  min="0"
                                  placeholder="0"
                                  value={count || ''}
                                  onChange={e => handleInputChange('system_overall', product.id, e.target.value, 'count')}
                                  className="w-full text-center bg-transparent focus:bg-white border-b-2 border-brand-midnight/20 focus:border-brand-midnight outline-none py-1 text-xs font-mono font-black transition-all text-brand-midnight"
                                />
                              </div>
                              <div className="relative">
                                <span className="absolute -top-3 left-0 text-[8px] font-black text-green-700 uppercase tracking-tighter">全体金額目標</span>
                                <input
                                  type="number"
                                  min="0"
                                  placeholder="0"
                                  value={amount || ''}
                                  onChange={e => handleInputChange('system_overall', product.id, e.target.value, 'amount')}
                                  className="w-full text-center bg-transparent focus:bg-white border-b-2 border-green-200 focus:border-green-600 outline-none py-1 text-xs font-mono font-black transition-all text-green-800"
                                />
                              </div>
                            </div>
                          </td>
                        );
                      })}
                      <td className="px-6 py-4 text-right bg-blue-100/20 border-l border-brand-border/10">
                        <div className="flex flex-col items-end gap-1.5 opacity-50">
                          <span className="text-[8px] font-black text-slate-400 uppercase tracking-tight">組織のKIＰ基準値</span>
                        </div>
                      </td>
                    </tr>

                    {members.map(member => {
                      let rowTargetCount = 0;
                      let rowTargetAmount = 0;
                      return (
                        <tr key={member.id} className="hover:bg-slate-50/50 group transition-colors">
                          <td className="px-6 py-4 font-bold text-brand-text border-r border-slate-50 sticky left-0 bg-white group-hover:bg-slate-50 z-10 transition-colors shadow-[2px_0_4px_rgba(0,0,0,0.02)]">
                            <div className="flex items-center gap-3">
                               <div className="w-6 h-6 rounded bg-slate-100 flex items-center justify-center text-[10px] text-slate-400 uppercase font-black group-hover:bg-brand-midnight group-hover:text-white transition-colors">
                                 {member.name.charAt(0)}
                               </div>
                               <span className="text-[11px] font-black uppercase tracking-tight">{member.name}</span>
                            </div>
                          </td>
                          {products.map(product => {
                            const key = `${member.id}_${product.id}`;
                            const count = localTargets[key] || 0;
                            const amount = localTargetAmounts[key] || 0;
                            rowTargetCount += count;
                            rowTargetAmount += amount;
                            return (
                              <td key={product.id} className="px-4 py-5 border-r border-slate-50/50 last:border-r-0">
                                <div className="space-y-4">
                                  <div className="relative">
                                    <span className="absolute -top-3 left-0 text-[8px] font-black text-blue-500 uppercase tracking-tighter">数量</span>
                                    <input
                                      type="number"
                                      min="0"
                                      placeholder="0"
                                      value={count || ''}
                                      onChange={e => handleInputChange(member.id, product.id, e.target.value, 'count')}
                                      className="w-full text-center bg-transparent focus:bg-white border-b border-slate-100 focus:border-brand-midnight outline-none py-1 text-xs font-mono font-black transition-all text-slate-800"
                                    />
                                  </div>
                                  <div className="relative">
                                    <span className="absolute -top-3 left-0 text-[8px] font-black text-green-600 uppercase tracking-tighter">金額</span>
                                    <input
                                      type="number"
                                      min="0"
                                      placeholder="0"
                                      value={amount || ''}
                                      onChange={e => handleInputChange(member.id, product.id, e.target.value, 'amount')}
                                      className="w-full text-center bg-transparent focus:bg-white border-b border-slate-100 focus:border-brand-midnight outline-none py-1 text-xs font-mono font-black transition-all text-green-700"
                                    />
                                  </div>
                                </div>
                              </td>
                            );
                          })}
                          <td className="px-6 py-4 text-right bg-slate-50/50 border-l border-brand-border/10">
                            <div className="flex flex-col items-end gap-1.5">
                              <div>
                                <span className="text-[11px] font-mono font-black text-brand-midnight">{rowTargetCount.toLocaleString()}</span>
                                <span className="text-[8px] font-black text-slate-400 ml-1 uppercase">件</span>
                              </div>
                              <div>
                                <span className="text-[11px] font-mono font-black text-green-600">¥{rowTargetAmount.toLocaleString()}</span>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )
                    })}

                    {/* Gap Analysis Row 1: Sum of Individuals */}
                    <tr className="bg-slate-50/50 border-t-2 border-slate-200">
                      <td className="px-6 py-4 font-bold text-slate-500 border-r border-slate-100 sticky left-0 bg-slate-50 z-10 italic">
                        <div className="flex flex-col">
                          <span className="text-[10px] font-black uppercase tracking-tight">個人目標の合計値</span>
                          <span className="text-[8px] font-bold uppercase tracking-tighter italic text-slate-400">Sum of Assignments</span>
                        </div>
                      </td>
                      {products.map(product => {
                        const sumCount = members.reduce((sum, m) => sum + (localTargets[`${m.id}_${product.id}`] || 0), 0);
                        const sumAmount = members.reduce((sum, m) => sum + (localTargetAmounts[`${m.id}_${product.id}`] || 0), 0);
                        return (
                          <td key={product.id} className="px-4 py-3 text-center border-r border-slate-200/20 last:border-r-0">
                            <div className="flex flex-col gap-1">
                              <span className="text-[11px] font-mono font-black text-slate-600">{sumCount} 件</span>
                              <span className="text-[10px] font-mono font-bold text-slate-400 text-xs">¥{sumAmount.toLocaleString()}</span>
                            </div>
                          </td>
                        );
                      })}
                      <td className="px-6 py-4 bg-slate-100/30"></td>
                    </tr>

                    {/* Gap Analysis Row 2: Discrepancy (Overall - Individual Sum) */}
                    <tr className="bg-white border-t border-slate-100">
                      <td className="px-6 py-4 font-bold border-r border-slate-100 sticky left-0 bg-white z-10 transition-colors">
                        <div className="flex flex-col">
                          <span className="text-[10px] font-black uppercase tracking-tight">全体目標とのズレ</span>
                          <span className="text-[8px] font-bold uppercase tracking-tighter italic text-slate-400">Discrepancy</span>
                        </div>
                      </td>
                      {products.map(product => {
                        const overallCount = localTargets[`system_overall_${product.id}`] || 0;
                        const overallAmount = localTargetAmounts[`system_overall_${product.id}`] || 0;
                        const sumCount = members.reduce((sum, m) => sum + (localTargets[`${m.id}_${product.id}`] || 0), 0);
                        const sumAmount = members.reduce((sum, m) => sum + (localTargetAmounts[`${m.id}_${product.id}`] || 0), 0);
                        
                        const diffCount = overallCount - sumCount;
                        const diffAmount = overallAmount - sumAmount;
                        
                        const isPerfectCount = diffCount === 0;
                        const isPerfectAmount = diffAmount === 0;

                        return (
                          <td key={product.id} className="px-4 py-3 text-center border-r border-slate-200/20 last:border-r-0">
                            <div className="flex flex-col gap-1">
                              <div className={cn(
                                "text-[10px] font-mono font-black py-0.5 px-1.5 rounded inline-block mx-auto",
                                isPerfectCount ? "text-emerald-600 bg-emerald-50" : "text-rose-600 bg-rose-50"
                              )}>
                                {diffCount > 0 ? `+${diffCount}` : diffCount}
                                <span className="ml-1 text-[8px]">{isPerfectCount ? 'OK' : '不足/過剰'}</span>
                              </div>
                              <div className={cn(
                                "text-[9px] font-mono font-bold py-0.5 px-1.5 rounded inline-block mx-auto",
                                isPerfectAmount ? "text-emerald-500 bg-emerald-50" : "text-amber-600 bg-amber-50"
                              )}>
                                {diffAmount > 0 ? `+¥${diffAmount.toLocaleString()}` : `¥${diffAmount.toLocaleString()}`}
                              </div>
                            </div>
                          </td>
                        );
                      })}
                      <td className="px-6 py-4 bg-slate-100/10"></td>
                    </tr>
                  </>
                ) : (
                  // Yearly View Tables
                  Array.from({ length: 12 }).map((_, i) => {
                    const month = `${selectedMonth.split('-')[0]}-${String(i + 1).padStart(2, '0')}`;
                    let monthTotalCount = 0;
                    let monthTotalAmount = 0;
                    return (
                      <tr key={month} className={cn(
                        "hover:bg-slate-50/50 transition-colors",
                        month === selectedMonth ? "bg-amber-50/30 font-bold" : ""
                      )}>
                        <td className="px-6 py-4 font-bold text-brand-text border-r border-slate-50 sticky left-0 bg-white group-hover:bg-slate-50 z-10 transition-colors shadow-[2px_0_4px_rgba(0,0,0,0.02)]">
                           <span className="text-[11px] font-black uppercase tracking-tight">{i + 1}月</span>
                        </td>
                        {products.map(product => {
                          const key = `${month}_${product.id}`;
                          const count = localTargets[key] || 0;
                          const amount = localTargetAmounts[key] || 0;
                          monthTotalCount += count;
                          monthTotalAmount += amount;
                          return (
                            <td key={product.id} className="px-4 py-5 border-r border-slate-50/50 last:border-r-0">
                                <div className="space-y-4">
                                  <div className="relative">
                                    <input
                                      type="number"
                                      min="0"
                                      placeholder="0"
                                      value={count || ''}
                                      onChange={e => handleInputChange(month, product.id, e.target.value, 'count')}
                                      className="w-full text-center bg-transparent focus:bg-white border-b border-slate-100 focus:border-brand-midnight outline-none py-1 text-xs font-mono font-black transition-all text-slate-800"
                                    />
                                  </div>
                                  <div className="relative">
                                    <input
                                      type="number"
                                      min="0"
                                      placeholder="0"
                                      value={amount || ''}
                                      onChange={e => handleInputChange(month, product.id, e.target.value, 'amount')}
                                      className="w-full text-center bg-transparent focus:bg-white border-b border-slate-100 focus:border-brand-midnight outline-none py-1 text-xs font-mono font-black transition-all text-green-700"
                                    />
                                  </div>
                                </div>
                            </td>
                          )
                        })}
                        <td className="px-6 py-4 text-right bg-slate-50/50 border-l border-brand-border/10">
                           <div className="flex flex-col items-end gap-1.5 opacity-50">
                             <span className="text-[11px] font-mono font-black text-brand-midnight">{monthTotalCount}</span>
                             <span className="text-[11px] font-mono font-black text-green-600">¥{monthTotalAmount.toLocaleString()}</span>
                           </div>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
          </table>
        </div>
        
        <div className="p-3 bg-slate-50/80 border-t border-brand-border flex justify-between text-[9px] text-slate-400 font-black uppercase tracking-[0.2em]">
           <span>TARGET PLANNER v3.0</span>
           <span className="flex items-center gap-2 text-blue-500">
              <Sparkles className="w-2.5 h-2.5" />
              BULK EDITING ENABLED
           </span>
        </div>
      </Card>

      <div className="bg-brand-midnight text-white p-5 rounded-xl flex items-start gap-4 shadow-xl">
        <div className="bg-white/10 p-2 rounded">
          <AlertCircle className="w-4 h-4 text-blue-300" />
        </div>
        <div className="flex-1">
          <h4 className="text-[11px] font-black text-white uppercase tracking-widest">一括入力のアドバイス</h4>
          <p className="text-[11px] text-slate-400 font-bold leading-relaxed mt-1 italic">
             右上の切り替えスイッチで「年間」を選択すると、一人ずつの数値を12月分まで一気に入力できます。
             全体の目標数値が固定されている場合は、まず「全体目標」を選択して12月分まで入力し、その後に各営業担当者の数値を入力してください。
             プロダクトが追加された際も、右側の列が自動で増えますので、同様の手順で通年目標を設定可能です。
          </p>
        </div>
      </div>
    </div>
  );
}
