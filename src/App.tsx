import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Header } from './components/Header';
import { ItemsTable } from './components/ItemsTable';
import { ImagePanel, SharePanel, ThemePanel } from './components/Panels';
import { PaysTable } from './components/PaysTable';
import { ProjectBar, ProjectCard } from './components/Project';
import { MobileBar, Stats } from './components/Stats';
import { UIProvider, useUI, type Anchor } from './components/ui';
import { I18n, makeT, useT } from './i18n';
import { cx, fileSafe } from './lib/dom';
import { exportExcel, importExcel } from './lib/excel';
import { suggestionNames } from './lib/model';
import type { MenuItem } from './lib/rows';
import { useSettings } from './lib/settings';
import { saveData } from './lib/storage';
import { useStore, type SaveStatus } from './store';
import type { Project, Settings } from './types';

export default function App() {
  const [settings, setSetting] = useSettings();
  const t = useMemo(() => makeT(settings.lang), [settings.lang]);
  return (
    <I18n.Provider value={t}>
      <UIProvider>
        <Main settings={settings} setSetting={setSetting} />
      </UIProvider>
    </I18n.Provider>
  );
}

type PanelState = { kind: 'theme' | 'share' | 'image'; anchor: Anchor } | null;

function Main({ settings, setSetting }: { settings: Settings; setSetting: ReturnType<typeof useSettings>[1] }) {
  const t = useT();
  const { toast, openMenu } = useUI();
  const store = useStore();
  const { data, p } = store;
  const [panel, setPanel] = useState<PanelState>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const names = useMemo(() => suggestionNames(data.projects), [data.projects]);

  const closePanel = useCallback(() => setPanel(null), []);
  const togglePanel = (kind: NonNullable<PanelState>['kind'], anchor: Anchor) => setPanel(cur => (cur?.kind === kind ? null : { kind, anchor }));

  useEffect(() => {
    document.title = (p.name.trim() ? `${p.name.trim()} — ` : '') + t('brand');
  }, [p.name, t]);

  // Ctrl+S — odatdagidek bosilsa ham xavotir yo'q: darhol saqlaymiz
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey) || e.code !== 'KeyS') return;
      e.preventDefault();
      saveData(data);
      toast(t('ctrlS'));
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [data, t, toast]);

  const saveExcel = async (all: boolean) => {
    toast(t('excelPreparing'));
    const list = all ? data.projects : [p];
    const name = all ? `${t('estimate')}-${new Date().toISOString().slice(0, 10)}.xlsx` : `${fileSafe(p.name)}.xlsx`;
    const kind = await exportExcel(list, name, t);
    toast(kind === 'csv' ? t('csvSaved') : all ? t('excelSavedAll', { n: list.length }) : t('excelSaved'));
  };

  const openSave = (anchor: HTMLElement) => {
    const items: MenuItem[] = [
      { id: 'png', label: t('savePng') },
      { id: 'xlsx', label: t('saveXlsx') },
    ];
    if (data.projects.length > 1) items.push('-', { id: 'all', label: t('saveAll', { n: data.projects.length }) });
    openMenu({ anchor, title: t('save'), items, onPick: id => (id === 'png' ? setPanel({ kind: 'image', anchor }) : saveExcel(id === 'all')) });
  };

  const importFile = async (file: File) => {
    toast(t('excelReading'));
    let made: Project[];
    try {
      made = await importExcel(file, t);
    } catch {
      return toast(t('readFailed'));
    }
    if (!made.length) return toast(t('noData'));
    const [first] = made;
    store.withUndo(
      made.length > 1 ? t('importedMany', { n: made.length }) : t('imported', { name: first.name, rows: first.items.length, pays: first.pays.length }),
      d => {
        d.projects.push(...made);
        d.activeId = first.id;
      },
    );
  };

  return (
    <>
      <div className="zoomable mx-auto max-w-[1120px] px-4 pb-[calc(96px+env(safe-area-inset-bottom))] pt-4 desk:pb-14 desk:pt-[18px] print:p-0">
        <Header
          lang={settings.lang}
          onLang={l => setSetting('lang', l)}
          onDesign={el => togglePanel('theme', el)}
          onImport={() => fileInput.current?.click()}
          onSave={openSave}
          onPrint={() => print()}
        />
        <ProjectBar store={store} />
        <ProjectCard store={store} onShare={el => togglePanel('share', el)} />
        <Stats p={p} />
        <div className="space-y-3.5">
          <ItemsTable store={store} names={names} />
          <PaysTable store={store} lang={settings.lang} />
        </div>
        <footer className="mt-3.5 flex flex-wrap justify-between gap-x-4 gap-y-2 px-0.5 text-[12.5px] text-muted print:hidden">
          <SaveStatusText status={store.status} />
          <span className="mob:hidden">{t('keys')}</span>
        </footer>
      </div>

      <MobileBar p={p} />

      <input
        ref={fileInput}
        type="file"
        accept=".xlsx,.xls,.csv"
        hidden
        onChange={e => {
          const f = e.target.files?.[0];
          e.target.value = '';
          if (f) importFile(f);
        }}
      />

      {panel?.kind === 'theme' && <ThemePanel settings={settings} set={setSetting} anchor={panel.anchor} onClose={closePanel} />}
      {panel?.kind === 'share' && <SharePanel p={p} anchor={panel.anchor} onClose={closePanel} onImage={() => setPanel({ kind: 'image', anchor: panel.anchor })} />}
      {panel?.kind === 'image' && <ImagePanel p={p} anchor={panel.anchor} onClose={closePanel} />}
    </>
  );
}

function SaveStatusText({ status }: { status: SaveStatus }) {
  const t = useT();
  const dot = { ok: 'bg-pos', busy: 'bg-accent', err: 'bg-neg' }[status];
  return (
    <span className={cx('inline-flex items-center gap-1.5', status === 'err' && 'text-neg')}>
      <i className={cx('size-[7px] rounded-full', dot)} />
      {status === 'ok' ? t('savedLocal') : status === 'busy' ? t('saving') : t('saveFailed')}
    </span>
  );
}
