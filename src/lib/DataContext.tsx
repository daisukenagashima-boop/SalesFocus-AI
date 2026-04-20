import React, { createContext, useContext, useEffect, useState } from 'react';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { db } from './firebase';
import { useAuth } from './AuthContext';
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

export function DataProvider({ children }: { children: React.ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const [members, setMembers] = useState<Member[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [targets, setTargets] = useState<Target[]>([]);
  const [records, setRecords] = useState<SalesRecord[]>([]);
  const [insights, setInsights] = useState<AIInsight[]>([]);
  const [performanceMetrics, setPerformanceMetrics] = useState<PerformanceMetric[]>([]);
  const [loading, setLoading] = useState(true);
  const [initialSyncComplete, setInitialSyncComplete] = useState(false);

  useEffect(() => {
    if (authLoading || !user) {
      setLoading(false);
      return;
    }

    setLoading(true);
    let loadedCount = 0;
    const totalCollections = 6;

    const markLoaded = () => {
      loadedCount++;
      if (loadedCount === totalCollections) {
        setLoading(false);
        setInitialSyncComplete(true);
      }
    };

    const unsubMembers = onSnapshot(collection(db, 'members'), (snapshot) => {
      setMembers(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Member)));
      if (!initialSyncComplete) markLoaded();
    }, (err) => console.error("Members error:", err));

    const unsubProducts = onSnapshot(collection(db, 'products'), (snapshot) => {
      setProducts(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Product)));
      if (!initialSyncComplete) markLoaded();
    }, (err) => console.error("Products error:", err));

    const unsubTargets = onSnapshot(collection(db, 'targets'), (snapshot) => {
      setTargets(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Target)));
      if (!initialSyncComplete) markLoaded();
    }, (err) => console.error("Targets error:", err));

    const unsubRecords = onSnapshot(query(collection(db, 'salesRecords'), orderBy('date', 'desc')), (snapshot) => {
      setRecords(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as SalesRecord)));
      if (!initialSyncComplete) markLoaded();
    }, (err) => console.error("Records error:", err));

    const unsubInsights = onSnapshot(collection(db, 'aiInsights'), (snapshot) => {
      setInsights(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as AIInsight)));
      if (!initialSyncComplete) markLoaded();
    }, (err) => console.error("Insights error:", err));

    const unsubPerf = onSnapshot(collection(db, 'performanceMetrics'), (snapshot) => {
      setPerformanceMetrics(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as PerformanceMetric)));
      if (!initialSyncComplete) markLoaded();
    }, (err) => console.error("Performance error:", err));

    const timer = setTimeout(() => {
      setLoading(false);
      setInitialSyncComplete(true);
    }, 2000);

    return () => {
      clearTimeout(timer);
      unsubMembers();
      unsubProducts();
      unsubTargets();
      unsubRecords();
      unsubInsights();
      unsubPerf();
    };
  }, [user, authLoading, initialSyncComplete]);

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
