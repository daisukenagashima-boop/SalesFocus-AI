import { useEffect, useState, createContext, useContext } from 'react';
import { BrowserRouter, Routes, Route, useLocation, Navigate } from 'react-router-dom';
import { LayoutDashboard, Target, PhoneCall, RefreshCw, Users, Activity, Trophy } from 'lucide-react';
import { SidebarLink } from './components/Common';
import { MonthNavigator } from './components/MonthNavigator';
import { api } from './lib/api';
import type { Meta } from './types';
import Dashboard from './pages/Dashboard';
import Targets from './pages/Targets';
import Performance from './pages/Performance';
import Actuals from './pages/Actuals';
import NotionSync from './pages/NotionSync';
import Members from './pages/Members';

interface AppState {
  meta: Meta | null;
  month: string;
  setMonth: (m: string) => void;
  reloadMeta: () => void;
}
const Ctx = createContext<AppState | null>(null);
export const useApp = () => {
  const c = useContext(Ctx);
  if (!c) throw new Error('useApp outside provider');
  return c;
};

function defaultMonth(meta: Meta | null): string {
  const now = new Date();
  const cur = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  if (meta && meta.months.length) {
    if (meta.months.includes(cur)) return cur;
    return meta.months[meta.months.length - 1];
  }
  return cur;
}

const NAV = [
  { to: '/', icon: LayoutDashboard, label: 'ダッシュボード' },
  { to: '/targets', icon: Target, label: '目標管理' },
  { to: '/performance', icon: Trophy, label: '受注・活動実績' },
  { to: '/actuals', icon: PhoneCall, label: 'IS実績入力' },
  { to: '/notion', icon: RefreshCw, label: 'Notion同期' },
  { to: '/members', icon: Users, label: 'メンバー' },
];

function Shell({ children }: { children: React.ReactNode }) {
  const { month, setMonth, meta } = useApp();
  const loc = useLocation();
  return (
    <div className="min-h-screen flex">
      <aside className="w-52 shrink-0 border-r border-brand-border bg-white flex flex-col">
        <div className="px-4 py-5 border-b border-brand-border">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-brand-midnight flex items-center justify-center">
              <Activity className="w-4 h-4 text-white" />
            </div>
            <div>
              <h1 className="text-[13px] font-black text-brand-text leading-none">SalesFocus</h1>
              <p className="text-[9px] text-brand-muted font-bold uppercase tracking-widest mt-0.5">営業数値管理</p>
            </div>
          </div>
        </div>
        <nav className="flex-1 p-2 space-y-1">
          {NAV.map((n) => (
            <SidebarLink key={n.to} {...n} active={loc.pathname === n.to} />
          ))}
        </nav>
        <div className="p-3 border-t border-brand-border">
          <p className="text-[9px] text-brand-muted font-bold">
            Notion: {meta?.notionConfigured ? <span className="text-green-600">接続済み</span> : <span className="text-amber-600">未設定</span>}
          </p>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-14 border-b border-brand-border bg-white/80 backdrop-blur flex items-center justify-between px-6 sticky top-0 z-10">
          <h2 className="text-[12px] font-black text-brand-text uppercase tracking-widest">
            {NAV.find((n) => n.to === loc.pathname)?.label ?? ''}
          </h2>
          <MonthNavigator value={month} onChange={setMonth} />
        </header>
        <main className="flex-1 p-6 overflow-auto">{children}</main>
      </div>
    </div>
  );
}

export default function App() {
  const [meta, setMeta] = useState<Meta | null>(null);
  const [month, setMonthState] = useState<string>(() => localStorage.getItem('sf-month') || '');

  const reloadMeta = () => api.meta().then(setMeta).catch(console.error);
  useEffect(() => { reloadMeta(); }, []);
  useEffect(() => {
    if (!month && meta) setMonthState(defaultMonth(meta));
  }, [meta, month]);

  const setMonth = (m: string) => { setMonthState(m); localStorage.setItem('sf-month', m); };

  if (!meta || !month) {
    return <div className="min-h-screen flex items-center justify-center text-brand-muted text-sm">読み込み中…</div>;
  }

  return (
    <Ctx.Provider value={{ meta, month, setMonth, reloadMeta }}>
      <BrowserRouter>
        <Shell>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/targets" element={<Targets />} />
            <Route path="/performance" element={<Performance />} />
            <Route path="/actuals" element={<Actuals />} />
            <Route path="/notion" element={<NotionSync />} />
            <Route path="/members" element={<Members />} />
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </Shell>
      </BrowserRouter>
    </Ctx.Provider>
  );
}
