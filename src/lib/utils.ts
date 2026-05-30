import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// ============= 数値整形 =============

/** ¥240,000 → フル桁の円表記。0は「-」 */
export const yen = (n: number) => {
  const v = Math.round(n || 0);
  if (v === 0) return '-';
  return '¥' + v.toLocaleString('ja-JP');
};

/** 24万円 形式の丸め表記。0は「-」。閾値: <1万=円, <1億=万円, それ以上=億円 */
export function yenMan(n: number): string {
  const v = Math.round(n || 0);
  if (v === 0) return '-';
  const abs = Math.abs(v);
  const sign = v < 0 ? '-' : '';
  if (abs < 10000) return sign + abs.toLocaleString('ja-JP') + '円';
  if (abs < 100000000) {
    const man = Math.round(abs / 10000);
    return sign + man.toLocaleString('ja-JP') + '万円';
  }
  const oku = (abs / 100000000).toFixed(1).replace(/\.0$/, '');
  return sign + oku + '億円';
}

/** 件数: 整数で四捨五入。0は「-」（ただしoptions.keepZero=trueなら「0」を返す） */
export function intRound(n: number, opts?: { keepZero?: boolean; suffix?: string }): string {
  const v = Math.round(n || 0);
  if (v === 0 && !opts?.keepZero) return '-';
  return v.toLocaleString('ja-JP') + (opts?.suffix ?? '');
}

/** 表示用: 小数点1桁を保持しつつ0を「-」に */
export const round1 = (n: number) => Math.round((n || 0) * 10) / 10;

/** 達成率 0-100+% */
export const pct = (actual: number, target: number) =>
  target > 0 ? Math.round((actual / target) * 100) : 0;

/** 残数（あと何件） */
export const remaining = (actual: number, target: number) => Math.max(0, Math.ceil((target || 0) - (actual || 0)));

/** 達成率の色(4段階) — 100↑緑 / 80↑橙 / 50↑黄 / 50未満赤 */
export function rateColor(p: number) {
  if (p >= 100) return 'text-green-600';
  if (p >= 80) return 'text-amber-600';
  if (p >= 50) return 'text-yellow-600';
  return 'text-red-600';
}

/** プログレスバーのbg色(4段階) */
export function rateBg(p: number) {
  if (p >= 100) return 'bg-green-500';
  if (p >= 80) return 'bg-amber-500';
  if (p >= 50) return 'bg-yellow-500';
  return 'bg-red-500';
}

/** 差分の色＋符号 (▲+5 / ▼-3 / =) */
export function deltaText(d: number | null | undefined): { text: string; color: string } {
  if (d == null) return { text: '', color: 'text-brand-muted' };
  if (d > 0) return { text: `▲+${d}`, color: 'text-green-600' };
  if (d < 0) return { text: `▼${d}`, color: 'text-red-600' };
  return { text: '=', color: 'text-brand-muted' };
}
