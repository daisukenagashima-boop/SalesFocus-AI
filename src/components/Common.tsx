import { Link } from 'react-router-dom';
import { ChevronRight, LucideIcon } from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';

export function SidebarLink({ to, icon: Icon, label, active }: { to: string, icon: LucideIcon, label: string, active: boolean }) {
  return (
    <Link
      to={to}
      className={cn(
        "flex items-center gap-3 px-3 py-2 rounded transition-all duration-150 group relative overflow-hidden",
        active
          ? "bg-sidebar-active text-sidebar-active-fg shadow-md"
          : "text-sidebar-fg hover:bg-sidebar-hover"
      )}
    >
      <Icon className={cn("w-4 h-4 shrink-0 transition-transform group-hover:scale-110", active ? "text-sidebar-active-fg" : "text-sidebar-fg")} />
      <span className="text-[11px] font-bold uppercase tracking-tight truncate">{label}</span>
      {active && (
        <motion.div
          layoutId="active-indicator"
          className="ml-auto"
        >
          <ChevronRight className="w-3 h-3 text-sidebar-active-fg opacity-60" />
        </motion.div>
      )}
    </Link>
  );
}

interface CardProps {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
  icon?: LucideIcon;
  className?: string;
  headerAction?: React.ReactNode;
  noPadding?: boolean;
}

export function Card({ children, title, subtitle, icon: Icon, className, headerAction, noPadding }: CardProps) {
  return (
    <div className={cn("bg-white rounded-xl border border-brand-border shadow-sm flex flex-col group overflow-hidden", className)}>
      {(title || Icon) && (
        <div className="px-5 py-3 border-b border-brand-border bg-slate-50/30 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            {Icon && <Icon className="w-3.5 h-3.5 text-brand-muted" />}
            <div>
              {title && <h3 className="text-[10px] font-black text-brand-muted uppercase tracking-widest leading-none">{title}</h3>}
              {subtitle && <p className="text-[9px] text-slate-400 font-bold uppercase tracking-tighter mt-0.5">{subtitle}</p>}
            </div>
          </div>
          {headerAction}
        </div>
      )}
      <div className={cn("flex-1", noPadding ? "" : "p-5")}>
        {children}
      </div>
    </div>
  );
}

export function Badge({ children, variant = 'default', className }: { children: React.ReactNode, variant?: 'default' | 'success' | 'warning' | 'danger' | 'info', className?: string }) {
  const variants = {
    default: "bg-slate-100 text-slate-800 border-slate-200",
    success: "bg-green-50 text-green-700 border-green-100",
    warning: "bg-amber-50 text-amber-700 border-amber-100",
    danger: "bg-red-50 text-red-700 border-red-100",
    info: "bg-blue-50 text-blue-700 border-blue-100",
  };
  
  return (
    <span className={cn(
      "text-[9px] font-black uppercase tracking-tighter px-1.5 py-0.5 rounded border shadow-sm inline-flex items-center gap-1",
      variants[variant],
      className
    )}>
      {children}
    </span>
  );
}

interface KpiProps {
  label: string;
  value: string | number;
  icon: LucideIcon;
  trend?: { val: string, positive: boolean };
  className?: string;
}

export function KpiCard({ label, value, icon: Icon, trend, className }: KpiProps) {
  return (
    <div className={cn("bg-white p-5 rounded-xl border border-brand-border shadow-sm transition-all hover:shadow-md group", className)}>
      <div className="flex items-start justify-between mb-4">
        <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100 group-hover:bg-brand-midnight group-hover:border-brand-midnight transition-colors">
          <Icon className="w-4 h-4 text-brand-muted group-hover:text-white transition-colors" />
        </div>
        {trend && (
          <span className={cn(
            "text-[9px] font-black tracking-tight flex items-center gap-0.5 px-1.5 py-0.5 rounded-full",
            trend.positive ? "bg-green-50 text-green-600" : "bg-red-50 text-red-600"
          )}>
            {trend.positive ? '↑' : '↓'} {trend.val}
          </span>
        )}
      </div>
      <div>
        <p className="text-[10px] font-black text-brand-muted uppercase tracking-widest mb-1">{label}</p>
        <h4 className="text-xl font-black text-brand-text font-mono truncate">{value}</h4>
      </div>
    </div>
  );
}
