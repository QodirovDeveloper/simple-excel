import type { Item, Pay, Project } from '../types';
import { num, unitOf } from './num';

/** Narx yozilgan bo'lsa summa o'zi hisoblanadi */
export const isAuto = (r: Item) => num(r.price) != null;

export function itemSum(r: Item): number {
  if (r.type === 'section') return 0;
  const price = num(r.price);
  if (price != null) return (num(r.qty) ?? 1) * price;
  return num(r.sum) ?? 0;
}

/** Dollar yozilgan bo'lsa summa = dollar × kurs */
export const payAuto = (r: Pay) => num(r.usd) != null;
export const payRate = (r: Pay, p: Project) => num(r.rate) ?? p.rate;
export const paySum = (r: Pay, p: Project) => (payAuto(r) ? (num(r.usd) ?? 0) * payRate(r, p) : num(r.sum) ?? 0);

export function totals(p: Project) {
  const total = p.items.reduce((a, r) => a + itemSum(r), 0);
  const paid = p.pays.reduce((a, r) => a + paySum(r, p), 0);
  return { total, paid, left: Math.round((total - paid) * 100) / 100 };
}

export const usdTotal = (p: Project) => p.pays.reduce((a, r) => a + (payAuto(r) ? num(r.usd) ?? 0 : 0), 0);

/** Birliklar bo'yicha jami: [["pcs", 577], ["m", 282]] */
export function unitTotals(items: Item[]): [string, number][] {
  const m = new Map<string, number>();
  for (const r of items) {
    const q = num(r.qty);
    const u = unitOf(r.qty);
    if (r.type === 'item' && q != null && u) m.set(u, (m.get(u) ?? 0) + q);
  }
  return [...m];
}

/** Har bir bo'lim sarlavhasi uchun undan keyingi qatorlar jami */
export function sectionSums(items: Item[]): Map<string, number> {
  const m = new Map<string, number>();
  let sec: string | null = null;
  for (const r of items) {
    if (r.type === 'section') m.set((sec = r.id), 0);
    else if (sec) m.set(sec, (m.get(sec) ?? 0) + itemSum(r));
  }
  return m;
}

export const columnSum = (items: Item[], colId: string) =>
  items.reduce((a, r) => a + (r.type === 'item' ? num(r.x[colId]) ?? 0 : 0), 0);

/** Shu nomli tovarning oxirgi narxi — avval joriy obyektdan, keyin boshqalaridan */
export function rememberedPrice(projects: Project[], current: Project, name: string, exceptId: string): string {
  const key = name.trim().toLowerCase();
  if (!key) return '';
  for (const p of [current, ...projects.filter(x => x.id !== current.id)]) {
    for (const r of [...p.items].reverse()) {
      if (r.id !== exceptId && r.type === 'item' && r.name.trim().toLowerCase() === key && isAuto(r)) return r.price;
    }
  }
  return '';
}

/** Qatorga biror narsa yozilganmi (bo'sh qatorlar eksport qilinmaydi) */
export const rowHasData = (r: Item | Pay) =>
  [r.name, 'qty' in r ? r.qty : '', 'price' in r ? r.price : '', r.sum, 'usd' in r ? r.usd : ''].some(v => v.trim());
