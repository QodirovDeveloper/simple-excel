const NUM_RE = /[-−]?\d[\d\s.,]*/;
/** Faqat raqamdan iborat matn ("60 000", "2,5") */
export const PURE_NUM = /^\s*[-−]?[\d\s.,]+\s*$/;

/**
 * Matndan raqamni ajratadi: "155та" → 155, "47 метр" → 47, "60 000" → 60000, "2,5м" → 2.5.
 * "та" / "метр" kabi so'zlar hisobga kirmaydi.
 */
export function num(v: unknown): number | null {
  if (typeof v === 'number') return Number.isFinite(v) ? v : null;
  const m = String(v ?? '').match(NUM_RE);
  if (!m) return null;
  let s = m[0].replace(/\s/g, '').replace('−', '-').replace(/[.,]+$/, '');
  const dot = s.lastIndexOf('.');
  const com = s.lastIndexOf(',');
  if (dot > -1 && com > -1) {
    // "1.234,5" yoki "1,234.5" — oxirgi belgi kasr
    const d = Math.max(dot, com);
    s = s.slice(0, d).replace(/[.,]/g, '') + '.' + s.slice(d + 1);
  } else if (dot > -1 || com > -1) {
    // "60,000" / "1.500.000" — minglik;  "2,5" / "0,500" — kasr
    const parts = s.split(dot > -1 ? '.' : ',');
    const thousands = parts.length > 2 || (parts[1].length === 3 && !/^-?0$/.test(parts[0]));
    s = parts.join(thousands ? '' : '.');
  }
  const n = parseFloat(s);
  return Number.isFinite(n) ? n : null;
}

/** 1500000 → "1 500 000" (bo'linmaydigan bo'sh joy bilan) */
export function fmt(n: number | null | undefined, sep = ' ', minus = '−'): string {
  if (n == null || !Number.isFinite(n)) return '';
  const r = Math.round(Math.abs(n) * 100) / 100;
  const [int, frac] = r.toFixed(2).split('.');
  const f = frac.replace(/0+$/, '');
  return (n < 0 && r !== 0 ? minus : '') + int.replace(/\B(?=(\d{3})+(?!\d))/g, sep) + (f ? ',' + f : '');
}

/** Katak ichiga yoziladigan ko'rinish: oddiy bo'sh joy va oddiy minus */
export const fmtIn = (n: number) => fmt(n, ' ', '-');

/** "155та" → "pcs", "47метр" → "m"; boshqa birliklar o'zicha qaytadi */
export function unitOf(qty: string): string {
  const u = qty.replace(NUM_RE, '').toLowerCase().replace(/[\s.]/g, '');
  if (!u) return '';
  if (/^(та|ta|шт|pcs|pc|дона|dona|дана)/.test(u)) return 'pcs';
  if (/^(м|m)$/.test(u) || /^(метр|metr|мтр|mtr|meter|metre)/.test(u)) return 'm';
  return u;
}
