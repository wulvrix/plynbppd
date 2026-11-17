import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowLeftRight,
  Check,
  CheckCircle2,
  Clock,
  Send,
  X,
} from 'lucide-react';
import { useAppState } from '../context/AppStateContext';
import {
  detectScheduleConflicts,
  formatIndonesianDate,
  getEffectiveWorkingDaysInMonth,
  getHolidaysInMonth,
  getHolidayTypeLabel,
  TODAY_ISO,
} from '../utils/scheduleEngine';
import { LocationBadge } from './LocationBadge';

export function ScheduleSwapView() {
  const { state, dispatch, pushToast } = useAppState();
  const [statusFilter, setStatusFilter] = useState<
    'ALL' | 'MENUNGGU' | 'DISETUJUI' | 'DITOLAK'
  >('ALL');

  const activeStaff = useMemo(
    () => state.staff.filter((s) => s.active),
    [state.staff]
  );

  const upcomingWorkingDays = useMemo(
    () =>
      getEffectiveWorkingDaysInMonth(state.selectedMonth, state.holidays).filter(
        (d) => d >= TODAY_ISO
      ),
    [state.selectedMonth, state.holidays]
  );

  const monthHolidays = useMemo(
    () => getHolidaysInMonth(state.selectedMonth, state.holidays),
    [state.selectedMonth, state.holidays]
  );

  const defaultRequesterId =
    state.activeRole === 'ASN'
      ? state.activeStaffId
      : activeStaff[0]?.id || 'asn-1';

  const [requesterId, setRequesterId] = useState(defaultRequesterId);
  const [requesterDate, setRequesterDate] = useState(
    upcomingWorkingDays[0] || '2026-11-17'
  );
  const [targetStaffId, setTargetStaffId] = useState(
    activeStaff.find((s) => s.id !== defaultRequesterId)?.id || 'asn-2'
  );
  const [targetDate, setTargetDate] = useState(
    upcomingWorkingDays[1] || upcomingWorkingDays[0] || '2026-11-18'
  );
  const [reason, setReason] = useState('');

  // Keep requesterId synced if user switches ASN profile in navbar
  React.useEffect(() => {
    if (state.activeRole === 'ASN') {
      setRequesterId(state.activeStaffId);
      if (targetStaffId === state.activeStaffId) {
        const other = activeStaff.find((s) => s.id !== state.activeStaffId);
        if (other) setTargetStaffId(other.id);
      }
    }
  }, [state.activeRole, state.activeStaffId, activeStaff, targetStaffId]);

  const effectiveRequesterId =
    state.activeRole === 'ASN' ? state.activeStaffId : requesterId;

  const canApprove =
    state.activeRole === 'ADMIN_SISTEM' || state.activeRole === 'KOORDINATOR';
  const canSubmit = state.activeRole !== 'PIMPINAN';

  const getLocationFor = (staffId: string, date: string) => {
    return (
      state.assignments.find((a) => a.staffId === staffId && a.date === date)
        ?.locationCode || 'KANTOR'
    );
  };

  const reqLoc = getLocationFor(effectiveRequesterId, requesterDate);
  const tgtLoc = getLocationFor(targetStaffId, targetDate);

  // Real-time conflict check on proposed swap
  const swapConflictCheck = useMemo(() => {
    if (!effectiveRequesterId || !targetStaffId) return [];
    const reqOnTgtDate = getLocationFor(effectiveRequesterId, targetDate);
    const tgtOnReqDate = getLocationFor(targetStaffId, requesterDate);

    const simulated = state.assignments.map((a) => {
      if (a.date === requesterDate && a.staffId === effectiveRequesterId) {
        return { ...a, locationCode: tgtOnReqDate };
      }
      if (a.date === requesterDate && a.staffId === targetStaffId) {
        return { ...a, locationCode: reqLoc };
      }
      if (a.date === targetDate && a.staffId === effectiveRequesterId) {
        return { ...a, locationCode: tgtLoc };
      }
      if (a.date === targetDate && a.staffId === targetStaffId) {
        return { ...a, locationCode: reqOnTgtDate };
      }
      return a;
    });

    return detectScheduleConflicts(
      simulated,
      state.staff,
      state.selectedMonth,
      state.holidays
    ).filter(
      (c) =>
        c.affectedStaffIds.includes(effectiveRequesterId) ||
        c.affectedStaffIds.includes(targetStaffId)
    );
  }, [
    effectiveRequesterId,
    targetStaffId,
    requesterDate,
    targetDate,
    reqLoc,
    tgtLoc,
    state.assignments,
    state.staff,
    state.selectedMonth,
    state.holidays,
  ]);

  const filteredSwaps = useMemo(() => {
    if (statusFilter === 'ALL') return state.swaps;
    return state.swaps.filter((s) => s.status === statusFilter);
  }, [state.swaps, statusFilter]);

  const handleSubmitSwap = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    if (effectiveRequesterId === targetStaffId) {
      pushToast({
        type: 'error',
        title: 'Rekan Pengganti Tidak Valid',
        description: 'Pilih rekan ASN yang berbeda untuk melakukan tukar jadwal.',
      });
      return;
    }
    if (!reason.trim()) {
      pushToast({
        type: 'error',
        title: 'Alasan Wajib Diisi',
        description: 'Cantumkan alasan dinas atau keperluan tukar jadwal.',
      });
      return;
    }

    dispatch({
      type: 'CREATE_SWAP',
      payload: {
        requesterId: effectiveRequesterId,
        requesterDate,
        requesterLocation: reqLoc,
        targetStaffId,
        targetDate,
        targetLocation: tgtLoc,
        reason: reason.trim(),
      },
    });
    setReason('');
    pushToast({
      type: 'success',
      title: 'Pengajuan Tukar Jadwal Terkirim',
      description:
        'Permohonan masuk ke antrean persetujuan Koordinator Pelayanan.',
    });
  };

  const handleReview = (swapId: string, decision: 'DISETUJUI' | 'DITOLAK') => {
    dispatch({
      type: 'REVIEW_SWAP',
      swapId,
      decision,
      reviewNote:
        decision === 'DISETUJUI'
          ? 'Disetujui dan matriks jadwal telah disesuaikan otomatis.'
          : 'Ditolak karena pertimbangan keseimbangan layanan.',
    });
    pushToast({
      type: decision === 'DISETUJUI' ? 'success' : 'info',
      title:
        decision === 'DISETUJUI'
          ? 'Tukar Jadwal Disetujui'
          : 'Tukar Jadwal Ditolak',
      description:
        decision === 'DISETUJUI'
          ? 'Matriks jadwal induk dan Audit Log telah diperbarui.'
          : 'Pemohon menerima status penolakan pada daftar pengajuan.',
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-2">
        <h1 className="text-xl font-bold text-slate-900">
          Pengajuan &amp; Persetujuan Tukar Jadwal
        </h1>
        <p className="text-xs text-slate-600">
          Alur pertukaran shift antar ASN Pengolah Data dan Informasi dengan
          persetujuan Koordinator Pelayanan dan pembaruan matriks otomatis.
        </p>
        {monthHolidays.length > 0 && (
          <div className="text-[11px] text-rose-800 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">
            Tanggal Libur Nasional &amp; Cuti Bersama dikecualikan dari opsi
            tukar shift:{' '}
            {monthHolidays
              .map(
                (h) =>
                  `${formatIndonesianDate(h.date)} (${getHolidayTypeLabel(
                    h.type
                  )}: ${h.name})`
              )
              .join('; ')}
            .
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        {/* Left: Swap Submission Form */}
        <div className="xl:col-span-5 bg-white border border-slate-200 rounded-xl p-5">
          <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <ArrowLeftRight className="w-4 h-4 text-blue-900" />
            <span>Formulir Pengajuan Tukar Jadwal</span>
          </h2>

          {!canSubmit ? (
            <div className="mt-4 rounded-lg bg-slate-50 border border-slate-200 p-4 text-xs text-slate-600">
              Mode Pimpinan / Kabid bersifat baca saja. Beralih ke peran ASN
              Pengolah Data atau Koordinator untuk mengajukan tukar jadwal.
            </div>
          ) : (
            <form onSubmit={handleSubmitSwap} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  ASN Pemohon
                </label>
                <select
                  value={effectiveRequesterId}
                  disabled={state.activeRole === 'ASN'}
                  onChange={(e) => setRequesterId(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-slate-50 disabled:opacity-80"
                >
                  {activeStaff.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Tanggal Jadwal Asal
                  </label>
                  <select
                    value={requesterDate}
                    onChange={(e) => setRequesterDate(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white"
                  >
                    {upcomingWorkingDays.map((d) => (
                      <option key={d} value={d}>
                        {formatIndonesianDate(d)}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Lokasi Terjadwal Anda
                  </label>
                  <div className="h-[34px] flex items-center">
                    <LocationBadge code={reqLoc} />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Rekan ASN Pengganti
                </label>
                <select
                  value={targetStaffId}
                  onChange={(e) => setTargetStaffId(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white"
                >
                  {activeStaff
                    .filter((s) => s.id !== effectiveRequesterId)
                    .map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Tanggal Jadwal Rekan
                  </label>
                  <select
                    value={targetDate}
                    onChange={(e) => setTargetDate(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white"
                  >
                    {upcomingWorkingDays.map((d) => (
                      <option key={d} value={d}>
                        {formatIndonesianDate(d)}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Lokasi Rekan
                  </label>
                  <div className="h-[34px] flex items-center">
                    <LocationBadge code={tgtLoc} />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Alasan Pertukaran Jadwal
                </label>
                <textarea
                  rows={3}
                  required
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Contoh: Menghadiri rapat koordinasi teknis PBB-P2 / keperluan kedinasan..."
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-900/20"
                />
              </div>

              {/* Conflict Preview */}
              {swapConflictCheck.length > 0 ? (
                <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 text-[11px] text-amber-900 flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <div className="font-semibold">
                      Catatan Validasi ({swapConflictCheck.length} temuan):
                    </div>
                    <div className="mt-0.5">
                      {swapConflictCheck[0].title} —{' '}
                      {swapConflictCheck[0].description}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-3 text-[11px] text-emerald-800 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>
                    Pertukaran ini menjaga kuota harian tetap seimbang dan
                    bebas bentrok.
                  </span>
                </div>
              )}

              <button
                type="submit"
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-semibold text-white bg-blue-900 rounded-lg hover:bg-blue-800"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Ajukan Tukar Jadwal</span>
              </button>
            </form>
          )}
        </div>

        {/* Right: Approval Queue */}
        <div className="xl:col-span-7 bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="p-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-bold text-slate-900">
                Antrean Persetujuan Tukar Jadwal ({filteredSwaps.length})
              </h2>
              <p className="text-xs text-slate-500">
                Persetujuan otomatis memperbarui matriks jadwal &amp; log audit
              </p>
            </div>

            <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
              {(
                [
                  { id: 'ALL', label: 'Semua' },
                  { id: 'MENUNGGU', label: 'Menunggu' },
                  { id: 'DISETUJUI', label: 'Disetujui' },
                  { id: 'DITOLAK', label: 'Ditolak' },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setStatusFilter(tab.id)}
                  className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
                    statusFilter === tab.id
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          <div className="divide-y divide-slate-200">
            {filteredSwaps.length === 0 ? (
              <div className="p-10 text-center text-xs text-slate-500">
                Tidak ada permohonan tukar jadwal pada filter ini.
              </div>
            ) : (
              filteredSwaps.map((swp) => {
                const req = state.staff.find((s) => s.id === swp.requesterId);
                const tgt = state.staff.find((s) => s.id === swp.targetStaffId);
                return (
                  <div key={swp.id} className="p-4 space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2 text-xs">
                        <span className="font-mono font-bold text-slate-500">
                          #{swp.id.toUpperCase()}
                        </span>
                        <span className="text-slate-300">·</span>
                        <span className="text-slate-500">
                          Diajukan {swp.createdAt.split('T')[0]}
                        </span>
                      </div>

                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[11px] font-semibold border ${
                          swp.status === 'MENUNGGU'
                            ? 'bg-amber-50 text-amber-800 border-amber-200'
                            : swp.status === 'DISETUJUI'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : 'bg-rose-50 text-rose-700 border-rose-200'
                        }`}
                      >
                        {swp.status === 'MENUNGGU' && (
                          <Clock className="w-3 h-3" />
                        )}
                        {swp.status === 'DISETUJUI' && (
                          <Check className="w-3 h-3" />
                        )}
                        {swp.status === 'DITOLAK' && <X className="w-3 h-3" />}
                        <span>
                          {swp.status === 'MENUNGGU'
                            ? 'Menunggu Persetujuan'
                            : swp.status === 'DISETUJUI'
                            ? 'Disetujui'
                            : 'Ditolak'}
                        </span>
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-50 border border-slate-200 rounded-lg p-3 text-xs">
                      <div>
                        <div className="text-[11px] text-slate-500">
                          Pemohon
                        </div>
                        <div className="font-semibold text-slate-900 mt-0.5">
                          {req?.name}
                        </div>
                        <div className="mt-1 flex items-center gap-2">
                          <span className="text-slate-600">
                            {formatIndonesianDate(swp.requesterDate)}
                          </span>
                          <LocationBadge
                            code={swp.requesterLocation}
                            compact
                          />
                        </div>
                      </div>

                      <div>
                        <div className="text-[11px] text-slate-500">
                          Bertukar Dengan
                        </div>
                        <div className="font-semibold text-slate-900 mt-0.5">
                          {tgt?.name}
                        </div>
                        <div className="mt-1 flex items-center gap-2">
                          <span className="text-slate-600">
                            {formatIndonesianDate(swp.targetDate)}
                          </span>
                          <LocationBadge code={swp.targetLocation} compact />
                        </div>
                      </div>
                    </div>

                    <div className="text-xs text-slate-700">
                      <span className="font-semibold text-slate-800">
                        Alasan:
                      </span>{' '}
                      {swp.reason}
                    </div>

                    {swp.reviewNote && (
                      <div className="text-[11px] text-slate-500">
                        Catatan {swp.reviewedBy}: {swp.reviewNote}
                      </div>
                    )}

                    {swp.status === 'MENUNGGU' && canApprove && (
                      <div className="flex items-center justify-end gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => handleReview(swp.id, 'DITOLAK')}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-rose-700 bg-rose-50 border border-rose-200 rounded-lg hover:bg-rose-100"
                        >
                          <X className="w-3.5 h-3.5" />
                          <span>Tolak</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleReview(swp.id, 'DISETUJUI')}
                          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-emerald-600 rounded-lg hover:bg-emerald-700"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>Setujui &amp; Perbarui Jadwal</span>
                        </button>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
