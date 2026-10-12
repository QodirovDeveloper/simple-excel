import { useEffect, useRef, type CSSProperties, type KeyboardEvent, type MouseEvent, type ReactNode } from 'react';
import { useT } from '../i18n';
import { rowHasData } from '../lib/calc';
import { cellSel, commitNow, cx, focusEl, focusFirst, isMobile } from '../lib/dom';
import { PURE_NUM, fmtIn, num } from '../lib/num';
import { applyRowOp, focusAfterOp, rowMenu, type RowOp } from '../lib/rows';
import { activeOf, type Store } from '../store';
import type { AppData, Item, ListKey, Pay, Tone } from '../types';
import { DotsIcon } from './icons';
import { useUI } from './ui';

/** "60000" → "60 000" (faqat raqamdan iborat bo'lsa; "60000 сўм" ga tegmaydi) */
const tidyNumber = (v: string) => {
  const n = num(v);
  return PURE_NUM.test(v) && n != null ? fmtIn(n) : v;
};

/* ===== Katak (yoziladigan) — ikkala jadvaldagi hamma kataklar shu bitta komponent ===== */
export function Field(props: {
  list: ListKey;
  row: string;
  k: string;
  value: string;
  onValue: (v: string) => void;
  onCommit?: (v: string) => void;
  tone: Tone;
  area: string;
  label?: string;
  ariaLabel: string;
  numeric?: boolean;
  placeholder?: string;
  suggest?: string;
  dim?: boolean;
}) {
  const { list, row, k, value, onValue, onCommit, tone, area, label, ariaLabel, numeric, placeholder, suggest, dim } = props;
  return (
    <label className={cx('cell tone', `tone-${tone}`, area, dim && 'opacity-40')}>
      {label && <span className="cell-label">{label}</span>}
      <input
        className={cx('cell-input', numeric && 'desk:text-right')}
        data-list={list}
        data-row={row}
        data-k={k}
        value={value}
        onChange={e => onValue(e.target.value)}
        onBlur={e => {
          const v = numeric ? tidyNumber(e.target.value) : e.target.value;
          if (v !== value) onValue(v);
          onCommit?.(v);
        }}
        list={suggest}
        inputMode={numeric ? 'decimal' : undefined}
        placeholder={placeholder}
        aria-label={ariaLabel}
        autoComplete={suggest ? undefined : 'off'}
        spellCheck={false}
        enterKeyHint="next"
      />
    </label>
  );
}

/** Hisoblangan katak (o'zgartirib bo'lmaydi), masalan Сони × Нархи */
export function Calc({ tone, area, label, value, title }: { tone: Tone; area: string; label?: string; value: string; title?: string }) {
  return (
    <div className={cx('cell tone', `tone-${tone}`, area)} title={title}>
      {label && <span className="cell-label">{label}</span>}
      <span className="cell-value">{value}</span>
    </div>
  );
}

/** Qator raqami; tanlangan qatorda ajralib turadi */
export const RowNo = ({ children, className }: { children?: ReactNode; className?: string }) => (
  <div className={cx('a-no self-center text-xs text-muted desk:text-center group-focus-within/row:font-bold group-focus-within/row:text-accent-ink', className)}>
    {children}
  </div>
);

export function ActButton({ onOpen }: { onOpen: (el: HTMLElement) => void }) {
  const t = useT();
  return (
    <button
      type="button"
      tabIndex={-1}
      aria-label={t('rowActions')}
      onClick={e => onOpen(e.currentTarget)}
      className="a-act grid h-[42px] w-full place-items-center rounded-lg text-muted hover:bg-surface-2 hover:text-fg desk:h-9 desk:opacity-50 desk:group-hover/row:opacity-100 desk:group-focus-within/row:opacity-100 print:invisible"
    >
      <DotsIcon />
    </button>
  );
}

/** Jadval sarlavhasidagi ustun nomi (kompyuterda) */
export function HeadCell({ tone, right, children }: { tone?: Tone; right?: boolean; children?: ReactNode }) {
  return (
    <div
      role="columnheader"
      className={cx(
        'self-stretch whitespace-nowrap px-2.5 py-2 text-[12.5px] font-semibold text-muted',
        right && 'text-right',
        tone && `tone tone-${tone} text-ti shadow-[inset_0_-3px_0_var(--tb)]`,
      )}
    >
      {children}
    </div>
  );
}

/** Kartochka sarlavhasi + tugmalar */
export function CardHead({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2.5 border-b border-line px-3 py-2.5 desk:pl-4">
      <h2 className="text-base font-bold">{title}</h2>
      <div className="flex w-full items-center gap-1.5 desk:w-auto print:hidden [&>button]:flex-1 desk:[&>button]:flex-none">{children}</div>
    </div>
  );
}

/** Telefonda ro'yxat oxiridagi katta "qo'shish" tugmasi */
export const AddBig = ({ onClick, children }: { onClick: () => void; children: ReactNode }) => (
  <button
    type="button"
    onClick={onClick}
    className="m-3 block h-[46px] w-[calc(100%-24px)] rounded-xl border-[1.5px] border-dashed border-line-2 font-semibold text-accent-ink active:bg-accent-soft desk:hidden print:hidden"
  >
    {children}
  </button>
);

/** Jadval: telefonda kartochkalar, kompyuterda keng jadval (kerak bo'lsa yonga suriladi) */
export function Grid({ cols, minWidth, onKeyDown, children }: { cols: string; minWidth: number; onKeyDown: (e: KeyboardEvent<HTMLElement>) => void; children: ReactNode }) {
  return (
    <div className="desk:overflow-x-auto">
      <div role="table" onKeyDown={onKeyDown} style={{ '--cols': cols, '--minw': `${minWidth}px` } as CSSProperties} className="desk:min-w-(--minw) tabular-nums">
        {children}
      </div>
    </div>
  );
}

/**
 * Klaviatura (Excel kabi): Enter — pastga, Shift+Enter — tepaga, ↑ ↓ — qatorlar,
 * Tab bilan o'ngga yurilsa Enter boshlangan ustunga qaytadi, oxirgi qatorda Enter — yangi qator.
 * Telefonda "keyingi" tugmasi kartochka ichidagi keyingi katakka o'tadi.
 */
export function useGridNav(list: ListKey, rows: (Item | Pay)[], addRow: () => string) {
  const anchor = useRef<string | null>(null);
  useEffect(() => {
    const reset = () => (anchor.current = null);
    document.addEventListener('pointerdown', reset);
    return () => document.removeEventListener('pointerdown', reset);
  }, []);

  return (e: KeyboardEvent<HTMLElement>) => {
    const el = e.target as HTMLInputElement;
    const { row, k } = el.dataset;
    if (el.tagName !== 'INPUT' || !row || !k || e.nativeEvent.isComposing) return;
    const i = rows.findIndex(r => r.id === row);

    const move = (col: string, dir: 1 | -1, canAdd: boolean) => {
      for (let j = i + dir; j >= 0 && j < rows.length; j += dir) {
        const next = document.querySelector(cellSel(list, rows[j].id, col));
        if (next) return focusEl(next);
      }
      if (canAdd && dir > 0 && i === rows.length - 1 && rowHasData(rows[i])) {
        let id = '';
        commitNow(() => (id = addRow()));
        focusFirst(cellSel(list, id, col), cellSel(list, id, 'name'));
      }
    };

    if (e.key === 'Enter' && !e.shiftKey && isMobile()) {
      e.preventDefault();
      const inputs = [...document.querySelectorAll(`[data-list="${list}"][data-row="${row}"]`)];
      const j = inputs.indexOf(el);
      return j < inputs.length - 1 ? focusEl(inputs[j + 1]) : move('name', 1, true);
    }
    if (e.key === 'Tab') {
      anchor.current ??= k;
      return;
    }
    const vertical = e.key === 'ArrowDown' || e.key === 'ArrowUp';
    if (e.key !== 'Enter' && !vertical) return;
    if (vertical && (el.list || e.altKey)) return; // tavsiyalar ro'yxati o'qlar bilan ishlaydi
    e.preventDefault();
    const col = e.key === 'Enter' && anchor.current ? anchor.current : k;
    anchor.current = null;
    move(col, e.key === 'ArrowUp' || e.shiftKey ? -1 : 1, e.key === 'Enter');
  };
}

/** O'ng tugma (katak ichida emas) — qator menyusini ochadi */
export function rowContext(e: MouseEvent, open: () => void) {
  if ((e.target as Element).closest('input')) return;
  e.preventDefault();
  open();
}

/** Qator menyusi (⋯ yoki o'ng tugma) — ikkala jadval uchun bitta */
export function useRowMenu<R extends Item | Pay>(list: ListKey, store: Store, fresh: () => R) {
  const t = useT();
  const { openMenu } = useUI();
  return (r: R, anchor: Element | { x: number; y: number }) => {
    const isSection = 'type' in r ? r.type === 'section' : null;
    openMenu({
      anchor,
      title: r.name.trim() || t(list === 'pays' ? 'payment' : isSection ? 'section' : 'row'),
      items: rowMenu(t, isSection),
      onPick: id => {
        const op = id as RowOp;
        const f = fresh();
        const run = (d: AppData) => applyRowOp(activeOf(d)[list] as R[], r.id, op, f);
        commitNow(() => (op === 'del' ? store.withUndo(t('rowDeleted'), run) : store.update(run)));
        const focusId = focusAfterOp(op, r.id, f.id);
        if (focusId) focusFirst(cellSel(list, focusId, 'name'));
      },
    });
  };
}
