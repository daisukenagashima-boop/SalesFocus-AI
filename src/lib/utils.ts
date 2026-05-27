import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const yen = (n: number) => '¥' + Math.round(n || 0).toLocaleString('ja-JP');

export const round1 = (n: number) => Math.round((n || 0) * 10) / 10;

export const pct = (actual: number, target: number) =>
  target > 0 ? Math.round((actual / target) * 100) : 0;

export function rateColor(p: number) {
  if (p >= 100) return 'text-green-600';
  if (p >= 70) return 'text-amber-600';
  return 'text-red-600';
}
