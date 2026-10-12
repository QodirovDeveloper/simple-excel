import { useLayoutEffect, useRef } from 'react';
import { useT } from '../i18n';
import { totals } from '../lib/calc';
import { commitNow, cx, focusFirst, todayStr } from '../lib/dom';
import { blankProject, uid } from '../lib/model';
import { fmt } from '../lib/num';
import { activeOf, type Store } from '../store';
import { SendIcon } from './icons';
import { Button } from './ui';

/** Obyektlar ro'yxati: tanlash, yangi, nusxa, o'chirish */
export function ProjectBar({ store }: { store: Store }) {
  const t = useT();
  const { data, p, update, withUndo } = store;

  const add = () => {
    const np = blankProject(p.rate);
    commitNow(() =>
      update(d => {
        d.projects.push(np);
        d.activeId = np.id;
      }),
    );
    focusFirst('#project-name');
  };
  const duplicate = () =>
    update(d => {
      const copy = { ...structuredClone(activeOf(d)), id: uid() };
      copy.name = `${copy.name.trim() || t('untitled')} ${t('copySuffix')}`;
      d.projects.push(copy);
      d.activeId = copy.id;
    });
  const remove = () => {
    if (!confirm(t('confirmDelete', { name: p.name.trim() || t('untitled') }))) return;
    withUndo(t('projectDeleted'), d => {
      d.projects = d.projects.filter(x => x.id !== d.activeId);
      if (!d.projects.length) d.projects.push(blankProject());
      d.activeId = d.projects[0].id;
    });
  };

  return (
    <div className="mb-3 grid grid-cols-[1fr_auto_auto] gap-2 desk:flex desk:items-center print:hidden">
      <select
        value={p.id}
        onChange={e => update(d => void (d.activeId = e.target.value))}
        aria-label={t('chooseProject')}
        className="col-span-full h-11 min-w-0 rounded-lg border border-line-2 bg-surface px-3 text-base font-semibold text-fg desk:h-9 desk:max-w-[460px] desk:flex-1 desk:text-sm"
      >
        {data.projects.map(x => {
          const name = x.name.trim() || t('untitled');
          const left = Math.round(totals(x).left);
          return (
            <option key={x.id} value={x.id}>
              {left ? t('dueIn', { name, n: fmt(left) }) : name}
            </option>
          );
        })}
      </select>
      <Button onClick={add}>{t('newProject')}</Button>
      <Button onClick={duplicate}>{t('duplicate')}</Button>
      <Button variant="danger" onClick={remove}>{t('delete')}</Button>
    </div>
  );
}

/** Obyekt nomi, eslatma va "Юбориш" tugmasi */
export function ProjectCard({ store, onShare }: { store: Store; onShare: (el: HTMLElement) => void }) {
  const t = useT();
  const { p, edit } = store;
  const note = useRef<HTMLTextAreaElement>(null);

  // Eslatma maydoni matnga qarab o'zi kattalashadi
  useLayoutEffect(() => {
    const el = note.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  }, [p.note]);

  return (
    <section className="card mb-3.5 px-4 pb-2.5 pt-3">
      <div className="flex items-center gap-2.5">
        <input
          id="project-name"
          value={p.name}
          onChange={e => edit(x => void (x.name = e.target.value))}
          placeholder={t('projectName')}
          aria-label={t('projectName')}
          spellCheck={false}
          className="min-w-0 flex-1 border-b-2 border-transparent bg-transparent py-0.5 text-xl font-bold tracking-tight text-fg outline-none placeholder:text-faint focus:border-accent desk:text-2xl"
        />
        <Button onClick={e => onShare(e.currentTarget)} title={t('sendTitle')} aria-haspopup="dialog" className="print:hidden">
          <SendIcon />
          {t('send')}
        </Button>
      </div>
      <div className="hidden text-xs text-muted print:block">
        {t('date')}: {todayStr()}
      </div>
      <textarea
        ref={note}
        rows={1}
        value={p.note}
        onChange={e => edit(x => void (x.note = e.target.value))}
        placeholder={t('notePh')}
        aria-label={t('notePh')}
        className={cx(
          'mt-1 block w-full resize-none overflow-hidden bg-transparent py-0.5 text-base text-muted outline-none placeholder:text-faint desk:text-sm',
          !p.note.trim() && 'print:hidden',
        )}
      />
    </section>
  );
}
