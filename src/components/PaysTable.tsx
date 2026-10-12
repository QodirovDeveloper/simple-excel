import { useState } from 'react';
import { PAY_NAMES, useT } from '../i18n';
import { payAuto, paySum, totals, usdTotal } from '../lib/calc';
import { cellSel, commitNow, focusFirst } from '../lib/dom';
import { newPay } from '../lib/model';
import { fmt, fmtIn, num } from '../lib/num';
import type { Store } from '../store';
import type { Lang, Pay } from '../types';
import { ActButton, AddBig, Calc, CardHead, Field, Grid, HeadCell, RowNo, rowContext, useGridNav, useRowMenu } from './grid';
import { Button } from './ui';

export function PaysTable({ store, lang }: { store: Store; lang: Lang }) {
  const t = useT();
  const { p, edit } = store;
  const usd = usdTotal(p);

  const editRow = (id: string, fn: (r: Pay) => void) =>
    edit(pr => {
      const r = pr.pays.find(x => x.id === id);
      if (r) fn(r);
    });
  const addPay = () => {
    const r = newPay();
    commitNow(() => edit(pr => void pr.pays.push(r)));
    focusFirst(cellSel('pays', r.id, 'sum'));
  };
  const onKeyDown = useGridNav('pays', p.pays, () => {
    const r = newPay();
    edit(pr => void pr.pays.push(r));
    return r.id;
  });
  const openMenu = useRowMenu('pays', store, newPay);

  return (
    <section className="card">
      <CardHead title={t('paysTitle')}>
        <label className="mr-1 inline-flex flex-none items-center gap-1.5 text-[13px] text-muted">
          1 $ =
          <RateInput key={p.id} rate={p.rate} onRate={rate => edit(pr => void (pr.rate = rate))} label={t('rateLabel')} />
          {t('currency')}
        </label>
        <Button onClick={addPay}>{t('addPay')}</Button>
      </CardHead>

      <Grid cols="42px minmax(160px,1fr) 110px 110px 150px 40px" minWidth={560} onKeyDown={onKeyDown}>
        <div role="row" className="grid-row hidden bg-head hover:bg-head desk:grid">
          <HeadCell>№</HeadCell>
          <HeadCell>{t('colNote')}</HeadCell>
          <HeadCell tone="usd" right>{t('colUsd')}</HeadCell>
          <HeadCell tone="rate" right>{t('colRate')}</HeadCell>
          <HeadCell tone="sum" right>{`${t('colAmount')}, ${t('currency')}`}</HeadCell>
          <div />
        </div>

        {p.pays.length === 0 && <p className="px-3 py-6 text-center text-muted">{t('noPays')}</p>}

        {p.pays.map((r, i) => (
          <div role="row" key={r.id} className="grid-row pay-row group/row" onContextMenu={e => rowContext(e, () => openMenu(r, { x: e.clientX, y: e.clientY }))}>
            <RowNo>{i + 1}</RowNo>
            <Field list="pays" row={r.id} k="name" value={r.name} onValue={v => editRow(r.id, x => void (x.name = v))}
              tone="name" area="a-name" ariaLabel={t('colNote')} placeholder={t('payPh')} suggest="dl-pays" />
            <Field list="pays" row={r.id} k="usd" value={r.usd} onValue={v => editRow(r.id, x => void (x.usd = v))}
              tone="usd" area="a-usd" label={t('colUsd')} ariaLabel={t('colUsd')} placeholder="—" numeric />
            <Field list="pays" row={r.id} k="rate" value={r.rate} onValue={v => editRow(r.id, x => void (x.rate = v))}
              tone="rate" area="a-rate" label={t('colRate')} ariaLabel={t('colRate')} placeholder={fmtIn(p.rate)} numeric dim={!payAuto(r)} />
            {payAuto(r) ? (
              <Calc tone="sum" area="a-sum" label={`${t('colAmount')}, ${t('currency')}`} value={fmt(paySum(r, p))} title={t('usdTimesRate')} />
            ) : (
              <Field list="pays" row={r.id} k="sum" value={r.sum} onValue={v => editRow(r.id, x => void (x.sum = v))}
                tone="sum" area="a-sum" label={`${t('colAmount')}, ${t('currency')}`} ariaLabel={t('colAmount')} placeholder="0" numeric />
            )}
            <ActButton onOpen={el => openMenu(r, el)} />
          </div>
        ))}

        <div role="row" className="grid-row foot-row">
          <RowNo className="mob:hidden" />
          <div className="a-name self-center desk:px-2.5">{t('totalReceived')}</div>
          <div className="a-sub self-center text-[12.5px] font-semibold text-muted desk:px-2.5 desk:text-right">{usd ? `${fmt(usd)} $` : ''}</div>
          <div className="mob:hidden" />
          <div className="a-sum self-center text-right text-lg desk:px-2.5 desk:text-base">{fmt(totals(p).paid)}</div>
          <div className="mob:hidden" />
        </div>
      </Grid>

      <AddBig onClick={addPay}>{t('addPayBig')}</AddBig>

      <datalist id="dl-pays">
        {PAY_NAMES[lang].map(name => (
          <option key={name} value={name} />
        ))}
      </datalist>
    </section>
  );
}

/** Kurs: yozayotganda o'z holicha, chiqqanda "12 000" ko'rinishiga keladi */
function RateInput({ rate, onRate, label }: { rate: number; onRate: (n: number) => void; label: string }) {
  const [text, setText] = useState(fmtIn(rate));
  return (
    <input
      value={text}
      onChange={e => {
        setText(e.target.value);
        onRate(num(e.target.value) ?? 0);
      }}
      onBlur={() => setText(fmtIn(rate))}
      inputMode="decimal"
      aria-label={label}
      className="h-10 w-24 rounded-lg border border-line-2 bg-surface px-2 text-right text-base tabular-nums text-fg focus:border-accent focus:outline-none desk:h-8 desk:text-sm"
    />
  );
}
