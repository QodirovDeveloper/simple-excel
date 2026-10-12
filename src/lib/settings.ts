import { useEffect, useState } from 'react';
import type { Settings } from '../types';
import { SETTINGS_KEY, loadSettings, writeJSON } from './storage';

const darkMQ = () => matchMedia('(prefers-color-scheme: dark)');

/** Sozlamalarni <html> ga qo'yadi (CSS shu atributlarga qarab rang va o'lchamni o'zgartiradi) */
export function applySettings(s: Settings) {
  const r = document.documentElement;
  r.classList.toggle('dark', s.mode === 'dark' || (s.mode === 'auto' && darkMQ().matches));
  r.dataset.accent = s.accent;
  r.dataset.cells = s.cells;
  r.dataset.size = s.size;
  r.lang = s.lang;
  // telefon brauzerining yuqori paneli ham sahifa rangida bo'lsin
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', getComputedStyle(document.body).backgroundColor);
}

export function useSettings() {
  const [settings, setSettings] = useState(loadSettings);

  useEffect(() => {
    applySettings(settings);
    writeJSON(SETTINGS_KEY, settings);
    // "Авто" rejimda telefon qorong'iga o'tsa — biz ham o'tamiz
    const mq = darkMQ();
    const onChange = () => applySettings(settings);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, [settings]);

  const set = <K extends keyof Settings>(key: K, value: Settings[K]) => setSettings(s => ({ ...s, [key]: value }));
  return [settings, set] as const;
}
