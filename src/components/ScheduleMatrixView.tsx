import React, { useMemo, useState } from 'react';
import {
  Calendar,
  CalendarOff,
  CheckCircle2,
  Grid3X3,
  Plus,
  RefreshCw,
  Search,
  ShieldAlert,
  Trash2,
  UserPlus,
  Users,
  X,
} from 'lucide-react';
import { useAppState } from '../context/AppStateContext';
import { HolidayType, LocationCode, ShiftSession } from '../types/sijadpajak';
import {
  detectScheduleConflicts,
  formatIndonesianDate,
  formatMonthTitle,
  getCalendarDaysGrid,
  getDailyLocationQuota,
  getDayAbbrev,
  getEffectiveWorkingDaysInMonth,
  getHolidayForDate,
  getHolidaysInMonth,
  getHolidayTypeLabel,
  getWorkingDaysInMonth,
  isLocationOpenOnDate,
  SERVICE_LOCATIONS,
  TODAY_ISO,
} from '../utils/scheduleEngine';
import { LocationBadge } from './LocationBadge';

export function ScheduleMatrixView() {
  const { state, dispatch, pushToast } = useAppState();
  const [viewMode, setViewMode] = useState<'matrix' | 'calendar'>('matrix');
  const [searchQuery, setSearchQuery] = useState('');
  const [locationFilter, setLocationFilter] = useState<'ALL' | LocationCode>(
    'ALL'
  );

  // Cell editor modal state
  const [editingCell, setEditingCell] = useState<{
    date: string;
    staffId: string;
  } | null>(null);
  const [editLocation, setEditLocation] = useState<LocationCode>('KANTOR');
  const [editSession, setEditSession] = useState<ShiftSession>('PAGI_SORE');
  const [editNotes, setEditNotes] = useState('');
  const [simulateDoubleBooking, setSimulateDoubleBooking] = useState(false);

  // Staff master data modal
  const [staffModalOpen, setStaffModalOpen] = useState(false);
  const [newStaffName, setNewStaffName] = useState('');
  const [newStaffNip, setNewStaffNip] = useState('');
  const [newStaffJabatan, setNewStaffJabatan] = useState(
    'Pengolah Data dan Informasi'
  );

  // Auto-rotate modal
  const [autoRotateModalOpen, setAutoRotateModalOpen] = useState(false);
  const [preserveLockedDates, setPreserveLockedDates] = useState(true);

  // Holidays & Cuti Bersama modal
  const [holidayModalOpen, setHolidayModalOpen] = useState(false);
  const [newHolidayDate, setNewHolidayDate] = useState('2026-11-27');
  const [newHolidayType, setNewHolidayType] =
    useState<HolidayType>('CUTI_BERSAMA');
  const [newHolidayName, setNewHolidayName] = useState('');
  const [clearOnHoliday, setClearOnHoliday] = useState(true);

  const canEdit =
    state.activeRole === 'ADMIN_SISTEM' || state.activeRole === 'KOORDINATOR';
  const isAdmin = state.activeRole === 'ADMIN_SISTEM';

  const workingDays = useMemo(
    () => getWorkingDaysInMonth(state.selectedMonth),
    [state.selectedMonth]
  );

  const effectiveWorkingDays = useMemo(
    () => getEffectiveWorkingDaysInMonth(state.selectedMonth, state.holidays),
    [state.selectedMonth, state.holidays]
  );

  const monthHolidays = useMemo(
    () => getHolidaysInMonth(state.selectedMonth, state.holidays),
    [state.selectedMonth, state.holidays]
  );

  const calendarCells = useMemo(
    () => getCalendarDaysGrid(state.selectedMonth),
    [state.selectedMonth]
  );

  const filteredStaff = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return state.staff.filter((s) => {
      if (!s.active) return false;
      if (!q) return true;
      return (
        s.name.toLowerCase().includes(q) || s.nip.toLowerCase().includes(q)
      );
    });
  }, [state.staff, searchQuery]);

  const monthAssignments = useMemo(
    () =>
      state.assignments.filter((a) => a.date.startsWith(state.selectedMonth)),
    [state.assignments, state.selectedMonth]
  );

  // Real-time conflict preview when editing a cell
  const proposedConflicts = useMemo(() => {
    if (!editingCell) return [];
    const simulatedAssignments = simulateDoubleBooking
      ? [
          ...state.assignments,
          {
            id: 'sim-preview',
            date: editingCell.date,
            staffId: editingCell.staffId,
            locationCode: editLocation,
            session: editSession,
            notes: editNotes,
            updatedAt: TODAY_ISO,
            updatedBy: 'Preview',
          },
        ]
      : [
          ...state.assignments.filter(
            (a) =>
              !(
                a.date === editingCell.date &&
                a.staffId === editingCell.staffId
              )
          ),
          {
            id: 'sim-preview',
            date: editingCell.date,
            staffId: editingCell.staffId,
            locationCode: editLocation,
            session: editSession,
            notes: editNotes,
            updatedAt: TODAY_ISO,
            updatedBy: 'Preview',
          },
        ];

    const all = detectScheduleConflicts(
      simulatedAssignments,
      state.staff,
      state.selectedMonth,
      state.holidays
    );
    return all.filter(
      (c) =>
        c.date === editingCell.date ||
        c.affectedStaffIds.includes(editingCell.staffId)
    );
  }, [
    editingCell,
    editLocation,
    editSession,
    editNotes,
    simulateDoubleBooking,
    state.assignments,
    state.staff,
    state.selectedMonth,
    state.holidays,
  ]);

  const blockingConflicts = proposedConflicts.filter(
    (c) => c.severity === 'BLOCKING'
  );

  const openEditor = (date: string, staffId: string) => {
    if (!canEdit) {
      pushToast({
        type: 'info',
        title: 'Mode Baca Saja',
        description:
          'Ubah peran ke Admin Sistem atau Koordinator Pelayanan untuk mengubah penugasan jadwal.',
      });
      return;
    }
    const existing = state.assignments.find(
      (a) => a.date === date && a.staffId === staffId
    );
    setEditingCell({ date, staffId });
    setEditLocation(existing?.locationCode || 'KANTOR');
    setEditSession(existing?.session || 'PAGI_SORE');
    setEditNotes(existing?.notes || '');
    setSimulateDoubleBooking(false);
  };

  const handleSaveAssignment = (forceOverride = false) => {
    if (!editingCell) return;

    if (blockingConflicts.length > 0 && !forceOverride) {
      pushToast({
        type: 'error',
        title: 'Penyimpanan Diblokir oleh Mesin Deteksi Konflik',
        description: blockingConflicts[0].title,
      });
      return;
    }

    dispatch({
      type: 'UPSERT_ASSIGNMENT',
      assignment: {
        date: editingCell.date,
        staffId: editingCell.staffId,
        locationCode: editLocation,
        session: editSession,
        notes: editNotes,
      },
      replaceExistingOnDate: !simulateDoubleBooking,
    });

    const targetPerson = state.staff.find((s) => s.id === editingCell.staffId);
    pushToast({
      type: proposedConflicts.length > 0 ? 'warning' : 'success',
      title:
        proposedConflicts.length > 0
          ? 'Jadwal Disimpan dengan Peringatan Konflik'
          : 'Jadwal Berhasil Diperbarui',
      description: `${targetPerson?.name ?? ''} -> ${
        SERVICE_LOCATIONS[editLocation].name
      } (${formatIndonesianDate(editingCell.date)})`,
    });
    setEditingCell(null);
  };

  const handleRunAutoRotate = () => {
    dispatch({
      type: 'AUTO_ROTATE_MONTH',
      month: state.selectedMonth,
      preserveLocked:
        state.selectedMonth === '2026-11' ? preserveLockedDates : false,
    });
    setAutoRotateModalOpen(false);
    pushToast({
      type: 'success',
      title: `Auto-Rotasi ${formatMonthTitle(state.selectedMonth)} Selesai`,
      description:
        'Penugasan seluruh ASN telah didistribusikan secara seimbang sesuai kuota MPP.',
    });
  };

  const handleAddStaff = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStaffName.trim() || !newStaffNip.trim()) return;
    dispatch({
      type: 'ADD_STAFF',
      staff: {
        name: newStaffName.trim(),
        nip: newStaffNip.trim(),
        jabatan: newStaffJabatan.trim(),
        golongan: 'Penata Muda (III/a)',
        phone: '0812-3456-1099',
        active: true,
      },
    });
    pushToast({
      type: 'success',
      title: 'Pegawai ASN Ditambahkan',
      description: `${newStaffName.trim()} siap dijadwalkan pada matriks.`,
    });
    setNewStaffName('');
    setNewStaffNip('');
  };

  const handleAddHoliday = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canEdit || !newHolidayDate || !newHolidayName.trim()) return;
    dispatch({
      type: 'UPSERT_HOLIDAY',
      holiday: {
        date: newHolidayDate,
        type: newHolidayType,
        name: newHolidayName.trim(),
        basis: 'Penetapan BPPD / SKB 3 Menteri',
      },
      clearAssignmentsOnDate: clearOnHoliday,
    });
    pushToast({
      type: 'success',
      title: `${getHolidayTypeLabel(newHolidayType)} Ditetapkan`,
      description: `${formatIndonesianDate(newHolidayDate, true)} — ${newHolidayName.trim()}`,
    });
    setNewHolidayName('');
  };

  return (
    <div className="space-y-5">
      {/* Header Controls */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">
            Kalender &amp; Matriks Jadwal Operasional
          </h1>
          <p className="mt-1 text-xs text-slate-600">
            Klik sel jadwal untuk mengubah penempatan lokasi ASN. Setiap
            perubahan divalidasi otomatis oleh Mesin Deteksi Konflik.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={() => setHolidayModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-rose-800 bg-rose-50 border border-rose-200 rounded-lg hover:bg-rose-100 whitespace-nowrap"
          >
            <CalendarOff className="w-3.5 h-3.5" />
            <span>
              Libur &amp; Cuti Bersama ({monthHolidays.length} bln ini)
            </span>
          </button>

          {isAdmin && (
            <button
              type="button"
              onClick={() => setStaffModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 whitespace-nowrap"
            >
              <Users className="w-3.5 h-3.5" />
              <span>Master Pegawai ({state.staff.length})</span>
            </button>
          )}

          {canEdit && (
            <button
              type="button"
              onClick={() => setAutoRotateModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-blue-900 rounded-lg hover:bg-blue-800 whitespace-nowrap"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Auto-Rotasi Cerdas</span>
            </button>
          )}
        </div>
      </div>

      {/* Filter & View Switcher Toolbar */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          {/* Month Selector */}
          <select
            aria-label="Pilih Bulan"
            value={state.selectedMonth}
            onChange={(e) =>
              dispatch({ type: 'SET_MONTH', month: e.target.value })
            }
            className="px-3 py-1.5 text-xs font-semibold text-slate-800 bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-900/20"
          >
            <option value="2026-10">Oktober 2026</option>
            <option value="2026-11">November 2026</option>
            <option value="2026-12">Desember 2026</option>
          </select>

          {/* Search Staff */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari nama ASN atau NIP..."
              className="pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-lg w-52 focus:outline-none focus:ring-2 focus:ring-blue-900/20"
            />
          </div>

          {/* Location Segmented Filter */}
          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
            {(
              [
                { id: 'ALL', label: 'Semua Lokasi' },
                { id: 'KANTOR', label: 'Kantor BPPD' },
                { id: 'L', label: 'MPP Lingkar Timur [L]' },
                { id: 'S', label: 'MPP Sukodono [S]' },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setLocationFilter(tab.id)}
                className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                  locationFilter === tab.id
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* View Mode Toggle */}
        <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg self-start lg:self-auto">
          <button
            type="button"
            onClick={() => setViewMode('matrix')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
              viewMode === 'matrix'
                ? 'bg-blue-900 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Grid3X3 className="w-3.5 h-3.5" />
            <span>Tampilan Matriks</span>
          </button>
          <button
            type="button"
            onClick={() => setViewMode('calendar')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
              viewMode === 'calendar'
                ? 'bg-blue-900 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>Kalender Bulanan</span>
          </button>
        </div>
      </div>

      {/* Monthly National Holiday & Collective Leave Notice Banner */}
      {monthHolidays.length > 0 && (
        <div className="bg-white border border-rose-200 rounded-xl p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div className="flex items-start gap-3">
            <CalendarOff className="w-4 h-4 text-rose-700 mt-0.5 shrink-0" />
            <div className="space-y-1">
              <div className="text-xs font-bold text-slate-900">
                Keterangan Hari Libur Nasional &amp; Cuti Bersama —{' '}
                {formatMonthTitle(state.selectedMonth)}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {monthHolidays.map((h) => (
                  <span
                    key={h.date}
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border text-[11px] font-medium ${
                      h.type === 'LIBUR_NASIONAL'
                        ? 'bg-rose-50 text-rose-800 border-rose-200'
                        : 'bg-amber-50 text-amber-800 border-amber-200'
                    }`}
                  >
                    <span className="font-mono font-semibold">
                      {formatIndonesianDate(h.date, true)}
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
            onClick={() => setHolidayModalOpen(true)}
            className="text-xs font-semibold text-blue-900 hover:underline whitespace-nowrap self-start md:self-center"
          >
            Lihat Kalender Libur 2026 →
          </button>
        </div>
      )}

      {/* Legend Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-1 text-xs text-slate-600">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-1.5">
            <LocationBadge code="KANTOR" compact />
            <span>Kantor Utama BPPD (Sisanya di kantor)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <LocationBadge code="L" compact />
            <span>MPP Lingkar Timur (Sen–Jum, 1/hari)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <LocationBadge code="S" compact />
            <span>MPP Sukodono (Sel &amp; Kam, 1/hari)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="px-1.5 py-0.5 rounded bg-rose-50 text-rose-800 border border-rose-200 font-mono text-[10px] font-bold">
              LN
            </span>
            <span>Libur Nasional</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="px-1.5 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200 font-mono text-[10px] font-bold">
              CB
            </span>
            <span>Cuti Bersama</span>
          </div>
        </div>
        <div className="text-slate-500">
          Hari Kerja Efektif ({formatMonthTitle(state.selectedMonth)}):{' '}
          <span className="font-mono font-semibold text-slate-800 tabular-nums">
            {effectiveWorkingDays.length} hari
          </span>
          {workingDays.length !== effectiveWorkingDays.length && (
            <span className="ml-1 text-rose-700 font-medium">
              ({workingDays.length - effectiveWorkingDays.length} hari libur/cuti)
            </span>
          )}
        </div>
      </div>

      {/* Matrix Table View */}
      {viewMode === 'matrix' ? (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          {workingDays.length === 0 ? (
            <div className="p-10 text-center text-sm text-slate-500">
              Belum ada data hari kerja untuk bulan ini.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="sticky left-0 z-20 bg-slate-50 py-3 px-4 text-left font-semibold text-slate-700 border-r border-slate-200 min-w-[210px]">
                      Pegawai ASN (NIP)
                    </th>
                    {workingDays.map((date) => {
                      const dayNum = date.split('-')[2];
                      const isToday = date === TODAY_ISO;
                      const holiday = getHolidayForDate(date, state.holidays);
                      return (
                        <th
                          key={date}
                          title={
                            holiday
                              ? `${getHolidayTypeLabel(holiday.type)}: ${holiday.name}`
                              : formatIndonesianDate(date, true)
                          }
                          className={`py-2 px-1.5 text-center font-semibold border-r border-slate-200/70 min-w-[54px] ${
                            holiday?.type === 'LIBUR_NASIONAL'
                              ? 'bg-rose-50 text-rose-800'
                              : holiday?.type === 'CUTI_BERSAMA'
                              ? 'bg-amber-50 text-amber-800'
                              : isToday
                              ? 'bg-blue-50 text-blue-900'
                              : 'text-slate-600'
                          }`}
                        >
                          <div className="text-[10px] font-medium uppercase">
                            {getDayAbbrev(date)}
                          </div>
                          <div className="font-mono tabular-nums text-xs">
                            {Number(dayNum)}
                          </div>
                          {holiday && (
                            <div
                              className={`mt-0.5 text-[9px] font-mono font-bold uppercase ${
                                holiday.type === 'LIBUR_NASIONAL'
                                  ? 'text-rose-700'
                                  : 'text-amber-700'
                              }`}
                            >
                              {holiday.type === 'LIBUR_NASIONAL' ? 'LN' : 'CB'}
                            </div>
                          )}
                        </th>
                      );
                    })}
                    <th className="py-2 px-3 text-center font-semibold text-slate-700 min-w-[110px] bg-slate-50">
                      Ringkasan
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {filteredStaff.map((person) => {
                    const personMonth = monthAssignments.filter(
                      (a) => a.staffId === person.id
                    );
                    const kCount = personMonth.filter(
                      (a) => a.locationCode === 'KANTOR'
                    ).length;
                    const lCount = personMonth.filter(
                      (a) => a.locationCode === 'L'
                    ).length;
                    const sCount = personMonth.filter(
                      (a) => a.locationCode === 'S'
                    ).length;

                    return (
                      <tr
                        key={person.id}
                        className="hover:bg-slate-50/70 transition-colors"
                      >
                        <td className="sticky left-0 z-10 bg-white py-2.5 px-4 border-r border-slate-200">
                          <div className="font-semibold text-slate-900 truncate max-w-[190px]">
                            {person.name}
                          </div>
                          <div className="text-[11px] font-mono text-slate-500 tabular-nums">
                            {person.nip}
                          </div>
                        </td>
                        {workingDays.map((date) => {
                          const cellAssns = monthAssignments.filter(
                            (a) => a.date === date && a.staffId === person.id
                          );
                          const primary = cellAssns[0];
                          const matchesFilter =
                            locationFilter === 'ALL' ||
                            (primary && primary.locationCode === locationFilter);
                          const isDouble = cellAssns.length > 1;
                          const isToday = date === TODAY_ISO;
                          const holiday = getHolidayForDate(date, state.holidays);

                          return (
                            <td
                              key={date}
                              className={`p-1 text-center border-r border-slate-200/70 ${
                                holiday?.type === 'LIBUR_NASIONAL'
                                  ? 'bg-rose-50/60'
                                  : holiday?.type === 'CUTI_BERSAMA'
                                  ? 'bg-amber-50/60'
                                  : isToday
                                  ? 'bg-blue-50/40'
                                  : ''
                              }`}
                            >
                              {primary ? (
                                <button
                                  type="button"
                                  onClick={() => openEditor(date, person.id)}
                                  className={`w-full py-1 rounded flex flex-col items-center justify-center transition-opacity ${
                                    matchesFilter ? 'opacity-100' : 'opacity-20'
                                  } ${
                                    canEdit
                                      ? 'hover:ring-2 hover:ring-blue-900/30 cursor-pointer'
                                      : 'cursor-default'
                                  }`}
                                >
                                  <LocationBadge
                                    code={primary.locationCode}
                                    compact
                                  />
                                  {isDouble && (
                                    <span className="mt-0.5 text-[9px] font-bold text-rose-700">
                                      GANDA ({cellAssns.length})
                                    </span>
                                  )}
                                  {holiday && (
                                    <span className="mt-0.5 text-[9px] font-bold text-rose-700">
                                      {holiday.type === 'LIBUR_NASIONAL'
                                        ? 'LIBUR'
                                        : 'CUTI'}
                                    </span>
                                  )}
                                </button>
                              ) : holiday ? (
                                <button
                                  type="button"
                                  onClick={() => openEditor(date, person.id)}
                                  title={`${getHolidayTypeLabel(holiday.type)}: ${holiday.name}`}
                                  className={`w-full py-1.5 rounded text-[9px] font-mono font-bold tracking-tight ${
                                    holiday.type === 'LIBUR_NASIONAL'
                                      ? 'text-rose-700 hover:bg-rose-100/70'
                                      : 'text-amber-700 hover:bg-amber-100/70'
                                  }`}
                                >
                                  {holiday.type === 'LIBUR_NASIONAL'
                                    ? 'LIBUR'
                                    : 'CUTI'}
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => openEditor(date, person.id)}
                                  className="w-full py-1.5 text-slate-300 hover:text-blue-700"
                                >
                                  +
                                </button>
                              )}
                            </td>
                          );
                        })}
                        <td className="py-2 px-3 text-center font-mono tabular-nums text-[11px] text-slate-700 bg-slate-50/50">
                          {kCount}K · {lCount}L · {sCount}S
                        </td>
                      </tr>
                    );
                  })}
                  {/* Daily Quota Summary Row */}
                  <tr className="bg-slate-100/80 border-t-2 border-slate-300 font-mono text-[10px]">
                    <td className="sticky left-0 z-10 bg-slate-100 py-2.5 px-4 font-sans font-semibold text-slate-700 border-r border-slate-200">
                      Beban Kuota Harian (K / L / S)
                    </td>
                    {workingDays.map((date) => {
                      const holiday = getHolidayForDate(date, state.holidays);
                      const dayAssns = monthAssignments.filter(
                        (a) => a.date === date
                      );
                      if (holiday && dayAssns.length === 0) {
                        return (
                          <td
                            key={date}
                            title={`${getHolidayTypeLabel(holiday.type)}: ${holiday.name}`}
                            className={`py-2 px-1 text-center border-r border-slate-200/70 font-sans font-semibold text-[9px] leading-tight ${
                              holiday.type === 'LIBUR_NASIONAL'
                                ? 'bg-rose-50 text-rose-800'
                                : 'bg-amber-50 text-amber-800'
                            }`}
                          >
                            {holiday.type === 'LIBUR_NASIONAL' ? (
                              <>
                                <div>Libur</div>
                                <div>Nas.</div>
                              </>
                            ) : (
                              <>
                                <div>Cuti</div>
                                <div>Bers.</div>
                              </>
                            )}
                          </td>
                        );
                      }

                      const k = dayAssns.filter(
                        (a) => a.locationCode === 'KANTOR'
                      ).length;
                      const l = dayAssns.filter(
                        (a) => a.locationCode === 'L'
                      ).length;
                      const s = dayAssns.filter(
                        (a) => a.locationCode === 'S'
                      ).length;
                      const activeCount = filteredStaff.length || 7;
                      const maxK = getDailyLocationQuota(
                        'KANTOR',
                        date,
                        activeCount,
                        state.holidays
                      );
                      const maxL = getDailyLocationQuota(
                        'L',
                        date,
                        activeCount,
                        state.holidays
                      );
                      const maxS = getDailyLocationQuota(
                        'S',
                        date,
                        activeCount,
                        state.holidays
                      );
                      const hasOverload = k > maxK || l > maxL || s > maxS;
                      return (
                        <td
                          key={date}
                          className={`py-2 px-1 text-center border-r border-slate-200/70 tabular-nums ${
                            hasOverload
                              ? 'bg-amber-50 text-amber-800 font-semibold'
                              : 'text-slate-600'
                          }`}
                          title={`Kantor: ${k}/${maxK}, MPP L: ${l}/${maxL}, MPP S: ${s}/${maxS}`}
                        >
                          <div>
                            {k}/{maxK}
                          </div>
                          <div className="text-sky-700">
                            {l}/{maxL}
                          </div>
                          <div
                            className={
                              maxS === 0
                                ? s > 0
                                  ? 'text-rose-700 font-bold'
                                  : 'text-slate-400'
                                : 'text-emerald-700'
                            }
                          >
                            {maxS === 0 && s === 0 ? '—' : `${s}/${maxS}`}
                          </div>
                        </td>
                      );
                    })}
                    <td className="py-2 px-3 text-center text-slate-500 font-sans">
                      L:1 · S:1 (Sel/Kam)
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : (
        /* Standard Monthly Calendar Grid */
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="grid grid-cols-7 bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600">
            {['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu'].map(
              (day) => (
                <div
                  key={day}
                  className="py-2.5 px-3 text-center border-r last:border-r-0 border-slate-200"
                >
                  {day}
                </div>
              )
            )}
          </div>
          <div className="grid grid-cols-7 divide-x divide-y divide-slate-200">
            {calendarCells.map((cell, idx) => {
              if (!cell.date) {
                return (
                  <div
                    key={`empty-${idx}`}
                    className="min-h-[120px] bg-slate-50/60"
                  />
                );
              }
              const dayAssns = monthAssignments.filter(
                (a) =>
                  a.date === cell.date &&
                  filteredStaff.some((s) => s.id === a.staffId) &&
                  (locationFilter === 'ALL' ||
                    a.locationCode === locationFilter)
              );
              const isToday = cell.date === TODAY_ISO;
              const holiday = getHolidayForDate(cell.date, state.holidays);

              return (
                <div
                  key={cell.date}
                  className={`min-h-[125px] p-2 ${
                    holiday?.type === 'LIBUR_NASIONAL'
                      ? 'bg-rose-50/70'
                      : holiday?.type === 'CUTI_BERSAMA'
                      ? 'bg-amber-50/70'
                      : cell.isWeekend
                      ? 'bg-slate-50/90'
                      : isToday
                      ? 'bg-blue-50/40'
                      : 'bg-white'
                  }`}
                >
                  <div className="flex items-center justify-between gap-1 mb-1.5">
                    <span
                      className={`text-xs font-mono font-semibold tabular-nums ${
                        isToday
                          ? 'px-1.5 py-0.5 rounded bg-blue-900 text-white'
                          : holiday?.type === 'LIBUR_NASIONAL'
                          ? 'text-rose-800'
                          : holiday?.type === 'CUTI_BERSAMA'
                          ? 'text-amber-800'
                          : cell.isWeekend
                          ? 'text-slate-400'
                          : 'text-slate-700'
                      }`}
                    >
                      {cell.dayNumber}
                    </span>
                    {holiday ? (
                      <span
                        className={`px-1.5 py-0.5 rounded text-[9px] font-bold border ${
                          holiday.type === 'LIBUR_NASIONAL'
                            ? 'bg-rose-100 text-rose-800 border-rose-200'
                            : 'bg-amber-100 text-amber-800 border-amber-200'
                        }`}
                      >
                        {getHolidayTypeLabel(holiday.type)}
                      </span>
                    ) : (
                      cell.isWeekend && (
                        <span className="text-[10px] text-slate-400">
                          Akhir Pekan
                        </span>
                      )
                    )}
                  </div>

                  {holiday && (
                    <div
                      className={`mb-1.5 px-2 py-1.5 rounded border text-[10px] leading-snug font-medium ${
                        holiday.type === 'LIBUR_NASIONAL'
                          ? 'bg-white/80 border-rose-200 text-rose-900'
                          : 'bg-white/80 border-amber-200 text-amber-900'
                      }`}
                    >
                      <span className="font-bold">
                        {getHolidayTypeLabel(holiday.type)}:
                      </span>{' '}
                      {holiday.name}
                    </div>
                  )}

                  {!cell.isWeekend && (!holiday || dayAssns.length > 0) && (
                    <div className="space-y-1">
                      {dayAssns
                        .filter(
                          (a) =>
                            a.locationCode !== 'KANTOR' ||
                            locationFilter === 'KANTOR'
                        )
                        .map((assn) => {
                          const person = state.staff.find(
                            (s) => s.id === assn.staffId
                          );
                          return (
                            <button
                              key={assn.id}
                              type="button"
                              onClick={() =>
                                openEditor(assn.date, assn.staffId)
                              }
                              className={`w-full text-left px-1.5 py-1 rounded text-[11px] border flex items-center justify-between gap-1 ${
                                assn.locationCode === 'L'
                                  ? 'bg-sky-50 border-sky-200 text-sky-900'
                                  : assn.locationCode === 'S'
                                  ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                                  : 'bg-slate-100 border-slate-200 text-slate-800'
                              }`}
                            >
                              <span className="truncate font-medium">
                                {person?.name.split(' ')[0]}
                              </span>
                              <span className="font-mono font-bold shrink-0">
                                {assn.locationCode === 'KANTOR'
                                  ? 'KTR'
                                  : `[${assn.locationCode}]`}
                              </span>
                            </button>
                          );
                        })}

                      {locationFilter === 'ALL' && !holiday && (
                        <div className="text-[10px] text-slate-500 pt-0.5 px-1">
                          +
                          {
                            dayAssns.filter((a) => a.locationCode === 'KANTOR')
                              .length
                          }{' '}
                          Kantor BPPD
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Cell Assignment Editor Modal */}
      {editingCell && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="bg-white rounded-xl border border-slate-200 max-w-lg w-full p-6 shadow-xl">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Ubah Penugasan Jadwal ASN
                </h3>
                <p className="text-xs text-slate-600 mt-0.5">
                  {state.staff.find((s) => s.id === editingCell.staffId)?.name}{' '}
                  · {formatIndonesianDate(editingCell.date, true)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEditingCell(null)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="mt-4 space-y-4">
              {(() => {
                const cellHoliday = getHolidayForDate(
                  editingCell.date,
                  state.holidays
                );
                if (!cellHoliday) return null;
                return (
                  <div
                    className={`rounded-lg border p-3 text-xs flex items-start gap-2.5 ${
                      cellHoliday.type === 'LIBUR_NASIONAL'
                        ? 'bg-rose-50 border-rose-200 text-rose-900'
                        : 'bg-amber-50 border-amber-200 text-amber-900'
                    }`}
                  >
                    <CalendarOff className="w-4 h-4 shrink-0 mt-0.5" />
                    <div>
                      <div className="font-bold">
                        {getHolidayTypeLabel(cellHoliday.type)}:{' '}
                        {cellHoliday.name}
                      </div>
                      <div className="text-[11px] mt-0.5 opacity-90">
                        Layanan Kantor BPPD dan MPP tidak beroperasi pada
                        tanggal libur nasional / cuti bersama.
                      </div>
                    </div>
                  </div>
                );
              })()}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Titik Lokasi Pelayanan
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {(['KANTOR', 'L', 'S'] as LocationCode[]).map((code) => {
                    const info = SERVICE_LOCATIONS[code];
                    const selected = editLocation === code;
                    const cellHoliday = getHolidayForDate(
                      editingCell.date,
                      state.holidays
                    );
                    const isOpen = isLocationOpenOnDate(
                      code,
                      editingCell.date,
                      state.holidays
                    );
                    const quota = getDailyLocationQuota(
                      code,
                      editingCell.date,
                      state.staff.filter((s) => s.active).length,
                      state.holidays
                    );
                    return (
                      <button
                        key={code}
                        type="button"
                        onClick={() => setEditLocation(code)}
                        className={`p-2.5 rounded-lg border text-left transition-colors ${
                          selected
                            ? 'border-blue-900 bg-blue-50 ring-1 ring-blue-900'
                            : 'border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        <div className="text-xs font-bold text-slate-900">
                          {code === 'KANTOR' ? 'Kantor BPPD' : `[${code}]`}
                        </div>
                        <div className="text-[11px] text-slate-600 truncate">
                          {info.name}
                        </div>
                        <div
                          className={`text-[10px] mt-1 ${
                            isOpen ? 'text-slate-500' : 'text-rose-700 font-semibold'
                          }`}
                        >
                          {cellHoliday
                            ? getHolidayTypeLabel(cellHoliday.type)
                            : isOpen
                            ? `Kuota hari ini: ${quota} orang`
                            : 'Tutup (Khusus Sel & Kam)'}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Sesi Dinas
                  </label>
                  <select
                    value={editSession}
                    onChange={(e) =>
                      setEditSession(e.target.value as ShiftSession)
                    }
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white"
                  >
                    <option value="PAGI_SORE">Penuh (07.30 – 15.30 WIB)</option>
                    <option value="SESI_1">Sesi Pagi (07.30 – 12.00 WIB)</option>
                    <option value="SESI_2">Sesi Siang (12.00 – 15.30 WIB)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Catatan Tugas (Opsional)
                  </label>
                  <input
                    type="text"
                    value={editNotes}
                    onChange={(e) => setEditNotes(e.target.value)}
                    placeholder="Contoh: Loket BPHTB / PBB"
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
                  />
                </div>
              </div>

              {/* Optional toggle to demonstrate Double-Booking Conflict validation */}
              <label className="flex items-center gap-2 text-xs text-slate-600 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={simulateDoubleBooking}
                  onChange={(e) => setSimulateDoubleBooking(e.target.checked)}
                  className="rounded border-slate-300 text-blue-900"
                />
                <span>
                  Tambahkan sebagai penugasan kedua (uji validasi jadwal ganda)
                </span>
              </label>

              {/* Real-Time Conflict Preview Box */}
              {proposedConflicts.length > 0 ? (
                <div
                  className={`rounded-lg border p-3 space-y-2 ${
                    blockingConflicts.length > 0
                      ? 'bg-rose-50 border-rose-200'
                      : 'bg-amber-50 border-amber-200'
                  }`}
                >
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-900">
                    <ShieldAlert
                      className={`w-4 h-4 ${
                        blockingConflicts.length > 0
                          ? 'text-rose-700'
                          : 'text-amber-700'
                      }`}
                    />
                    <span>
                      Deteksi Konflik Real-Time ({proposedConflicts.length}{' '}
                      temuan)
                    </span>
                  </div>
                  {proposedConflicts.map((c) => (
                    <div
                      key={c.id}
                      className="text-[11px] text-slate-700 leading-relaxed border-t border-black/5 pt-1.5"
                    >
                      <span
                        className={`font-semibold ${
                          c.severity === 'BLOCKING'
                            ? 'text-rose-700'
                            : 'text-amber-800'
                        }`}
                      >
                        [{c.severity === 'BLOCKING' ? 'BLOKIR' : 'PERINGATAN'}]
                      </span>{' '}
                      {c.title} — {c.description}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 flex items-center gap-2 text-xs text-emerald-800">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>
                    Validasi lolos: Tidak ada jadwal ganda, kuota lokasi
                    terpenuhi, dan rotasi MPP seimbang.
                  </span>
                </div>
              )}
            </div>

            <div className="mt-6 flex flex-wrap items-center justify-between gap-2.5">
              <div>
                {(() => {
                  const existingCellAssignment = state.assignments.find(
                    (a) =>
                      a.date === editingCell.date &&
                      a.staffId === editingCell.staffId
                  );
                  if (!existingCellAssignment) return null;
                  const targetPerson = state.staff.find(
                    (s) => s.id === editingCell.staffId
                  );
                  return (
                    <button
                      type="button"
                      onClick={() => {
                        dispatch({
                          type: 'DELETE_ASSIGNMENT',
                          assignmentId: existingCellAssignment.id,
                        });
                        pushToast({
                          type: 'success',
                          title: 'Jadwal Akun Dihapus',
                          description: `Jadwal ${targetPerson?.name ?? ''} pada ${formatIndonesianDate(
                            editingCell.date
                          )} telah dihapus.`,
                        });
                        setEditingCell(null);
                      }}
                      className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-rose-700 bg-rose-50 border border-rose-200 rounded-lg hover:bg-rose-100"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Hapus Jadwal Ini</span>
                    </button>
                  );
                })()}
              </div>

              <div className="flex flex-wrap items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setEditingCell(null)}
                  className="px-4 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50"
                >
                  Batal
                </button>

                {blockingConflicts.length > 0 ? (
                  <>
                    <button
                      type="button"
                      onClick={() => handleSaveAssignment(true)}
                      className="px-3.5 py-2 text-xs font-semibold text-amber-800 bg-amber-100 border border-amber-300 rounded-lg hover:bg-amber-200"
                    >
                      Simpan Paksa (Uji Konflik)
                    </button>
                    <button
                      type="button"
                      disabled
                      className="px-4 py-2 text-xs font-semibold text-white bg-slate-400 rounded-lg cursor-not-allowed"
                    >
                      Simpan Diblokir
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleSaveAssignment(false)}
                    className="px-4 py-2 text-xs font-semibold text-white bg-blue-900 rounded-lg hover:bg-blue-800"
                  >
                    Simpan Perubahan Jadwal
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Auto-Rotation Modal */}
      {autoRotateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="bg-white rounded-xl border border-slate-200 max-w-md w-full p-6 shadow-xl">
            <h3 className="text-base font-bold text-slate-900">
              Auto-Rotasi Jadwal {formatMonthTitle(state.selectedMonth)}
            </h3>
            <p className="mt-1.5 text-xs text-slate-600 leading-relaxed">
              Algoritma akan menempatkan 1 petugas di MPP Lingkar Timur [L]
              (Senin–Jumat), 1 petugas di MPP Sukodono [S] (khusus Selasa &amp;
              Kamis), dan seluruh sisa petugas di Kantor Utama BPPD secara adil
              tanpa tugas MPP berturut-turut.
            </p>

            {state.selectedMonth === '2026-11' && (
              <label className="mt-4 flex items-start gap-2.5 p-3 rounded-lg bg-slate-50 border border-slate-200 cursor-pointer">
                <input
                  type="checkbox"
                  checked={preserveLockedDates}
                  onChange={(e) => setPreserveLockedDates(e.target.checked)}
                  className="mt-0.5 rounded border-slate-300 text-blue-900"
                />
                <div className="text-xs text-slate-700">
                  <div className="font-semibold">
                    Pertahankan tanggal patokan (2, 3, 10 Nov 2026)
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    Tetap mematuhi ketentuan MPP Sukodono khusus Selasa &amp;
                    Kamis serta MPP Lingkar Timur 1 petugas per hari.
                  </div>
                </div>
              </label>
            )}

            <div className="mt-6 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setAutoRotateModalOpen(false)}
                className="px-4 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleRunAutoRotate}
                className="px-4 py-2 text-xs font-semibold text-white bg-blue-900 rounded-lg hover:bg-blue-800"
              >
                Jalankan Auto-Rotasi
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Master Data Pegawai Modal (Admin Sistem) */}
      {staffModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="bg-white rounded-xl border border-slate-200 max-w-2xl w-full p-6 shadow-xl max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Master Data Pegawai ASN — Pengolah Data &amp; Informasi
                </h3>
                <p className="text-xs text-slate-500">
                  Kelola daftar pegawai aktif BPPD Kabupaten Sidoarjo
                </p>
              </div>
              <button
                type="button"
                onClick={() => setStaffModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="mt-4 overflow-y-auto flex-1 space-y-2">
              {state.staff.map((person) => (
                <div
                  key={person.id}
                  className="flex items-center justify-between p-3 rounded-lg border border-slate-200 text-xs"
                >
                  <div>
                    <div className="font-semibold text-slate-900">
                      {person.name}
                    </div>
                    <div className="font-mono text-[11px] text-slate-500 tabular-nums">
                      NIP {person.nip} · {person.golongan}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      dispatch({
                        type: 'TOGGLE_STAFF_ACTIVE',
                        staffId: person.id,
                      })
                    }
                    className={`px-3 py-1.5 rounded-md font-semibold border ${
                      person.active
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : 'bg-slate-100 text-slate-500 border-slate-200'
                    }`}
                  >
                    {person.active ? 'Aktif' : 'Non-Aktif'}
                  </button>
                </div>
              ))}
            </div>

            <form
              onSubmit={handleAddStaff}
              className="mt-4 pt-4 border-t border-slate-200 grid grid-cols-1 sm:grid-cols-3 gap-2.5"
            >
              <input
                type="text"
                required
                value={newStaffName}
                onChange={(e) => setNewStaffName(e.target.value)}
                placeholder="Nama Lengkap ASN"
                className="px-3 py-2 text-xs border border-slate-300 rounded-lg"
              />
              <input
                type="text"
                required
                value={newStaffNip}
                onChange={(e) => setNewStaffNip(e.target.value)}
                placeholder="NIP (18 digit)"
                className="px-3 py-2 text-xs font-mono border border-slate-300 rounded-lg"
              />
              <button
                type="submit"
                className="inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold text-white bg-blue-900 rounded-lg hover:bg-blue-800"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>Tambah Pegawai</span>
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Holidays & Collective Leave Management Modal */}
      {holidayModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="bg-white rounded-xl border border-slate-200 max-w-2xl w-full p-6 shadow-xl max-h-[90vh] flex flex-col">
            <div className="flex items-start justify-between pb-3 border-b border-slate-200 gap-3">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Kalender Hari Libur Nasional &amp; Cuti Bersama 2026
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Acuan SKB 3 Menteri RI Tahun 2026 · Otomatis menandai jadwal
                  dan mengecualikan rotasi shift
                </p>
              </div>
              <button
                type="button"
                onClick={() => setHolidayModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="mt-4 overflow-y-auto flex-1 space-y-2 pr-1">
              {state.holidays.map((h) => {
                const inSelectedMonth = h.date.startsWith(state.selectedMonth);
                return (
                  <div
                    key={h.date}
                    className={`flex items-center justify-between gap-3 p-3 rounded-lg border text-xs ${
                      inSelectedMonth
                        ? 'border-blue-300 bg-blue-50/40'
                        : 'border-slate-200 bg-white'
                    }`}
                  >
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono font-semibold text-slate-900">
                          {formatIndonesianDate(h.date, true)}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                            h.type === 'LIBUR_NASIONAL'
                              ? 'bg-rose-50 text-rose-800 border-rose-200'
                              : 'bg-amber-50 text-amber-800 border-amber-200'
                          }`}
                        >
                          {getHolidayTypeLabel(h.type)}
                        </span>
                        {inSelectedMonth && (
                          <span className="px-1.5 py-0.5 rounded bg-blue-900 text-white text-[10px] font-semibold">
                            Bulan Aktif
                          </span>
                        )}
                      </div>
                      <div className="font-semibold text-slate-800 mt-1">
                        {h.name}
                      </div>
                      {h.basis && (
                        <div className="text-[11px] text-slate-500">
                          Dasar: {h.basis}
                        </div>
                      )}
                    </div>

                    {canEdit && (
                      <button
                        type="button"
                        onClick={() => {
                          dispatch({ type: 'REMOVE_HOLIDAY', date: h.date });
                          pushToast({
                            type: 'info',
                            title: 'Hari Libur / Cuti Dihapus',
                            description: `${formatIndonesianDate(h.date)} (${h.name}) dihapus dari daftar.`,
                          });
                        }}
                        className="p-1.5 text-slate-400 hover:text-rose-700 rounded hover:bg-rose-50 shrink-0"
                        title="Hapus hari libur/cuti bersama ini"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>

            {canEdit && (
              <form
                onSubmit={handleAddHoliday}
                className="mt-4 pt-4 border-t border-slate-200 space-y-3"
              >
                <div className="text-xs font-bold text-slate-800">
                  Tambah Keterangan Libur Nasional / Cuti Bersama Tambahan
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
                  <input
                    type="date"
                    required
                    value={newHolidayDate}
                    onChange={(e) => setNewHolidayDate(e.target.value)}
                    className="sm:col-span-4 px-3 py-2 text-xs font-mono border border-slate-300 rounded-lg"
                  />
                  <select
                    value={newHolidayType}
                    onChange={(e) =>
                      setNewHolidayType(e.target.value as HolidayType)
                    }
                    className="sm:col-span-4 px-3 py-2 text-xs font-semibold border border-slate-300 rounded-lg bg-white"
                  >
                    <option value="LIBUR_NASIONAL">Hari Libur Nasional</option>
                    <option value="CUTI_BERSAMA">Cuti Bersama</option>
                  </select>
                  <button
                    type="submit"
                    className="sm:col-span-4 inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold text-white bg-blue-900 rounded-lg hover:bg-blue-800"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Simpan Tanggal</span>
                  </button>
                </div>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <input
                    type="text"
                    required
                    value={newHolidayName}
                    onChange={(e) => setNewHolidayName(e.target.value)}
                    placeholder="Keterangan (misal: Cuti Bersama Tambahan / Hari Jadi Daerah)"
                    className="flex-1 px-3 py-2 text-xs border border-slate-300 rounded-lg"
                  />
                  <label className="flex items-center gap-1.5 text-[11px] text-slate-600 cursor-pointer shrink-0">
                    <input
                      type="checkbox"
                      checked={clearOnHoliday}
                      onChange={(e) => setClearOnHoliday(e.target.checked)}
                      className="rounded border-slate-300 text-blue-900"
                    />
                    <span>Kosongkan shift di tanggal ini</span>
                  </label>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
