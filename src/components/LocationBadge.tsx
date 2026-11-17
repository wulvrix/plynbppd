import { LocationCode } from '../types/sijadpajak';
import { SERVICE_LOCATIONS } from '../utils/scheduleEngine';

interface LocationBadgeProps {
  code: LocationCode;
  compact?: boolean;
}

export function LocationBadge({ code, compact = false }: LocationBadgeProps) {
  const info = SERVICE_LOCATIONS[code];

  const styles: Record<LocationCode, string> = {
    KANTOR: 'bg-slate-100 text-slate-700 border-slate-300',
    L: 'bg-sky-50 text-sky-700 border-sky-300',
    S: 'bg-emerald-50 text-emerald-700 border-emerald-300',
  };

  if (compact) {
    return (
      <span
        title={info.name}
        className={`inline-flex items-center justify-center rounded px-2 py-0.5 text-[11px] font-semibold tracking-tight border whitespace-nowrap ${styles[code]}`}
      >
        {code === 'KANTOR' ? 'KTR' : `[${code}]`}
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-semibold border whitespace-nowrap ${styles[code]}`}
    >
      <span>{code === 'KANTOR' ? 'Kantor BPPD' : `[${code}] ${info.name}`}</span>
    </span>
  );
}
