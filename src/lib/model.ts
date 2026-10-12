import type { AppData, Column, Item, Pay, Project } from '../types';
import { num } from './num';

export const DEFAULT_RATE = 12000;

export const uid = () => Math.random().toString(36).slice(2, 8) + Date.now().toString(36).slice(-4);

export const newItem = (type: Item['type'] = 'item'): Item => ({ id: uid(), type, name: '', qty: '', price: '', sum: '', x: {} });
export const newPay = (): Pay => ({ id: uid(), name: '', usd: '', rate: '', sum: '' });

const str = (v: unknown) => (v == null ? '' : String(v));

/** Chala yoki eski shakldagi obyekt (localStorage, import, boshlang'ich ma'lumot) */
type LooseProject = Partial<Pick<Project, 'id' | 'name' | 'note' | 'rate'>> & {
  columns?: Partial<Column>[];
  items?: Partial<Item>[];
  pays?: Partial<Pay>[];
};

/** Har qanday (eski / import qilingan) ma'lumotni to'g'ri shaklga keltiradi */
export function normProject(p: LooseProject = {}): Project {
  return {
    id: str(p.id) || uid(),
    name: str(p.name),
    note: str(p.note),
    rate: num(p.rate) ?? DEFAULT_RATE,
    columns: (p.columns ?? []).map(c => ({ id: str(c.id) || uid(), title: str(c.title), sum: !!c.sum })),
    items: (p.items ?? []).map(r => ({
      id: str(r.id) || uid(),
      type: r.type === 'section' ? 'section' : 'item',
      name: str(r.name),
      qty: str(r.qty),
      price: str(r.price),
      sum: str(r.sum),
      x: r.x && typeof r.x === 'object' ? { ...r.x } : {},
    })),
    pays: (p.pays ?? []).map(r => ({ id: str(r.id) || uid(), name: str(r.name), usd: str(r.usd), rate: str(r.rate), sum: str(r.sum) })),
  };
}

export const blankProject = (rate = DEFAULT_RATE) => normProject({ rate, items: [newItem(), newItem(), newItem()] });

/** Birinchi ochilganda — "ШУКУРИЛЛО АКА.xlsx" dagi ma'lumotlar */
export function seedData(): AppData {
  const I = (name: string, qty = '', price = '', sum = ''): Partial<Item> => ({ type: 'item', name, qty, price, sum });
  const p = normProject({
    name: 'ШУКУРИЛЛО АКА',
    note: 'ЭСКИ ИШЛАР',
    rate: 12000,
    items: [
      I('Щит счетчик', '', '', '1 500 000'),
      I('Щит автомат', '187та', '60 000'),
      I('Точка', '155та', '60 000'),
      I('Потолок Точка', '43та', '60 000'),
      I('1 А', '26та', '60 000'),
      I('wi-fi коридор', '4та', '60 000'),
      I('Галоген', '90та', '30 000'),
      I('Дамафон', '2та', '60 000'),
      I('Климат контрол', '6та', '60 000'),
      I('Калекторга', '8та', '60 000'),
      I('Щит сетовый', '48та', '60 000'),
      I('патрон лам', '8та', '60 000'),
      I('Заземления', '', '', '1 200 000'),
      { type: 'section', name: 'Главный кабеллар' },
      I('4х50', '47метр', '30 000'),
      I('4х16', '40метр', '30 000'),
      I('1х16', '40метр', '30 000'),
      I('4х10', '35метр', '30 000'),
      I('4х6', '35метр', '30 000'),
      I('1х16', '35метр', '30 000'),
      I('4х10', '40метр', '30 000'),
      I('1х16', '10метр', '30 000'),
    ],
    pays: [
      { name: 'Айирилди', sum: '11 500 000' },
      { name: 'Отберилган', sum: '1 580 000' },
      { name: 'Олинган', usd: '600' },
      { name: 'Олинган', usd: '300' },
      { name: 'Олинган', sum: '3 000 000' },
      { name: 'Олинган', sum: '3 000 000' },
      { name: 'Олинган', usd: '600' },
    ],
  });
  return { activeId: p.id, projects: [p] };
}

/** Nom katagi uchun tavsiyalar: ko'p yozilganlari birinchi, keyin umumiy nomlar */
export function suggestionNames(projects: Project[]): string[] {
  const seen = new Map<string, { name: string; n: number }>();
  const add = (raw: string, weight: number) => {
    const name = raw.trim();
    const e = seen.get(name.toLowerCase());
    if (!name) return;
    if (e) e.n += weight;
    else seen.set(name.toLowerCase(), { name, n: weight });
  };
  for (const p of projects) for (const r of p.items) if (r.type === 'item') add(r.name, 1);
  COMMON_NAMES.forEach(n => add(n, 0));
  return [...seen.values()]
    .sort((a, b) => b.n - a.n || a.name.localeCompare(b.name))
    .slice(0, 400)
    .map(e => e.name);
}

/** Elektrikchilar ko'p yozadigan nomlar (avtoto'ldirish uchun) */
export const COMMON_NAMES = [
  'Точка', 'Розетка', 'Выключатель', 'Потолок Точка', 'Люстра', 'Светильник', 'Спот', 'Галоген', 'LED лента',
  'Щит автомат', 'Щит счетчик', 'Щит сетовый', 'Автомат', 'УЗО', 'Заземления', 'Дамафон', 'wi-fi', 'Интернет точка',
  'ТВ точка', 'Климат контрол', 'Вентилятор', 'Распред коробка', 'Подрозетник', 'Гофра', 'Штроба',
  'Кабель 3х1.5', 'Кабель 3х2.5', 'Кабель 3х4', 'Кабель 3х6', 'патрон лам', 'Калекторга',
];
