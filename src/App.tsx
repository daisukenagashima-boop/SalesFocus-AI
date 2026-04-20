import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { 
  LayoutDashboard, 
  Users, 
  Target as TargetIcon, 
  SquarePlus, 
  Sparkles,
  Menu,
  X,
  ChevronRight,
  Package,
  Trophy,
  LogIn,
  LogOut
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

import { AuthProvider, useAuth } from './lib/AuthContext';
import { DataProvider } from './lib/DataContext';
import { seedInitialData } from './lib/seed';
import { cn } from './lib/utils';

import Dashboard from './pages/Dashboard';
import Members from './pages/Members';
import Targets from './pages/Targets';
import Entries from './pages/Entries';
import Analysis from './pages/Analysis';
import Products from './pages/Products';
import Performance from './pages/Performance';

import { 
  SidebarLink,
  Card,
  Badge,
  KpiCard
} from './components/Common';

function LoginScreen() {
  const { login } = useAuth();
  return (
    <div className="min-h-screen bg-brand-bg flex items-center justify-center p-6">
      <Card className="max-w-md w-full p-8 text-center space-y-8 bg-white border-2 border-brand-midnight/5 shadow-2xl">
        <div className="space-y-3">
          <div className="w-16 h-16 bg-brand-midnight rounded-2xl flex items-center justify-center mx-auto shadow-lg rotate-3 group-hover:rotate-0 transition-transform">
            <Sparkles className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-black tracking-tighter text-brand-midnight">SalesFocus AI</h1>
          <p className="text-[11px] text-brand-muted font-bold tracking-[0.3em] uppercase">Intelligent CRM Matrix</p>
        </div>
        
        <div className="space-y-4">
          <p className="text-sm text-slate-500 font-medium leading-relaxed">
            2026年度 営業目標の統合管理プラットフォームへようこそ。<br/>
            セキュアなアクセスを確保するため、ログインが必要です。
          </p>
          <button 
            onClick={login}
            className="w-full flex items-center justify-center gap-3 bg-brand-midnight text-white py-3.5 rounded-xl font-bold uppercase tracking-widest text-[11px] group hover:bg-slate-800 transition-all shadow-xl shadow-brand-midnight/10 active:scale-95"
          >
            <div className="w-6 h-6 bg-white/10 rounded flex items-center justify-center">
               <LogIn className="w-3.5 h-3.5" />
            </div>
            Googleアカウントでログイン
          </button>
        </div>
        
        <div className="pt-6 border-t border-slate-100 italic text-[9px] text-slate-400 font-bold uppercase tracking-widest">
          SYSTEM VERSION 2.0.4 - SECURE HANDSHAKE REQUIRED
        </div>
      </Card>
    </div>
  );
}

function AppContent() {
  const { user, login, logout } = useAuth();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  useEffect(() => {
    if (user) {
      seedInitialData();
    }
  }, [user]);

  if (!user) {
    return <LoginScreen />;
  }

  return (
    <div className="h-screen bg-brand-bg text-brand-text flex flex-col font-sans overflow-hidden">
      {/* Top Header */}
      <header className="bg-white border-b border-brand-border h-14 flex items-center justify-between px-6 flex-shrink-0 z-50 shadow-sm">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-1.5 hover:bg-slate-50 rounded border border-brand-border text-brand-muted transition-colors active:bg-slate-200"
            aria-label="Toggle Sidebar"
          >
            {sidebarOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
          </button>
          <Link to="/" className="flex items-center gap-2 group">
            <div className="bg-brand-midnight p-1.5 rounded transition-transform group-hover:scale-105">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <div>
              <h1 className="text-sm font-black tracking-tighter leading-tight">SalesFocus AI</h1>
              <p className="text-[9px] text-brand-muted font-bold tracking-widest uppercase">Intelligent CRM Matrix</p>
            </div>
          </Link>
        </div>
        
        <div className="flex items-center gap-6">
          <div className="hidden lg:flex flex-col items-end border-r border-brand-border pr-6">
            <p className="text-[9px] text-brand-muted uppercase font-black tracking-widest leading-none mb-1">システム稼働状況</p>
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.5)]" />
              <span className="text-[10px] font-black text-slate-700 uppercase tracking-tight">System Operational</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <p className="text-[10px] font-black text-slate-900 leading-none">{user.displayName || 'Admin User'}</p>
              <p className="text-[9px] text-brand-muted font-bold uppercase tracking-tighter">{user.email}</p>
            </div>
            <button 
              onClick={logout}
              className="w-8 h-8 rounded bg-brand-midnight border border-brand-border flex items-center justify-center text-white font-black text-xs shadow-inner hover:bg-slate-800 transition-colors group"
              title="Logout"
            >
              <LogOut className="w-3.5 h-3.5 group-hover:scale-110 transition-transform" />
            </button>
          </div>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <aside className={cn(
          "bg-white border-r border-brand-border flex-col transition-all duration-200 z-40 overflow-hidden",
          sidebarOpen ? "w-56 flex" : "w-0 hidden md:flex"
        )}>
          <div className="flex-1 px-3 py-4 space-y-0.5">
            <p className="text-[10px] font-bold text-brand-muted uppercase tracking-widest px-3 mb-2">メインメニュー</p>
            <SidebarLink to="/" icon={LayoutDashboard} label="ダッシュボード" active={location.pathname === '/'} />
            <SidebarLink to="/entries" icon={SquarePlus} label="実績入力" active={location.pathname === '/entries'} />
            <SidebarLink to="/targets" icon={TargetIcon} label="目標設定" active={location.pathname === '/targets'} />
            <SidebarLink to="/performance" icon={Trophy} label="個人成績・分析" active={location.pathname === '/performance'} />
            <SidebarLink to="/analysis" icon={Sparkles} label="AI分析アドバイザー" active={location.pathname === '/analysis'} />
            
            <p className="text-[10px] font-bold text-brand-muted uppercase tracking-widest px-3 mb-2 mt-6">マスタ管理</p>
            <SidebarLink to="/products" icon={Package} label="プロダクト管理" active={location.pathname === '/products'} />
            <SidebarLink to="/members" icon={Users} label="担当者管理" active={location.pathname === '/members'} />
          </div>

          <div className="p-3 border-t border-brand-border bg-slate-50/50">
            <div className="flex items-center gap-2 p-2 rounded bg-white border border-brand-border shadow-sm overflow-hidden">
              <div className="w-6 h-6 rounded bg-slate-800 flex items-center justify-center text-[10px] text-white font-bold">
                {user.displayName?.charAt(0) || 'U'}
              </div>
              <div className="overflow-hidden">
                <p className="text-[10px] font-bold truncate tracking-tight">{user.displayName || '管理者'}</p>
                <p className="text-[9px] text-brand-muted truncate tracking-tighter uppercase font-black">Authorized Access</p>
              </div>
            </div>
          </div>
        </aside>

        {/* Main Content Areas */}
        <main className="flex-1 overflow-hidden flex flex-col relative">
          <div className="absolute inset-0 overflow-y-auto p-6 scrollbar-thin scrollbar-thumb-slate-200 scrollbar-track-transparent">
            <AnimatePresence mode="wait">
              <motion.div
                key={location.pathname}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="max-w-[1400px] mx-auto"
              >
                <Routes>
                  <Route path="/" element={<Dashboard />} />
                  <Route path="/members" element={<Members />} />
                  <Route path="/targets" element={<Targets />} />
                  <Route path="/entries" element={<Entries />} />
                  <Route path="/analysis" element={<Analysis />} />
                  <Route path="/performance" element={<Performance />} />
                  <Route path="/products" element={<Products />} />
                </Routes>
              </motion.div>
            </AnimatePresence>
          </div>
        </main>
      </div>

      {/* Bottom Context Rail */}
      <footer className="h-6 bg-brand-midnight text-white flex items-center px-4 justify-between text-[9px] uppercase tracking-[0.2em] font-bold z-50">
        <div className="flex gap-4">
          <span className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-blue-400"></span> 端末: セキュア・ターミナル</span>
          <span className="text-blue-400">データ同期: ライブ接続中</span>
        </div>
        <div className="flex gap-4">
          <span>セキュリティ: AES-256</span>
          <span className="text-slate-400">認証済みユーザー: {user.email}</span>
        </div>
      </footer>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <DataProvider>
        <Router>
          <AppContent />
        </Router>
      </DataProvider>
    </AuthProvider>
  );
}
