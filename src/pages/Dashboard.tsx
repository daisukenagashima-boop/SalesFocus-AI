import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useData } from '../lib/DataProvider';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer, 
} from 'recharts';
import { TrendingUp, Target as TargetIcon, CheckCircle, Users, Activity, Package, LayoutGrid, CalendarRange, AlertCircle, CheckCircle2, Trophy } from 'lucide-react';
import { format, parseISO, startOfYear, endOfYear, eachMonthOfInterval } from 'date-fns';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';
import { Card, Badge, KpiCard } from '../components/Common';

export default function Dashboard() {
  const { members, products, targets, records, loading } = useData();
  const [selectedYear] = useState('2026');

  const stats = useMemo(() => {
    const today = new Date();
    const currentMonth = format(today, 'yyyy-MM');
    const startOfSelectedYear = startOfYear(new Date(`${selectedYear}-01-01`));
    const endOfSelectedYear = endOfYear(new Date(`${selectedYear}-01-01`));
    
    // 1. Current Month Stats
    const currentMonthTargets = targets.filter(t => t.month === currentMonth);
    const monthlyRecords = records.filter(r => format(parseISO(r.date), 'yyyy-MM') === currentMonth);

    // Calculate goals based on 'system_overall' if exists, otherwise sum individuals
    const getGoal = (targetList: typeof targets) => {
      const overallTargets = targetList.filter(t => t.memberId === 'system_overall');
      if (overallTargets.length > 0) {
        return {
          count: overallTargets.reduce((sum, t) => sum + t.targetCount, 0),
          amount: overallTargets.reduce((sum, t) => sum + t.targetAmount, 0)
        };
      }
      return {
        count: targetList.reduce((sum, t) => sum + t.targetCount, 0),
        amount: targetList.reduce((sum, t) => sum + t.targetAmount, 0)
      };
    };

    const currentGoals = getGoal(currentMonthTargets);
    const totalTarget = currentGoals.count;
    const totalTargetAmount = currentGoals.amount;
    const totalActual = monthlyRecords.reduce((sum, r) => sum + r.count, 0);
    const totalActualAmount = monthlyRecords.reduce((sum, r) => sum + r.amount, 0);
    
    const achievementRate = totalTarget > 0 ? (totalActual / totalTarget) * 100 : 0;
    const revenueRate = totalTargetAmount > 0 ? (totalActualAmount / totalTargetAmount) * 100 : 0;

    // 2. Yearly Aggregate Section (Product-wise)
    const yearlyRecords = records.filter(r => format(parseISO(r.date), 'yyyy') === selectedYear);

    const yearlyProductSummary = products.map(p => {
      const pYearlyTargets = targets.filter(t => t.month.startsWith(selectedYear) && t.productId === p.id);
      
      // For each month, decide if we use overall or sum
      let pYearlyTarget = 0;
      const yearMonths = eachMonthOfInterval({ start: startOfSelectedYear, end: endOfSelectedYear });
      yearMonths.forEach(m => {
        const mStr = format(m, 'yyyy-MM');
        const mPTargets = pYearlyTargets.filter(t => t.month === mStr);
        const overall = mPTargets.find(t => t.memberId === 'system_overall');
        if (overall) {
          pYearlyTarget += overall.targetCount;
        } else {
          pYearlyTarget += mPTargets.reduce((sum, t) => sum + t.targetCount, 0);
        }
      });

      const pYearlyActual = yearlyRecords.filter(r => r.productId === p.id).reduce((sum, r) => sum + r.count, 0);
      const rate = pYearlyTarget > 0 ? (pYearlyActual / pYearlyTarget) * 100 : 0;
      const remaining = Math.max(0, pYearlyTarget - pYearlyActual);
      
      const monthProgress = today.getMonth() + 1;
      const targetProgress = (pYearlyTarget / 12) * monthProgress;
      const status = pYearlyActual < targetProgress * 0.8 ? '要注意' : '良好';

      return {
        id: p.id,
        name: p.name,
        target: pYearlyTarget,
        actual: pYearlyActual,
        rate,
        remaining,
        status
      };
    });

    const yearlyTotalTarget = yearlyProductSummary.reduce((sum, s) => sum + s.target, 0);
    const yearlyTotalActual = yearlyProductSummary.reduce((sum, s) => sum + s.actual, 0);
    const yearlyTotalRate = yearlyTotalTarget > 0 ? (yearlyTotalActual / yearlyTotalTarget) * 100 : 0;

    // 3. Monthly Progress Matrix (1-12 months)
    const months = eachMonthOfInterval({ start: startOfSelectedYear, end: endOfSelectedYear });
    const monthlyMatrix = months.map(m => {
      const mStr = format(m, 'yyyy-MM');
      const monthTargets = targets.filter(t => t.month === mStr);
      const monthRecords = records.filter(r => format(parseISO(r.date), 'yyyy-MM') === mStr);

      const prodData: { [key: string]: { target: number, actual: number } } = {};
      products.forEach(p => {
        const mPTargets = monthTargets.filter(t => t.productId === p.id);
        const overall = mPTargets.find(t => t.memberId === 'system_overall');
        
        prodData[p.id] = {
          target: overall ? overall.targetCount : mPTargets.reduce((sum, t) => sum + t.targetCount, 0),
          actual: monthRecords.filter(r => r.productId === p.id).reduce((sum, r) => sum + r.count, 0)
        };
      });

      const mTotalTarget = Object.values(prodData).reduce((sum, d) => sum + d.target, 0);
      const mTotalActual = Object.values(prodData).reduce((sum, d) => sum + d.actual, 0);

      return {
        month: format(m, 'M月'),
        monthRaw: mStr,
        prodData,
        mTotalTarget,
        mTotalActual,
        rate: mTotalTarget > 0 ? (mTotalActual / mTotalTarget) * 100 : 0
      };
    });

    // Ranking for current month (individuals only)
    const currentMonthTargetsIndividuals = currentMonthTargets.filter(t => t.memberId !== 'system_overall');
    const memberRankings = members.map(m => {
      const mActual = monthlyRecords.filter(r => r.memberId === m.id).reduce((sum, r) => sum + r.count, 0);
      const mTarget = currentMonthTargetsIndividuals.filter(t => t.memberId === m.id).reduce((sum, t) => sum + t.targetCount, 0);
      const mActualAmt = monthlyRecords.filter(r => r.memberId === m.id).reduce((sum, r) => sum + r.amount, 0);
      const mTargetAmt = currentMonthTargetsIndividuals.filter(t => t.memberId === m.id).reduce((sum, t) => sum + t.targetAmount, 0);
      return {
        id: m.id,
        name: m.name,
        actual: mActual,
        target: mTarget,
        actualAmt: mActualAmt,
        targetAmt: mTargetAmt,
        rate: mTarget > 0 ? (mActual / mTarget) * 100 : 0,
        revenueRate: mTargetAmt > 0 ? (mActualAmt / mTargetAmt) * 100 : 0
      };
    }).sort((a, b) => b.actual - a.actual);

    return { 
      totalTarget, 
      totalActual, 
      totalTargetAmount, 
      totalActualAmount, 
      achievementRate, 
      revenueRate,
      yearlyProductSummary,
      yearlyTotalTarget,
      yearlyTotalActual,
      yearlyTotalRate,
      monthlyMatrix,
      memberRankings 
    };
  }, [members, products, targets, records, selectedYear]);

  if (loading && members.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 font-bold text-slate-400 gap-4">
        <div className="w-8 h-8 rounded-full border-2 border-slate-200 border-t-brand-midnight animate-spin" />
        <p className="text-[10px] uppercase tracking-[0.2em]">データの安全な同期を初期化中...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-20">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-black text-brand-text tracking-tight uppercase flex items-center gap-2">
            <LayoutGrid className="w-5 h-5 text-brand-midnight" />
            {selectedYear}年 営業目標管理ダッシュボード
          </h1>
          <p className="text-[10px] text-brand-muted font-black uppercase tracking-[0.2em] mt-0.5">Comprehensive Performance Ecosystem</p>
        </div>
        <div className="flex items-center gap-3">
           <Badge variant="info" className="bg-slate-100 border-slate-200 text-slate-600 font-black">
             {selectedYear} ANNUAL CYCLE
           </Badge>
           <button className="p-2 border border-brand-border rounded hover:bg-slate-50 transition-colors">
              <CalendarRange className="w-4 h-4 text-brand-muted" />
           </button>
        </div>
      </div>

      {/* Primary KPI Stream */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="成約目標 (数量)" value={`${stats.totalTarget} 件`} icon={Users} />
        <KpiCard label="成約実績 (数量)" value={`${stats.totalActual} 件`} icon={TrendingUp} trend={{ val: `${stats.achievementRate.toFixed(1)}%`, positive: stats.achievementRate >= 80 }} />
        <KpiCard label="月間目標 (金額)" value={`¥${stats.totalTargetAmount.toLocaleString()}`} icon={TargetIcon} />
        <KpiCard label="現在実績 (金額)" value={`¥${stats.totalActualAmount.toLocaleString()}`} icon={CheckCircle} trend={{ val: `${stats.revenueRate.toFixed(1)}%`, positive: stats.revenueRate >= 80 }} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        {/* Yearly Achievement Summary (Excel style top table) */}
        <Card 
          className="md:col-span-12 lg:col-span-7"
          title="【年間目標サマリー】" 
          subtitle="各プロダクトごとの累積達成状況"
          icon={Activity}
          noPadding
        >
          <div className="overflow-x-auto">
            <table className="w-full border-collapse min-w-[600px]">
               <thead>
                 <tr className="bg-slate-50 border-b border-brand-border text-[9px] font-black text-slate-400 uppercase tracking-widest text-left">
                    <th className="px-5 py-3">商品名</th>
                    <th className="px-4 py-3 text-right">目標件数</th>
                    <th className="px-4 py-3 text-right">実績件数</th>
                    <th className="px-4 py-3 text-right">達成率</th>
                    <th className="px-4 py-3 text-right">残り</th>
                    <th className="px-5 py-3 text-center">状態</th>
                 </tr>
               </thead>
               <tbody className="divide-y divide-slate-100 font-bold">
                 {stats.yearlyProductSummary.map(row => (
                   <tr key={row.id} className="group hover:bg-slate-50 transition-colors">
                      <td className="px-5 py-3.5 text-[11px] text-brand-text">{row.name}</td>
                      <td className="px-4 py-3.5 text-right font-mono text-[11px] text-slate-500">{row.target}</td>
                      <td className="px-4 py-3.5 text-right font-mono text-[11px] text-brand-text">{row.actual}</td>
                      <td className="px-4 py-3.5 text-right font-mono text-[11px] text-blue-600 italic">{row.rate.toFixed(1)}%</td>
                      <td className="px-4 py-3.5 text-right font-mono text-[11px] text-rose-500">{row.remaining}</td>
                      <td className="px-5 py-3.5 text-center">
                         <Badge variant={row.status === '要注意' ? 'warning' : 'success'} className="px-3 min-w-[70px]">
                           {row.status === '要注意' ? (
                             <span className="flex items-center gap-1.5 justify-center"><AlertCircle className="w-2.5 h-2.5" /> 要注意</span>
                           ) : (
                             <span className="flex items-center gap-1.5 justify-center"><CheckCircle2 className="w-2.5 h-2.5" /> 良好</span>
                           )}
                         </Badge>
                      </td>
                   </tr>
                 ))}
                 <tr className="bg-slate-100 font-black">
                    <td className="px-5 py-3.5 text-[11px] text-brand-midnight">合計</td>
                    <td className="px-4 py-3.5 text-right font-mono text-[11px]">{stats.yearlyTotalTarget}</td>
                    <td className="px-4 py-3.5 text-right font-mono text-[11px]">{stats.yearlyTotalActual}</td>
                    <td className="px-4 py-3.5 text-right font-mono text-[11px] text-blue-700 italic">{stats.yearlyTotalRate.toFixed(1)}%</td>
                    <td className="px-4 py-3.5 text-right font-mono text-[11px] text-rose-600">{Math.max(0, stats.yearlyTotalTarget - stats.yearlyTotalActual)}</td>
                    <td className="px-5 py-3.5"></td>
                 </tr>
               </tbody>
            </table>
          </div>
        </Card>

        {/* Member Ranking for current month */}
        <Card 
          className="md:col-span-12 lg:col-span-5"
          title="今月の個人実績トップ"
          subtitle="成約数量ベース"
          icon={Trophy}
          noPadding
        >
          <div className="divide-y divide-slate-50">
            {stats.memberRankings.slice(0, 5).map((m, idx) => (
              <div key={m.id} className="px-5 py-3.5 flex items-center justify-between group hover:bg-slate-50 transition-all">
                <div className="flex items-center gap-4">
                  <div className={cn(
                    "w-6 h-6 rounded flex items-center justify-center text-[10px] font-black",
                    idx === 0 ? "bg-amber-100 text-amber-700 border border-amber-200" : "bg-slate-100 text-slate-500 border border-slate-200"
                  )}>
                    {idx + 1}
                  </div>
                  <div>
                    <h4 className="text-[11px] font-black text-brand-text uppercase">{m.name}</h4>
                    <p className="text-[9px] text-slate-400 font-bold uppercase tracking-tight">累計売上: ¥{m.actualAmt.toLocaleString()}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-[11px] font-mono font-black text-brand-midnight">{m.actual} 件</p>
                  <div className="w-16 h-1 bg-slate-100 rounded-full mt-1.5 overflow-hidden">
                    <div className="bg-brand-midnight h-full" style={{ width: `${Math.min(100, m.rate)}%` }} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Monthly Progress Matrix (Excel style bottom table) */}
        <Card 
          className="md:col-span-12"
          title="【月別進捗詳細】"
          subtitle="1月〜12月の推移マトリクス"
          icon={TrendingUp}
          noPadding
        >
          <div className="overflow-x-auto">
            <table className="w-full border-collapse min-w-[1000px]">
               <thead>
                 <tr className="bg-slate-50 border-b border-brand-border text-[9px] font-black text-slate-400 uppercase tracking-widest text-left">
                    <th className="px-5 py-3 sticky left-0 bg-slate-50 z-10 w-24 border-r border-slate-200">月</th>
                    {products.map(p => (
                      <th key={p.id} className="px-4 py-3 text-center border-r border-slate-200/50" colSpan={2}>{p.name} (件数)</th>
                    ))}
                    <th className="px-4 py-3 text-center bg-slate-100 font-black text-brand-midnight" colSpan={3}>合計・達成率 (件数)</th>
                 </tr>
                 <tr className="bg-slate-50 border-b border-brand-border text-[8px] font-black text-slate-500 uppercase tracking-tighter">
                    <th className="px-5 py-2 sticky left-0 bg-slate-50 z-10 border-r border-slate-200 text-left">指標</th>
                    {products.map(p => (
                      <React.Fragment key={p.id}>
                        <th className="px-2 py-2 text-right border-r border-slate-100">目標</th>
                        <th className="px-2 py-2 text-right border-r border-slate-200/50 bg-white/50">実績</th>
                      </React.Fragment>
                    ))}
                    <th className="px-2 py-2 text-right bg-slate-100/50 border-r border-slate-200">目標</th>
                    <th className="px-2 py-2 text-right bg-slate-100/50 border-r border-slate-200 font-black text-brand-midnight underline decoration-blue-400/50">実績</th>
                    <th className="px-2 py-2 text-center bg-slate-100 font-black text-blue-600">達成率</th>
                 </tr>
               </thead>
               <tbody className="divide-y divide-slate-100">
                  {stats.monthlyMatrix.map(mapMonth => (
                    <tr key={mapMonth.month} className={cn(
                      "hover:bg-slate-50 transition-colors",
                      format(new Date(), 'yyyy-MM') === mapMonth.monthRaw ? "bg-blue-50/30" : ""
                    )}>
                       <td className="px-5 py-2.5 text-[10px] font-black text-brand-text sticky left-0 bg-white transition-colors group-hover:bg-slate-50 border-r border-slate-200">{mapMonth.month}</td>
                       {products.map(p => (
                         <React.Fragment key={p.id}>
                           <td className="px-2 py-2.5 text-right font-mono text-[10px] text-slate-400 border-r border-slate-100">{mapMonth.prodData[p.id]?.target || 0}</td>
                           <td className={cn(
                             "px-2 py-2.5 text-right font-mono text-[10px] border-r border-slate-200/50",
                             (mapMonth.prodData[p.id]?.actual || 0) > 0 ? "text-brand-midnight font-black" : "text-slate-200"
                           )}>{mapMonth.prodData[p.id]?.actual || 0}</td>
                         </React.Fragment>
                       ))}
                       <td className="px-2 py-2 text-right font-mono text-[10px] text-slate-500 bg-slate-100/20 border-r border-slate-200">{mapMonth.mTotalTarget}</td>
                       <td className={cn(
                         "px-2 py-2 text-right font-mono text-[10px] bg-slate-100/30 border-r border-slate-200 font-bold",
                         mapMonth.mTotalActual > 0 ? "text-brand-midnight font-black" : "text-slate-200"
                       )}>{mapMonth.mTotalActual}</td>
                       <td className="px-2 py-2 text-center font-mono text-[10px] bg-slate-100/50 text-blue-600 font-bold">{mapMonth.rate.toFixed(1)}%</td>
                    </tr>
                  ))}
               </tbody>
            </table>
          </div>
        </Card>
      </div>
    </div>
  );
}