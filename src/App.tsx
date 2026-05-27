import { useEffect, useState, useRef, createContext, useContext } from 'react';
import { BrowserRouter, Routes, Route, useLocation, Navigate } from 'react-router-dom';
import { LayoutDashboard, Target, PhoneCall, RefreshCw, Users, Activity, Trophy, Palette, Check } from 'lucide-react';
import { SidebarLink } from './components/Common';
import { MonthNavigator } from './components/MonthNavigator';
import { api } from './lib/api';
import { THEMES, applyTheme, currentThemeId, swatch } from './lib/theme';
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
  { to: '/members', icon: Users, label: 'マスタ管理' },
];

function ThemePicker({ themeId, onPick }: { themeId: string; onPick: (id: string) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const close = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);
  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        title="テーマ"
        className="flex items-center gap-1.5 px-2.5 py-2 rounded-lg border border-brand-border bg-white hover:bg-slate-50 transition-colors"
      >
        <Palette className="w-4 h-4 text-brand-muted" />
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-60 bg-white rounded-xl border border-brand-border shadow-lg z-20 p-2">
          <p className="text-[9px] font-black text-brand-muted uppercase tracking-widest px-2 py-1.5">カラーテーマ</p>
          <div className="space-y-0.5 max-h-80 overflow-auto">
            {THEMES.map((t) => {
              const s = swatch(t);
              const active = t.id === themeId;
              return (
                <button
                  key={t.id}
                  onClick={() => { onPick(t.id); setOpen(false); }}
                  className="w-full flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-slate-50 transition-colors text-left"
                >
                  <span className="relative w-9 h-9 rounded-lg overflow-hidden border border-brand-border shrink-0" style={{ background: s.sidebar }}>
                    <span className="absolute bottom-1 left-1 w-3 h-3 rounded-full" style={{ background: s.active }} />
                    <span className="absolute top-1 right-1 w-2.5 h-2.5 rounded-full" style={{ background: s.accent }} />
                  </span>
                  <span className="flex-1 text-[12px] font-bold text-brand-text">{t.label}</span>
                  {active && <Check className="w-4 h-4 text-brand-midnight" />}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function Shell({ children, themeId, setThemeId }: { children: React.ReactNode; themeId: string; setThemeId: (id: string) => void }) {
  const { month, setMonth, meta } = useApp();
  const loc = useLocation();
  return (
    <div className="min-h-screen flex">
      <aside className="w-52 shrink-0 border-r border-sidebar-border bg-sidebar flex flex-col">
        <div className="px-4 py-5 border-b border-sidebar-border">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-sidebar-logo flex items-center justify-center">
              <Activity className="w-4 h-4 text-white" />
            </div>
            <div>
              <h1 className="text-[13px] font-black text-sidebar-heading leading-none">SalesFocus</h1>
              <p className="text-[9px] text-sidebar-fg font-bold uppercase tracking-widest mt-0.5">営業数値管理</p>
            </div>
          </div>
        </div>
        <nav className="flex-1 p-2 space-y-1">
          {NAV.map((n) => (
            <SidebarLink key={n.to} {...n} active={loc.pathname === n.to} />
          ))}
        </nav>
        <div className="p-3 border-t border-sidebar-border">
          <p className="text-[9px] text-sidebar-fg font-bold">
            Notion: {meta?.notionConfigured ? <span className="text-green-500">接続済み</span> : <span className="text-amber-500">未設定</span>}
          </p>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-14 border-b border-brand-border bg-white/80 backdrop-blur flex items-center justify-between px-6 sticky top-0 z-10">
          <h2 className="text-[12px] font-black text-brand-text uppercase tracking-widest">
            {NAV.find((n) => n.to === loc.pathname)?.label ?? ''}
          </h2>
          <div className="flex items-center gap-2">
            <ThemePicker themeId={themeId} onPick={setThemeId} />
            <MonthNavigator value={month} onChange={setMonth} />
          </div>
        </header>
        <main className="flex-1 p-6 overflow-auto">{children}</main>
      </div>
    </div>
  );
}

export default function App() {
  const [meta, setMeta] = useState<Meta | null>(null);
  const [month, setMonthState] = useState<string>(() => localStorage.getItem('sf-month') || '');
  const [themeId, setThemeId] = useState<string>(() => currentThemeId());

  useEffect(() => { applyTheme(themeId); }, [themeId]);

  const [metaError, setMetaError] = useState(false);

  const reloadMeta = async (retries = 4): Promise<void> => {
    for (let i = 0; i <= retries; i++) {
      try {
        const m = await api.meta();
        setMeta(m);
        setMetaError(false);
        return;
      } catch (e) {
        if (i === retries) { setMetaError(true); return; }
        await new Promise((r) => setTimeout(r, 800)); // サーバー再起動中などをリトライ
      }
    }
  };
  useEffect(() => { reloadMeta(); }, []);
  useEffect(() => {
    if (!month && meta) setMonthState(defaultMonth(meta));
  }, [meta, month]);

  const setMonth = (m: string) => { setMonthState(m); localStorage.setItem('sf-month', m); };

  if (metaError && !meta) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3 text-brand-muted text-sm">
        <p>サーバーに接続できませんでした。</p>
        <button onClick={() => { setMetaError(false); reloadMeta(); }}
          className="px-4 py-2 rounded-lg bg-brand-midnight text-white text-[12px] font-black uppercase tracking-wider hover:opacity-90">
          再読み込み
        </button>
      </div>
    );
  }
  if (!meta || !month) {
    return <div className="min-h-screen flex items-center justify-center text-brand-muted text-sm">読み込み中…</div>;
  }

  return (
    <Ctx.Provider value={{ meta, month, setMonth, reloadMeta }}>
      <BrowserRouter>
        <Shell themeId={themeId} setThemeId={setThemeId}>
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
