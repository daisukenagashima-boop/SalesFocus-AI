import React from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, parseISO, isToday } from 'date-fns';
import { cn } from '../lib/utils';

interface MiniCalendarProps {
  records: { date: string }[];
  currentMonth: string; // 'yyyy-MM'
  onSelectDate?: (date: string) => void;
  selectedDate?: string; // 'yyyy-MM-dd'
}

export function MiniCalendar({ records, currentMonth, onSelectDate, selectedDate }: MiniCalendarProps) {
  const monthStart = startOfMonth(parseISO(`${currentMonth}-01`));
  const monthEnd = endOfMonth(monthStart);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

  // Get distinct dates that have records
  const recordDates = new Set(records.map(r => format(parseISO(r.date), 'yyyy-MM-dd')));

  return (
    <div className="bg-white border border-brand-border rounded-xl p-4 shadow-sm">
      <div className="flex items-center justify-between mb-4 px-1">
        <h3 className="text-[10px] font-black text-brand-midnight uppercase tracking-[0.2em]">Activity Map</h3>
        <span className="text-[9px] font-bold text-slate-400 uppercase">{format(monthStart, 'MMMM yyyy')}</span>
      </div>
      
      <div className="grid grid-cols-7 gap-1">
        {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map(d => (
          <div key={d} className="text-[8px] font-black text-slate-300 text-center py-1">{d}</div>
        ))}
        
        {/* Padding for start of month */}
        {Array.from({ length: monthStart.getDay() }).map((_, i) => (
          <div key={`pad-${i}`} className="aspect-square" />
        ))}
        
        {days.map(day => {
          const dateStr = format(day, 'yyyy-MM-dd');
          const hasActivity = recordDates.has(dateStr);
          const isSelected = selectedDate === dateStr;
          const isCurrentDay = isToday(day);

          return (
            <button
              key={dateStr}
              onClick={() => onSelectDate?.(dateStr)}
              className={cn(
                "aspect-square rounded-sm flex items-center justify-center text-[10px] font-mono transition-all relative group",
                isSelected 
                  ? "bg-brand-midnight text-white font-black z-10 scale-110 shadow-lg" 
                  : hasActivity
                    ? "bg-blue-50 text-blue-600 font-black hover:bg-blue-100"
                    : "text-slate-400 hover:bg-slate-50",
                isCurrentDay && !isSelected && "border border-blue-200"
              )}
            >
              {day.getDate()}
              {hasActivity && !isSelected && (
                <span className="absolute bottom-1 left-1/2 -translate-x-1/2 w-0.5 h-0.5 rounded-full bg-blue-500" />
              )}
              
              {/* Tooltip on hover */}
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 p-1.5 bg-slate-900 text-white text-[8px] rounded opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-50 font-black tracking-widest shadow-xl">
                {format(day, 'MMM d, yyyy')}
                {hasActivity && <div className="text-blue-300 mt-0.5">ACTIVITY LOGGED</div>}
              </div>
            </button>
          );
        })}
      </div>
      
      <div className="mt-4 pt-3 border-t border-slate-50 flex items-center justify-between">
         <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
            <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Logged</span>
         </div>
         <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded border border-blue-200" />
            <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Today</span>
         </div>
      </div>
    </div>
  );
}
