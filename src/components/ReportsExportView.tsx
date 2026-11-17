import { useMemo } from 'react';
import { Download, Printer } from 'lucide-react';
import { useAppState } from '../context/AppStateContext';
import {
  exportMonthlyReportCSV,
  formatIndonesianDate,
  formatMonthTitle,
  getEffectiveWorkingDaysInMonth,
  getHolidaysInMonth,
  getHolidayTypeLabel,
  TODAY_ISO,
} from '../utils/scheduleEngine';

export function ReportsExportView() {
  const { state, dispatch, pushToast } = useAppState();

  const effectiveWorkingDays = useMemo(
    () => getEffectiveWorkingDaysInMonth(state.selectedMonth, state.holidays),
    [state.selectedMonth, state.holidays]
  );

  const monthHolidays = useMemo(
    () => getHolidaysInMonth(state.selectedMonth, state.holidays),
    [state.selectedMonth, state.holidays]
  );

  const reportRows = useMemo(() => {
    const monthAssns = state.assignments.filter((a) =>
      a.date.startsWith(state.selectedMonth)
    );
    const monthAtts = state.attendance.filter((a) =>
      a.date.startsWith(state.selectedMonth)
    );

    return state.staff
      .filter((s) => s.active)
      .map((person, index) => {
        const assns = monthAssns.filter((a) => a.staffId === person.id);
        const kantor = assns.filter((a) => a.locationCode === 'KANTOR').length;
        const l = assns.filter((a) => a.locationCode === 'L').length;
        const s = assns.filter((a) => a.locationCode === 'S').length;

        const scheduledUpToToday = assns.filter(
          (a) => a.date <= TODAY_ISO
        ).length;
        const presentUpToToday = monthAtts.filter(
          (att) => att.staffId === person.id && att.date <= TODAY_ISO
        ).length;
        const lateCount = monthAtts.filter(
          (att) => att.staffId === person.id && att.status === 'TERLAMBAT'
        ).length;

        const attendancePct =
          scheduledUpToToday > 0
            ? ((presentUpToToday / scheduledUpToToday) * 100).toFixed(1)
            : '100.0';

        return {
          no: index + 1,
          person,
          totalDays: assns.length,
          kantor,
          l,
          s,
          scheduledUpToToday,
          presentUpToToday,
          lateCount,
          attendancePct,
        };
      });
  }, [state.staff, state.assignments, state.attendance, state.selectedMonth]);

  const handleExportCSV = () => {
    exportMonthlyReportCSV(
      state.selectedMonth,
      state.staff,
      state.assignments,
      state.holidays
    );
    pushToast({
      type: 'success',
      title: 'Laporan CSV/Excel Diunduh',
      description: `Berkas Rekap_Jadwal_SIJADPAJAK_${state.selectedMonth}.csv berhasil dibuat.`,
    });
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Action Header (Hidden when printing) */}
      <div className="no-print bg-white border border-slate-200 rounded-xl p-5 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">
            Laporan &amp; Export Surat Tugas Operasional
          </h1>
          <p className="mt-1 text-xs text-slate-600">
            Rekapitulasi distribusi beban kerja dan kepatuhan presensi ASN
            Pengolah Data dan Informasi BPPD Kabupaten Sidoarjo.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <select
            aria-label="Pilih Bulan Laporan"
            value={state.selectedMonth}
            onChange={(e) =>
              dispatch({ type: 'SET_MONTH', month: e.target.value })
            }
            className="px-3 py-2 text-xs font-semibold bg-slate-50 border border-slate-300 rounded-lg"
          >
            <option value="2026-10">Oktober 2026</option>
            <option value="2026-11">November 2026</option>
            <option value="2026-12">Desember 2026</option>
          </select>

          <button
            type="button"
            onClick={handleExportCSV}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-slate-800 bg-white border border-slate-300 rounded-lg hover:bg-slate-50"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV / Excel</span>
          </button>

          <button
            type="button"
            onClick={handlePrint}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-blue-900 rounded-lg hover:bg-blue-800"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Cetak Surat Tugas (PDF)</span>
          </button>
        </div>
      </div>

      {/* Printable Official Government Document Container */}
      <div className="print-container bg-white border border-slate-200 rounded-xl p-6 sm:p-8 space-y-6">
        {/* Official Kop Surat Header */}
        <div className="border-b-2 border-slate-900 pb-4 text-center">
          <div className="text-xs font-semibold uppercase tracking-widest text-slate-600">
            Pemerintah Kabupaten Sidoarjo
          </div>
          <div className="text-lg sm:text-xl font-bold uppercase tracking-wide text-slate-900 mt-0.5">
            Badan Pelayanan Pajak Daerah (BPPD)
          </div>
          <div className="text-xs text-slate-600 mt-0.5">
            Jl. Pahlawan No. 56, Sidoarjo · Jawa Timur 61213 · Sistem Informasi
            SIJADPAJAK
          </div>
        </div>

        {/* Document Title & Metadata */}
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-2 text-xs">
          <div>
            <div className="text-sm font-bold text-slate-900 uppercase">
              Rekapitulasi Surat Tugas &amp; Kehadiran Pelayanan Pajak Daerah
            </div>
            <div className="text-slate-600 mt-0.5">
              Unit Kerja: Bidang Pengolahan Data dan Informasi · Periode:{' '}
              <span className="font-semibold text-slate-900">
                {formatMonthTitle(state.selectedMonth)}
              </span>{' '}
              ({effectiveWorkingDays.length} Hari Kerja Efektif
              {monthHolidays.length > 0
                ? `, ${monthHolidays.length} Hari Libur Nasional/Cuti Bersama`
                : ''}
              )
            </div>
          </div>
          <div className="font-mono text-[11px] text-slate-600">
            Nomor Dokumen: 800/SIJADPAJAK/{state.selectedMonth.replace('-', '')}
          </div>
        </div>

        {/* Summary Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs border border-slate-300">
            <thead>
              <tr className="bg-slate-100 text-slate-800 font-semibold border-b border-slate-300">
                <th className="py-2.5 px-3 border-r border-slate-300 text-center w-10">
                  No
                </th>
                <th className="py-2.5 px-3 border-r border-slate-300">
                  Nama Pegawai ASN
                </th>
                <th className="py-2.5 px-3 border-r border-slate-300">NIP</th>
                <th className="py-2.5 px-3 border-r border-slate-300 text-right">
                  Total Shift
                </th>
                <th className="py-2.5 px-3 border-r border-slate-300 text-right">
                  Kantor BPPD
                </th>
                <th className="py-2.5 px-3 border-r border-slate-300 text-right text-sky-800">
                  MPP Lingkar Timur [L]
                </th>
                <th className="py-2.5 px-3 border-r border-slate-300 text-right text-emerald-800">
                  MPP Sukodono [S]
                </th>
                <th className="py-2.5 px-3 border-r border-slate-300 text-right">
                  Hadir QR (s.d. 16 Nov)
                </th>
                <th className="py-2.5 px-3 text-right">Kepatuhan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {reportRows.map((row) => (
                <tr key={row.person.id} className="hover:bg-slate-50/70">
                  <td className="py-2.5 px-3 border-r border-slate-300 text-center font-mono tabular-nums">
                    {row.no}
                  </td>
                  <td className="py-2.5 px-3 border-r border-slate-300 font-semibold text-slate-900">
                    {row.person.name}
                  </td>
                  <td className="py-2.5 px-3 border-r border-slate-300 font-mono tabular-nums text-slate-700">
                    {row.person.nip}
                  </td>
                  <td className="py-2.5 px-3 border-r border-slate-300 text-right font-mono tabular-nums font-semibold">
                    {row.totalDays}
                  </td>
                  <td className="py-2.5 px-3 border-r border-slate-300 text-right font-mono tabular-nums">
                    {row.kantor}
                  </td>
                  <td className="py-2.5 px-3 border-r border-slate-300 text-right font-mono tabular-nums font-semibold text-sky-700">
                    {row.l}
                  </td>
                  <td className="py-2.5 px-3 border-r border-slate-300 text-right font-mono tabular-nums font-semibold text-emerald-700">
                    {row.s}
                  </td>
                  <td className="py-2.5 px-3 border-r border-slate-300 text-right font-mono tabular-nums">
                    {row.presentUpToToday}/{row.scheduledUpToToday}
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono tabular-nums font-semibold text-emerald-700">
                    {row.attendancePct}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Location Notes & Signature Block */}
        <div className="pt-4 grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
          <div className="space-y-1.5 text-slate-600">
            <div className="font-semibold text-slate-800">
              Keterangan Lokasi Penugasan:
            </div>
            <div>
              • Kantor Utama BPPD: Jl. Pahlawan No. 56, Sidoarjo (Senin–Jumat,
              sisa petugas: 5–6 ASN/hari)
            </div>
            <div>
              • MPP Lingkar Timur [L]: Jl. Lingkar Timur KM 2, Buduran
              (Senin–Jumat, kuota: 1 ASN/hari)
            </div>
            <div>
              • MPP Sukodono [S]: Jl. Raya Sukodono No. 18, Sukodono (Khusus
              Selasa &amp; Kamis, kuota: 1 ASN/hari)
            </div>

            {monthHolidays.length > 0 && (
              <div className="pt-2 space-y-1">
                <div className="font-semibold text-slate-800">
                  Keterangan Hari Libur Nasional &amp; Cuti Bersama:
                </div>
                {monthHolidays.map((h) => (
                  <div key={h.date} className="text-rose-800">
                    • {formatIndonesianDate(h.date, true)} —{' '}
                    <span className="font-semibold">
                      {getHolidayTypeLabel(h.type)}:
                    </span>{' '}
                    {h.name}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex flex-col items-start md:items-end text-left md:text-center">
            <div className="w-64 space-y-1">
              <div className="text-slate-700">
                Sidoarjo, {formatIndonesianDate(TODAY_ISO)}
              </div>
              <div className="font-semibold text-slate-900">
                Kepala Bidang Pengolahan Data &amp; Informasi
              </div>
              <div className="text-[11px] text-slate-500">
                Badan Pelayanan Pajak Daerah Kabupaten Sidoarjo
              </div>
              <div className="h-14" />
              <div className="font-semibold text-slate-900 underline underline-offset-4">
                Koordinator Pelayanan &amp; Pimpinan BPPD
              </div>
              <div className="text-[11px] font-mono text-slate-500">
                Dokumen Terverifikasi Sistem SIJADPAJAK
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
