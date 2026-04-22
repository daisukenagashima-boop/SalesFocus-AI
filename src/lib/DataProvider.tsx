import React, { createContext, useContext, useState } from 'react';
import { Member, Product, Target, SalesRecord, AIInsight, PerformanceMetric } from '../types';

interface DataContextType {
  members: Member[];
  products: Product[];
  targets: Target[];
  records: SalesRecord[];
  insights: AIInsight[];
  performanceMetrics: PerformanceMetric[];
  loading: boolean;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

const INITIAL_MEMBERS: Member[] = [
  { id: 'm1', name: '岡田一輝', role: '営業', email: 'okada@example.com' },
  { id: 'm2', name: '酒井優聖', role: '営業', email: 'sakai@example.com' },
  { id: 'm3', name: '長嶋乃祐', role: '営業', email: 'nagashima@example.com' },
  { id: 'm4', name: '吉田菜智', role: '営業', email: 'yoshida@example.com' },
  { id: 'm5', name: '山口謙介', role: '営業', email: 'yamaguchi@example.com' }
];

const INITIAL_PRODUCTS: Product[] = [
  { id: 'p1', name: 'ながらかいご記録', basePrice: 30000 },
  { id: 'p2', name: 'ながらかいご議事録', basePrice: 4000 }
];

export function DataProvider({ children }: { children: React.ReactNode }) {
  const [members] = useState<Member[]>(INITIAL_MEMBERS);
  const [products] = useState<Product[]>(INITIAL_PRODUCTS);
  const [targets] = useState<Target[]>([]);
  const [records] = useState<SalesRecord[]>([]);
  const [insights] = useState<AIInsight[]>([]);
  const [performanceMetrics] = useState<PerformanceMetric[]>([]);
  const [loading] = useState(false);

  return (
    <DataContext.Provider value={{ members, products, targets, records, insights, performanceMetrics, loading }}>
      {children}
    </DataContext.Provider>
  );
}

export function useData() {
  const context = useContext(DataContext);
  if (context === undefined) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
}
