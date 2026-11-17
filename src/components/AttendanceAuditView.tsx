import { useMemo, useState } from 'react';
import {
  CheckCircle2,
  ClipboardList,
  Clock,
  LogIn,
  LogOut,
  MapPin,
  QrCode,
  Search,
  ShieldCheck,
} from 'lucide-react';
import { useAppState } from '../context/AppStateContext';
import {
  formatIndonesianDate,
  getHolidayForDate,
  getHolidayTypeLabel,
  SERVICE_LOCATIONS,
  TODAY_ISO,
} from '../utils/scheduleEngine';
import { LocationBadge } from './LocationBadge';

export function AttendanceAuditView() {
  const { state, dispatch, pushToast } = useAppState();
  const [activeTab, setActiveTab] = useState<'qr' | 'audit'>('qr');

  // For ASN simulator: use activeStaffId if in ASN mode, else allow picking which ASN to simulate
  const [simulatedStaffId, setSimulatedStaffId] = useState(state.activeStaffId);
  const targetStaffId =
    state.activeRole === 'ASN' ? state.activeStaffId : simulatedStaffId;

  const [inRadius, setInRadius] = useState(true);
  const [operationalNote, setOperationalNote] = useState(
    'Loket pelayanan pajak daerah beroperasi normal, verifikasi berkas wajib pajak berjalan lancar.'
  );
  const [qrScanned, setQrScanned] = useState(false);

  // Audit Log Filters
  const [auditSearch, setAuditSearch] = useState('');
  const [auditCategory, setAuditCategory] = useState<string>('ALL');

  const activeStaff = useMemo(
    () => state.staff.filter((s) => s.active),
    [state.staff]
  );

  const selectedPerson = state.staff.find((s) => s.id === targetStaffId);
  const todayAssignment = state.assignments.find(
    (a) => a.date === TODAY_ISO && a.staffId === targetStaffId
  );
  const todayRecord = state.attendance.find(
    (a) => a.date === TODAY_ISO && a.staffId === targetStaffId
  );

  const assignedLocation = todayAssignment
    ? SERVICE_LOCATIONS[todayAssignment.locationCode]
    : SERVICE_LOCATIONS.KANTOR;

  const isReadOnlyPimpinan = state.activeRole === 'PIMPINAN';
  const todayHoliday = getHolidayForDate(TODAY_ISO, state.holidays);

  const todayAttendanceRows = useMemo(() => {
    return activeStaff.map((person) => {
      const assn = state.assignments.find(
        (a) => a.date === TODAY_ISO && a.staffId === person.id
      );
      const rec = state.attendance.find(
        (a) => a.date === TODAY_ISO && a.staffId === person.id
      );
      return { person, assn, rec };
    });
  }, [activeStaff, state.assignments, state.attendance]);

  const filteredAuditLogs = useMemo(() => {
    const q = auditSearch.trim().toLowerCase();
    return state.auditLogs.filter((log) => {
      if (auditCategory !== 'ALL' && log.category !== auditCategory) {
        return false;
      }
      if (!q) return true;
      return (
        log.actorName.toLowerCase().includes(q) ||
        log.action.toLowerCase().includes(q) ||
        log.detail.toLowerCase().includes(q)
      );
    });
  }, [state.auditLogs, auditCategory, auditSearch]);

  const handleSimulatedScanAndCheckIn = () => {
    if (isReadOnlyPimpinan) return;
    if (!qrScanned) {
      setQrScanned(true);
      pushToast({
        type: 'info',
        title: `QR Loket ${assignedLocation.qrCodeId} Terbaca`,
        description:
          'Silakan klik tombol Konfirmasi Check-In untuk mencatat waktu presensi.',
      });
      return;
    }

    dispatch({
      type: 'CHECK_IN',
      staffId: targetStaffId,
      locationCode: assignedLocation.code,
      operationalNote: operationalNote.trim() || 'Pelayanan loket normal.',
      geofenceStatus: inRadius ? 'TERVERIFIKASI' : 'LUAR_RADIUS',
      distanceMeters: inRadius ? 14 : 245,
    });
    setQrScanned(false);
    pushToast({
      type: 'success',
      title: 'Check-In QR Berhasil Dicatat',
      description: `${selectedPerson?.name ?? ''} hadir di ${
        assignedLocation.name
      }.`,
    });
  };

  const handleCheckOut = () => {
    if (!todayRecord || isReadOnlyPimpinan) return;
    dispatch({
      type: 'CHECK_OUT',
      attendanceId: todayRecord.id,
      operationalNote: operationalNote.trim() || todayRecord.operationalNote,
    });
    pushToast({
      type: 'success',
      title: 'Check-Out QR Berhasil Dicatat',
      description: `Tugas pelayanan hari ini telah selesai dicatat pada Log Audit.`,
    });
  };

  return (
    <div className="space-y-6">
      {/* Header & Tabs */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">
            Absensi QR Check-In / Check-Out &amp; Audit Log
          </h1>
          <p className="mt-1 text-xs text-slate-600">
            Pencatatan kehadiran berbasis QR titik layanan dengan verifikasi
            geofencing dan jejak audit permanen Inspektorat.
          </p>
        </div>

        <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setActiveTab('qr')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap ${
              activeTab === 'qr'
                ? 'bg-blue-900 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <QrCode className="w-3.5 h-3.5" />
            <span>Simulasi Absensi QR</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('audit')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap ${
              activeTab === 'audit'
                ? 'bg-blue-900 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <ClipboardList className="w-3.5 h-3.5" />
            <span>Audit Log ({state.auditLogs.length})</span>
          </button>
        </div>
      </div>

      {todayHoliday && (
        <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 text-xs text-rose-900">
          <span className="font-bold">
            Keterangan {getHolidayTypeLabel(todayHoliday.type)}:
          </span>{' '}
          Hari ini ({formatIndonesianDate(TODAY_ISO, true)}) bertepatan dengan{' '}
          <span className="font-semibold">{todayHoliday.name}</span>. Seluruh
          loket Kantor BPPD dan MPP tidak beroperasi.
        </div>
      )}

      {activeTab === 'qr' ? (
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
          {/* Left: QR Check-in/out Simulator */}
          <div className="xl:col-span-5 bg-white border border-slate-200 rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-slate-900">
                Terminal Presensi QR Pegawai
              </h2>
              <span className="text-[11px] font-mono text-slate-500">
                {formatIndonesianDate(TODAY_ISO)}
              </span>
            </div>

            {state.activeRole !== 'ASN' && (
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Pilih Pegawai ASN untuk Simulasi Presensi
                </label>
                <select
                  value={simulatedStaffId}
                  onChange={(e) => {
                    setSimulatedStaffId(e.target.value);
                    setQrScanned(false);
                  }}
                  className="w-full px-3 py-2 text-xs font-medium border border-slate-300 rounded-lg bg-slate-50"
                >
                  {activeStaff.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} (NIP {s.nip})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Assigned Location Info Box */}
            <div className="rounded-lg bg-slate-50 border border-slate-200 p-4 space-y-2.5">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-semibold text-slate-700">
                  Lokasi Tugas Terjadwal:
                </span>
                <LocationBadge code={assignedLocation.code} />
              </div>
              <div className="text-[11px] text-slate-600 space-y-1">
                <div className="flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span>
                    {assignedLocation.address} (Koordinat:{' '}
                    <span className="font-mono">
                      {assignedLocation.coordinates}
                    </span>
                    )
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span>Jam Operasional: {assignedLocation.operationalHours}</span>
                </div>
              </div>
            </div>

            {/* Simulated QR Code Visual */}
            <div className="border border-slate-200 rounded-xl p-4 flex flex-col sm:flex-row items-center gap-4 bg-white">
              <div className="w-28 h-28 rounded-lg border-2 border-slate-800 p-2 bg-white flex items-center justify-center shrink-0">
                {/* Deterministic crisp SVG QR matrix */}
                <svg
                  viewBox="0 0 21 21"
                  className="w-full h-full text-slate-900"
                  aria-label="QR Code Titik Layanan"
                >
                  <rect width="21" height="21" fill="white" />
                  {/* Top-left finder */}
                  <path
                    fill="currentColor"
                    d="M0,0 h7 v7 h-7 z M1,1 v5 h5 v-5 z M2,2 h3 v3 h-3 z"
                  />
                  {/* Top-right finder */}
                  <path
                    fill="currentColor"
                    d="M14,0 h7 v7 h-7 z M15,1 v5 h5 v-5 z M16,2 h3 v3 h-3 z"
                  />
                  {/* Bottom-left finder */}
                  <path
                    fill="currentColor"
                    d="M0,14 h7 v7 h-7 z M1,15 v5 h5 v-5 z M2,16 h3 v3 h-3 z"
                  />
                  {/* Data modules */}
                  <path
                    fill="currentColor"
                    d="M8,1 h2 v2 h-2 z M11,2 h2 v1 h-2 z M9,4 h3 v2 h-3 z M8,8 h5 v2 h-5 z M1,9 h4 v2 h-4 z M6,10 h2 v3 h-2 z M14,9 h3 v3 h-3 z M18,8 h3 v2 h-3 z M9,12 h2 v4 h-2 z M12,13 h4 v2 h-4 z M17,12 h3 v3 h-3 z M8,17 h3 v3 h-3 z M13,16 h2 v4 h-2 z M16,17 h4 v3 h-4 z"
                  />
                </svg>
              </div>
              <div className="space-y-2 text-center sm:text-left">
                <div className="text-xs font-mono font-bold text-slate-900">
                  {assignedLocation.qrCodeId}
                </div>
                <div className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded border bg-emerald-50 text-emerald-700 border-emerald-200">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>
                    Geofencing:{' '}
                    {inRadius
                      ? 'Terverifikasi (Radius 14m)'
                      : 'Di Luar Radius (245m)'}
                  </span>
                </div>
                <div>
                  <button
                    type="button"
                    onClick={() => setInRadius((v) => !v)}
                    className="text-[11px] font-medium text-blue-900 hover:underline"
                  >
                    {inRadius
                      ? 'Uji kondisi luar radius GPS'
                      : 'Kembalikan ke dalam radius kantor'}
                  </button>
                </div>
              </div>
            </div>

            {/* Operational Note Input */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Catatan Operasional Harian
              </label>
              <textarea
                rows={2}
                value={operationalNote}
                onChange={(e) => setOperationalNote(e.target.value)}
                disabled={isReadOnlyPimpinan}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-900/20 disabled:bg-slate-100"
                placeholder="Ringkasan aktivitas loket atau kendala sistem pajak..."
              />
            </div>

            {/* Action Buttons */}
            {isReadOnlyPimpinan ? (
              <div className="rounded-lg bg-slate-50 border border-slate-200 p-3 text-xs text-slate-600">
                Peran Pimpinan / Kabid bersifat baca saja. Beralih ke peran ASN
                atau Admin untuk menguji Check-In/Check-Out QR.
              </div>
            ) : !todayRecord ? (
              <button
                type="button"
                onClick={handleSimulatedScanAndCheckIn}
                className={`w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-semibold text-white rounded-lg transition-colors ${
                  qrScanned
                    ? 'bg-emerald-600 hover:bg-emerald-700'
                    : 'bg-blue-900 hover:bg-blue-800'
                }`}
              >
                {qrScanned ? (
                  <>
                    <LogIn className="w-4 h-4" />
                    <span>Konfirmasi Check-In Sekarang</span>
                  </>
                ) : (
                  <>
                    <QrCode className="w-4 h-4" />
                    <span>Pindai QR Lokasi &amp; Check-In</span>
                  </>
                )}
              </button>
            ) : !todayRecord.checkOutTime ? (
              <div className="space-y-2.5">
                <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-3 text-xs text-emerald-800 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>
                    Sudah Check-In pukul{' '}
                    <span className="font-mono font-bold">
                      {todayRecord.checkInTime} WIB
                    </span>{' '}
                    di {SERVICE_LOCATIONS[todayRecord.locationCode].name}.
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleCheckOut}
                  className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-semibold text-white bg-slate-800 rounded-lg hover:bg-slate-900"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Catat Check-Out Pulang</span>
                </button>
              </div>
            ) : (
              <div className="rounded-lg bg-slate-100 border border-slate-200 p-3 text-xs text-slate-700 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>
                  Presensi hari ini lengkap: Masuk{' '}
                  <span className="font-mono font-semibold">
                    {todayRecord.checkInTime}
                  </span>{' '}
                  · Pulang{' '}
                  <span className="font-mono font-semibold">
                    {todayRecord.checkOutTime}
                  </span>{' '}
                  WIB.
                </span>
              </div>
            )}
          </div>

          {/* Right: Live Today Attendance Register */}
          <div className="xl:col-span-7 bg-white border border-slate-200 rounded-xl overflow-hidden">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold text-slate-900">
                  Log Kehadiran Hari Ini ({formatIndonesianDate(TODAY_ISO)})
                </h2>
                <p className="text-xs text-slate-500">
                  Rekap waktu Check-In/Out QR dan catatan operasional petugas
                </p>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-semibold text-slate-600 uppercase">
                    <th className="py-2.5 px-4">Pegawai ASN</th>
                    <th className="py-2.5 px-4">Lokasi</th>
                    <th className="py-2.5 px-4">Masuk / Pulang</th>
                    <th className="py-2.5 px-4">Verifikasi &amp; Catatan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {todayAttendanceRows.map(({ person, assn, rec }) => (
                    <tr key={person.id} className="hover:bg-slate-50/70">
                      <td className="py-3 px-4 font-semibold text-slate-900">
                        {person.name}
                      </td>
                      <td className="py-3 px-4">
                        {assn ? (
                          <LocationBadge code={assn.locationCode} compact />
                        ) : (
                          '—'
                        )}
                      </td>
                      <td className="py-3 px-4 font-mono tabular-nums text-slate-700">
                        {rec ? (
                          <div>
                            <div>In: {rec.checkInTime}</div>
                            <div className="text-slate-500">
                              Out: {rec.checkOutTime || '—'}
                            </div>
                          </div>
                        ) : (
                          <span className="text-amber-700 font-sans">
                            Belum presensi
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        {rec ? (
                          <div>
                            <div
                              className={`text-[11px] font-semibold ${
                                rec.geofenceStatus === 'TERVERIFIKASI'
                                  ? 'text-emerald-700'
                                  : 'text-amber-700'
                              }`}
                            >
                              {rec.geofenceStatus === 'TERVERIFIKASI'
                                ? `QR Terverifikasi (${rec.distanceMeters}m)`
                                : `Luar Radius (${rec.distanceMeters}m)`}
                            </div>
                            <div className="text-[11px] text-slate-600 mt-0.5 line-clamp-2">
                              {rec.operationalNote}
                            </div>
                          </div>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        /* Audit Log Tab */
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={auditSearch}
                  onChange={(e) => setAuditSearch(e.target.value)}
                  placeholder="Cari aktor atau aktivitas..."
                  className="pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-lg w-56"
                />
              </div>
              <select
                value={auditCategory}
                onChange={(e) => setAuditCategory(e.target.value)}
                className="px-3 py-1.5 text-xs font-medium bg-slate-50 border border-slate-300 rounded-lg"
              >
                <option value="ALL">Semua Kategori</option>
                <option value="JADWAL">Perubahan Jadwal</option>
                <option value="TUKAR_JADWAL">Tukar Jadwal</option>
                <option value="ABSENSI">Absensi QR</option>
                <option value="MASTER_DATA">Master Pegawai</option>
              </select>
            </div>
            <div className="text-xs text-slate-500">
              Catatan permanen untuk pengawasan Inspektorat Daerah
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-semibold text-slate-600 uppercase">
                  <th className="py-2.5 px-4">Waktu</th>
                  <th className="py-2.5 px-4">Aktor</th>
                  <th className="py-2.5 px-4">Kategori</th>
                  <th className="py-2.5 px-4">Aktivitas &amp; Rincian</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredAuditLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/70">
                    <td className="py-3 px-4 font-mono tabular-nums text-[11px] text-slate-600 whitespace-nowrap">
                      {log.timestamp.replace('T', ' ')}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-900">
                        {log.actorName}
                      </div>
                      <div className="text-[11px] text-slate-500">
                        {log.actorRole}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 text-[11px] font-semibold rounded bg-slate-100 text-slate-700 border border-slate-200 whitespace-nowrap">
                        {log.category}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-900">
                        {log.action}
                      </div>
                      <div className="text-slate-600 mt-0.5">{log.detail}</div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
