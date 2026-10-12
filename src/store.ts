import { useCallback, useEffect, useRef, useState } from 'react';
import { useUI } from './components/ui';
import { useT } from './i18n';
import { loadData, saveData } from './lib/storage';
import type { AppData, Project } from './types';

export type SaveStatus = 'ok' | 'busy' | 'err';

/** Komponentlarga beriladigan bitta obyekt: ma'lumot + uni o'zgartirish yo'llari */
export interface Store {
  data: AppData;
  /** Joriy (tanlangan) obyekt */
  p: Project;
  /** Butun ma'lumotni o'zgartirish: nusxa olinadi, fn uni "joyida" o'zgartiradi (KISS) */
  update: (fn: (d: AppData) => void) => void;
  /** Faqat joriy obyektni o'zgartirish */
  edit: (fn: (p: Project) => void) => void;
  /** O'chirish, import kabi amallar: "Қайтариш" tugmali xabar bilan */
  withUndo: (msg: string, fn: (d: AppData) => void) => void;
  status: SaveStatus;
}

export const activeOf = (d: AppData) => d.projects.find(p => p.id === d.activeId) ?? d.projects[0];

export function useStore(): Store {
  const t = useT();
  const { toast } = useUI();
  const [data, setData] = useState(loadData);
  const status = usePersist(data);

  const update = useCallback((fn: (d: AppData) => void) => {
    setData(s => {
      const d = structuredClone(s);
      fn(d);
      return d;
    });
  }, []);

  const edit = useCallback((fn: (p: Project) => void) => update(d => fn(activeOf(d))), [update]);

  const withUndo = useCallback(
    (msg: string, fn: (d: AppData) => void) => {
      const before = data; // ma'lumot o'zgarmas (immutable) — eski holatni shunchaki eslab qolamiz
      update(fn);
      toast(msg, { label: t('undo'), run: () => setData(before) });
    },
    [data, update, toast, t],
  );

  return { data, p: activeOf(data), update, edit, withUndo, status };
}

/** O'zgarishdan 300ms keyin brauzerga saqlaydi; sahifa yopilayotganda darhol saqlaydi */
function usePersist(data: AppData): SaveStatus {
  const [status, setStatus] = useState<SaveStatus>('ok');
  const latest = useRef(data);
  const first = useRef(true);

  useEffect(() => {
    latest.current = data;
    if (first.current) {
      first.current = false;
      return;
    }
    setStatus('busy');
    const id = setTimeout(() => setStatus(saveData(data) ? 'ok' : 'err'), 300);
    return () => clearTimeout(id);
  }, [data]);

  useEffect(() => {
    const flush = () => saveData(latest.current);
    const onHide = () => document.visibilityState === 'hidden' && flush();
    addEventListener('pagehide', flush);
    document.addEventListener('visibilitychange', onHide);
    return () => {
      removeEventListener('pagehide', flush);
      document.removeEventListener('visibilitychange', onHide);
    };
  }, []);

  return status;
}
