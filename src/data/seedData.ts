import {
  AppState,
  AttendanceRecord,
  AuditLogEntry,
  StaffMember,
  SwapRequest,
  UserAccount,
} from '../types/sijadpajak';
import {
  generateBalancedMonthSchedule,
  getWorkingDaysInMonth,
  OFFICIAL_HOLIDAYS_2026,
  TODAY_ISO,
} from '../utils/scheduleEngine';

export const SEED_STAFF: StaffMember[] = [
  {
    id: 'asn-1',
    username: 'bellina',
    name: 'Bellina Reggita Sari',
    nip: '199801012022032001',
    email: 'bellina.sari@bppd.sidoarjokab.go.id',
    role: 'asn',
    jabatan: 'ASN Pengolah Data dan Informasi',
    golongan: 'Penata Muda (III/a)',
    phone: '0812-3456-1001',
    active: true,
  },
  {
    id: 'asn-2',
    username: 'diva',
    name: 'Diva Trifindaardy Palupi',
    nip: '199802022022032002',
    email: 'diva.palupi@bppd.sidoarjokab.go.id',
    role: 'asn',
    jabatan: 'ASN Pengolah Data dan Informasi',
    golongan: 'Penata Muda (III/a)',
    phone: '0812-3456-1002',
    active: true,
  },
  {
    id: 'asn-3',
    username: 'putri',
    name: 'Putri Ratih',
    nip: '199803032022032003',
    email: 'putri.ratih@bppd.sidoarjokab.go.id',
    role: 'asn',
    jabatan: 'ASN Pengolah Data dan Informasi',
    golongan: 'Penata Muda (III/a)',
    phone: '0812-3456-1003',
    active: true,
  },
  {
    id: 'asn-4',
    username: 'rahma',
    name: 'Rahma Agustin Rahayu',
    nip: '199804042022032004',
    email: 'rahma.rahayu@bppd.sidoarjokab.go.id',
    role: 'asn',
    jabatan: 'ASN Pengolah Data dan Informasi',
    golongan: 'Penata Muda (III/a)',
    phone: '0812-3456-1004',
    active: true,
  },
  {
    id: 'asn-5',
    username: 'novita',
    name: 'Novita',
    nip: '199805052022032005',
    email: 'novita@bppd.sidoarjokab.go.id',
    role: 'asn',
    jabatan: 'ASN Pengolah Data dan Informasi',
    golongan: 'Penata Muda (III/a)',
    phone: '0812-3456-1005',
    active: true,
  },
  {
    id: 'asn-6',
    username: 'viona',
    name: 'Viona',
    nip: '199806062022032006',
    email: 'viona@bppd.sidoarjokab.go.id',
    role: 'asn',
    jabatan: 'ASN Pengolah Data dan Informasi',
    golongan: 'Penata Muda (III/a)',
    phone: '0812-3456-1006',
    active: true,
  },
  {
    id: 'asn-7',
    username: 'reza',
    name: 'Reza',
    nip: '199907192023031001',
    email: 'reza@bppd.sidoarjokab.go.id',
    role: 'asn',
    jabatan: 'ASN Pengolah Data dan Informasi',
    golongan: 'Pengatur (II/c)',
    phone: '0812-3456-1007',
    active: true,
  },
];

export const SEED_ACCOUNTS: UserAccount[] = [
  {
    id: 'acc-admin',
    username: 'admin',
    nip: '199001012015031001',
    email: 'admin.sijadpajak@bppd.sidoarjokab.go.id',
    fullName: 'Admin Sistem SIJADPAJAK',
    role: 'ADMIN_SISTEM',
    jabatan: 'Administrator Sistem Informasi',
    golongan: 'Penata Muda Tk. I (III/b)',
    phone: '0812-3456-2003',
    password: 'admin123',
    active: true,
    createdAt: '2026-11-01T07:00:00',
  },
  {
    id: 'acc-koord',
    username: 'koordinator',
    nip: '198504122010011001',
    email: 'koordinator@bppd.sidoarjokab.go.id',
    fullName: 'Koordinator Pelayanan BPPD',
    role: 'KOORDINATOR',
    jabatan: 'Koordinator Pelayanan Pajak Daerah',
    golongan: 'Penata (III/c)',
    phone: '0812-3456-2001',
    password: 'koord123',
    active: true,
    createdAt: '2026-11-01T07:00:00',
  },
  {
    id: 'acc-pimpinan',
    username: 'pimpinan',
    nip: '198008172006041002',
    email: 'kabid.pdi@bppd.sidoarjokab.go.id',
    fullName: 'Kepala Bidang PDI (Pimpinan)',
    role: 'PIMPINAN',
    jabatan: 'Kepala Bidang Pengolahan Data & Informasi',
    golongan: 'Pembina (IV/a)',
    phone: '0812-3456-2002',
    password: 'pimpinan123',
    active: true,
    createdAt: '2026-11-01T07:00:00',
  },
  ...SEED_STAFF.map((s) => ({
    id: s.id,
    username: s.username || s.name.split(' ')[0].toLowerCase(),
    nip: s.nip,
    email: s.email || `${s.id}@bppd.sidoarjokab.go.id`,
    fullName: s.name,
    role: 'ASN' as const,
    jabatan: s.jabatan,
    golongan: s.golongan,
    phone: s.phone,
    password: 'bppd123',
    active: s.active,
    createdAt: '2026-11-01T07:00:00',
  })),
];

export function createSeedState(): AppState {
  const novAssignments = generateBalancedMonthSchedule(
    '2026-11',
    SEED_STAFF,
    'Koordinator Pelayanan',
    true,
    OFFICIAL_HOLIDAYS_2026
  );

  const decAssignments = generateBalancedMonthSchedule(
    '2026-12',
    SEED_STAFF,
    'Koordinator Pelayanan',
    false,
    OFFICIAL_HOLIDAYS_2026
  );

  const allAssignments = [...novAssignments, ...decAssignments];

  const workingDaysNov = getWorkingDaysInMonth('2026-11');
  const attendance: AttendanceRecord[] = [];
  const checkInSamples = ['07:22:14', '07:26:40', '07:29:05', '07:31:18', '07:24:51', '07:28:12', '07:34:09'];
  const checkOutSamples = ['15:31:04', '15:34:22', '15:32:45', '15:38:10', '15:30:55', '15:35:19', '15:33:41'];

  const notesByLoc = {
    KANTOR: 'Verifikasi berkas SPPT PBB-P2 dan validasi BPHTB loket utama.',
    L: 'Pelayanan konsultasi wajib pajak daerah dan cetak salinan NJOP di MPP Lingkar Timur.',
    S: 'Pelayanan registrasi objek pajak baru dan pemutakhiran data di MPP Sukodono.',
  };

  workingDaysNov.forEach((date) => {
    if (date < TODAY_ISO) {
      const dayAssns = novAssignments.filter((a) => a.date === date);
      dayAssns.forEach((assn, idx) => {
        if (date === '2026-11-12' && assn.staffId === 'asn-6') return;
        const isLate = date === '2026-11-06' && idx === 6;
        attendance.push({
          id: `att-${date}-${assn.staffId}`,
          date,
          staffId: assn.staffId,
          locationCode: assn.locationCode,
          checkInTime: isLate ? '08:07:33' : checkInSamples[idx % checkInSamples.length],
          checkOutTime: checkOutSamples[idx % checkOutSamples.length],
          qrVerified: true,
          geofenceStatus: 'TERVERIFIKASI',
          distanceMeters: 12 + (idx * 7) % 28,
          operationalNote: notesByLoc[assn.locationCode],
          status: isLate ? 'TERLAMBAT' : 'SELESAI',
        });
      });
    } else if (date === TODAY_ISO) {
      const todayAssns = novAssignments.filter((a) => a.date === TODAY_ISO);
      todayAssns.forEach((assn, idx) => {
        if (assn.staffId === 'asn-1' || assn.staffId === 'asn-4') return;
        attendance.push({
          id: `att-${TODAY_ISO}-${assn.staffId}`,
          date: TODAY_ISO,
          staffId: assn.staffId,
          locationCode: assn.locationCode,
          checkInTime: checkInSamples[idx % checkInSamples.length],
          qrVerified: true,
          geofenceStatus: 'TERVERIFIKASI',
          distanceMeters: 8 + (idx * 5) % 24,
          operationalNote: notesByLoc[assn.locationCode],
          status: 'HADIR',
        });
      });
    }
  });

  const findLoc = (staffId: string, date: string) =>
    novAssignments.find((a) => a.staffId === staffId && a.date === date)?.locationCode || 'KANTOR';

  const swaps: SwapRequest[] = [
    {
      id: 'swp-001',
      requesterId: 'asn-4',
      requesterDate: '2026-11-19',
      requesterLocation: findLoc('asn-4', '2026-11-19'),
      targetStaffId: 'asn-5',
      targetDate: '2026-11-20',
      targetLocation: findLoc('asn-5', '2026-11-20'),
      reason: 'Mengikuti diklat teknis pengelolaan basis data PBB-P2 tingkat kabupaten pada tanggal 19 November.',
      status: 'MENUNGGU',
      createdAt: '2026-11-15T14:20:00',
    },
    {
      id: 'swp-002',
      requesterId: 'asn-3',
      requesterDate: '2026-11-23',
      requesterLocation: findLoc('asn-3', '2026-11-23'),
      targetStaffId: 'asn-7',
      targetDate: '2026-11-24',
      targetLocation: findLoc('asn-7', '2026-11-24'),
      reason: 'Penyesuaian jadwal tugas lapangan verifikasi objek pajak daerah wilayah barat.',
      status: 'MENUNGGU',
      createdAt: '2026-11-16T08:15:00',
    },
    {
      id: 'swp-003',
      requesterId: 'asn-2',
      requesterDate: '2026-11-11',
      requesterLocation: findLoc('asn-2', '2026-11-11'),
      targetStaffId: 'asn-6',
      targetDate: '2026-11-12',
      targetLocation: findLoc('asn-6', '2026-11-12'),
      reason: 'Keperluan administrasi kepegawaian di BKD Kabupaten Sidoarjo.',
      status: 'DISETUJUI',
      createdAt: '2026-11-09T09:10:00',
      reviewedAt: '2026-11-09T11:30:00',
      reviewedBy: 'Koordinator Pelayanan',
      reviewNote: 'Disetujui sesuai kuota harian MPP dan tidak menimbulkan jadwal berturut-turut.',
    },
  ];

  const auditLogs: AuditLogEntry[] = [
    {
      id: 'aud-001',
      timestamp: '2026-11-01T07:30:00',
      actorName: 'Koordinator Pelayanan',
      actorRole: 'KOORDINATOR',
      category: 'JADWAL',
      action: 'Penerbitan Jadwal Bulanan November 2026',
      detail: 'Matriks jadwal operasional 7 ASN Pengolah Data dan Informasi pada 3 titik layanan berhasil diterbitkan.',
    },
    {
      id: 'aud-002',
      timestamp: '2026-11-09T11:30:00',
      actorName: 'Koordinator Pelayanan',
      actorRole: 'KOORDINATOR',
      category: 'TUKAR_JADWAL',
      action: 'Persetujuan Tukar Jadwal #SWP-003',
      detail: 'Menyetujui pertukaran jadwal antara Diva Trifindaardy Palupi (11 Nov) dan Viona (12 Nov).',
    },
    {
      id: 'aud-003',
      timestamp: '2026-11-16T07:24:51',
      actorName: 'Diva Trifindaardy Palupi',
      actorRole: 'ASN',
      category: 'ABSENSI',
      action: 'Check-In QR Terverifikasi',
      detail: 'Presensi pagi berhasil dicatat melalui pemindaian QR dan verifikasi radius lokasi layanan.',
    },
    {
      id: 'aud-004',
      timestamp: '2026-11-16T08:15:00',
      actorName: 'Putri Ratih',
      actorRole: 'ASN',
      category: 'TUKAR_JADWAL',
      action: 'Pengajuan Tukar Jadwal #SWP-002',
      detail: 'Mengajukan permohonan tukar jadwal tanggal 23 Nov 2026 dengan Reza (24 Nov 2026).',
    },
  ];

  return {
    activeRole: 'ADMIN_SISTEM',
    activeStaffId: 'asn-1',
    loggedInAccountId: 'acc-admin',
    activeModule: 'dashboard',
    selectedMonth: '2026-11',
    staff: SEED_STAFF,
    accounts: SEED_ACCOUNTS,
    locationIdMap: {
      KANTOR: '00000000-0000-0000-0000-000000000101',
      L: '00000000-0000-0000-0000-000000000102',
      S: '00000000-0000-0000-0000-000000000103',
    },
    holidays: OFFICIAL_HOLIDAYS_2026,
    assignments: allAssignments,
    attendance,
    swaps,
    auditLogs,
  };
}
