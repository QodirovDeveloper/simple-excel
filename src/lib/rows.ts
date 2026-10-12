import type { T } from '../i18n';
import type { Item, Pay } from '../types';

export type RowOp = 'above' | 'below' | 'dup' | 'section' | 'up' | 'down' | 'del';
export type MenuItem = { id: string; label: string; danger?: boolean } | '-';

/**
 * Qator ustidagi amal (ishlar ham, to'lovlar ham bir xil — DRY). Ro'yxatni joyida o'zgartiradi.
 * `fresh` — oldindan yaratilgan bo'sh qator: uning id'si yangi / nusxa qatorga beriladi,
 * shuning uchun fokus qaysi qatorga o'tishi oldindan ma'lum.
 */
export function applyRowOp<R extends Item | Pay>(list: R[], id: string, op: RowOp, fresh: R): void {
  const i = list.findIndex(r => r.id === id);
  if (i < 0) return;
  const swap = (j: number) => j >= 0 && j < list.length && ([list[i], list[j]] = [list[j], list[i]]);
  const r = list[i];
  switch (op) {
    case 'above':
      return void list.splice(i, 0, fresh);
    case 'below':
      return void list.splice(i + 1, 0, fresh);
    case 'dup':
      return void list.splice(i + 1, 0, { ...structuredClone(r), id: fresh.id });
    case 'section':
      if ('type' in r) r.type = r.type === 'section' ? 'item' : 'section';
      return;
    case 'up':
      return void swap(i - 1);
    case 'down':
      return void swap(i + 1);
    case 'del':
      return void list.splice(i, 1);
  }
}

/** Amaldan keyin fokus qaysi qatorga o'tadi */
export const focusAfterOp = (op: RowOp, id: string, freshId: string) =>
  op === 'del' ? null : op === 'above' || op === 'below' || op === 'dup' ? freshId : id;

/** Qator menyusi. isSection: null — to'lov qatori (bo'lim tugmasi yo'q) */
export function rowMenu(t: T, isSection: boolean | null): MenuItem[] {
  return [
    { id: 'above', label: t('insertAbove') },
    { id: 'below', label: t('insertBelow') },
    { id: 'dup', label: t('duplicateRow') },
    ...(isSection == null ? [] : [{ id: 'section', label: t(isSection ? 'makeItem' : 'makeSection') }]),
    '-',
    { id: 'up', label: t('moveUp') },
    { id: 'down', label: t('moveDown') },
    '-',
    { id: 'del', label: t('deleteRow'), danger: true },
  ];
}
