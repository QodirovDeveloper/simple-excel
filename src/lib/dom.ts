import { flushSync } from 'react-dom';

/** className'larni birlashtirish: cx('a', ok && 'b') */
export const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(' ');

/** Telefon o'lchami (CSS'dagi "desk" varianti bilan bir xil chegara — 640px) */
export const isMobile = () => matchMedia('(max-width: 639.98px)').matches;

/** Katakka fokus: kompyuterda hammasi belgilanadi, telefonda kursor oxirga qo'yiladi */
export function focusEl(el: Element | null | undefined) {
  if (!(el instanceof HTMLElement)) return;
  el.focus();
  if (!(el instanceof HTMLInputElement)) return;
  if (!isMobile()) return el.select();
  const n = el.value.length;
  try {
    el.setSelectionRange(n, n);
  } catch {
    /* ba'zi input turlari qo'llamaydi */
  }
}

/** O'zgarishni darhol chizdiradi — keyingi qatorda yangi katak allaqachon sahifada bo'ladi */
export const commitNow = (change: () => void) => flushSync(change);

/** Birinchi ko'rinib turgan elementga fokus (bir xil maydon telefon va kompyuter uchun ikki joyda bo'lishi mumkin) */
export const focusFirst = (...selectors: string[]) =>
  focusEl(selectors.flatMap(s => [...document.querySelectorAll<HTMLElement>(s)]).find(el => el.offsetParent !== null));

/** Katak selektori: <input data-list data-row data-k> */
export const cellSel = (list: string, row: string, k: string) => `[data-list="${list}"][data-row="${row}"][data-k="${k}"]`;

export function downloadBlob(blob: Blob, name: string) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

/** Fayl nomiga yaroqsiz belgilarni olib tashlaydi */
export const fileSafe = (name: string) => name.replace(/[\\/:*?"<>|]/g, ' ').trim() || 'smeta';

/** 10.10.2026 */
export function todayStr() {
  const d = new Date();
  return [d.getDate(), d.getMonth() + 1].map(n => String(n).padStart(2, '0')).join('.') + '.' + d.getFullYear();
}

export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // eski brauzerlar uchun
    const ta = Object.assign(document.createElement('textarea'), { value: text });
    document.body.append(ta);
    ta.select();
    const ok = document.execCommand('copy');
    ta.remove();
    return ok;
  }
}
