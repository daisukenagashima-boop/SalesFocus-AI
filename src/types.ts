
export interface Member {
  id: string;
  name: string;
  role: string;
  email: string;
}

export interface Product {
  id: string;
  name: string;
  basePrice: number; // 月払い（標準）
  yearlyPrice?: number; // 年払い
}

export interface Target {
  id: string;
  memberId: string;
  productId: string;
  month: string; // YYYY-MM
  targetCount: number;
  targetAmount: number;
}

export interface SalesRecord {
  id: string;
  memberId: string;
  productId: string;
  date: string; // ISO String
  customerName?: string;
  paymentPlan: 'monthly' | 'yearly';
  count: number;
  unitPrice: number;
  amount: number;
  note?: string;
}

export interface AIInsight {
  id: string;
  memberId: string;
  month: string;
  content: string;
  updatedAt: string;
}

export interface WeeklyPerformance {
  calls?: number;           // 架電数
  connected?: number;       // 通電数
  appointments?: number;    // アポ数
  negotiations?: number;    // 商談数
  trialStarts?: number;     // トライアル開始
  trialEnds?: number;       // トライアル終了
  contracts?: number;       // 契約数
  inboundEntries?: number;  // インバウンド数
}

export interface PerformanceMetric {
  id: string;
  memberId: string;
  productId: string;
  month: string;           // YYYY-MM
  weeks: {
    [weekNumber: number]: WeeklyPerformance; // 1-5
  };
}

export interface MonthlyStats {
  month: string;
  target: number;
  actual: number;
  members: {
    [memberId: string]: {
      target: number;
      actual: number;
    }
  };
}
