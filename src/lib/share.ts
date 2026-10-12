import { unitLabel, type T } from '../i18n';
import type { Project } from '../types';
import { isAuto, itemSum, rowHasData, totals } from './calc';
import { fmt, num } from './num';

/** Mijozga Telegram / WhatsApp / SMS orqali yuboriladigan matn */
export function shareText(p: Project, t: T): string {
  const n = (v: number) => fmt(v, ' ');
  const cur = t('currency');
  const { total, paid, left } = totals(p);
  const lines = [`📋 ${p.name.trim() || t('estimate')}`, ''];
  let i = 0;
  for (const r of p.items) {
    if (r.type === 'section') {
      if (r.name.trim()) lines.push('', `▪️ ${r.name.trim()}`);
      continue;
    }
    if (!rowHasData(r)) continue;
    const calc = isAuto(r) ? `${r.qty.trim() ? r.qty.trim() + ' × ' : ''}${n(num(r.price) ?? 0)} = ` : '';
    lines.push(`${++i}. ${r.name.trim() || '—'}: ${calc}${n(itemSum(r))}`);
  }
  lines.push('', `💰 ${t('total')}: ${n(total)} ${cur}`);
  if (p.pays.some(rowHasData)) {
    lines.push(`✅ ${t('received')}: ${n(paid)} ${cur}`);
    lines.push(left >= 0 ? `⏳ ${t('left')}: ${n(left)} ${cur}` : `↩️ ${t('overpaid')}: ${n(-left)} ${cur}`);
  }
  lines.push('', `⚡ ${t('brand')}`);
  return lines.join('\n');
}

/** "577 та · 282 м" */
export const unitsText = (units: [string, number][], t: T) => units.map(([u, q]) => `${fmt(q)} ${unitLabel(t, u)}`).join(' · ');
