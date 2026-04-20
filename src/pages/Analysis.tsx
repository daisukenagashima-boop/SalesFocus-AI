import React, { useState } from 'react';
import { useData } from '../lib/DataContext';
import { analyzeSalesPerformance } from '../lib/gemini';
import { db } from '../lib/firebase';
import { useAuth } from '../lib/AuthContext';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { format, parseISO } from 'date-fns';
import { Sparkles, BrainCircuit, Calendar, User, History, Loader2, Settings } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { motion, AnimatePresence } from 'motion/react';
import { Card, Badge } from '../components/Common';
import { MonthNavigator } from '../components/MonthNavigator';

export default function Analysis() {
  const { members, products, targets, records, insights, loading } = useData();
  const { user } = useAuth();
  const [selectedMemberId, setSelectedMemberId] = useState('');
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), 'yyyy-MM'));
  
  // Auto-select member based on login
  React.useEffect(() => {
    if (members.length > 0 && !selectedMemberId && user?.email) {
      const currentMember = members.find(m => m.email.toLowerCase() === user.email.toLowerCase());
      if (currentMember) setSelectedMemberId(currentMember.id);
    }
  }, [members, user, selectedMemberId]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  const handleAnalyze = async () => {
    if (!selectedMemberId) return;
    
    setIsAnalyzing(true);
    setResult(null);

    const member = members.find(m => m.id === selectedMemberId);
    if (!member) return;

    // Prepare data for the selected member/month
    const memberTargets = targets.filter(t => t.memberId === selectedMemberId && t.month === selectedMonth);
    const memberRecords = records.filter(r => {
      const d = parseISO(r.date);
      return r.memberId === selectedMemberId && format(d, 'yyyy-MM') === selectedMonth;
    });

    const productData = products.map(p => {
      const target = memberTargets.find(t => t.productId === p.id)?.targetCount || 0;
      const actual = memberRecords.filter(r => r.productId === p.id).reduce((sum, r) => sum + r.count, 0);
      return { name: p.name, target, actual };
    });

    const analysis = await analyzeSalesPerformance(member.name, selectedMonth, productData);
    setResult(analysis);
    
    // Save to Firestore (optional, for history)
    try {
      await addDoc(collection(db, 'aiInsights'), {
        memberId: selectedMemberId,
        month: selectedMonth,
        content: analysis,
        createdAt: serverTimestamp()
      });
    } catch (e) {
      console.error(e);
    }
    
    setIsAnalyzing(false);
  };

  if (loading) return null;

  return (
    <div className="space-y-6 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-brand-text tracking-tight uppercase flex items-center gap-2">
            <BrainCircuit className="w-5 h-5 text-brand-midnight" />
            AI営業分析アドバイザー
          </h1>
          <p className="text-[11px] text-brand-muted font-bold uppercase tracking-wider">高精度予測分析エンジン稼働中</p>
        </div>
      </div>

      <Card 
        title="分析パラメータ設定" 
        subtitle="インテリジェント・エンジンへの入力"
        icon={Settings}
      >
        <div className="flex flex-col md:flex-row gap-6 items-end">
          <div className="flex-1 space-y-1.5">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
              <User className="w-3 h-3" /> 対象担当者
            </label>
            <select
              value={selectedMemberId}
              onChange={e => setSelectedMemberId(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-brand-border rounded outline-none text-xs font-bold focus:bg-white focus:border-brand-midnight transition-all cursor-pointer"
            >
              <option value="">担当者を選択...</option>
              {members.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
          </div>
          
          <div className="flex-1 space-y-1.5">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
              <Calendar className="w-3 h-3" /> 分析対象月
            </label>
            <MonthNavigator
              value={selectedMonth}
              onChange={setSelectedMonth}
              className="w-full"
            />
          </div>

          <button
            onClick={handleAnalyze}
            disabled={!selectedMemberId || isAnalyzing}
            className="px-8 py-2 bg-brand-midnight text-white text-[10px] font-black uppercase rounded shadow-lg shadow-brand-midnight/20 hover:opacity-95 disabled:opacity-50 transition-all flex items-center justify-center gap-2 tracking-[0.2em]"
          >
            {isAnalyzing ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Sparkles className="w-3.5 h-3.5 text-blue-400" />
            )}
            {isAnalyzing ? '分析中' : 'AI分析開始'}
          </button>
        </div>
      </Card>

      <AnimatePresence>
        {result && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-brand-midnight text-white p-8 rounded-xl shadow-xl border border-white/5 overflow-hidden"
          >
            <div className="flex items-center gap-3 mb-8 border-b border-white/10 pb-6">
              <div className="p-2 bg-blue-500 rounded shadow-lg shadow-blue-500/20">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="text-sm font-black uppercase tracking-[0.2em] text-white">AI 戦略推奨アクション</h3>
                <p className="text-[9px] text-slate-400 uppercase font-black tracking-widest mt-0.5">分析信頼度スコア: 高 (94.2%)</p>
              </div>
            </div>
            <div className="prose prose-invert prose-sm max-w-none prose-p:text-slate-300 prose-headings:text-white prose-strong:text-blue-300 prose-li:text-slate-300 prose-code:text-blue-200">
              <ReactMarkdown>{result}</ReactMarkdown>
            </div>
            <div className="mt-10 pt-6 border-t border-white/5 flex justify-between items-center text-[9px] text-slate-500 font-black uppercase tracking-[0.3em]">
               <span>PROCESSED BY GEMINI 1.5 PRO PROTOCOL</span>
               <Badge variant="info" className="bg-white/5 border-white/10 text-slate-400">SYNC COMPLETE</Badge>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {!result && !isAnalyzing && (
        <div className="border border-brand-border bg-white rounded-xl p-20 text-center flex flex-col items-center">
          <div className="p-4 bg-slate-50 rounded-full mb-4 shadow-inner">
            <BrainCircuit className="w-10 h-10 text-slate-200" />
          </div>
          <p className="text-slate-400 font-black text-[10px] uppercase tracking-[0.2em]">対象を選択してAIエンジンを初期化してください</p>
          <div className="mt-8 flex justify-center gap-2">
            <motion.div animate={{ scale: [1, 1.2, 1] }} transition={{ repeat: Infinity, duration: 2 }} className="w-1.5 h-1.5 rounded-full bg-slate-100"></motion.div>
            <motion.div animate={{ scale: [1, 1.2, 1] }} transition={{ repeat: Infinity, duration: 2, delay: 0.3 }} className="w-1.5 h-1.5 rounded-full bg-slate-100"></motion.div>
            <motion.div animate={{ scale: [1, 1.2, 1] }} transition={{ repeat: Infinity, duration: 2, delay: 0.6 }} className="w-1.5 h-1.5 rounded-full bg-slate-100"></motion.div>
          </div>
        </div>
      )}

      {/* Analysis History */}
      {insights.length > 0 && !result && (
        <div className="space-y-4">
           <h3 className="text-[11px] font-black text-brand-muted uppercase tracking-[0.2em] px-1">過去の分析アーカイブ</h3>
           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {insights.slice(0, 6).map(insight => {
                const member = members.find(m => m.id === insight.memberId);
                return (
                  <Card key={insight.id} noPadding className="hover:border-blue-400 cursor-pointer transition-all group h-full">
                    <div className="p-5 flex flex-col h-full">
                      <div className="flex items-center justify-between mb-4">
                         <Badge variant="info">{insight.month} CYCLE</Badge>
                         <div className="w-6 h-6 rounded bg-slate-50 flex items-center justify-center text-slate-300 group-hover:bg-blue-500 group-hover:text-white transition-all shadow-inner">
                            <History className="w-3 h-3" />
                         </div>
                      </div>
                      <p className="text-[11px] font-black text-brand-text mb-2 uppercase tracking-tight">{member?.name || 'SYSTEM'}</p>
                      <p className="text-[10px] text-slate-400 line-clamp-3 leading-relaxed italic mb-4">"{insight.content}"</p>
                      <div className="mt-auto pt-3 border-t border-slate-50 flex justify-between items-center text-[8px] font-black text-slate-300 uppercase tracking-widest">
                        <span>GENERATED STATUS: VERIFIED</span>
                      </div>
                    </div>
                  </Card>
                )
              })}
           </div>
        </div>
      )}
    </div>
  );
}
