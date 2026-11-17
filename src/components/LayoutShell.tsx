import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowLeftRight,
  Building2,
  CalendarDays,
  CheckCircle2,
  Database,
  FileSpreadsheet,
  LayoutDashboard,
  LogOut,
  Menu,
  QrCode,
  RotateCcw,
  ShieldCheck,
  UserCheck,
  X,
} from 'lucide-react';
import { useAppState } from '../context/AppStateContext';
import { ActiveModule, UserRole } from '../types/sijadpajak';
import {
  detectScheduleConflicts,
  formatIndonesianDate,
  getHolidayForDate,
  getHolidayTypeLabel,
  TODAY_ISO,
} from '../utils/scheduleEngine';

const ROLE_OPTIONS: Array<{
  role: UserRole;
  label: string;
  shortDesc: string;
}> = [
  {
    role: 'ADMIN_SISTEM',
    label: 'Admin Sistem',
    shortDesc: 'Akses penuh jadwal, pegawai & sistem',
  },
  {
    role: 'KOORDINATOR',
    label: 'Koordinator Pelayanan',
    shortDesc: 'Kelola rotasi, konflik & setujui tukar jadwal',
  },
  {
    role: 'ASN',
    label: 'ASN Pengolah Data',
    shortDesc: 'Lihat jadwal, absensi QR & ajukan tukar',
  },
  {
    role: 'PIMPINAN',
    label: 'Pimpinan / Kabid',
    shortDesc: 'Pantauan eksekutif & analitik (Baca Saja)',
  },
];

const NAV_ITEMS: Array<{
  id: ActiveModule;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}> = [
  { id: 'dashboard', label: 'Dashboard Eksekutif', icon: LayoutDashboard },
  { id: 'schedule', label: 'Matriks & Kalender', icon: CalendarDays },
  { id: 'conflicts', label: 'Deteksi Konflik', icon: AlertTriangle },
  { id: 'attendance', label: 'Absensi QR & Audit', icon: QrCode },
  { id: 'swaps', label: 'Tukar Jadwal', icon: ArrowLeftRight },
  { id: 'reports', label: 'Laporan & Export', icon: FileSpreadsheet },
];

export function LayoutShell({ children }: { children: React.ReactNode }) {
  const {
    state,
    authMode,
    authEmail,
    realtimeConnected,
    isSyncing,
    dispatch,
    logout,
    toasts,
    dismissToast,
    pushToast,
  } = useAppState();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [resetModalOpen, setResetModalOpen] = useState(false);

  const conflicts = useMemo(
    () =>
      detectScheduleConflicts(
        state.assignments,
        state.staff,
        state.selectedMonth,
        state.holidays
      ),
    [state.assignments, state.staff, state.selectedMonth, state.holidays]
  );

  const todayHoliday = useMemo(
    () => getHolidayForDate(TODAY_ISO, state.holidays),
    [state.holidays]
  );

  const pendingSwapsCount = useMemo(
    () => state.swaps.filter((s) => s.status === 'MENUNGGU').length,
    [state.swaps]
  );

  const activeNav = NAV_ITEMS.find((n) => n.id === state.activeModule);
  const currentRoleInfo = ROLE_OPTIONS.find((r) => r.role === state.activeRole);
  const activeAsn = state.staff.find((s) => s.id === state.activeStaffId);

  const handleRoleChange = (role: UserRole) => {
    dispatch({ type: 'SET_ROLE', role });
    const info = ROLE_OPTIONS.find((r) => r.role === role);
    pushToast({
      type: 'info',
      title: `Mode Peran: ${info?.label}`,
      description: info?.shortDesc,
    });
  };

  const handleConfirmReset = () => {
    dispatch({ type: 'RESET_DEMO' });
    setResetModalOpen(false);
    pushToast({
      type: 'success',
      title: 'Data Demo Dipulihkan',
      description:
        'Seluruh jadwal November 2026, data pegawai, absensi, dan log audit telah dikembalikan ke kondisi awal.',
    });
  };

  const handleLogout = async () => {
    await logout();
  };

  return (
    <div className="min-h-screen flex bg-slate-50 text-slate-900">
      {/* Sidebar Desktop */}
      <aside className="no-print hidden lg:flex lg:w-64 lg:flex-col lg:fixed lg:inset-y-0 bg-blue-950 text-white border-r border-blue-900">
        <div className="px-5 py-5 border-b border-blue-900/80">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-blue-800 border border-blue-700 flex items-center justify-center shrink-0">
              <Building2 className="w-5 h-5 text-sky-300" />
            </div>
            <div className="min-w-0">
              <div className="text-base font-bold tracking-tight text-white truncate">
                SIJADPAJAK
              </div>
              <div className="text-[11px] text-blue-200 truncate">
                BPPD Kab. Sidoarjo
              </div>
            </div>
          </div>
          <p className="mt-3 text-[11px] leading-relaxed text-blue-200/90">
            Tertib Jadwal, Optimal Layanan Pajak Daerah.
          </p>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = state.activeModule === item.id;
            const badge =
              item.id === 'conflicts' && conflicts.length > 0
                ? conflicts.length
                : item.id === 'swaps' && pendingSwapsCount > 0
                ? pendingSwapsCount
                : null;

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => dispatch({ type: 'SET_MODULE', module: item.id })}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-colors text-left ${
                  isActive
                    ? 'bg-blue-800 text-white shadow-sm'
                    : 'text-blue-100/85 hover:bg-blue-900/70 hover:text-white'
                }`}
              >
                <span className="flex items-center gap-2.5 min-w-0">
                  <Icon className="w-4 h-4 shrink-0" />
                  <span className="truncate">{item.label}</span>
                </span>
                {badge !== null && (
                  <span
                    className={`ml-2 px-1.5 py-0.5 text-[11px] font-semibold rounded tabular-nums ${
                      item.id === 'conflicts'
                        ? 'bg-amber-500/20 text-amber-200 border border-amber-400/30'
                        : 'bg-sky-500/20 text-sky-200 border border-sky-400/30'
                    }`}
                  >
                    {badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        <div className="p-4 border-t border-blue-900/80 space-y-2.5">
          <div className="rounded-lg bg-blue-900/50 border border-blue-800/80 p-3">
            <div className="flex items-center justify-between text-[11px] font-medium text-blue-200">
              <span>Sumber Data</span>
              <Database className="w-3.5 h-3.5 text-sky-300" />
            </div>
            <div className="mt-1 text-xs font-semibold text-white">
              {authMode === 'supabase'
                ? realtimeConnected
                  ? 'PostgreSQL Supabase (Live)'
                  : 'PostgreSQL Supabase'
                : 'Mode Demo Lokal'}
            </div>
            <div className="mt-1 text-[11px] text-blue-200/80 truncate">
              {authMode === 'supabase' && authEmail
                ? authEmail
                : state.activeRole === 'ASN'
                ? activeAsn?.name
                : currentRoleInfo?.label}
            </div>
          </div>

          {authMode === 'demo' && (
            <button
              type="button"
              onClick={() => setResetModalOpen(true)}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-medium text-blue-100 bg-blue-900/60 hover:bg-blue-900 border border-blue-800 transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset Data Demo</span>
            </button>
          )}

          <button
            type="button"
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-medium text-blue-100 bg-blue-950 hover:bg-blue-900 border border-blue-800 transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Keluar / Layar Login</span>
          </button>
        </div>
      </aside>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="no-print fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-slate-900/50"
            onClick={() => setMobileMenuOpen(false)}
          />
          <div className="relative w-72 max-w-[85vw] bg-blue-950 text-white flex flex-col h-full z-10">
            <div className="px-5 py-4 border-b border-blue-900 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Building2 className="w-5 h-5 text-sky-300" />
                <span className="font-bold tracking-tight">SIJADPAJAK</span>
              </div>
              <button
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                className="p-1.5 rounded-md text-blue-200 hover:bg-blue-900"
                aria-label="Tutup menu"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
              {NAV_ITEMS.map((item) => {
                const Icon = item.icon;
                const isActive = state.activeModule === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      dispatch({ type: 'SET_MODULE', module: item.id });
                      setMobileMenuOpen(false);
                    }}
                    className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium ${
                      isActive
                        ? 'bg-blue-800 text-white'
                        : 'text-blue-100 hover:bg-blue-900'
                    }`}
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </nav>
            <div className="p-4 border-t border-blue-900 space-y-2">
              {authMode === 'demo' && (
                <button
                  type="button"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    setResetModalOpen(true);
                  }}
                  className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-medium text-blue-100 bg-blue-900 border border-blue-800"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Reset Data Demo</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  void handleLogout();
                }}
                className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-medium text-blue-100 bg-blue-950 border border-blue-800"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Keluar / Layar Login</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Column */}
      <div className="flex-1 lg:pl-64 flex flex-col min-w-0">
        {/* Top Navbar */}
        <header className="no-print sticky top-0 z-30 bg-white border-b border-slate-200 px-4 sm:px-6 py-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            {/* Left: Mobile Trigger + Breadcrumb */}
            <div className="flex items-center gap-3 min-w-0">
              <button
                type="button"
                onClick={() => setMobileMenuOpen(true)}
                className="lg:hidden p-2 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50"
                aria-label="Buka navigasi"
              >
                <Menu className="w-4 h-4" />
              </button>
              <div className="min-w-0">
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <span className="font-medium text-blue-900 whitespace-nowrap">
                    BPPD Kab. Sidoarjo
                  </span>
                  <span aria-hidden="true">/</span>
                  <span className="truncate">{activeNav?.label}</span>
                  {isSyncing && (
                    <span className="text-[11px] text-sky-700 font-medium">
                      · Menyinkronkan...
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 text-sm font-semibold text-slate-900 truncate">
                  <span>{formatIndonesianDate(TODAY_ISO, true)}</span>
                  {todayHoliday && (
                    <span
                      className={`px-2 py-0.5 rounded border text-[10px] font-bold ${
                        todayHoliday.type === 'LIBUR_NASIONAL'
                          ? 'bg-rose-50 text-rose-800 border-rose-200'
                          : 'bg-amber-50 text-amber-800 border-amber-200'
                      }`}
                    >
                      {getHolidayTypeLabel(todayHoliday.type)}:{' '}
                      {todayHoliday.name}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Right: RBAC Persona Switcher (Demo) or Locked Authenticated Role (Supabase) */}
            <div className="flex flex-wrap items-center gap-2.5">
              {authMode === 'supabase' ? (
                <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-1.5 text-xs">
                  <ShieldCheck className="w-4 h-4 text-emerald-700 shrink-0" />
                  <span className="font-semibold text-emerald-900">
                    {currentRoleInfo?.label}
                  </span>
                  <span className="text-emerald-700 hidden sm:inline">
                    · RLS Aktif
                  </span>
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-2 bg-slate-100 border border-slate-200 rounded-lg px-2.5 py-1.5">
                    <ShieldCheck className="w-4 h-4 text-blue-900 shrink-0" />
                    <label
                      htmlFor="role-switcher"
                      className="text-xs font-medium text-slate-600 hidden sm:inline whitespace-nowrap"
                    >
                      Peran Demo:
                    </label>
                    <select
                      id="role-switcher"
                      value={state.activeRole}
                      onChange={(e) =>
                        handleRoleChange(e.target.value as UserRole)
                      }
                      className="bg-transparent text-xs font-semibold text-blue-900 focus:outline-none cursor-pointer pr-1"
                    >
                      {ROLE_OPTIONS.map((opt) => (
                        <option key={opt.role} value={opt.role}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {state.activeRole === 'ASN' && (
                    <div className="flex items-center gap-2 bg-sky-50 border border-sky-200 rounded-lg px-2.5 py-1.5">
                      <UserCheck className="w-4 h-4 text-sky-700 shrink-0" />
                      <select
                        aria-label="Pilih Profil ASN"
                        value={state.activeStaffId}
                        onChange={(e) =>
                          dispatch({
                            type: 'SET_ACTIVE_STAFF',
                            staffId: e.target.value,
                          })
                        }
                        className="bg-transparent text-xs font-semibold text-sky-900 focus:outline-none cursor-pointer max-w-[180px]"
                      >
                        {state.staff
                          .filter((s) => s.active)
                          .map((person) => (
                            <option key={person.id} value={person.id}>
                              {person.name}
                            </option>
                          ))}
                      </select>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </header>

        {/* Viewport Content */}
        <main className="flex-1 p-4 sm:p-6 max-w-[1440px] w-full mx-auto">
          {children}
        </main>
      </div>

      {/* Reset Demo Confirmation Modal */}
      {resetModalOpen && (
        <div className="no-print fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="bg-white rounded-xl border border-slate-200 max-w-md w-full p-6 shadow-xl">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-lg bg-amber-50 border border-amber-200 flex items-center justify-center shrink-0">
                <RotateCcw className="w-5 h-5 text-amber-700" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-slate-900">
                  Reset Data Simulasi SIJADPAJAK?
                </h3>
                <p className="mt-1.5 text-sm text-slate-600 leading-relaxed">
                  Tindakan ini akan mengembalikan seluruh jadwal November 2026,
                  riwayat absensi QR, pengajuan tukar jadwal, dan log audit ke
                  data awal BPPD Sidoarjo.
                </p>
              </div>
            </div>
            <div className="mt-6 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setResetModalOpen(false)}
                className="px-4 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmReset}
                className="px-4 py-2 text-xs font-semibold text-white bg-blue-900 rounded-lg hover:bg-blue-800"
              >
                Ya, Reset Data Demo
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notifications */}
      <div className="no-print fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none px-4 sm:px-0">
        {toasts.map((t) => {
          const palette =
            t.type === 'success'
              ? 'bg-emerald-950 text-white border-emerald-800'
              : t.type === 'warning'
              ? 'bg-amber-950 text-white border-amber-800'
              : t.type === 'error'
              ? 'bg-rose-950 text-white border-rose-800'
              : 'bg-blue-950 text-white border-blue-800';

          return (
            <div
              key={t.id}
              className={`pointer-events-auto rounded-lg border p-3.5 shadow-lg flex items-start justify-between gap-3 ${palette}`}
            >
              <div className="flex items-start gap-2.5 min-w-0">
                <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0 opacity-90" />
                <div className="min-w-0">
                  <div className="text-xs font-semibold">{t.title}</div>
                  {t.description && (
                    <div className="mt-0.5 text-[11px] opacity-85 leading-snug">
                      {t.description}
                    </div>
                  )}
                </div>
              </div>
              <button
                type="button"
                onClick={() => dismissToast(t.id)}
                className="p-0.5 rounded opacity-75 hover:opacity-100"
                aria-label="Tutup notifikasi"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
