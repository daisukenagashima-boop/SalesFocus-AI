import React from 'react';
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react';
import { format, addMonths, subMonths, parseISO } from 'date-fns';
import { cn } from '../lib/utils';

interface MonthNavigatorProps {
  value: string; // 'yyyy-MM'
  onChange: (value: string) => void;
  className?: string;
}

export function MonthNavigator({ value, onChange, className }: MonthNavigatorProps) {
  const currentDate = parseISO(`${value}-01`);

  const handlePrev = () => {
    const nextDate = subMonths(currentDate, 1);
    onChange(format(nextDate, 'yyyy-MM'));
  };

  const handleNext = () => {
    const nextDate = addMonths(currentDate, 1);
    onChange(format(nextDate, 'yyyy-MM'));
  };

  return (
    <div className={cn("flex items-center gap-1 bg-white p-1 rounded-lg border border-brand-border shadow-sm", className)}>
      <button 
        onClick={handlePrev}
        className="p-1.5 hover:bg-slate-50 rounded transition-colors"
        title="前の月"
      >
        <ChevronLeft className="w-4 h-4 text-slate-400" />
      </button>
      
      <div className="relative group">
        <div className="flex items-center gap-2 px-3 py-1.5 min-w-[120px] justify-center">
          <Calendar className="w-3.5 h-3.5 text-brand-midnight" />
          <span className="text-[11px] font-black text-brand-text uppercase tracking-widest whitespace-nowrap">
            {format(currentDate, 'yyyy.MM')}
          </span>
          <input 
            type="month"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="absolute inset-0 opacity-0 cursor-pointer"
          />
        </div>
      </div>

      <button 
        onClick={handleNext}
        className="p-1.5 hover:bg-slate-50 rounded transition-colors"
        title="次の月"
      >
        <ChevronRight className="w-4 h-4 text-slate-400" />
      </button>
    </div>
  );
}
