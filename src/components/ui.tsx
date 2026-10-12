import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ButtonHTMLAttributes,
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';
import { useT } from '../i18n';
import { cx, isMobile } from '../lib/dom';
import type { MenuItem } from '../lib/rows';
import { CloseIcon } from './icons';

/* ===== Tugma ===== */
const BTN_VARIANTS = {
  default: 'border-line-2 bg-surface hover:border-muted hover:bg-surface-2',
  primary: 'border-ink bg-ink text-on-ink hover:opacity-90',
  danger: 'border-line-2 bg-surface hover:border-neg hover:text-neg',
};

export function Button({ variant = 'default', className, ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: keyof typeof BTN_VARIANTS }) {
  return (
    <button
      type="button"
      className={cx(
        'inline-flex h-10 items-center justify-center gap-1.5 whitespace-nowrap rounded-lg border px-3 text-sm desk:h-9',
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent',
        BTN_VARIANTS[variant],
        className,
      )}
      {...props}
    />
  );
}

/* ===== Popover: kompyuterda tugma ostida, telefonda pastdan chiqadi (menyu ham, oynalar ham — DRY) ===== */
export type Anchor = Element | { x: number; y: number };

export function Popover({ anchor, onClose, closeOnScroll, className, children }: {
  anchor: Anchor;
  onClose: () => void;
  closeOnScroll?: boolean;
  className?: string;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [sheet] = useState(isMobile);
  const [pos, setPos] = useState<{ left: number; top: number }>();

  useLayoutEffect(() => {
    if (sheet) {
      (document.activeElement as HTMLElement | null)?.blur(); // telefonda klaviatura yopilsin
      return;
    }
    const el = ref.current!;
    const b = anchor instanceof Element ? anchor.getBoundingClientRect() : { left: anchor.x, right: anchor.x, top: anchor.y, bottom: anchor.y };
    let top = b.bottom + 6;
    if (top + el.offsetHeight > innerHeight - 8) top = Math.max(8, b.top - el.offsetHeight - 6);
    setPos({ left: Math.max(8, Math.min(b.right - el.offsetWidth, innerWidth - el.offsetWidth - 8)), top });
  }, [anchor, sheet]);

  useEffect(() => {
    const inside = (e: Event) => ref.current?.contains(e.target as Node) || (anchor instanceof Element && anchor.contains(e.target as Node));
    const onDown = (e: PointerEvent) => !inside(e) && onClose();
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    const width = innerWidth;
    const onResize = () => innerWidth !== width && onClose(); // telefonda klaviatura ochilsa yopilmasin
    const onScroll = (e: Event) => closeOnScroll && !sheet && !inside(e) && onClose();
    document.addEventListener('pointerdown', onDown);
    document.addEventListener('keydown', onKey);
    document.addEventListener('scroll', onScroll, true);
    addEventListener('resize', onResize);
    return () => {
      document.removeEventListener('pointerdown', onDown);
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('scroll', onScroll, true);
      removeEventListener('resize', onResize);
    };
  }, [anchor, onClose, closeOnScroll, sheet]);

  return createPortal(
    <>
      {sheet && <div className="fixed inset-0 z-40 bg-black/35" />}
      <div
        ref={ref}
        data-sheet={sheet}
        style={sheet ? undefined : { left: pos?.left ?? -9999, top: pos?.top ?? -9999 }}
        className={cx(
          'group fixed z-50 rounded-xl border border-line-2 bg-surface text-fg shadow-[0_12px_36px_rgb(0_0_0/0.2)]',
          sheet && 'inset-x-2 bottom-[calc(8px+env(safe-area-inset-bottom))] max-h-[82vh] overflow-y-auto rounded-2xl',
          className,
        )}
      >
        {children}
      </div>
    </>,
    document.body,
  );
}

/** Sarlavha + yopish tugmasi bilan oyna (Дизайн, Юбориш, Расм) */
export function Panel({ title, anchor, onClose, wide, children }: { title: string; anchor: Anchor; onClose: () => void; wide?: boolean; children: ReactNode }) {
  const t = useT();
  return (
    <Popover anchor={anchor} onClose={onClose} className={cx('w-[350px] max-w-[calc(100vw-16px)] data-[sheet=true]:w-auto data-[sheet=true]:max-w-none', wide && 'desk:w-[520px]')}>
      <div className="flex items-center justify-between py-2.5 pl-4 pr-2.5">
        <b className="text-base">{title}</b>
        <button type="button" onClick={onClose} aria-label={t('close')} className="grid size-9 place-items-center rounded-lg text-muted hover:bg-surface-2 hover:text-fg">
          <CloseIcon />
        </button>
      </div>
      <div className="max-h-[min(75vh,600px)] overflow-y-auto px-4 pb-4">{children}</div>
    </Popover>
  );
}

/** Bir nechta variantdan bittasini tanlash tugmalari (Дизайн oynasida) */
export function Seg<V extends string>({ value, options, onChange }: { value: V; options: { id: V; label: string; icon?: ReactNode }[]; onChange: (v: V) => void }) {
  return (
    <div className="grid auto-cols-fr grid-flow-col gap-1.5">
      {options.map(o => (
        <button
          key={o.id}
          type="button"
          aria-pressed={value === o.id}
          onClick={() => onChange(o.id)}
          className={cx(
            'flex min-h-14 min-w-0 flex-col items-center justify-center gap-1.5 rounded-xl border px-1 py-2',
            options.length > 4 ? 'text-[11.5px]' : 'text-[13px]', // 5 ta rang tugmasi tor — yozuv kichikroq
            value === o.id ? 'border-accent bg-accent-soft font-bold text-accent-ink ring-1 ring-accent ring-inset' : 'border-line-2 bg-surface hover:border-muted',
          )}
        >
          {o.icon}
          {o.label}
        </button>
      ))}
    </div>
  );
}

/* ===== Menyu va xabar (toast) — butun ilova uchun bitta ===== */
type MenuState = { items: MenuItem[]; title?: string; anchor: Anchor; onPick: (id: string) => void };
type ToastState = { msg: string; action?: { label: string; run: () => void }; key: number };

const UICtx = createContext<{
  openMenu: (m: MenuState) => void;
  toast: (msg: string, action?: ToastState['action']) => void;
}>({ openMenu: () => {}, toast: () => {} });

export const useUI = () => useContext(UICtx);

export function UIProvider({ children }: { children: ReactNode }) {
  const [menu, setMenu] = useState<MenuState | null>(null);
  const [toast, setToast] = useState<ToastState | null>(null);
  const closeMenu = useCallback(() => setMenu(null), []);
  const openMenu = useCallback((m: MenuState) => setMenu(cur => (cur && cur.anchor === m.anchor ? null : m)), []);
  const showToast = useCallback((msg: string, action?: ToastState['action']) => setToast({ msg, action, key: Date.now() }), []);

  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(null), toast.action ? 7000 : 3500);
    return () => clearTimeout(id);
  }, [toast]);

  return (
    <UICtx.Provider value={{ openMenu, toast: showToast }}>
      {children}
      {menu && (
        <Popover anchor={menu.anchor} onClose={closeMenu} closeOnScroll className="min-w-[230px] p-1 data-[sheet=true]:p-1.5">
          <div role="menu" onKeyDown={menuArrows}>
            {menu.title && <div className="hidden truncate px-3 pb-2 pt-2.5 text-[13px] font-semibold text-muted group-data-[sheet=true]:block">{menu.title}</div>}
            {menu.items.map((it, i) =>
              it === '-' ? (
                <hr key={i} className="my-1 border-line" />
              ) : (
                <button
                  key={it.id}
                  type="button"
                  role="menuitem"
                  autoFocus={i === 0 && !isMobile()}
                  onClick={() => {
                    closeMenu();
                    menu.onPick(it.id);
                  }}
                  className={cx(
                    'block w-full rounded-md px-2.5 py-2 text-left text-sm hover:bg-surface-2 focus:bg-surface-2 focus:outline-none',
                    'group-data-[sheet=true]:py-3.5 group-data-[sheet=true]:text-base',
                    it.danger && 'text-neg',
                  )}
                >
                  {it.label}
                </button>
              ),
            )}
          </div>
        </Popover>
      )}
      {toast && (
        <div
          key={toast.key}
          role="status"
          className="fixed bottom-[calc(76px+env(safe-area-inset-bottom))] left-1/2 z-[60] flex max-w-[calc(100%-32px)] -translate-x-1/2 items-center gap-3.5 rounded-xl bg-ink px-3.5 py-2.5 text-sm text-on-ink shadow-xl desk:bottom-5 print:hidden"
        >
          <span>{toast.msg}</span>
          {toast.action && (
            <button
              type="button"
              className="font-bold text-accent"
              onClick={() => {
                toast.action!.run();
                setToast(null);
              }}
            >
              {toast.action.label}
            </button>
          )}
        </div>
      )}
    </UICtx.Provider>
  );
}

/** Menyuda ↑ ↓ bilan yurish */
function menuArrows(e: ReactKeyboardEvent<HTMLDivElement>) {
  if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
  e.preventDefault();
  const items = [...e.currentTarget.querySelectorAll<HTMLButtonElement>('[role=menuitem]')];
  const i = items.indexOf(document.activeElement as HTMLButtonElement);
  items[(i + (e.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length]?.focus();
}
