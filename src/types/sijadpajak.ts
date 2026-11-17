export type UserRole = 'ADMIN_SISTEM' | 'KOORDINATOR' | 'ASN' | 'PIMPINAN';

export type DbUserRole = 'admin' | 'koordinator' | 'asn' | 'pimpinan';

export type LocationCode = 'KANTOR' | 'L' | 'S';

export interface ServiceLocation {
  id?: string;
  code: LocationCode;
  name: string;
  shortLabel: string;
  dailyQuota: number;
  operationalDaysLabel: string;
  address: string;
  coordinates: string;
  qrCodeId: string;
  operationalHours: string;
}

export interface StaffMember {
  id: string;
  username?: string;
  name: string;
  nip: string;
  email?: string;
  role?: DbUserRole;
  jabatan: string;
  golongan: string;
  phone: string;
  active: boolean;
}

export interface UserAccount {
  id: string;
  username: string;
  nip: string;
  email: string;
  fullName: string;
  role: UserRole;
  jabatan: string;
  golongan: string;
  phone: string;
  password: string;
  active: boolean;
  createdAt: string;
}

export type ShiftSession = 'PAGI_SORE' | 'SESI_1' | 'SESI_2';

export interface ScheduleAssignment {
  id: string;
  date: string; // YYYY-MM-DD
  staffId: string;
  locationCode: LocationCode;
  locationId?: string;
  session: ShiftSession;
  status?: 'SCHEDULED' | 'SWAPPED' | 'ABSENT';
  notes?: string;
  updatedAt: string;
  updatedBy: string;
}

export interface AttendanceRecord {
  id: string;
  scheduleId?: string;
  date: string; // YYYY-MM-DD
  staffId: string;
  locationCode: LocationCode;
  checkInTime: string; // HH:mm:ss
  checkOutTime?: string; // HH:mm:ss
  qrVerified: boolean;
  geofenceStatus: 'TERVERIFIKASI' | 'LUAR_RADIUS';
  distanceMeters: number;
  operationalNote: string;
  status: 'HADIR' | 'SELESAI' | 'TERLAMBAT';
}

export type SwapStatus = 'MENUNGGU' | 'DISETUJUI' | 'DITOLAK';

export interface SwapRequest {
  id: string;
  requesterId: string;
  requesterScheduleId?: string;
  requesterDate: string;
  requesterLocation: LocationCode;
  targetStaffId: string;
  targetScheduleId?: string;
  targetDate: string;
  targetLocation: LocationCode;
  reason: string;
  status: SwapStatus;
  createdAt: string;
  reviewedAt?: string;
  reviewedBy?: string;
  reviewNote?: string;
}

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  actorName: string;
  actorRole: UserRole;
  category: 'JADWAL' | 'TUKAR_JADWAL' | 'ABSENSI' | 'MASTER_DATA' | 'SISTEM';
  action: string;
  detail: string;
}

export type HolidayType = 'LIBUR_NASIONAL' | 'CUTI_BERSAMA';

export interface HolidayEntry {
  date: string; // YYYY-MM-DD
  type: HolidayType;
  name: string;
  basis?: string;
}

export type ConflictSeverity = 'BLOCKING' | 'WARNING';

export type ConflictRuleType =
  | 'DOUBLE_BOOKING'
  | 'QUOTA_EXCEEDED'
  | 'OPERATIONAL_DAY_CLOSED'
  | 'HOLIDAY_CONFLICT'
  | 'CONSECUTIVE_MPP'
  | 'UNASSIGNED_STAFF';

export interface ConflictAlert {
  id: string;
  date: string;
  rule: ConflictRuleType;
  severity: ConflictSeverity;
  title: string;
  description: string;
  affectedStaffIds: string[];
  locationCode?: LocationCode;
  suggestion: string;
}

export type ActiveModule =
  | 'dashboard'
  | 'schedule'
  | 'conflicts'
  | 'attendance'
  | 'swaps'
  | 'reports'
  | 'accounts';

export type AuthMode = 'unauthenticated' | 'supabase' | 'demo';

export interface AppState {
  activeRole: UserRole;
  activeStaffId: string;
  loggedInAccountId?: string | null;
  activeModule: ActiveModule;
  selectedMonth: string; // YYYY-MM
  staff: StaffMember[];
  accounts: UserAccount[];
  locationIdMap: Record<LocationCode, string>;
  holidays: HolidayEntry[];
  assignments: ScheduleAssignment[];
  attendance: AttendanceRecord[];
  swaps: SwapRequest[];
  auditLogs: AuditLogEntry[];
}
