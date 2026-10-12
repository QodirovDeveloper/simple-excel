import type { AppData, Settings } from '../types';
import { normProject, seedData } from './model';

// HTML versiyadagi kalit bilan bir xil — ma'lumot shakli o'zgarmagan
const DATA_KEY = 'elektrik-smeta-v1';
export const SETTINGS_KEY = 'elektrik-smeta-settings';

/** localStorage xususiy rejimda yoki bloklanganda xato beradi — shuning uchun try/catch */
export function readJSON<T>(key: string): T | null {
  try {
    return JSON.parse(localStorage.getItem(key) ?? 'null') as T | null;
  } catch {
    return null;
  }
}

export function writeJSON(key: string, value: unknown): boolean {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

export function loadData(): AppData {
  const s = readJSON<AppData>(DATA_KEY);
  if (!s?.projects?.length) return seedData();
  const projects = s.projects.map(p => normProject(p));
  return { activeId: projects.some(p => p.id === s.activeId) ? s.activeId : projects[0].id, projects };
}

export const saveData = (d: AppData) => writeJSON(DATA_KEY, d);

export const DEFAULT_SETTINGS: Settings = { lang: 'uz', mode: 'auto', accent: 'amber', cells: 'color', size: 'm' };
export const loadSettings = (): Settings => ({ ...DEFAULT_SETTINGS, ...readJSON<Partial<Settings>>(SETTINGS_KEY) });
