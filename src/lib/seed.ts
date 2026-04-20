import { db } from './firebase';
import { collection, getDocs, doc, setDoc } from 'firebase/firestore';

export async function seedInitialData() {
  const productSnap = await getDocs(collection(db, 'products'));
  if (productSnap.empty) {
    const products = [
      { id: 'p1', name: 'ながらかいご記録', basePrice: 30000 },
      { id: 'p2', name: 'ながらかいご議事録', basePrice: 4000 }
    ];
    for (const p of products) {
      await setDoc(doc(db, 'products', p.id), { name: p.name, basePrice: p.basePrice });
    }
  }

  const memberSnap = await getDocs(collection(db, 'members'));
  if (memberSnap.empty) {
    const initialMembers = [
      { id: 'm1', name: '酒井', role: '営業', email: 'sakai@example.com' },
      { id: 'm2', name: '長嶋', role: '営業', email: 'nagashima@example.com' },
      { id: 'm3', name: '吉田', role: '営業', email: 'yoshida@example.com' },
      { id: 'm4', name: '山口', role: '営業', email: 'yamaguchi@example.com' }
    ];
    for (const m of initialMembers) {
      await setDoc(doc(db, 'members', m.id), m);
    }
  }
}
