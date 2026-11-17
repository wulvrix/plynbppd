import { useMemo, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Play,
  ShieldAlert,
  ShieldCheck,
  Trash2,
  Wrench,
} from 'lucide-react';
import { useAppState } from '../context/AppStateContext';
import { LocationCode } from '../types/sijadpajak';
import {
  detectScheduleConflicts,
  formatIndonesianDate,
  formatMonthTitle,
  getHolidayForDate,
  getHolidayTypeLabel,
  getWorkingDaysInMonth,
  SERVICE_LOCATIONS,
  TODAY_ISO,
} from '../utils/scheduleEngine';
import { LocationBadge } from './LocationBadge';

export function ConflictEngineView() {
  const { state, dispatch, pushToast } = useAppState();
  const [filterSeverity, setFilterSeverity] = useState<
    'ALL' | 'BLOCKING' | 'WARNING'
  >('ALL');

  // Interactive Validation Sandbox
  const workingDays = useMemo(
    () => getWorkingDaysInMonth(state.selectedMonth),
    [state.selectedMonth]
  );
  const activeStaff = useMemo(
    () => state.staff.filter((s) => s.active),
    [state.staff]
  );

  const [testDate, setTestDate] = useState(workingDays[0] || TODAY_ISO);
  const [testStaffId, setTestStaffId] = useState(activeStaff[0]?.id || 'asn-1');
  const [testLocation, setTestLocation] = useState<LocationCode>('L');
  const [testMode, setTestMode] = useState<'REPLACE' | 'DOUBLE'>('REPLACE');

  const canModify =
    state.activeRole === 'ADMIN_SISTEM' || state.activeRole === 'KOORDINATOR';

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

  const filteredConflicts = useMemo(() => {
    if (filterSeverity === 'ALL') return conflicts;
    return conflicts.filter((c) => c.severity === filterSeverity);
  }, [conflicts, filterSeverity]);

  const blockingCount = conflicts.filter((c) => c.severity === 'BLOCKING').length;
  const warningCount = conflicts.filter((c) => c.severity === 'WARNING').length;

  // Live sandbox check
  const sandboxResult = useMemo(() => {
    const simulated =
      testMode === 'DOUBLE'
        ? [
            ...state.assignments,
            {
              id: 'sandbox-test',
              date: testDate,
              staffId: testStaffId,
              locationCode: testLocation,
              session: 'PAGI_SORE' as const,
              updatedAt: TODAY_ISO,
              updatedBy: 'Simulasi',
            },
          ]
        : [
            ...state.assignments.filter(
              (a) => !(a.date === testDate && a.staffId === testStaffId)
            ),
            {
              id: 'sandbox-test',
              date: testDate,
              staffId: testStaffId,
              locationCode: testLocation,
              session: 'PAGI_SORE' as const,
              updatedAt: TODAY_ISO,
              updatedBy: 'Simulasi',
            },
          ];

    return detectScheduleConflicts(
      simulated,
      state.staff,
      state.selectedMonth,
      state.holidays
    ).filter(
      (c) => c.date === testDate || c.affectedStaffIds.includes(testStaffId)
    );
  }, [
    testDate,
    testStaffId,
    testLocation,
    testMode,
    state.assignments,
    state.staff,
    state.selectedMonth,
    state.holidays,
  ]);

  const handleResolveQuotaOrDouble = (conflictId: string) => {
    const conflict = conflicts.find((c) => c.id === conflictId);
    if (!conflict || !canModify) return;

    if (conflict.rule === 'HOLIDAY_CONFLICT') {
      const holidayAssns = state.assignments.filter(
        (a) => a.date === conflict.date
      );
      holidayAssns.forEach((a) =>
        dispatch({ type: 'DELETE_ASSIGNMENT', assignmentId: a.id })
      );
      pushToast({
        type: 'success',
        title: 'Jadwal Hari Libur / Cuti Dibersihkan',
        description: `Penugasan pada ${formatIndonesianDate(
          conflict.date
        )} telah dihapus.`,
      });
      return;
    }

    if (conflict.rule === 'DOUBLE_BOOKING') {
      const staffId = conflict.affectedStaffIds[0];
      const duplicates = state.assignments.filter(
        (a) => a.date === conflict.date && a.staffId === staffId
      );
      if (duplicates.length > 1) {
        dispatch({
          type: 'DELETE_ASSIGNMENT',
          assignmentId: duplicates[duplicates.length - 1].id,
        });
        pushToast({
          type: 'success',
          title: 'Jadwal Ganda Dibersihkan',
          description: `Entri duplikat pada ${formatIndonesianDate(
            conflict.date
          )} telah dihapus.`,
        });
      }
      return;
    }

    if (conflict.rule === 'QUOTA_EXCEEDED' && conflict.locationCode === 'KANTOR') {
      // Move 1 excess staff from KANTOR to S (if S < 1) or L (if L < 2)
      const dayAssns = state.assignments.filter((a) => a.date === conflict.date);
      const kantorStaff = dayAssns.filter((a) => a.locationCode === 'KANTOR');
      const lCount = dayAssns.filter((a) => a.locationCode === 'L').length;
      const sCount = dayAssns.filter((a) => a.locationCode === 'S').length;

      const targetLoc: LocationCode | null =
        sCount < SERVICE_LOCATIONS.S.dailyQuota
          ? 'S'
          : lCount < SERVICE_LOCATIONS.L.dailyQuota
          ? 'L'
          : null;

      if (targetLoc && kantorStaff.length > 0) {
        const candidate = kantorStaff[kantorStaff.length - 1];
        dispatch({
          type: 'UPSERT_ASSIGNMENT',
          assignment: {
            id: candidate.id,
            date: candidate.date,
            staffId: candidate.staffId,
            locationCode: targetLoc,
            session: candidate.session,
            notes: 'Penyesuaian otomatis kuota harian',
          },
        });
        pushToast({
          type: 'success',
          title: 'Kuota Harian Diseimbangkan',
          description: `1 petugas dipindahkan dari Kantor Utama BPPD ke ${SERVICE_LOCATIONS[targetLoc].name}.`,
        });
        return;
      }
    }

    // Fallback: re-balance month cleanly
    dispatch({
      type: 'AUTO_ROTATE_MONTH',
      month: state.selectedMonth,
      preserveLocked: false,
    });
    pushToast({
      type: 'success',
      title: 'Rotasi Bulan Diselaraskan',
      description: `Seluruh jadwal ${formatMonthTitle(
        state.selectedMonth
      )} telah disesuaikan dengan batas kuota harian.`,
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">
            Mesin Deteksi Konflik Jadwal Real-Time
          </h1>
          <p className="mt-1 text-xs text-slate-600">
            Validasi otomatis terhadap jadwal ganda, hari buka MPP Sukodono
            (khusus Selasa &amp; Kamis, 1 petugas), MPP Lingkar Timur (Senin–Jumat,
            1 petugas), sisanya di Kantor, serta anti-rotasi MPP berturut-turut
            untuk periode {formatMonthTitle(state.selectedMonth)}.
          </p>
        </div>

        {canModify && conflicts.length > 0 && (
          <button
            type="button"
            onClick={() => {
              dispatch({
                type: 'AUTO_ROTATE_MONTH',
                month: state.selectedMonth,
                preserveLocked: false,
              });
              pushToast({
                type: 'success',
                title: 'Seluruh Konflik Diselesaikan Otomatis',
                description:
                  'Matriks jadwal disusun ulang sesuai kuota harian dan pemerataan rotasi MPP.',
              });
            }}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-blue-900 rounded-lg hover:bg-blue-800 whitespace-nowrap self-start lg:self-auto"
          >
            <Wrench className="w-3.5 h-3.5" />
            <span>Selesaikan Semua via Auto-Rotasi</span>
          </button>
        )}
      </div>

      {/* Rule Summary Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <div className="text-xs font-semibold text-slate-500">
            Total Konflik Terdeteksi
          </div>
          <div className="mt-1.5 text-2xl font-bold font-mono tabular-nums text-slate-900">
            {conflicts.length}
          </div>
          <div className="mt-1 text-xs text-slate-600">
            {blockingCount} Blokir Kritis · {warningCount} Peringatan Rotasi
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <div className="text-xs font-semibold text-slate-500">
            Aturan Hari &amp; Kuota Harian Aktif
          </div>
          <div className="mt-1.5 text-sm font-semibold text-slate-900 font-mono tabular-nums">
            [L] Sen–Jum: 1 · [S] Sel &amp; Kam: 1 · Sisanya Kantor
          </div>
          <div className="mt-1 text-xs text-slate-600">
            MPP Sukodono tutup pada Senin, Rabu, dan Jumat (5–6 ASN di Kantor)
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <div className="text-xs font-semibold text-slate-500">
            Aturan Keadilan Rotasi
          </div>
          <div className="mt-1.5 text-sm font-semibold text-slate-900">
            Anti-Berturut-turut MPP &amp; Anti-Ganda
          </div>
          <div className="mt-1 text-xs text-slate-600">
            Mencegah penugasan MPP 2 hari berurutan pada ASN yang sama
          </div>
        </div>
      </div>

      {/* Split Layout: Detected Conflict List + Interactive Simulator */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        {/* Conflict Findings List */}
        <div className="xl:col-span-7 bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="p-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-sm font-bold text-slate-900">
              Daftar Temuan Validasi ({filteredConflicts.length})
            </h2>
            <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
              {(
                [
                  { id: 'ALL', label: `Semua (${conflicts.length})` },
                  { id: 'BLOCKING', label: `Blokir (${blockingCount})` },
                  { id: 'WARNING', label: `Peringatan (${warningCount})` },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setFilterSeverity(tab.id)}
                  className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
                    filterSeverity === tab.id
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {filteredConflicts.length === 0 ? (
            <div className="p-10 text-center">
              <ShieldCheck className="w-10 h-10 text-emerald-600 mx-auto" />
              <div className="mt-3 text-sm font-bold text-slate-900">
                Tidak Ada Konflik Jadwal
              </div>
              <p className="mt-1 text-xs text-slate-500 max-w-md mx-auto">
                Seluruh penugasan ASN pada periode{' '}
                {formatMonthTitle(state.selectedMonth)} memenuhi kuota lokasi
                dan aturan pemerataan rotasi.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-200">
              {filteredConflicts.map((item) => (
                <div key={item.id} className="p-4 space-y-2">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="flex items-start gap-2.5">
                      {item.severity === 'BLOCKING' ? (
                        <ShieldAlert className="w-4 h-4 text-rose-600 mt-0.5 shrink-0" />
                      ) : (
                        <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
                      )}
                      <div>
                        <div className="text-xs font-bold text-slate-900">
                          {item.title}
                        </div>
                        <div className="text-[11px] text-slate-500 mt-0.5">
                          {formatIndonesianDate(item.date, true)} · Kode Aturan:{' '}
                          <span className="font-mono">{item.rule}</span>
                        </div>
                      </div>
                    </div>

                    <span
                      className={`px-2 py-0.5 text-[11px] font-semibold rounded border ${
                        item.severity === 'BLOCKING'
                          ? 'bg-rose-50 text-rose-700 border-rose-200'
                          : 'bg-amber-50 text-amber-800 border-amber-200'
                      }`}
                    >
                      {item.severity === 'BLOCKING'
                        ? 'Pelanggaran Kuota/Ganda'
                        : 'Peringatan Rotasi'}
                    </span>
                  </div>

                  <p className="text-xs text-slate-700 leading-relaxed pl-6">
                    {item.description}
                  </p>

                  <div className="pl-6 flex flex-wrap items-center justify-between gap-2 pt-1">
                    <span className="text-[11px] text-slate-500">
                      Rekomendasi: {item.suggestion}
                    </span>

                    {canModify && (
                      <button
                        type="button"
                        onClick={() => handleResolveQuotaOrDouble(item.id)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-semibold text-blue-900 bg-blue-50 border border-blue-200 rounded-md hover:bg-blue-100 whitespace-nowrap"
                      >
                        {item.rule === 'DOUBLE_BOOKING' ? (
                          <Trash2 className="w-3 h-3" />
                        ) : (
                          <Wrench className="w-3 h-3" />
                        )}
                        <span>Perbaiki Otomatis</span>
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Interactive Validation Testbench */}
        <div className="xl:col-span-5 bg-white border border-slate-200 rounded-xl p-5 space-y-4">
          <div>
            <h2 className="text-sm font-bold text-slate-900">
              Simulasi Uji Validasi Jadwal
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Uji rencana penugasan sebelum disimpan ke matriks induk.
            </p>
          </div>

          <div className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Tanggal Kerja
              </label>
              <select
                value={testDate}
                onChange={(e) => setTestDate(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-slate-50"
              >
                {workingDays.map((d) => {
                  const h = getHolidayForDate(d, state.holidays);
                  return (
                    <option key={d} value={d}>
                      {formatIndonesianDate(d, true)}
                      {h ? ` [${getHolidayTypeLabel(h.type)}: ${h.name}]` : ''}
                    </option>
                  );
                })}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Pegawai ASN
              </label>
              <select
                value={testStaffId}
                onChange={(e) => setTestStaffId(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-slate-50"
              >
                {activeStaff.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Target Lokasi
                </label>
                <select
                  value={testLocation}
                  onChange={(e) =>
                    setTestLocation(e.target.value as LocationCode)
                  }
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-slate-50"
                >
                  <option value="KANTOR">Kantor Utama BPPD</option>
                  <option value="L">MPP Lingkar Timur [L]</option>
                  <option value="S">MPP Sukodono [S]</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Mode Simulasi
                </label>
                <select
                  value={testMode}
                  onChange={(e) =>
                    setTestMode(e.target.value as 'REPLACE' | 'DOUBLE')
                  }
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-slate-50"
                >
                  <option value="REPLACE">Pindah Lokasi</option>
                  <option value="DOUBLE">Tambah Shift Ganda</option>
                </select>
              </div>
            </div>
          </div>

          <div className="pt-2 border-t border-slate-200">
            <div className="text-xs font-semibold text-slate-700 mb-2 flex items-center justify-between">
              <span>Hasil Analisis Mesin Deteksi:</span>
              <LocationBadge code={testLocation} compact />
            </div>

            {sandboxResult.length === 0 ? (
              <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-3 flex items-start gap-2 text-xs text-emerald-800">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
                <span>
                  Penugasan simulasi dinyatakan valid dan aman diterapkan tanpa
                  bentrok kuota maupun rotasi.
                </span>
              </div>
            ) : (
              <div className="space-y-2">
                {sandboxResult.map((res) => (
                  <div
                    key={res.id}
                    className={`rounded-lg border p-3 text-xs ${
                      res.severity === 'BLOCKING'
                        ? 'bg-rose-50 border-rose-200 text-rose-900'
                        : 'bg-amber-50 border-amber-200 text-amber-900'
                    }`}
                  >
                    <div className="font-bold">{res.title}</div>
                    <div className="mt-0.5 text-[11px] opacity-90">
                      {res.description}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {canModify && (
              <button
                type="button"
                disabled={sandboxResult.some((r) => r.severity === 'BLOCKING')}
                onClick={() => {
                  dispatch({
                    type: 'UPSERT_ASSIGNMENT',
                    assignment: {
                      date: testDate,
                      staffId: testStaffId,
                      locationCode: testLocation,
                      session: 'PAGI_SORE',
                    },
                    replaceExistingOnDate: testMode === 'REPLACE',
                  });
                  pushToast({
                    type: 'success',
                    title: 'Penugasan Simulasi Diterapkan',
                    description: `Jadwal pada ${formatIndonesianDate(
                      testDate
                    )} diperbarui.`,
                  });
                }}
                className="mt-3 w-full inline-flex items-center justify-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-blue-900 rounded-lg hover:bg-blue-800 disabled:bg-slate-300 disabled:cursor-not-allowed"
              >
                <Play className="w-3.5 h-3.5" />
                <span>Terapkan Penugasan Simulasi</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
