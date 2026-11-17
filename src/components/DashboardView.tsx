import { useMemo } from 'react';
import {
  AlertTriangle,
  ArrowLeftRight,
  ArrowRight,
  CalendarDays,
  CalendarOff,
  CheckCircle2,
  Clock,
  MapPin,
  QrCode,
  ShieldAlert,
  TrendingUp,
  Users,
} from 'lucide-react';
import { useAppState } from '../context/AppStateContext';
import { LocationCode } from '../types/sijadpajak';
import {
  detectScheduleConflicts,
  formatIndonesianDate,
  formatMonthTitle,
  getDailyLocationQuota,
  getHolidayForDate,
  getHolidaysInMonth,
  getHolidayTypeLabel,
  getWorkingDaysInMonth,
  isLocationOpenOnDate,
  SERVICE_LOCATIONS,
  TODAY_ISO,
} from '../utils/scheduleEngine';
import { LocationBadge } from './LocationBadge';

export function DashboardView() {
  const { state, dispatch } = useAppState();

  const activeStaff = useMemo(
    () => state.staff.filter((s) => s.active),
    [state.staff]
  );

  const todayAssignments = useMemo(
    () => state.assignments.filter((a) => a.date === TODAY_ISO),
    [state.assignments]
  );

  const todayAttendance = useMemo(
    () => state.attendance.filter((a) => a.date === TODAY_ISO),
    [state.attendance]
  );

  const todayByLoc = useMemo(() => {
    const counts: Record<LocationCode, number> = { KANTOR: 0, L: 0, S: 0 };
    todayAssignments.forEach((a) => {
      counts[a.locationCode] += 1;
    });
    return counts;
  }, [todayAssignments]);

  const checkedInByLoc = useMemo(() => {
    const counts: Record<LocationCode, number> = { KANTOR: 0, L: 0, S: 0 };
    todayAttendance.forEach((a) => {
      counts[a.locationCode] += 1;
    });
    return counts;
  }, [todayAttendance]);

  // Compliance Rate across Nov 2 .. TODAY_ISO
  const complianceStats = useMemo(() => {
    const pastAndTodayAssns = state.assignments.filter(
      (a) => a.date.startsWith('2026-11') && a.date <= TODAY_ISO
    );
    const totalExpected = pastAndTodayAssns.length;
    const totalPresent = pastAndTodayAssns.filter((assn) =>
      state.attendance.some(
        (att) => att.date === assn.date && att.staffId === assn.staffId
      )
    ).length;
    const rate = totalExpected > 0 ? (totalPresent / totalExpected) * 100 : 100;
    return {
      rate: rate.toFixed(1),
      present: totalPresent,
      expected: totalExpected,
    };
  }, [state.assignments, state.attendance]);

  const pendingSwaps = useMemo(
    () => state.swaps.filter((s) => s.status === 'MENUNGGU'),
    [state.swaps]
  );

  const monthConflicts = useMemo(
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

  const monthHolidays = useMemo(
    () => getHolidaysInMonth(state.selectedMonth, state.holidays),
    [state.selectedMonth, state.holidays]
  );

  // Workload distribution per staff in selectedMonth
  const workloadByStaff = useMemo(() => {
    const monthAssns = state.assignments.filter((a) =>
      a.date.startsWith(state.selectedMonth)
    );
    return activeStaff.map((person) => {
      const personAssns = monthAssns.filter((a) => a.staffId === person.id);
      const kantor = personAssns.filter((a) => a.locationCode === 'KANTOR').length;
      const l = personAssns.filter((a) => a.locationCode === 'L').length;
      const s = personAssns.filter((a) => a.locationCode === 'S').length;
      const total = kantor + l + s;
      return {
        person,
        kantor,
        l,
        s,
        mppTotal: l + s,
        total,
      };
    });
  }, [activeStaff, state.assignments, state.selectedMonth]);

  const maxShifts = Math.max(...workloadByStaff.map((w) => w.total), 1);

  // PRD Section 6: Anomaly Detection (late check-ins, out-of-radius geofence, missed scheduled days)
  const attendanceAnomalies = useMemo(() => {
    const items: Array<{
      id: string;
      date: string;
      staffName: string;
      type: 'TERLAMBAT' | 'LUAR_RADIUS' | 'TIDAK_HADIR';
      detail: string;
    }> = [];

    const staffMap = new Map(state.staff.map((s) => [s.id, s.name]));

    for (const att of state.attendance) {
      if (!att.date.startsWith(state.selectedMonth)) continue;
      if (att.geofenceStatus === 'LUAR_RADIUS') {
        items.push({
          id: `anom-geo-${att.id}`,
          date: att.date,
          staffName: staffMap.get(att.staffId) || att.staffId,
          type: 'LUAR_RADIUS',
          detail: `Check-in di luar radius geofence (${att.distanceMeters}m) di ${SERVICE_LOCATIONS[att.locationCode].name}.`,
        });
      }
      if (att.status === 'TERLAMBAT') {
        items.push({
          id: `anom-late-${att.id}`,
          date: att.date,
          staffName: staffMap.get(att.staffId) || att.staffId,
          type: 'TERLAMBAT',
          detail: `Check-in tercatat pukul ${att.checkInTime} WIB di ${SERVICE_LOCATIONS[att.locationCode].name}.`,
        });
      }
    }

    const pastAssns = state.assignments.filter(
      (a) => a.date.startsWith(state.selectedMonth) && a.date < TODAY_ISO
    );
    for (const assn of pastAssns) {
      const hasAtt = state.attendance.some(
        (att) => att.date === assn.date && att.staffId === assn.staffId
      );
      if (!hasAtt) {
        items.push({
          id: `anom-abs-${assn.id}`,
          date: assn.date,
          staffName: staffMap.get(assn.staffId) || assn.staffId,
          type: 'TIDAK_HADIR',
          detail: `Tidak ada catatan QR Check-in untuk jadwal di ${SERVICE_LOCATIONS[assn.locationCode].name}.`,
        });
      }
    }

    return items.sort((a, b) => b.date.localeCompare(a.date)).slice(0, 6);
  }, [state.attendance, state.assignments, state.staff, state.selectedMonth]);

  // PRD Section 6: Workforce Forecasting (upcoming 5 weekdays, including holiday/cuti bersama visibility)
  const upcomingForecast = useMemo(() => {
    const allWeekdays = Array.from(
      new Set([
        ...getWorkingDaysInMonth(state.selectedMonth),
        ...getWorkingDaysInMonth('2026-11'),
        ...getWorkingDaysInMonth('2026-12'),
      ])
    ).sort();

    const futureDates = allWeekdays
      .filter((d) => d >= TODAY_ISO && d.startsWith(state.selectedMonth))
      .slice(0, 5);

    const fallbackDates =
      futureDates.length > 0
        ? futureDates
        : allWeekdays.filter((d) => d.startsWith(state.selectedMonth)).slice(-5);

    return fallbackDates.map((date) => {
      const holiday = getHolidayForDate(date, state.holidays);
      const dayAssns = state.assignments.filter((a) => a.date === date);
      const lCount = dayAssns.filter((a) => a.locationCode === 'L').length;
      const sCount = dayAssns.filter((a) => a.locationCode === 'S').length;
      const kCount = dayAssns.filter((a) => a.locationCode === 'KANTOR').length;
      const isPeakMpp = isLocationOpenOnDate('S', date, state.holidays);
      return {
        date,
        holiday,
        lCount,
        sCount,
        kCount,
        isPeakMpp,
        note: holiday
          ? `${getHolidayTypeLabel(holiday.type)}: ${holiday.name}`
          : isPeakMpp
          ? 'Beban MPP Ganda (Lingkar Timur + Sukodono buka)'
          : 'Operasional Standar (MPP Lingkar Timur)',
      };
    });
  }, [state.assignments, state.selectedMonth, state.holidays]);

  const myTodayAssignment = useMemo(() => {
    if (state.activeRole !== 'ASN') return null;
    return todayAssignments.find((a) => a.staffId === state.activeStaffId);
  }, [state.activeRole, state.activeStaffId, todayAssignments]);

  const myTodayAttendance = useMemo(() => {
    if (state.activeRole !== 'ASN') return null;
    return todayAttendance.find((a) => a.staffId === state.activeStaffId);
  }, [state.activeRole, state.activeStaffId, todayAttendance]);

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            Dashboard Eksekutif &amp; Operasional Pelayanan
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Pemantauan penugasan ASN Pengolah Data dan Informasi pada 3 titik
            layanan BPPD Kabupaten Sidoarjo · Periode{' '}
            <span className="font-semibold text-slate-800">
              {formatMonthTitle(state.selectedMonth)}
            </span>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          {state.activeRole === 'ASN' ? (
            <button
              type="button"
              onClick={() =>
                dispatch({ type: 'SET_MODULE', module: 'attendance' })
              }
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-blue-900 rounded-lg hover:bg-blue-800 transition-colors"
            >
              <QrCode className="w-4 h-4" />
              <span>
                {myTodayAttendance
                  ? 'Lihat Status Absensi QR'
                  : 'Check-In QR Hari Ini'}
              </span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() =>
                dispatch({ type: 'SET_MODULE', module: 'schedule' })
              }
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-blue-900 rounded-lg hover:bg-blue-800 transition-colors"
            >
              <CalendarDays className="w-4 h-4" />
              <span>Buka Matriks Jadwal</span>
            </button>
          )}
        </div>
      </div>

      {/* Today or Selected Month Holiday / Collective Leave Notice */}
      {(todayHoliday || monthHolidays.length > 0) && (
        <div className="bg-white border border-rose-200 rounded-xl p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div className="flex items-start gap-3">
            <CalendarOff className="w-4 h-4 text-rose-700 mt-0.5 shrink-0" />
            <div className="space-y-1">
              <div className="text-xs font-bold text-slate-900">
                {todayHoliday
                  ? `Hari Ini Bertepatan dengan ${getHolidayTypeLabel(
                      todayHoliday.type
                    )}: ${todayHoliday.name}`
                  : `Info Libur Nasional & Cuti Bersama — ${formatMonthTitle(
                      state.selectedMonth
                    )}`}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {monthHolidays.map((h) => (
                  <span
                    key={h.date}
                    className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded border text-[11px] font-medium ${
                      h.type === 'LIBUR_NASIONAL'
                        ? 'bg-rose-50 text-rose-800 border-rose-200'
                        : 'bg-amber-50 text-amber-800 border-amber-200'
                    }`}
                  >
                    <span className="font-mono font-semibold">
                      {formatIndonesianDate(h.date)}
                    </span>
                    <span>·</span>
                    <span className="font-semibold">
                      {getHolidayTypeLabel(h.type)}:
                    </span>
                    <span>{h.name}</span>
                  </span>
                ))}
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={() =>
              dispatch({ type: 'SET_MODULE', module: 'schedule' })
            }
            className="text-xs font-semibold text-blue-900 hover:underline whitespace-nowrap self-start md:self-center"
          >
            Lihat di Matriks &amp; Kalender →
          </button>
        </div>
      )}

      {/* Role-specific ASN quick highlight */}
      {state.activeRole === 'ASN' && myTodayAssignment && (
        <div className="bg-blue-900 text-white rounded-xl p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-start gap-3">
            <MapPin className="w-5 h-5 text-sky-300 mt-0.5 shrink-0" />
            <div>
              <div className="text-xs text-blue-200">
                Lokasi Tugas Anda Hari Ini ({formatIndonesianDate(TODAY_ISO)})
              </div>
              <div className="text-base font-bold mt-0.5">
                {SERVICE_LOCATIONS[myTodayAssignment.locationCode].name}
              </div>
              <div className="text-xs text-blue-200 mt-0.5">
                Jam Layanan:{' '}
                {
                  SERVICE_LOCATIONS[myTodayAssignment.locationCode]
                    .operationalHours
                }{' '}
                · Status Presensi:{' '}
                <span className="font-semibold text-white">
                  {myTodayAttendance
                    ? `Check-In Pukul ${myTodayAttendance.checkInTime} WIB`
                    : 'Belum Check-In'}
                </span>
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={() =>
              dispatch({ type: 'SET_MODULE', module: 'attendance' })
            }
            className="px-3.5 py-2 rounded-lg bg-white text-blue-900 text-xs font-semibold hover:bg-blue-50 whitespace-nowrap self-start sm:self-center"
          >
            Ke Menu Absensi QR
          </button>
        </div>
      )}

      {/* KPI Row (4 Cards) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {/* KPI 1: Personel Aktif per Lokasi */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">
              Personel Aktif Hari Ini
            </span>
            <Users className="w-4 h-4 text-blue-900" />
          </div>
          <div className="mt-3 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-700 font-medium">
                Kantor Utama BPPD
              </span>
              <span className="font-mono font-semibold tabular-nums text-slate-800">
                {todayHoliday
                  ? getHolidayTypeLabel(todayHoliday.type)
                  : `${checkedInByLoc.KANTOR}/${todayByLoc.KANTOR} hadir (kuota ${getDailyLocationQuota(
                      'KANTOR',
                      TODAY_ISO,
                      activeStaff.length,
                      state.holidays
                    )})`}
              </span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-sky-700 font-medium">
                MPP Lingkar Timur [L]
              </span>
              <span className="font-mono font-semibold tabular-nums text-sky-700">
                {todayHoliday
                  ? 'Tutup (Libur)'
                  : `${checkedInByLoc.L}/${todayByLoc.L} hadir (Sen–Jum · 1)`}
              </span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-emerald-700 font-medium">
                MPP Sukodono [S]
              </span>
              <span className="font-mono font-semibold tabular-nums text-emerald-700">
                {todayHoliday
                  ? 'Tutup (Libur)'
                  : isLocationOpenOnDate('S', TODAY_ISO, state.holidays)
                  ? `${checkedInByLoc.S}/${todayByLoc.S} hadir (Sel & Kam · 1)`
                  : 'Tutup (Buka Sel & Kam)'}
              </span>
            </div>
          </div>
        </div>

        {/* KPI 2: Attendance Compliance */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">
              Kepatuhan Presensi QR
            </span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="mt-2">
            <div className="text-3xl font-bold text-slate-900 font-mono tabular-nums">
              {complianceStats.rate}%
            </div>
            <div className="mt-1 text-xs text-slate-600 tabular-nums">
              {complianceStats.present} dari {complianceStats.expected} shift
              terjadwal s.d. hari ini · Target &gt;95%
            </div>
          </div>
          <div className="mt-3 w-full h-2 bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-emerald-600 rounded-full"
              style={{ width: `${Math.min(100, Number(complianceStats.rate))}%` }}
            />
          </div>
        </div>

        {/* KPI 3: Pending Swaps */}
        <button
          type="button"
          onClick={() => dispatch({ type: 'SET_MODULE', module: 'swaps' })}
          className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col justify-between text-left hover:border-blue-300 transition-colors"
        >
          <div className="flex items-center justify-between w-full">
            <span className="text-xs font-semibold text-slate-500">
              Permohonan Tukar Jadwal
            </span>
            <ArrowLeftRight className="w-4 h-4 text-sky-600" />
          </div>
          <div className="mt-2">
            <div className="text-3xl font-bold text-slate-900 font-mono tabular-nums">
              {pendingSwaps.length}
            </div>
            <div className="mt-1 text-xs text-slate-600">
              Menunggu persetujuan Koordinator Pelayanan
            </div>
          </div>
          <div className="mt-3 flex items-center gap-1 text-xs font-semibold text-blue-900">
            <span>Tinjau antrean persetujuan</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </div>
        </button>

        {/* KPI 4: Conflict Alerts */}
        <button
          type="button"
          onClick={() => dispatch({ type: 'SET_MODULE', module: 'conflicts' })}
          className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col justify-between text-left hover:border-amber-300 transition-colors"
        >
          <div className="flex items-center justify-between w-full">
            <span className="text-xs font-semibold text-slate-500">
              Peringatan Konflik Jadwal
            </span>
            <AlertTriangle
              className={`w-4 h-4 ${
                monthConflicts.length > 0 ? 'text-amber-600' : 'text-emerald-600'
              }`}
            />
          </div>
          <div className="mt-2">
            <div className="text-3xl font-bold text-slate-900 font-mono tabular-nums">
              {monthConflicts.length}
            </div>
            <div className="mt-1 text-xs text-slate-600">
              {monthConflicts.length > 0
                ? 'Temuan validasi kuota atau rotasi MPP'
                : 'Seluruh jadwal bulan berjalan valid'}
            </div>
          </div>
          <div className="mt-3 flex items-center gap-1 text-xs font-semibold text-blue-900">
            <span>Periksa mesin deteksi konflik</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </div>
        </button>
      </div>

      {/* Main Content Split: Chart + Live Operational Status */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        {/* Workload Distribution Chart */}
        <div className="xl:col-span-5 bg-white border border-slate-200 rounded-xl p-5">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Distribusi Beban Tugas per ASN
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Perbandingan jumlah hari tugas pada 3 titik layanan (
                {formatMonthTitle(state.selectedMonth)})
              </p>
            </div>
          </div>

          {/* Legend */}
          <div className="mt-4 flex flex-wrap items-center gap-4 text-xs text-slate-600">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-sm bg-slate-600 inline-block" />
              <span>Kantor BPPD</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-sm bg-sky-600 inline-block" />
              <span>MPP Lingkar Timur [L]</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-sm bg-emerald-600 inline-block" />
              <span>MPP Sukodono [S]</span>
            </div>
          </div>

          {/* Horizontal Stacked Bars */}
          <div className="mt-5 space-y-3.5">
            {workloadByStaff.map(({ person, kantor, l, s, mppTotal, total }) => {
              const kPct = (kantor / maxShifts) * 100;
              const lPct = (l / maxShifts) * 100;
              const sPct = (s / maxShifts) * 100;
              return (
                <div key={person.id}>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="font-semibold text-slate-800 truncate pr-2">
                      {person.name}
                    </span>
                    <span className="font-mono tabular-nums text-slate-600 shrink-0">
                      {kantor} KTR · {l} [L] · {s} [S] (MPP: {mppTotal})
                    </span>
                  </div>
                  <div className="w-full h-5 bg-slate-100 rounded-md overflow-hidden flex border border-slate-200/80">
                    {kantor > 0 && (
                      <div
                        className="h-full bg-slate-600 transition-all duration-200 flex items-center justify-center text-[10px] font-mono text-white"
                        style={{ width: `${kPct}%` }}
                        title={`Kantor Utama BPPD: ${kantor} hari`}
                      >
                        {kantor > 2 ? kantor : ''}
                      </div>
                    )}
                    {l > 0 && (
                      <div
                        className="h-full bg-sky-600 transition-all duration-200 flex items-center justify-center text-[10px] font-mono text-white"
                        style={{ width: `${lPct}%` }}
                        title={`MPP Lingkar Timur [L]: ${l} hari`}
                      >
                        {l}
                      </div>
                    )}
                    {s > 0 && (
                      <div
                        className="h-full bg-emerald-600 transition-all duration-200 flex items-center justify-center text-[10px] font-mono text-white"
                        style={{ width: `${sPct}%` }}
                        title={`MPP Sukodono [S]: ${s} hari`}
                      >
                        {s}
                      </div>
                    )}
                  </div>
                  {total === 0 && (
                    <div className="text-[11px] text-slate-400 mt-0.5">
                      Belum ada jadwal pada bulan ini
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Today's Live Operational Status Table */}
        <div className="xl:col-span-7 bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="p-5 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Status Operasional Petugas Hari Ini
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Rekap kehadiran real-time tanggal{' '}
                {formatIndonesianDate(TODAY_ISO, true)}
              </p>
            </div>
            <button
              type="button"
              onClick={() =>
                dispatch({ type: 'SET_MODULE', module: 'attendance' })
              }
              className="text-xs font-semibold text-blue-900 hover:underline whitespace-nowrap self-start sm:self-center"
            >
              Kelola Absensi QR →
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-semibold text-slate-600 uppercase tracking-wider">
                  <th className="py-2.5 px-4">Pegawai ASN</th>
                  <th className="py-2.5 px-4">Lokasi Tugas</th>
                  <th className="py-2.5 px-4">Check-In</th>
                  <th className="py-2.5 px-4">Status Layanan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-xs">
                {activeStaff.map((person) => {
                  const assn = todayAssignments.find(
                    (a) => a.staffId === person.id
                  );
                  const att = todayAttendance.find(
                    (a) => a.staffId === person.id
                  );

                  return (
                    <tr
                      key={person.id}
                      className="hover:bg-slate-50/80 transition-colors"
                    >
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-900">
                          {person.name}
                        </div>
                        <div className="text-[11px] font-mono text-slate-500 tabular-nums">
                          NIP {person.nip}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        {assn ? (
                          <LocationBadge code={assn.locationCode} />
                        ) : (
                          <span className="text-slate-400">Tidak dijadwalkan</span>
                        )}
                      </td>
                      <td className="py-3 px-4 font-mono tabular-nums text-slate-700">
                        {att ? (
                          <div>
                            <div className="font-semibold text-slate-900">
                              {att.checkInTime} WIB
                            </div>
                            <div className="text-[11px] text-emerald-700">
                              QR · {att.distanceMeters}m
                            </div>
                          </div>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        {att ? (
                          att.checkOutTime ? (
                            <span className="inline-flex items-center gap-1 text-slate-700 font-medium">
                              <CheckCircle2 className="w-3.5 h-3.5 text-slate-500" />
                              Selesai ({att.checkOutTime})
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-emerald-700 font-semibold">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                              Bertugas di Lokasi
                            </span>
                          )
                        ) : (
                          <span className="inline-flex items-center gap-1 text-amber-700 font-medium">
                            <Clock className="w-3.5 h-3.5 text-amber-600" />
                            Menunggu Check-In
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* PRD Section 6: Workforce Forecasting & Anomaly Detection */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        <div className="xl:col-span-6 bg-white border border-slate-200 rounded-xl p-5">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Proyeksi Kebutuhan Personil (5 Hari Kerja Ke Depan)
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Pemetaan beban layanan Kantor Utama vs cabang MPP berdasarkan hari operasional
              </p>
            </div>
            <TrendingUp className="w-4 h-4 text-blue-900 shrink-0" />
          </div>

          <div className="mt-4 divide-y divide-slate-200 text-xs">
            {upcomingForecast.length === 0 ? (
              <div className="py-6 text-center text-slate-500">
                Belum ada jadwal mendatang untuk diproyeksikan.
              </div>
            ) : (
              upcomingForecast.map((item) => (
                <div
                  key={item.date}
                  className="py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2"
                >
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold text-slate-900">
                        {formatIndonesianDate(item.date, true)}
                      </span>
                      {item.holiday && (
                        <span
                          className={`px-1.5 py-0.5 rounded border text-[10px] font-bold ${
                            item.holiday.type === 'LIBUR_NASIONAL'
                              ? 'bg-rose-50 text-rose-800 border-rose-200'
                              : 'bg-amber-50 text-amber-800 border-amber-200'
                          }`}
                        >
                          {getHolidayTypeLabel(item.holiday.type)}
                        </span>
                      )}
                    </div>
                    <div
                      className={`text-[11px] ${
                        item.holiday ? 'text-rose-700 font-medium' : 'text-slate-500'
                      }`}
                    >
                      {item.note}
                    </div>
                  </div>
                  {item.holiday ? (
                    <span className="text-[11px] font-semibold text-rose-700 whitespace-nowrap">
                      Layanan Tutup
                    </span>
                  ) : (
                    <div className="flex items-center gap-3 font-mono tabular-nums text-[11px]">
                      <span className="text-slate-700 font-semibold">
                        Kantor: {item.kCount}
                      </span>
                      <span className="text-sky-700 font-semibold">
                        [L]: {item.lCount}
                      </span>
                      <span
                        className={
                          item.isPeakMpp
                            ? 'text-emerald-700 font-semibold'
                            : 'text-slate-400'
                        }
                      >
                        [S]: {item.isPeakMpp ? item.sCount : 'Tutup'}
                      </span>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        <div className="xl:col-span-6 bg-white border border-slate-200 rounded-xl p-5">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Deteksi Anomali Kehadiran &amp; Lokasi QR
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Pemantauan otomatis keterlambatan, presensi luar radius, dan ketidakhadiran
              </p>
            </div>
            <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0" />
          </div>

          <div className="mt-4 divide-y divide-slate-200 text-xs">
            {attendanceAnomalies.length === 0 ? (
              <div className="py-6 text-center text-emerald-700 font-medium">
                Tidak ada anomali presensi atau ketidaksesuaian titik QR pada bulan ini.
              </div>
            ) : (
              attendanceAnomalies.map((anom) => (
                <div key={anom.id} className="py-3 flex items-start justify-between gap-3">
                  <div>
                    <div className="font-semibold text-slate-900">
                      {anom.staffName} ·{' '}
                      <span className="font-normal text-slate-500">
                        {formatIndonesianDate(anom.date)}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-600 mt-0.5">
                      {anom.detail}
                    </div>
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded border text-[10px] font-semibold whitespace-nowrap ${
                      anom.type === 'LUAR_RADIUS'
                        ? 'bg-rose-50 text-rose-700 border-rose-200'
                        : anom.type === 'TIDAK_HADIR'
                        ? 'bg-amber-50 text-amber-800 border-amber-200'
                        : 'bg-slate-100 text-slate-700 border-slate-200'
                    }`}
                  >
                    {anom.type === 'LUAR_RADIUS'
                      ? 'Luar Radius'
                      : anom.type === 'TIDAK_HADIR'
                      ? 'Tanpa Presensi'
                      : 'Terlambat'}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
