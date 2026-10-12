import { useT } from '../i18n';
import { columnSum, isAuto, itemSum, rememberedPrice, sectionSums, totals, unitTotals } from '../lib/calc';
import { cellSel, commitNow, cx, focusFirst } from '../lib/dom';
import { newItem, uid } from '../lib/model';
import { fmt } from '../lib/num';
import { unitsText } from '../lib/share';
import { activeOf, type Store } from '../store';
import type { Column, Item } from '../types';
import { ActButton, AddBig, Calc, CardHead, Field, Grid, HeadCell, RowNo, rowContext, useGridNav, useRowMenu } from './grid';
import { Button } from './ui';

const LEGEND = ['qty', 'price', 'sum', 'usd', 'rate'] as const;
const LEGEND_LABEL = { qty: 'colQty', price: 'colPrice', sum: 'colSum', usd: 'colUsd', rate: 'colRate' } as const;

export function ItemsTable({ store, names }: { store: Store; names: string[] }) {
  const t = useT();
  const { p, data, edit, withUndo } = store;
  const cols = p.columns;
  const subs = sectionSums(p.items);
  const units = unitTotals(p.items);

  const editRow = (id: string, fn: (r: Item) => void) =>
    edit(pr => {
      const r = pr.items.find(x => x.id === id);
      if (r) fn(r);
    });
  const editCol = (id: string, fn: (c: Column) => void) =>
    edit(pr => {
      const c = pr.columns.find(x => x.id === id);
      if (c) fn(c);
    });
  const addRows = (...rows: Item[]) => {
    commitNow(() => edit(pr => void pr.items.push(...rows)));
    focusFirst(cellSel('items', rows[0].id, 'name'));
  };
  const addColumn = () => {
    const c: Column = { id: uid(), title: cols.length ? t('columnN', { n: cols.length + 1 }) : t('firstColumn'), sum: false };
    commitNow(() => edit(pr => void pr.columns.push(c)));
    focusFirst(`[data-col="${c.id}"]`);
  };
  const deleteColumn = (id: string) =>
    withUndo(t('columnDeleted'), d => {
      const pr = activeOf(d);
      pr.columns = pr.columns.filter(c => c.id !== id);
      for (const r of pr.items) delete r.x[id];
    });
  /** Ma'lum tovar nomi yozilsa — narxi o'zi qo'yiladi */
  const fillPrice = (r: Item, name: string) => {
    if (r.type !== 'item' || r.price.trim()) return;
    const price = rememberedPrice(data.projects, p, name, r.id);
    if (price) editRow(r.id, x => void (x.price = price));
  };

  const onKeyDown = useGridNav('items', p.items, () => {
    const r = newItem();
    edit(pr => void pr.items.push(r));
    return r.id;
  });
  const openMenu = useRowMenu('items', store, () => newItem());

  const columnHead = (c: Column) => (
    <div key={c.id} className="flex min-w-0 items-center gap-0.5">
      <input
        data-col={c.id}
        value={c.title}
        onChange={e => editCol(c.id, x => void (x.title = e.target.value))}
        aria-label={t('columnName')}
        spellCheck={false}
        className="h-8 min-w-0 flex-1 rounded-md border border-transparent bg-transparent px-1.5 text-base font-semibold text-fg focus:border-accent focus:bg-surface focus:outline-none desk:h-7 desk:text-[12.5px]"
      />
      <button
        type="button"
        aria-pressed={c.sum}
        title={t('columnSum')}
        onClick={() => editCol(c.id, x => void (x.sum = !x.sum))}
        className={cx('size-8 flex-none rounded-md desk:size-6', c.sum ? 'bg-accent-soft font-bold text-accent-ink' : 'text-muted hover:bg-surface-2')}
      >
        Σ
      </button>
      <button type="button" title={t('columnDelete')} onClick={() => deleteColumn(c.id)} className="size-8 flex-none rounded-md text-muted hover:bg-surface-2 hover:text-neg desk:size-6">
        ✕
      </button>
    </div>
  );

  let n = 0;
  return (
    <section className="card">
      <CardHead title={t('itemsTitle')}>
        <Button onClick={() => addRows(newItem())}>{t('addRow')}</Button>
        <Button onClick={() => addRows(newItem('section'), newItem())}>{t('addSection')}</Button>
        <Button onClick={addColumn}>{t('addColumn')}</Button>
      </CardHead>

      {/* Telefonda qo'shilgan ustunlar nomi tepada turadi */}
      {cols.length > 0 && (
        <div className="flex flex-wrap gap-1.5 border-b border-line p-3 desk:hidden">
          {cols.map(c => (
            <div key={c.id} className="flex-[1_1_150px] rounded-lg border border-line-2 bg-surface-2 p-1">{columnHead(c)}</div>
          ))}
        </div>
      )}

      <Grid
        cols={`42px minmax(160px,1fr) 112px 120px 142px ${cols.map(() => '150px ').join('')}40px`}
        minWidth={680 + cols.length * 150}
        onKeyDown={onKeyDown}
      >
        <div role="row" className="grid-row hidden bg-head hover:bg-head desk:grid">
          <HeadCell>№</HeadCell>
          <HeadCell>{t('colName')}</HeadCell>
          <HeadCell tone="qty">{t('colQty')}</HeadCell>
          <HeadCell tone="price" right>{t('colPrice')}</HeadCell>
          <HeadCell tone="sum" right>{t('colSum')}</HeadCell>
          {cols.map(c => (
            <div key={c.id} role="columnheader" className="tone tone-x self-stretch px-1 py-1 shadow-[inset_0_-3px_0_var(--tb)]">
              {columnHead(c)}
            </div>
          ))}
          <div />
        </div>

        {p.items.length === 0 && <p className="px-3 py-6 text-center text-muted">{t('noRows')}</p>}

        {p.items.map(r =>
          r.type === 'section' ? (
            <div role="row" key={r.id} className="grid-row sec-row group/row" onContextMenu={e => rowContext(e, () => openMenu(r, { x: e.clientX, y: e.clientY }))}>
              <RowNo><span className="inline-block size-2 rounded-[2px] bg-accent" /></RowNo>
              <Field list="items" row={r.id} k="name" value={r.name} onValue={v => editRow(r.id, x => void (x.name = v))}
                tone="section" area="a-name" ariaLabel={t('sectionPh')} placeholder={t('sectionPh')} />
              <div className="a-sum self-center px-1 text-right font-bold text-muted desk:px-2.5" title={t('total')}>
                {subs.get(r.id) ? fmt(subs.get(r.id)) : ''}
              </div>
              <ActButton onOpen={el => openMenu(r, el)} />
            </div>
          ) : (
            <div role="row" key={r.id} className="grid-row item-row group/row" onContextMenu={e => rowContext(e, () => openMenu(r, { x: e.clientX, y: e.clientY }))}>
              <RowNo>{++n}</RowNo>
              <Field list="items" row={r.id} k="name" value={r.name} onValue={v => editRow(r.id, x => void (x.name = v))}
                onCommit={v => fillPrice(r, v)} tone="name" area="a-name" ariaLabel={t('colName')} placeholder={t('namePh')} suggest="dl-names" />
              <Field list="items" row={r.id} k="qty" value={r.qty} onValue={v => editRow(r.id, x => void (x.qty = v))}
                tone="qty" area="a-qty" label={t('colQty')} ariaLabel={t('colQty')} placeholder={t('qtyPh')} />
              <Field list="items" row={r.id} k="price" value={r.price} onValue={v => editRow(r.id, x => void (x.price = v))}
                tone="price" area="a-price" label={t('colPrice')} ariaLabel={t('colPrice')} placeholder="0" numeric />
              {isAuto(r) ? (
                <Calc tone="sum" area="a-sum" label={t('colSum')} value={fmt(itemSum(r))} title={t('qtyTimesPrice')} />
              ) : (
                <Field list="items" row={r.id} k="sum" value={r.sum} onValue={v => editRow(r.id, x => void (x.sum = v))}
                  tone="sum" area="a-sum" label={t('colSum')} ariaLabel={t('colSum')} placeholder="0" numeric />
              )}
              {cols.map(c => (
                <Field key={c.id} list="items" row={r.id} k={`x:${c.id}`} value={r.x[c.id] ?? ''}
                  onValue={v => editRow(r.id, x => void (x.x[c.id] = v))}
                  tone="x" area="a-x" label={c.title} ariaLabel={c.title} numeric={c.sum} />
              ))}
              <ActButton onOpen={el => openMenu(r, el)} />
            </div>
          ),
        )}

        <div role="row" className="grid-row foot-row">
          <RowNo className="mob:hidden" />
          <div className="a-name self-center desk:px-2.5">{t('total')}</div>
          <div className="a-sub self-center text-[12.5px] font-semibold leading-tight text-muted desk:px-2.5">{unitsText(units, t)}</div>
          <div className="mob:hidden" />
          <div className="a-sum self-center text-right text-lg desk:px-2.5 desk:text-base">{fmt(totals(p).total)}</div>
          {cols.map(c => (
            <div key={c.id} className={cx('a-x flex justify-between gap-2 text-[13px] text-muted desk:block desk:px-2.5 desk:text-right desk:text-[15px] desk:text-fg', !c.sum && 'mob:hidden')}>
              <span className="desk:hidden">{c.title}</span>
              {c.sum ? fmt(columnSum(p.items, c.id)) : ''}
            </div>
          ))}
          <div className="mob:hidden" />
        </div>
      </Grid>

      <AddBig onClick={() => addRows(newItem())}>{t('addRowBig')}</AddBig>

      <div className="border-t border-line px-4 pb-3 pt-2.5 text-[13px] text-muted print:hidden">
        <div className="legend mb-1.5 flex-wrap gap-x-4 gap-y-1 font-semibold text-fg">
          {LEGEND.map(k => (
            <span key={k} className={`tone tone-${k} inline-flex items-center gap-1.5`}>
              <i className="inline-block size-3.5 rounded border-[1.5px] border-tb bg-tf" />
              {t(LEGEND_LABEL[k])}
            </span>
          ))}
        </div>
        {t('hintQty')} {t('hintPrice')}
      </div>

      <datalist id="dl-names">
        {names.map(name => (
          <option key={name} value={name} />
        ))}
      </datalist>
    </section>
  );
}
