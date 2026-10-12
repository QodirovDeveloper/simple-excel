import type { CellObject, WorkSheet } from 'xlsx';
import type { T } from '../i18n';
import type { Project } from '../types';
import { itemSum, payAuto, payRate, paySum, rowHasData, totals } from './calc';
import { downloadBlob, fileSafe } from './dom';
import { newItem, newPay, normProject, uid } from './model';
import { PURE_NUM, fmtIn, num } from './num';

type XLSX = typeof import('xlsx');
type Cell = string | number | null;

/** SheetJS katta kutubxona — faqat kerak bo'lganda yuklanadi */
const loadXlsx = (): Promise<XLSX> => import('xlsx');

// Import paytida qatorlarni tanish uchun so'zlar (uch tilda + asl Excel'dagi so'zlar)
const TOTAL_RE = /^(общий|жами|итого|всего|jami|umumiy|total)/i;
const SKIP_PAY_RE = /^(колган|қолган|qolgan|остаток|remaining|переплата|ортиқча|overpaid|жами|итого|всего|total)/i;

const sheetName = (name: string, t: T) => (name.replace(/[[\]:*?/\\]/g, ' ').trim() || t('estimate')).slice(0, 31);

/**
 * Varaq tuzilishi asl fayl bilan bir xil: A Номи | B Сони | C Нархи | D Суммаси (+ qo'shimcha ustunlar).
 * Keyin "Жами", olingan pullar va "Қолган".
 */
function buildRows(p: Project, t: T): Cell[][] {
  const cols = p.columns;
  const rows: Cell[][] = [[t('colName'), t('colQty'), t('colPrice'), t('colSum'), ...cols.map(c => c.title || t('columnN', { n: '' }))]];
  for (const r of p.items) {
    if (r.type === 'section') {
      if (r.name.trim()) rows.push([r.name]);
      continue;
    }
    const xs = cols.map(c => {
      const v = r.x[c.id] ?? '';
      return c.sum && PURE_NUM.test(v) ? num(v) : v || null;
    });
    if (!rowHasData(r) && xs.every(v => v == null)) continue;
    rows.push([r.name, r.qty || null, num(r.price), itemSum(r), ...xs]);
  }
  const { total, paid, left } = totals(p);
  rows.push([], [t('total'), null, null, total]);
  const pays = p.pays.filter(rowHasData);
  if (pays.length) {
    rows.push([], [t('paysTitle'), t('colRate'), '$', t('colAmount')]);
    for (const r of pays) {
      const auto = payAuto(r);
      rows.push([r.name || t('payPh'), auto ? payRate(r, p) : null, auto ? num(r.usd) : null, -paySum(r, p)]);
    }
    rows.push([t('totalReceived'), null, null, -paid]);
  }
  rows.push([t('left'), null, null, left]);
  return rows;
}

function makeSheet(X: XLSX, p: Project, t: T): WorkSheet {
  const ws = X.utils.aoa_to_sheet(buildRows(p, t));
  for (const [addr, c] of Object.entries(ws)) {
    const cell = c as CellObject;
    if (!addr.startsWith('!') && cell.t === 'n') cell.z = Number.isInteger(cell.v) ? '#,##0' : '#,##0.00';
  }
  ws['!cols'] = [{ wch: 30 }, { wch: 12 }, { wch: 12 }, { wch: 16 }, ...p.columns.map(() => ({ wch: 16 }))];
  return ws;
}

function csvBlob(p: Project, t: T) {
  const cell = (v: Cell | undefined) => {
    if (v == null) return '';
    const s = typeof v === 'number' ? String(Math.round(v * 100) / 100).replace('.', ',') : v;
    return /[;"\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const csv = buildRows(p, t).map(r => r.map(cell).join(';')).join('\r\n');
  return new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' });
}

/** Bir yoki bir nechta obyektni Excel'ga saqlaydi (har biri alohida varaq). Kutubxona yuklanmasa — CSV */
export async function exportExcel(list: Project[], fileName: string, t: T): Promise<'xlsx' | 'csv'> {
  let X: XLSX;
  try {
    X = await loadXlsx();
  } catch {
    downloadBlob(csvBlob(list[0], t), fileSafe(list[0].name) + '.csv');
    return 'csv';
  }
  const wb = X.utils.book_new();
  const used = new Set<string>();
  for (const p of list) {
    let name = sheetName(p.name, t);
    for (let k = 2; used.has(name.toLowerCase()); k++) name = `${sheetName(p.name, t).slice(0, 27)} (${k})`;
    used.add(name.toLowerCase());
    X.utils.book_append_sheet(wb, makeSheet(X, p, t), name);
  }
  X.writeFile(wb, fileName);
  return 'xlsx';
}

/** Excel varag'ini obyektga aylantiradi — asl qo'lda yozilgan fayl ham, shu dastur saqlagani ham o'qiladi */
function sheetToProject(X: XLSX, ws: WorkSheet, t: T): Project {
  const rows = new Map<number, CellObject[]>();
  for (const [addr, c] of Object.entries(ws)) {
    if (addr.startsWith('!')) continue;
    const { r, c: col } = X.utils.decode_cell(addr);
    if (!rows.has(r)) rows.set(r, []);
    rows.get(r)![col] = c as CellObject;
  }
  const val = (c?: CellObject) => (c?.v == null || c.v === '' ? null : c.v);
  const sval = (c?: CellObject) => {
    const v = val(c);
    return v == null ? '' : typeof v === 'number' ? fmtIn(v) : String(v).trim();
  };
  const nval = (c?: CellObject) => {
    const v = val(c);
    return v == null ? null : typeof v === 'number' ? v : PURE_NUM.test(String(v)) ? num(v) : null;
  };
  const isSumFormula = (c?: CellObject) => !!c?.f && /^\s*SUM\s*\(/i.test(c.f);

  const p = normProject({});
  const notes: string[] = [];
  const rates: number[] = [];
  let mode: 'items' | 'pays' = 'items';
  let xCols: (Project['columns'][number] | undefined)[] | null = null;

  for (const ri of [...rows.keys()].sort((a, b) => a - b)) {
    const row = rows.get(ri)!;
    const [A, B, C, D] = row;
    const extras = row.slice(4);
    const a = sval(A), b = sval(B), cNum = nval(C), dNum = nval(D), dTxt = sval(D);
    if (!a && !b && !sval(C) && !dTxt && extras.every(c => !sval(c))) continue;
    if (mode === 'items' && TOTAL_RE.test(a)) {
      mode = 'pays';
      continue;
    }

    if (mode === 'items') {
      if (dTxt && dNum == null) {
        // sarlavha qatori: "Номи | Сони | Нархи | Суммаси | ..." — qo'shimcha ustunlar shu yerdan olinadi
        if (!xCols) {
          xCols = extras.map(c => (sval(c) ? { id: uid(), title: sval(c), sum: false } : undefined));
          p.columns.push(...xCols.filter(c => c != null));
        }
        continue;
      }
      if (isSumFormula(D)) continue;
      const x: Record<string, string> = {};
      extras.forEach((c, i) => {
        const v = sval(c);
        const col = xCols?.[i];
        if (v && col) x[col.id] = v;
        else if (v) notes.push(v);
      });
      if (a && !b && cNum == null && dNum == null) {
        p.items.push({ ...newItem('section'), name: a, x });
        continue;
      }
      let price = '', sum = '';
      const q = num(b);
      if (cNum != null) price = fmtIn(cNum);
      else if (dNum != null) {
        const pr = q ? dNum / q : null; // narx yozilmagan bo'lsa — summadan topamiz
        if (pr != null && Math.abs(pr * 100 - Math.round(pr * 100)) < 1e-6) price = fmtIn(pr);
        else sum = fmtIn(dNum);
      }
      p.items.push({ ...newItem(), name: a, qty: b, price, sum, x });
    } else {
      extras.forEach(c => sval(c) && notes.push(sval(c)));
      if (isSumFormula(D) || dNum == null || SKIP_PAY_RE.test(a)) continue;
      const amount = Math.abs(dNum);
      const usd = cNum ? Math.abs(cNum) : null;
      const name = a || t('deducted');
      if (usd) {
        rates.push(amount / usd);
        p.pays.push({ ...newPay(), name, usd: fmtIn(usd), rate: fmtIn(amount / usd) });
      } else p.pays.push({ ...newPay(), name, sum: fmtIn(amount) });
    }
  }
  if (rates.length) {
    p.rate = Math.round(rates[0] * 100) / 100;
    for (const r of p.pays) if (r.rate && Math.abs((num(r.rate) ?? 0) - p.rate) < 0.01) r.rate = '';
  }
  for (const c of p.columns) {
    const vals = p.items.map(r => r.x[c.id]).filter(Boolean);
    c.sum = vals.length > 0 && vals.every(v => PURE_NUM.test(v));
  }
  p.note = [...new Set(notes)].join('\n');
  return p;
}

/** Excel / CSV faylni o'qiydi: har bir varaq — alohida obyekt */
export async function importExcel(file: File, t: T): Promise<Project[]> {
  const X = await loadXlsx();
  const wb = X.read(await file.arrayBuffer(), { type: 'array' });
  const base = file.name.replace(/\.[^.]+$/, '');
  const many = wb.SheetNames.length > 1;
  return wb.SheetNames.flatMap(sn => {
    const p = sheetToProject(X, wb.Sheets[sn], t);
    if (!p.items.length && !p.pays.length) return [];
    p.name = !many ? base : /^(лист|sheet|varaq)\s*\d*$/i.test(sn) ? `${base} — ${sn}` : sn;
    return [p];
  });
}
