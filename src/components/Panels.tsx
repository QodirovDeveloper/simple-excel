import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { LANGS, useT, type TKey } from '../i18n';
import { copyText, downloadBlob, fileSafe } from '../lib/dom';
import { renderEstimatePng } from '../lib/image';
import { shareText } from '../lib/share';
import type { Accent, Project, Settings } from '../types';
import { AutoIcon, MoonIcon, SunIcon } from './icons';
import { Button, Panel, Seg, useUI, type Anchor } from './ui';

type PanelProps = { p: Project; anchor: Anchor; onClose: () => void };

const canShare = () => typeof navigator.share === 'function';

/* ===== Дизайн: til, mavzu, asosiy rang, kataklar, yozuv o'lchami ===== */
const ACCENTS: [Accent, TKey, string][] = [
  ['amber', 'accentAmber', '#f0a500'],
  ['blue', 'accentBlue', '#2f6fed'],
  ['green', 'accentGreen', '#1f9d55'],
  ['red', 'accentRed', '#e5484d'],
  ['purple', 'accentPurple', '#7c5cd6'],
];

/** Katak ko'rinishining kichik namunasi */
const CellsPreview = ({ colored }: { colored: boolean }) => (
  <span className={colored ? 'flex gap-[3px]' : 'flex border border-line-2'}>
    {(['qty', 'price', 'sum'] as const).map((tone, i) => (
      <i
        key={tone}
        className={colored ? `tone tone-${tone} block h-3.5 w-5 rounded border-[1.5px] border-(--tc) bg-tf` : `block h-3.5 w-5 ${i ? 'border-l border-line-2' : ''}`}
      />
    ))}
  </span>
);

export function ThemePanel({ settings, set, anchor, onClose }: {
  settings: Settings;
  set: <K extends keyof Settings>(k: K, v: Settings[K]) => void;
  anchor: Anchor;
  onClose: () => void;
}) {
  const t = useT();
  const group = (label: TKey, control: ReactNode) => (
    <>
      <div className="mb-1.5 mt-3 text-[12.5px] font-semibold text-muted first:mt-0">{t(label)}</div>
      {control}
    </>
  );
  return (
    <Panel title={t('design')} anchor={anchor} onClose={onClose}>
      {group('language', <Seg value={settings.lang} onChange={v => set('lang', v)} options={LANGS.map(l => ({ id: l.id, label: l.name, icon: <b>{l.short}</b> }))} />)}
      {group(
        'theme',
        <Seg
          value={settings.mode}
          onChange={v => set('mode', v)}
          options={[
            { id: 'light', label: t('modeLight'), icon: <SunIcon size={20} /> },
            { id: 'dark', label: t('modeDark'), icon: <MoonIcon size={20} /> },
            { id: 'auto', label: t('modeAuto'), icon: <AutoIcon size={20} /> },
          ]}
        />,
      )}
      {group(
        'accentColor',
        <Seg
          value={settings.accent}
          onChange={v => set('accent', v)}
          options={ACCENTS.map(([id, key, color]) => ({
            id,
            label: t(key),
            icon: <i className="block size-6 rounded-full shadow-[inset_0_0_0_2px_rgb(255_255_255/0.35)]" style={{ background: color }} />,
          }))}
        />,
      )}
      {group(
        'cells',
        <Seg
          value={settings.cells}
          onChange={v => set('cells', v)}
          options={[
            { id: 'color', label: t('cellsColor'), icon: <CellsPreview colored /> },
            { id: 'plain', label: t('cellsPlain'), icon: <CellsPreview colored={false} /> },
          ]}
        />,
      )}
      {group(
        'textSize',
        <Seg
          value={settings.size}
          onChange={v => set('size', v)}
          options={[
            { id: 's', label: t('sizeS'), icon: <b className="text-xs leading-none">А</b> },
            { id: 'm', label: t('sizeM'), icon: <b className="text-[15px] leading-none">А</b> },
            { id: 'l', label: t('sizeL'), icon: <b className="text-[19px] leading-none">А</b> },
          ]}
        />,
      )}
    </Panel>
  );
}

/* ===== Mijozga matn qilib yuborish ===== */
export function SharePanel({ p, anchor, onClose, onImage }: PanelProps & { onImage: () => void }) {
  const t = useT();
  const { toast } = useUI();
  const text = useMemo(() => shareText(p, t), [p, t]);

  const copy = async () => toast(t((await copyText(text)) ? 'copied' : 'copyFailed'));
  const share = async () => {
    try {
      await navigator.share({ title: p.name.trim() || t('estimate'), text });
      onClose();
    } catch (e) {
      if ((e as Error).name !== 'AbortError') copy();
    }
  };

  return (
    <Panel title={t('shareTitle')} anchor={anchor} onClose={onClose}>
      <textarea
        readOnly
        value={text}
        aria-label={t('shareTextLabel')}
        className="block h-64 w-full resize-y rounded-xl border border-line-2 bg-surface-2 px-3 py-2.5 text-[13.5px] leading-normal text-fg outline-none"
      />
      <div className="mt-2.5 flex gap-2 [&>button]:h-11 [&>button]:flex-1">
        {canShare() && <Button variant="primary" onClick={share}>{t('shareDots')}</Button>}
        <Button variant={canShare() ? 'default' : 'primary'} onClick={copy}>{t('copy')}</Button>
      </div>
      <Button className="mt-2 h-11 w-full" onClick={onImage}>{t('shareAsImage')}</Button>
      <p className="mt-2 text-[12.5px] text-muted">{t('shareNote')}</p>
    </Panel>
  );
}

/* ===== Smeta rasmi (.png): oldin ko'rsatadi, keyin yuklab olish yoki yuborish ===== */
export function ImagePanel({ p, anchor, onClose }: PanelProps) {
  const t = useT();
  const { toast } = useUI();
  const [img, setImg] = useState<{ blob: Blob; url: string; file: File } | null>(null);
  const name = fileSafe(p.name) + '.png';

  useEffect(() => {
    let cancelled = false;
    let url = '';
    renderEstimatePng(p, t)
      .then(blob => {
        if (cancelled) return;
        url = URL.createObjectURL(blob);
        setImg({ blob, url, file: new File([blob], name, { type: 'image/png' }) });
      })
      .catch(() => toast(t('imageFailed')));
    return () => {
      cancelled = true;
      if (url) URL.revokeObjectURL(url);
    };
  }, [p, t, name, toast]);

  const download = () => {
    if (!img) return;
    downloadBlob(img.blob, name);
    toast(t('imageSaved'));
  };
  const share = async () => {
    try {
      await navigator.share({ files: [img!.file], title: p.name.trim() || t('estimate') });
      onClose();
    } catch (e) {
      if ((e as Error).name !== 'AbortError') download();
    }
  };
  const canShareFile = !!img && canShare() && !!navigator.canShare?.({ files: [img.file] });

  return (
    <Panel title={t('imageTitle')} anchor={anchor} onClose={onClose} wide>
      <div className="max-h-[min(62vh,560px)] overflow-auto rounded-xl border border-line-2 bg-white">
        {img ? <img src={img.url} alt={t('imageAlt')} className="block h-auto w-full" /> : <p className="p-6 text-center text-muted">{t('imageMaking')}</p>}
      </div>
      <div className="mt-2.5 flex gap-2 [&>button]:h-11 [&>button]:flex-1">
        <Button variant="primary" onClick={download} disabled={!img}>{t('download')}</Button>
        {canShareFile && <Button onClick={share}>{t('shareDots')}</Button>}
      </div>
      <p className="mt-2 text-[12.5px] text-muted">{t('imageNote')}</p>
    </Panel>
  );
}
