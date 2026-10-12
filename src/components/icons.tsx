import type { ReactNode, SVGProps } from 'react';

/** Barcha ikonlar bitta qolipdan (24×24, chiziqli) */
const icon = (paths: ReactNode, filled = false) =>
  function Icon({ size = 16, ...props }: SVGProps<SVGSVGElement> & { size?: number }) {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill={filled ? 'currentColor' : 'none'}
        stroke={filled ? 'none' : 'currentColor'}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
        {...props}
      >
        {paths}
      </svg>
    );
  };

export const BoltIcon = icon(<path d="M13 2 4.5 13.5H11L10 22l8.5-11.5H12L13 2z" />, true);
export const UploadIcon = icon(<><path d="M4 14v5a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-5" /><path d="M12 15V3" /><path d="m7 8 5-5 5 5" /></>);
export const DownloadIcon = icon(<><path d="M4 14v5a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-5" /><path d="M12 3v12" /><path d="m7 10 5 5 5-5" /></>);
export const PrintIcon = icon(<><path d="M6 9V3h12v6" /><rect x="3" y="9" width="18" height="8" rx="1" /><path d="M6 14h12v7H6z" /></>);
export const SendIcon = icon(<><path d="M22 2 11 13" /><path d="M22 2 15 22l-4-9-9-4 20-7z" /></>);
export const PaletteIcon = icon(
  <>
    <path d="M12 3a9 9 0 1 0 0 18c1.1 0 1.7-.8 1.7-1.7 0-.5-.2-.9-.5-1.2-.3-.3-.5-.7-.5-1.2 0-.9.8-1.7 1.7-1.7H16a5 5 0 0 0 5-5c0-4.4-4-8.2-9-8.2z" />
    <circle cx="7.5" cy="11.5" r="1" fill="currentColor" />
    <circle cx="10.5" cy="7.5" r="1" fill="currentColor" />
    <circle cx="15.5" cy="8" r="1" fill="currentColor" />
  </>,
);
export const DotsIcon = icon(<><circle cx="5" cy="12" r="1.8" /><circle cx="12" cy="12" r="1.8" /><circle cx="19" cy="12" r="1.8" /></>, true);
export const CloseIcon = icon(<path d="M6 6l12 12M18 6 6 18" />);
export const SunIcon = icon(<><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></>);
export const MoonIcon = icon(<path d="M21 12.8A9 9 0 1 1 11.2 3 7 7 0 0 0 21 12.8z" />);
export const AutoIcon = icon(<><circle cx="12" cy="12" r="9" /><path d="M12 3a9 9 0 0 1 0 18z" fill="currentColor" /></>);
