import { LANGS, useT } from '../i18n';
import type { Lang } from '../types';
import { BoltIcon, DownloadIcon, PaletteIcon, PrintIcon, UploadIcon } from './icons';
import { Button } from './ui';

export function Header(props: {
  lang: Lang;
  onLang: (l: Lang) => void;
  onDesign: (el: HTMLElement) => void;
  onImport: () => void;
  onSave: (el: HTMLElement) => void;
  onPrint: () => void;
}) {
  const t = useT();
  return (
    <header className="mb-3 flex flex-wrap items-center gap-2.5 desk:mb-4 print:hidden">
      <div className="flex min-w-0 flex-1 items-center gap-2.5">
        <span className="grid size-9 flex-none place-items-center rounded-[9px] bg-accent text-on-accent">
          <BoltIcon size={20} />
        </span>
        <h1 className="truncate text-lg font-bold tracking-tight">{t('brand')}</h1>
      </div>

      <select
        value={props.lang}
        onChange={e => props.onLang(e.target.value as Lang)}
        aria-label={t('language')}
        title={t('language')}
        className="h-9 rounded-lg border border-line-2 bg-surface px-2 text-sm font-semibold text-fg mob:hidden" // telefonda til "Дизайн" ichida
      >
        {LANGS.map(l => (
          <option key={l.id} value={l.id}>
            {l.short} · {l.name}
          </option>
        ))}
      </select>
      <Button onClick={e => props.onDesign(e.currentTarget)} aria-label={t('design')} aria-haspopup="dialog">
        <PaletteIcon />
        <span className="mob:hidden">{t('design')}</span>
      </Button>

      <div className="grid w-full grid-cols-[1fr_1fr_auto] gap-2 desk:flex desk:w-auto">
        <Button onClick={props.onImport}>
          <UploadIcon />
          {t('importExcel')}
        </Button>
        <Button variant="primary" onClick={e => props.onSave(e.currentTarget)} aria-haspopup="menu">
          <DownloadIcon />
          {t('save')}
        </Button>
        <Button onClick={props.onPrint} aria-label={t('print')}>
          <PrintIcon />
          <span className="mob:hidden">{t('print')}</span>
        </Button>
      </div>
    </header>
  );
}
