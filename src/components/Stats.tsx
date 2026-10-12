import { useEffect, useState } from 'react';
import { useT } from '../i18n';
import { itemSum, paySum, totals } from '../lib/calc';
import { cx } from '../lib/dom';
import { fmt } from '../lib/num';
import type { Project } from '../types';

/** Qolgan summa holati: qarz / to'liq to'langan / ortiqcha olingan */
const leftState = (left: number) => (left > 0 ? 'debt' : left < 0 ? 'over' : 'done');
const LEFT_COLOR = { debt: 'text-accent-ink', done: 'text-pos', over: 'text-neg' };

/** Tepadagi 3 ta karta: Жами иш / Олинган / Қолган */
export function Stats({ p }: { p: Project }) {
  const t = useT();
  const { total, paid, left } = totals(p);
  const state = leftState(left);
  const pct = total > 0 ? Math.min(100, Math.max(0, (paid / total) * 100)) : 0;
  const rows = p.items.filter(r => r.type === 'item' && (r.name.trim() || itemSum(r))).length;
  const pays = p.pays.filter(r => paySum(r, p)).length;
  const card = 'card rounded-xl px-3 py-2.5 desk:px-4 desk:py-3';
  const value = 'my-0.5 block truncate text-xl font-bold tracking-tight tabular-nums desk:text-[26px]';

  return (
    <section className="mb-3.5 grid grid-cols-2 gap-2.5 desk:grid-cols-3 desk:gap-3">
      <div className={cx(card, 'stat-total tone')}>
        <span className="text-[13px] text-muted">{t('totalWork')}</span>
        <b className={cx(value, 'text-ti')}>{fmt(total)}</b>
        <small className="text-[12.5px] text-muted print:hidden">{t('rowsCount', { n: rows })}</small>
      </div>
      <div className={cx(card, 'stat-paid tone')}>
        <span className="text-[13px] text-muted">{t('received')}</span>
        <b className={cx(value, 'text-ti')}>{fmt(paid)}</b>
        <small className="text-[12.5px] text-muted print:hidden">{t('paysCount', { n: pays })}</small>
      </div>
      <div className={cx(card, 'col-span-full border-accent bg-accent-soft desk:col-span-1', state === 'done' && 'border-pos')}>
        <span className="text-[13px] text-muted">{state === 'debt' ? t('leftDebt') : state === 'over' ? t('overpaid') : t('left')}</span>
        <b className={cx(value, LEFT_COLOR[state])}>{fmt(Math.abs(left))}</b>
        <div className="mb-1 mt-1.5 h-1.5 overflow-hidden rounded-full bg-line print:hidden">
          <i className="block h-full rounded-full bg-pos transition-[width]" style={{ width: `${pct}%` }} />
        </div>
        <small className="text-[12.5px] text-muted print:hidden">
          {total > 0 && (left === 0 ? t('settled') : t('paidPct', { n: Math.round(pct) }))}
        </small>
      </div>
    </section>
  );
}

/** Telefonda pastda doim turadigan jami paneli; yozayotganda klaviaturaga joy bo'shatadi */
export function MobileBar({ p }: { p: Project }) {
  const t = useT();
  const editing = useEditing();
  const { total, paid, left } = totals(p);
  const items: [string, number, string][] = [
    [t('totalWork'), total, ''],
    [t('received'), paid, ''],
    [left < 0 ? t('overpaid') : t('left'), Math.abs(left), LEFT_COLOR[leftState(left)]],
  ];
  return (
    <div
      className={cx(
        'zoomable fixed inset-x-0 bottom-0 z-30 grid grid-cols-3 gap-2 border-t border-line-2 bg-surface px-4 pt-2 pb-[calc(8px+env(safe-area-inset-bottom))]',
        'shadow-[0_-4px_16px_rgb(0_0_0/0.08)] desk:hidden print:hidden',
        editing && 'hidden',
      )}
    >
      {items.map(([label, v, color]) => (
        <div key={label} className="min-w-0">
          <span className="block truncate text-[11px] text-muted">{label}</span>
          <b className={cx('block truncate text-[15px] tabular-nums', color)}>{fmt(v)}</b>
        </div>
      ))}
    </div>
  );
}

/** Hozir biror katakka yozilyaptimi */
function useEditing() {
  const [editing, setEditing] = useState(false);
  useEffect(() => {
    const check = () => setTimeout(() => setEditing(!!document.activeElement?.matches('input:not([type=file]), textarea')));
    document.addEventListener('focusin', check);
    document.addEventListener('focusout', check);
    return () => {
      document.removeEventListener('focusin', check);
      document.removeEventListener('focusout', check);
    };
  }, []);
  return editing;
}
