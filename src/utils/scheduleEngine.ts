import {
  ConflictAlert,
  HolidayEntry,
  HolidayType,
  LocationCode,
  ScheduleAssignment,
  ServiceLocation,
  StaffMember,
} from '../types/sijadpajak';

export const SERVICE_LOCATIONS: Record<LocationCode, ServiceLocation> = {
  KANTOR: {
    code: 'KANTOR',
    name: 'Kantor Utama BPPD',
    shortLabel: 'KANTOR',
    dailyQuota: 6,
    operationalDaysLabel: 'Senin – Jumat (Sisanya di Kantor)',
    address: 'Jl. Pahlawan No. 56, Sidoarjo',
    coordinates: '-7.4478, 112.7183',
    qrCodeId: 'QR-BPPD-KANTOR-01',
    operationalHours: 'Sen–Jum, 07.30 – 15.30 WIB',
  },
  L: {
    code: 'L',
    name: 'MPP Lingkar Timur',
    shortLabel: 'MPP Lingkar Timur [L]',
    dailyQuota: 1,
    operationalDaysLabel: 'Senin – Jumat (1 Petugas/hari)',
    address: 'Jl. Lingkar Timur KM 2, Buduran, Sidoarjo',
    coordinates: '-7.4342, 112.7429',
    qrCodeId: 'QR-MPP-LTIMUR-02',
    operationalHours: 'Sen–Jum, 08.00 – 15.00 WIB',
  },
  S: {
    code: 'S',
    name: 'MPP Sukodono',
    shortLabel: 'MPP Sukodono [S]',
    dailyQuota: 1,
    operationalDaysLabel: 'Khusus Selasa & Kamis (1 Petugas/hari)',
    address: 'Jl. Raya Sukodono No. 18, Sukodono, Sidoarjo',
    coordinates: '-7.4021, 112.6684',
    qrCodeId: 'QR-MPP-SUKODONO-03',
    operationalHours: 'Sel & Kam, 08.00 – 15.00 WIB',
  },
};

export const TODAY_ISO = '2026-11-16';

// Daftar Hari Libur Nasional & Cuti Bersama Tahun 2026 (SKB 3 Menteri RI)
export const OFFICIAL_HOLIDAYS_2026: HolidayEntry[] = [
  { date: '2026-01-01', type: 'LIBUR_NASIONAL', name: 'Tahun Baru 2026 Masehi', basis: 'SKB 3 Menteri 2026' },
  { date: '2026-01-16', type: 'LIBUR_NASIONAL', name: 'Isra Mikraj Nabi Muhammad SAW', basis: 'SKB 3 Menteri 2026' },
  { date: '2026-02-16', type: 'CUTI_BERSAMA', name: 'Tahun Baru Imlek 2577 Kongzili', basis: 'SKB 3 Menteri 2026' },
  { date: '2026-02-17', type: 'LIBUR_NASIONAL', name: 'Tahun Baru Imlek 2577 Kongzili', basis: 'SKB 3 Menteri 2026' },
  { date: '2026-03-18', type: 'CUTI_BERSAMA', name: 'Hari Suci Nyepi (Tahun Baru Saka 1948)', basis: 'SKB 3 Menteri 2026' },
  { date: '2026-03-19', type: 'LIBUR_NASIONAL', name: 'Hari Suci Nyepi (Tahun Baru Saka 1948)', basis: 'SKB 3 Menteri 2026' },
  { date: '2026-03-20', type: 'CUTI_BERSAMA', name: 'Hari Raya Idulfitri 1447 Hijriah', basis: 'SKB 3 Menteri 2026' },
  { date: '2026-03-21', type: 'LIBUR_NASIONAL', name: 'Hari Raya Idulfitri 1447 Hijriah', basis: 'SKB 3 Menteri 2026' },
  { date: '2026-03-22', type: 'LIBUR_NASIONAL', name: 'Hari Raya Idulfitri 1447 Hijriah', basis: 'SKB 3 Menteri 2026' },
  { date: '2026-03-23', type: 'CUTI_BERSAMA', name: 'Hari Raya Idulfitri 1447 Hijriah', basis: 'SKB 3 Menteri 2026' },
  { date: '2026-03-24', type: 'CUTI_BERSAMA', name: 'Hari Raya Idulfitri 1447 Hijriah', basis: 'SKB 3 Menteri 2026' },
  { date: '2026-04-03', type: 'LIBUR_NASIONAL', name: 'Wafat Yesus Kristus (Jumat Agung)', basis: 'SKB 3 Menteri 2026' },
  { date: '2026-04-05', type: 'LIBUR_NASIONAL', name: 'Hari Kebangkitan Yesus Kristus (Paskah)', basis: 'SKB 3 Menteri 2026' },
  { date: '2026-05-01', type: 'LIBUR_NASIONAL', name: 'Hari Buruh Internasional', basis: 'SKB 3 Menteri 2026' },
  { date: '2026-05-14', type: 'LIBUR_NASIONAL', name: 'Kenaikan Yesus Kristus', basis: 'SKB 3 Menteri 2026' },
  { date: '2026-05-15', type: 'CUTI_BERSAMA', name: 'Kenaikan Yesus Kristus', basis: 'SKB 3 Menteri 2026' },
  { date: '2026-05-27', type: 'LIBUR_NASIONAL', name: 'Hari Raya Iduladha 1447 Hijriah', basis: 'SKB 3 Menteri 2026' },
  { date: '2026-05-31', type: 'LIBUR_NASIONAL', name: 'Hari Raya Waisak 2570 BE', basis: 'SKB 3 Menteri 2026' },
  { date: '2026-06-01', type: 'LIBUR_NASIONAL', name: 'Hari Lahir Pancasila', basis: 'SKB 3 Menteri 2026' },
  { date: '2026-06-16', type: 'LIBUR_NASIONAL', name: '1 Muharam Tahun Baru Islam 1448 Hijriah', basis: 'SKB 3 Menteri 2026' },
  { date: '2026-08-17', type: 'LIBUR_NASIONAL', name: 'Proklamasi Kemerdekaan Republik Indonesia', basis: 'SKB 3 Menteri 2026' },
  { date: '2026-08-25', type: 'LIBUR_NASIONAL', name: 'Maulid Nabi Muhammad SAW', basis: 'SKB 3 Menteri 2026' },
  { date: '2026-12-24', type: 'CUTI_BERSAMA', name: 'Kelahiran Yesus Kristus (Hari Raya Natal)', basis: 'SKB 3 Menteri 2026' },
  { date: '2026-12-25', type: 'LIBUR_NASIONAL', name: 'Kelahiran Yesus Kristus (Hari Raya Natal)', basis: 'SKB 3 Menteri 2026' },
];

export function getHolidayForDate(
  isoDate: string,
  holidays: HolidayEntry[] = OFFICIAL_HOLIDAYS_2026
): HolidayEntry | undefined {
  return holidays.find((h) => h.date === isoDate);
}

export function getHolidayTypeLabel(type: HolidayType): string {
  return type === 'LIBUR_NASIONAL' ? 'Libur Nasional' : 'Cuti Bersama';
}

export function formatHolidayDescription(holiday: HolidayEntry): string {
  return `${getHolidayTypeLabel(holiday.type)}: ${holiday.name}`;
}

export function getHolidaysInMonth(
  yearMonth: string,
  holidays: HolidayEntry[] = OFFICIAL_HOLIDAYS_2026
): HolidayEntry[] {
  return holidays
    .filter((h) => h.date.startsWith(yearMonth))
    .sort((a, b) => a.date.localeCompare(b.date));
}

export function getDayOfWeekFromIso(isoDate: string): number {
  const [y, m, d] = isoDate.split('-').map(Number);
  if (!y || !m || !d) return 1;
  return new Date(y, m - 1, d).getDay(); // 0=Sun, 1=Mon, 2=Tue, 3=Wed, 4=Thu, 5=Fri, 6=Sat
}

export function isLocationOpenOnDate(
  locationCode: LocationCode,
  isoDate: string,
  holidays: HolidayEntry[] = OFFICIAL_HOLIDAYS_2026
): boolean {
  if (getHolidayForDate(isoDate, holidays)) return false;
  const dow = getDayOfWeekFromIso(isoDate);
  if (dow === 0 || dow === 6) return false;
  if (locationCode === 'S') {
    // MPP Sukodono hanya beroperasi hari Selasa (2) dan Kamis (4)
    return dow === 2 || dow === 4;
  }
  // Kantor Utama & MPP Lingkar Timur beroperasi Senin–Jumat
  return dow >= 1 && dow <= 5;
}

export function getDailyLocationQuota(
  locationCode: LocationCode,
  isoDate: string,
  activeStaffCount = 7,
  holidays: HolidayEntry[] = OFFICIAL_HOLIDAYS_2026
): number {
  if (!isLocationOpenOnDate(locationCode, isoDate, holidays)) return 0;
  if (locationCode === 'L') return 1;
  if (locationCode === 'S') return 1;
  // Sisanya di kantor: total ASN aktif dikurangi petugas MPP hari itu (1 L, dan 1 S jika Sel/Kam)
  const mppNeeded = 1 + (isLocationOpenOnDate('S', isoDate, holidays) ? 1 : 0);
  return Math.max(1, activeStaffCount - mppNeeded);
}

export function getWorkingDaysInMonth(yearMonth: string): string[] {
  const [yearStr, monthStr] = yearMonth.split('-');
  const year = Number(yearStr);
  const month = Number(monthStr);
  if (!year || !month) return [];

  const daysInMonth = new Date(year, month, 0).getDate();
  const workingDays: string[] = [];

  for (let day = 1; day <= daysInMonth; day++) {
    const d = new Date(year, month - 1, day);
    const dow = d.getDay();
    if (dow >= 1 && dow <= 5) {
      const mm = String(month).padStart(2, '0');
      const dd = String(day).padStart(2, '0');
      workingDays.push(`${year}-${mm}-${dd}`);
    }
  }
  return workingDays;
}

export function getEffectiveWorkingDaysInMonth(
  yearMonth: string,
  holidays: HolidayEntry[] = OFFICIAL_HOLIDAYS_2026
): string[] {
  return getWorkingDaysInMonth(yearMonth).filter(
    (d) => !getHolidayForDate(d, holidays)
  );
}

export function getCalendarDaysGrid(yearMonth: string): Array<{
  date: string | null;
  dayNumber: number | null;
  isWeekend: boolean;
}> {
  const [yearStr, monthStr] = yearMonth.split('-');
  const year = Number(yearStr);
  const month = Number(monthStr);
  const firstDay = new Date(year, month - 1, 1);
  const daysInMonth = new Date(year, month, 0).getDate();

  const startOffset = (firstDay.getDay() + 6) % 7;
  const cells: Array<{
    date: string | null;
    dayNumber: number | null;
    isWeekend: boolean;
  }> = [];

  for (let i = 0; i < startOffset; i++) {
    cells.push({ date: null, dayNumber: null, isWeekend: false });
  }

  for (let day = 1; day <= daysInMonth; day++) {
    const d = new Date(year, month - 1, day);
    const dow = d.getDay();
    const mm = String(month).padStart(2, '0');
    const dd = String(day).padStart(2, '0');
    cells.push({
      date: `${year}-${mm}-${dd}`,
      dayNumber: day,
      isWeekend: dow === 0 || dow === 6,
    });
  }

  while (cells.length % 7 !== 0) {
    cells.push({ date: null, dayNumber: null, isWeekend: false });
  }

  return cells;
}

export function formatIndonesianDate(isoDate: string, includeDay = false): string {
  const [y, m, d] = isoDate.split('-').map(Number);
  if (!y || !m || !d) return isoDate;
  const dateObj = new Date(y, m - 1, d);
  const months = [
    'Januari',
    'Februari',
    'Maret',
    'April',
    'Mei',
    'Juni',
    'Juli',
    'Agustus',
    'September',
    'Oktober',
    'November',
    'Desember',
  ];
  const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
  const base = `${d} ${months[m - 1]} ${y}`;
  return includeDay ? `${days[dateObj.getDay()]}, ${base}` : base;
}

export function formatShortDate(isoDate: string): string {
  const [, m, d] = isoDate.split('-').map(Number);
  const shortMonths = [
    'Jan',
    'Feb',
    'Mar',
    'Apr',
    'Mei',
    'Jun',
    'Jul',
    'Agu',
    'Sep',
    'Okt',
    'Nov',
    'Des',
  ];
  return `${d} ${shortMonths[(m || 1) - 1]}`;
}

export function getDayAbbrev(isoDate: string): string {
  const [y, m, d] = isoDate.split('-').map(Number);
  const dateObj = new Date(y, m - 1, d);
  const days = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
  return days[dateObj.getDay()];
}

export function formatMonthTitle(yearMonth: string): string {
  const [y, m] = yearMonth.split('-').map(Number);
  const months = [
    'Januari',
    'Februari',
    'Maret',
    'April',
    'Mei',
    'Juni',
    'Juli',
    'Agustus',
    'September',
    'Oktober',
    'November',
    'Desember',
  ];
  return `${months[(m || 1) - 1]} ${y}`;
}

export function detectScheduleConflicts(
  assignments: ScheduleAssignment[],
  staffList: StaffMember[],
  monthFilter?: string,
  holidays: HolidayEntry[] = OFFICIAL_HOLIDAYS_2026
): ConflictAlert[] {
  const alerts: ConflictAlert[] = [];
  const activeStaff = staffList.filter((s) => s.active);
  const staffMap = new Map(staffList.map((s) => [s.id, s]));

  const scoped = monthFilter
    ? assignments.filter((a) => a.date.startsWith(monthFilter))
    : assignments;

  const byDate = new Map<string, ScheduleAssignment[]>();
  for (const item of scoped) {
    const list = byDate.get(item.date) || [];
    list.push(item);
    byDate.set(item.date, list);
  }

  const sortedDates = Array.from(byDate.keys()).sort();

  for (const date of sortedDates) {
    const dayItems = byDate.get(date) || [];
    const holiday = getHolidayForDate(date, holidays);

    // 0. Holiday / Cuti Bersama Conflict Check
    if (holiday && dayItems.length > 0) {
      const names = Array.from(
        new Set(dayItems.map((i) => staffMap.get(i.staffId)?.name ?? i.staffId))
      ).join(', ');
      const holidayTypeText = getHolidayTypeLabel(holiday.type);
      alerts.push({
        id: `holiday-${date}`,
        date,
        rule: 'HOLIDAY_CONFLICT',
        severity: 'BLOCKING',
        title: `Penugasan pada ${holidayTypeText}: ${holiday.name}`,
        description: `Tanggal ${formatIndonesianDate(
          date,
          true
        )} bertepatan dengan ${holidayTypeText} (${holiday.name}). Terdapat ${dayItems.length} penugasan terjadwal untuk: ${names}.`,
        affectedStaffIds: Array.from(new Set(dayItems.map((i) => i.staffId))),
        suggestion: `Hapus penugasan pada tanggal ${holidayTypeText.toLowerCase()} ini atau pindahkan ke hari kerja efektif.`,
      });
    }

    // 1. Double-booking per staff on the same date
    const byStaff = new Map<string, ScheduleAssignment[]>();
    for (const item of dayItems) {
      const list = byStaff.get(item.staffId) || [];
      list.push(item);
      byStaff.set(item.staffId, list);
    }

    for (const [staffId, list] of byStaff.entries()) {
      if (list.length > 1) {
        const person = staffMap.get(staffId);
        const locs = list
          .map((l) => SERVICE_LOCATIONS[l.locationCode].name)
          .join(' & ');
        alerts.push({
          id: `double-${date}-${staffId}`,
          date,
          rule: 'DOUBLE_BOOKING',
          severity: 'BLOCKING',
          title: `Jadwal Ganda: ${person?.name ?? staffId}`,
          description: `Pegawai tercatat memiliki ${list.length} penugasan pada tanggal ${formatIndonesianDate(
            date
          )} (${locs}).`,
          affectedStaffIds: [staffId],
          suggestion:
            'Hapus salah satu penugasan ganda agar setiap ASN hanya bertugas di satu lokasi per hari kerja.',
        });
      }
    }

    // 2. Operational Day & Daily Quota Check per Location
    const countByLoc: Record<LocationCode, ScheduleAssignment[]> = {
      KANTOR: [],
      L: [],
      S: [],
    };
    for (const item of dayItems) {
      countByLoc[item.locationCode].push(item);
    }

    // 2a. Check MPP Sukodono closed days (only Tuesday & Thursday, skipping holidays already flagged)
    if (!holiday && countByLoc.S.length > 0 && !isLocationOpenOnDate('S', date, holidays)) {
      const names = countByLoc.S.map(
        (i) => staffMap.get(i.staffId)?.name ?? i.staffId
      ).join(', ');
      alerts.push({
        id: `closed-${date}-S`,
        date,
        rule: 'OPERATIONAL_DAY_CLOSED',
        severity: 'BLOCKING',
        title: `Hari Operasional Tidak Berlaku: MPP Sukodono [S]`,
        description: `MPP Sukodono hanya beroperasi pada hari Selasa dan Kamis (1 petugas). Ditemukan penugasan pada ${formatIndonesianDate(
          date,
          true
        )} untuk: ${names}.`,
        affectedStaffIds: countByLoc.S.map((i) => i.staffId),
        locationCode: 'S',
        suggestion:
          'Pindahkan petugas ke Kantor Utama BPPD atau jadwalkan MPP Sukodono khusus pada hari Selasa/Kamis.',
      });
    }

    // 2b. Quota Check per Location
    if (!holiday) {
      (['L', 'S', 'KANTOR'] as LocationCode[]).forEach((locCode) => {
        const items = countByLoc[locCode];
        const locInfo = SERVICE_LOCATIONS[locCode];
        const quotaForDate = getDailyLocationQuota(
          locCode,
          date,
          activeStaff.length,
          holidays
        );
        if (locCode === 'S' && !isLocationOpenOnDate('S', date, holidays)) {
          return; // Already flagged by OPERATIONAL_DAY_CLOSED
        }
        if (items.length > quotaForDate) {
          const names = items
            .map((i) => staffMap.get(i.staffId)?.name ?? i.staffId)
            .join(', ');
          alerts.push({
            id: `quota-${date}-${locCode}`,
            date,
            rule: 'QUOTA_EXCEEDED',
            severity: 'BLOCKING',
            title: `Kuota Harian Terlampaui: ${locInfo.name}`,
            description: `Penugasan pada ${formatIndonesianDate(
              date,
              true
            )} berjumlah ${items.length} petugas (ketentuan maksimal ${quotaForDate} petugas): ${names}.`,
            affectedStaffIds: items.map((i) => i.staffId),
            locationCode: locCode,
            suggestion: `Sesuaikan menjadi ${quotaForDate} petugas di ${locInfo.name} dan tempatkan sisanya di Kantor Utama BPPD.`,
          });
        }
      });
    }
  }

  // 3. Unfair Consecutive MPP Assignments (L or S on consecutive effective working days)
  const workingDays = monthFilter
    ? getEffectiveWorkingDaysInMonth(monthFilter, holidays)
    : sortedDates.filter((d) => !getHolidayForDate(d, holidays));

  for (const person of activeStaff) {
    let prevMppDate: string | null = null;
    let prevMppLoc: LocationCode | null = null;

    for (let i = 0; i < workingDays.length; i++) {
      const date = workingDays[i];
      const dayItems = (byDate.get(date) || []).filter(
        (a) => a.staffId === person.id
      );
      const mppItem = dayItems.find(
        (a) => a.locationCode === 'L' || a.locationCode === 'S'
      );

      if (mppItem) {
        if (prevMppDate) {
          const prevIdx = workingDays.indexOf(prevMppDate);
          if (prevIdx !== -1 && i - prevIdx === 1) {
            alerts.push({
              id: `consec-${date}-${person.id}`,
              date,
              rule: 'CONSECUTIVE_MPP',
              severity: 'WARNING',
              title: `Penugasan MPP Berturut-turut: ${person.name}`,
              description: `Bertugas di ${
                SERVICE_LOCATIONS[prevMppLoc!].shortLabel
              } pada ${formatShortDate(prevMppDate)} lalu langsung di ${
                SERVICE_LOCATIONS[mppItem.locationCode].shortLabel
              } pada ${formatShortDate(date)}.`,
              affectedStaffIds: [person.id],
              locationCode: mppItem.locationCode,
              suggestion:
                'Pertimbangkan jeda minimal 1 hari kerja di Kantor Utama BPPD untuk pemerataan beban lintas unit.',
            });
          }
        }
        prevMppDate = date;
        prevMppLoc = mppItem.locationCode;
      }
    }
  }

  return alerts;
}

export function generateBalancedMonthSchedule(
  yearMonth: string,
  staffList: StaffMember[],
  actorName: string,
  preserveLockedNovDates = false,
  holidays: HolidayEntry[] = OFFICIAL_HOLIDAYS_2026
): ScheduleAssignment[] {
  const activeStaff = staffList.filter((s) => s.active);
  const workingDays = getEffectiveWorkingDaysInMonth(yearMonth, holidays);
  const results: ScheduleAssignment[] = [];

  const mppCount = new Map<string, number>();
  const lCount = new Map<string, number>();
  const sCount = new Map<string, number>();
  const lastMppDayIndex = new Map<string, number>();

  activeStaff.forEach((s) => {
    mppCount.set(s.id, 0);
    lCount.set(s.id, 0);
    sCount.set(s.id, 0);
    lastMppDayIndex.set(s.id, -99);
  });

  // Anchor dates compliant with:
  // - MPP Lingkar Timur [L]: Mon-Fri, 1 staff
  // - MPP Sukodono [S]: Tue & Thu only, 1 staff
  // - Remainder at KANTOR
  const lockedNovMap: Record<
    string,
    Array<{ staffId: string; locationCode: LocationCode }>
  > = {
    '2026-11-02': [{ staffId: 'asn-4', locationCode: 'L' }], // Sen: Rahma [L], 6 Kantor
    '2026-11-03': [
      { staffId: 'asn-3', locationCode: 'L' }, // Sel: Putri [L]
      { staffId: 'asn-5', locationCode: 'S' }, // Sel: Novita [S]
    ],
    '2026-11-10': [
      { staffId: 'asn-1', locationCode: 'L' }, // Sel: Bellina [L]
      { staffId: 'asn-2', locationCode: 'S' }, // Sel: Diva [S]
    ],
  };

  workingDays.forEach((date, dayIdx) => {
    const dayAssignment = new Map<string, LocationCode>();
    const needSukodono = isLocationOpenOnDate('S', date, holidays); // True only on Tuesday & Thursday (not holiday)

    const pickCandidate = (loc: 'L' | 'S') => {
      const available = activeStaff
        .filter((s) => !dayAssignment.has(s.id))
        .sort((a, b) => {
          const consecA = dayIdx - (lastMppDayIndex.get(a.id) ?? -99) <= 1 ? 100 : 0;
          const consecB = dayIdx - (lastMppDayIndex.get(b.id) ?? -99) <= 1 ? 100 : 0;
          if (consecA !== consecB) return consecA - consecB;

          const totalA = mppCount.get(a.id) || 0;
          const totalB = mppCount.get(b.id) || 0;
          if (totalA !== totalB) return totalA - totalB;

          const locA = (loc === 'L' ? lCount.get(a.id) : sCount.get(a.id)) || 0;
          const locB = (loc === 'L' ? lCount.get(b.id) : sCount.get(b.id)) || 0;
          if (locA !== locB) return locA - locB;

          return a.id.localeCompare(b.id);
        });
      return available[0];
    };

    if (preserveLockedNovDates && lockedNovMap[date]) {
      for (const lock of lockedNovMap[date]) {
        if (activeStaff.some((s) => s.id === lock.staffId)) {
          dayAssignment.set(lock.staffId, lock.locationCode);
          mppCount.set(lock.staffId, (mppCount.get(lock.staffId) || 0) + 1);
          if (lock.locationCode === 'L') {
            lCount.set(lock.staffId, (lCount.get(lock.staffId) || 0) + 1);
          } else if (lock.locationCode === 'S') {
            sCount.set(lock.staffId, (sCount.get(lock.staffId) || 0) + 1);
          }
          lastMppDayIndex.set(lock.staffId, dayIdx);
        }
      }
    } else {
      // 1 petugas untuk MPP Lingkar Timur [L] (Senin - Jumat)
      const chosenL = pickCandidate('L');
      if (chosenL) {
        dayAssignment.set(chosenL.id, 'L');
        mppCount.set(chosenL.id, (mppCount.get(chosenL.id) || 0) + 1);
        lCount.set(chosenL.id, (lCount.get(chosenL.id) || 0) + 1);
        lastMppDayIndex.set(chosenL.id, dayIdx);
      }

      // 1 petugas untuk MPP Sukodono [S] (Khusus Selasa & Kamis)
      if (needSukodono) {
        const chosenS = pickCandidate('S');
        if (chosenS) {
          dayAssignment.set(chosenS.id, 'S');
          mppCount.set(chosenS.id, (mppCount.get(chosenS.id) || 0) + 1);
          sCount.set(chosenS.id, (sCount.get(chosenS.id) || 0) + 1);
          lastMppDayIndex.set(chosenS.id, dayIdx);
        }
      }
    }

    // Sisanya di Kantor Utama BPPD
    for (const s of activeStaff) {
      if (!dayAssignment.has(s.id)) {
        dayAssignment.set(s.id, 'KANTOR');
      }
    }

    for (const s of activeStaff) {
      const loc = dayAssignment.get(s.id) || 'KANTOR';
      results.push({
        id: `sch-${date}-${s.id}`,
        date,
        staffId: s.id,
        locationCode: loc,
        session: 'PAGI_SORE',
        updatedAt: '2026-11-01T07:30:00',
        updatedBy: actorName,
      });
    }
  });

  return results;
}

export function exportMonthlyReportCSV(
  yearMonth: string,
  staffList: StaffMember[],
  assignments: ScheduleAssignment[],
  holidays: HolidayEntry[] = OFFICIAL_HOLIDAYS_2026
) {
  const workingDays = getWorkingDaysInMonth(yearMonth);
  const monthAssignments = assignments.filter((a) =>
    a.date.startsWith(yearMonth)
  );
  const monthHolidays = getHolidaysInMonth(yearMonth, holidays);

  const headers = [
    'No',
    'Nama Pegawai ASN',
    'NIP',
    'Jabatan',
    'Total Hari Kerja',
    'Kantor Utama BPPD',
    'MPP Lingkar Timur [L]',
    'MPP Sukodono [S]',
    ...workingDays.map((d) => {
      const h = getHolidayForDate(d, holidays);
      return h ? `${d} (${getHolidayTypeLabel(h.type)})` : d;
    }),
  ];

  const rows = staffList.map((s, idx) => {
    const personAssignments = monthAssignments.filter((a) => a.staffId === s.id);
    const kantorCount = personAssignments.filter(
      (a) => a.locationCode === 'KANTOR'
    ).length;
    const lCount = personAssignments.filter((a) => a.locationCode === 'L').length;
    const sCount = personAssignments.filter((a) => a.locationCode === 'S').length;

    const dailyCols = workingDays.map((d) => {
      const found = personAssignments.find((a) => a.date === d);
      if (found) return found.locationCode;
      const h = getHolidayForDate(d, holidays);
      if (h) {
        return h.type === 'LIBUR_NASIONAL' ? 'LIBUR NASIONAL' : 'CUTI BERSAMA';
      }
      return '-';
    });

    return [
      String(idx + 1),
      s.name,
      `'${s.nip}`,
      s.jabatan,
      String(personAssignments.length),
      String(kantorCount),
      String(lCount),
      String(sCount),
      ...dailyCols,
    ];
  });

  const holidayNotes =
    monthHolidays.length > 0
      ? [
          [],
          ['Keterangan Hari Libur Nasional & Cuti Bersama'],
          ...monthHolidays.map((h) => [
            h.date,
            getHolidayTypeLabel(h.type),
            h.name,
            h.basis || 'SKB 3 Menteri',
          ]),
        ]
      : [];

  const csvContent =
    '\uFEFF' +
    [headers, ...rows, ...holidayNotes]
      .map((row) =>
        row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')
      )
      .join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `Rekap_Jadwal_SIJADPAJAK_${yearMonth}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
