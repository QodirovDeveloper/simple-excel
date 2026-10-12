export type Lang = 'uz' | 'ru' | 'en';
export type Mode = 'light' | 'dark' | 'auto';
export type Accent = 'amber' | 'blue' | 'green' | 'red' | 'purple';
export type Cells = 'color' | 'plain';
export type Size = 's' | 'm' | 'l';

export interface Settings {
  lang: Lang;
  mode: Mode;
  accent: Accent;
  cells: Cells;
  size: Size;
}

/** Qo'shimcha ustun ("Изоҳ" va h.k.); sum — pastda jamisi chiqsinmi */
export interface Column {
  id: string;
  title: string;
  sum: boolean;
}

/** Qiymatlar matn bo'lib saqlanadi: "155та", "60 000" — hisoblashda num() raqamni ajratadi */
export interface Item {
  id: string;
  type: 'item' | 'section';
  name: string;
  qty: string;
  price: string;
  sum: string; // narx yo'q bo'lsa qo'lda yoziladigan summa
  x: Record<string, string>; // qo'shimcha ustunlar qiymati
}

export interface Pay {
  id: string;
  name: string;
  usd: string;
  rate: string; // bo'sh bo'lsa obyekt kursi olinadi
  sum: string; // dollar yo'q bo'lsa qo'lda yoziladigan summa
}

export interface Project {
  id: string;
  name: string;
  note: string;
  rate: number;
  columns: Column[];
  items: Item[];
  pays: Pay[];
}

export interface AppData {
  activeId: string;
  projects: Project[];
}

export type ListKey = 'items' | 'pays';

/** Katak rangi: Сони — ko'k, Нархи — to'q sariq, Суммаси — yashil ... */
export type Tone = 'name' | 'section' | 'qty' | 'price' | 'sum' | 'usd' | 'rate' | 'x';
