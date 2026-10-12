import type { T } from '../i18n';
import type { Project } from '../types';
import { isAuto, itemSum, payAuto, payRate, paySum, rowHasData, sectionSums, totals, unitTotals } from './calc';
import { todayStr } from './dom';
import { fmt, num } from './num';
import { unitsText } from './share';

/*
 * Smetani PNG rasm qilib chizadi — kutubxonasiz, internetsiz.
 * Rasm doim oq fonda (telefonda o'qish va chop etish uchun), asosiy rang esa "Дизайн"dan olinadi.
 */

const W = 820;
const PAD = 40;
const IW = W - 2 * PAD;
const font = (weight: number, size: number) => `${weight} ${size}px system-ui, -apple-system, "Segoe UI", Roboto, Arial, sans-serif`;

function rgbOf(c: string): number[] {
  c = c.trim();
  if (c.startsWith('#')) {
    if (c.length === 4) c = '#' + [...c.slice(1)].map(ch => ch + ch).join('');
    const n = parseInt(c.slice(1, 7), 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }
  return (c.match(/[\d.]+/g) ?? ['0', '0', '0']).slice(0, 3).map(Number);
}
/** Ikki rangni aralashtirish: t=0 — birinchisi, t=1 — ikkinchisi */
const mix = (a: string, b: string, t: number) => {
  const x = rgbOf(a), y = rgbOf(b);
  return `rgb(${x.map((v, i) => Math.round(v + (y[i] - v) * t)).join(',')})`;
};

/** Matnni kenglikka sig'adigan qatorlarga bo'lish (juda uzun so'z ham bo'linadi) */
function wrap(ctx: CanvasRenderingContext2D, text: string, maxW: number): string[] {
  const out: string[] = [];
  for (const para of text.split('\n')) {
    let line = '';
    for (let word of para.split(/\s+/).filter(Boolean)) {
      const test = line ? `${line} ${word}` : word;
      if (ctx.measureText(test).width <= maxW) {
        line = test;
        continue;
      }
      if (line) out.push(line);
      while (ctx.measureText(word).width > maxW) {
        let k = word.length - 1;
        while (k > 1 && ctx.measureText(word.slice(0, k)).width > maxW) k--;
        out.push(word.slice(0, k));
        word = word.slice(k);
      }
      line = word;
    }
    out.push(line);
  }
  return out;
}

function fit(ctx: CanvasRenderingContext2D, text: string, maxW: number) {
  if (ctx.measureText(text).width <= maxW) return text;
  let s = text;
  while (s.length > 1 && ctx.measureText(s + '…').width > maxW) s = s.slice(0, -1);
  return s + '…';
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
}

/** H=0 — faqat balandlikni o'lchaydi; H>0 — chizadi. Qaytaradi: rasm balandligi */
function paint(ctx: CanvasRenderingContext2D, p: Project, t: T, H: number): number {
  const css = (name: string, fallback: string) => getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback;
  const C = {
    text: '#1c1a15', muted: '#6e685c', line: '#e6e3dc', head: '#f3f1ec', zebra: '#faf9f6', pos: '#1f8a55', neg: '#c43c2c',
    accent: css('--accent', '#f0a500'), onAccent: css('--on-accent', '#1c1a15'),
    qty: css('--t-qty', '#2f7de1'), price: css('--t-price', '#e07b00'), sum: css('--t-sum', '#1f9d55'), usd: css('--t-usd', '#0e9f96'),
  };
  const ink = (c: string) => mix(c, C.text, 0.3); // o'qiladigan to'q tus
  const tint = (c: string, k = 0.9) => mix(c, '#ffffff', k); // och tus
  const n = (v: number) => fmt(v, ' ');
  const text = (s: string, x: number, y: number, f: string, color = C.text, align: CanvasTextAlign = 'left') => {
    ctx.font = f;
    ctx.fillStyle = color;
    ctx.textAlign = align;
    ctx.fillText(s, x, y);
  };
  const rect = (x: number, y: number, w: number, h: number, color: string) => {
    ctx.fillStyle = color;
    ctx.fillRect(x, y, w, h);
  };
  const { total, paid, left } = totals(p);

  if (H) rect(0, 0, W, H, '#ffffff');
  rect(0, 0, W, 8, C.accent);

  // --- Sarlavha: logo, nom, sana ---
  let y = 36;
  ctx.fillStyle = C.accent;
  roundRect(ctx, PAD, y, 46, 46, 11);
  ctx.fill();
  ctx.save();
  ctx.translate(PAD + 8, y + 8);
  ctx.scale(30 / 24, 30 / 24);
  ctx.fillStyle = C.onAccent;
  ctx.fill(new Path2D('M13 2 4.5 13.5H11L10 22l8.5-11.5H12L13 2z'));
  ctx.restore();
  text(t('brand'), PAD + 60, y + 31, font(700, 23));
  text(t('estimate'), PAD + IW, y + 19, font(700, 15), C.muted, 'right');
  text(todayStr(), PAD + IW, y + 40, font(400, 15), C.muted, 'right');
  y += 76;

  ctx.font = font(800, 30);
  for (const l of wrap(ctx, p.name.trim() || t('estimate'), IW)) {
    text(l, PAD, y + 28, font(800, 30));
    y += 38;
  }
  if (p.note.trim()) {
    ctx.font = font(400, 16);
    for (const l of wrap(ctx, p.note.trim(), IW)) {
      text(l, PAD, y + 20, font(400, 16), C.muted);
      y += 24;
    }
  }
  y += 20;

  // --- Ustunlar joylashuvi ---
  const xNo = PAD + 20, xName = PAD + 44, qtyL = PAD + IW - 380, priceR = PAD + IW - 160, sumR = PAD + IW - 12;
  const nameW = qtyL - xName - 12;

  type Head = [label: string, x: number, align: CanvasTextAlign, color: string, barX?: number, barW?: number];
  const tableHead = (heads: Head[]) => {
    rect(PAD, y, IW, 42, C.head);
    for (const [label, x, align, color, barX, barW] of heads) {
      text(label, x, y + 27, font(700, 14), color, align);
      if (barX != null && barW) rect(barX, y + 39, barW, 3, tint(color, 0.45));
    }
    y += 46;
  };
  const totalRow = (label: string, value: number, color: string, extra = '') => {
    y += 4;
    rect(PAD, y, IW, 2, C.text);
    text(label, xName, y + 34, font(800, 19));
    if (extra) {
      ctx.font = font(600, 14);
      text(fit(ctx, extra, priceR - qtyL - 10), qtyL + 10, y + 33, font(600, 14), C.muted);
    }
    ctx.font = font(800, 21);
    text(fit(ctx, n(value), 220), sumR, y + 35, font(800, 21), ink(color), 'right');
    y += 52;
  };

  // --- Ishlar va tovarlar ---
  tableHead([
    ['№', xNo, 'center', C.muted],
    [t('colName'), xName, 'left', C.muted],
    [t('colQty'), qtyL + 10, 'left', ink(C.qty), qtyL, 110],
    [t('colPrice'), priceR, 'right', ink(C.price), qtyL + 110, 110],
    [t('colSum'), sumR, 'right', ink(C.sum), priceR + 10, 150],
  ]);
  const subs = sectionSums(p.items);
  let no = 0, zebra = 0;
  for (const r of p.items) {
    if (r.type === 'section') {
      if (!r.name.trim()) continue;
      rect(PAD, y, IW, 42, tint(C.accent, 0.85));
      rect(PAD, y, 5, 42, C.accent);
      ctx.font = font(800, 17);
      text(fit(ctx, r.name.trim(), priceR - xName), xName, y + 27, font(800, 17));
      const sub = subs.get(r.id);
      if (sub) text(n(sub), sumR, y + 27, font(700, 16), C.muted, 'right');
      y += 42;
      zebra = 0;
      continue;
    }
    const extras = p.columns
      .map(c => (r.x[c.id]?.trim() ? `${c.title || t('columnN', { n: '' })}: ${r.x[c.id].trim()}` : ''))
      .filter(Boolean)
      .join(' · ');
    if (!rowHasData(r) && !extras) continue;
    ctx.font = font(500, 17);
    const nameLines = wrap(ctx, r.name.trim() || '—', nameW);
    ctx.font = font(400, 14);
    const extraLines = extras ? wrap(ctx, extras, nameW) : [];
    const h = Math.max(46, 16 + nameLines.length * 24 + extraLines.length * 20 + 6);
    if (zebra++ % 2) rect(PAD, y, IW, h, C.zebra);
    text(String(++no), xNo, y + 29, font(400, 14), C.muted, 'center');
    nameLines.forEach((l, i) => text(l, xName, y + 29 + i * 24, font(500, 17)));
    extraLines.forEach((l, i) => text(l, xName, y + 25 + nameLines.length * 24 + i * 20, font(400, 14), C.muted));
    ctx.font = font(500, 17);
    if (r.qty.trim()) text(fit(ctx, r.qty.trim(), 100), qtyL + 10, y + 29, font(500, 17), ink(C.qty));
    if (isAuto(r)) text(n(num(r.price) ?? 0), priceR, y + 29, font(500, 17), ink(C.price), 'right');
    text(n(itemSum(r)), sumR, y + 29, font(700, 17), ink(C.sum), 'right');
    rect(PAD, y + h - 1, IW, 1, C.line);
    y += h;
  }
  totalRow(t('total'), total, C.sum, unitsText(unitTotals(p.items), t));

  // --- Olingan pullar ---
  const pays = p.pays.filter(rowHasData);
  if (pays.length) {
    y += 18;
    text(t('paysTitle'), PAD, y + 24, font(800, 21));
    y += 40;
    tableHead([
      ['№', xNo, 'center', C.muted],
      [t('colNote'), xName, 'left', C.muted],
      [t('usdTimesRate'), priceR, 'right', ink(C.usd), qtyL, 220],
      [t('colAmount'), sumR, 'right', ink(C.usd), priceR + 10, 150],
    ]);
    pays.forEach((r, i) => {
      if (i % 2) rect(PAD, y, IW, 46, C.zebra);
      text(String(i + 1), xNo, y + 29, font(400, 14), C.muted, 'center');
      ctx.font = font(500, 17);
      text(fit(ctx, r.name.trim() || t('payPh'), nameW), xName, y + 29, font(500, 17));
      if (payAuto(r)) text(`${n(num(r.usd) ?? 0)} $ × ${n(payRate(r, p))}`, priceR, y + 29, font(500, 16), ink(C.usd), 'right');
      text(n(paySum(r, p)), sumR, y + 29, font(700, 17), ink(C.usd), 'right');
      rect(PAD, y + 45, IW, 1, C.line);
      y += 46;
    });
    totalRow(t('totalReceived'), paid, C.usd);
  }

  // --- Yakuniy kartalar: Жами / Олинган / Қолган ---
  y += 20;
  const leftColor = left > 0 ? C.accent : left < 0 ? C.neg : C.pos;
  const leftLabel = left > 0 ? t('leftShort') : left < 0 ? t('overpaid') : t('settled');
  const boxes: [string, number, string][] = pays.length
    ? [[t('totalWork'), total, C.sum], [t('received'), paid, C.usd], [leftLabel, Math.abs(left), leftColor]]
    : [[t('totalWork'), total, C.sum]];
  const gap = 14, bw = (IW - gap * (boxes.length - 1)) / boxes.length, bh = 98;
  boxes.forEach(([label, value, color], i) => {
    const bx = PAD + i * (bw + gap);
    ctx.fillStyle = tint(color, 0.9);
    roundRect(ctx, bx, y, bw, bh, 12);
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = mix(color, '#ffffff', 0.35);
    roundRect(ctx, bx + 1, y + 1, bw - 2, bh - 2, 11);
    ctx.stroke();
    ctx.font = font(700, 15);
    text(fit(ctx, label, bw - 36), bx + 18, y + 32, font(700, 15), ink(color));
    ctx.font = font(800, 30);
    text(fit(ctx, n(value), bw - 36), bx + 18, y + 76, font(800, 30), ink(color));
  });
  y += bh + 26;

  rect(PAD, y, IW, 1, C.line);
  y += 28;
  text(`⚡ ${t('brand')} · ${todayStr()}`, W / 2, y, font(400, 14), C.muted, 'center');
  return y + 26;
}

export async function renderEstimatePng(p: Project, t: T): Promise<Blob> {
  const probe = document.createElement('canvas').getContext('2d')!;
  const H = Math.ceil(paint(probe, p, t, 0));
  // Tiniq bo'lsin (2x), lekin telefon brauzeri ko'tara oladigan o'lchamdan oshmasin
  const scale = Math.max(1, Math.min(2, Math.sqrt(16e6 / (W * H))));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(W * scale);
  canvas.height = Math.round(H * scale);
  const ctx = canvas.getContext('2d')!;
  ctx.scale(scale, scale);
  paint(ctx, p, t, H);
  return new Promise((res, rej) => canvas.toBlob(b => (b ? res(b) : rej(new Error('png'))), 'image/png'));
}
