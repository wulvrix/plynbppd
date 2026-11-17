import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useReducer,
  useState,
} from 'react';
import { createSeedState, SEED_ACCOUNTS } from '../data/seedData';
import {
  fetchAllSupabaseData,
  mapDbRoleToUiRole,
  mapUiRoleToDbRole,
  sbAddStaffProfile,
  sbBulkUpsertSchedules,
  sbCheckIn,
  sbCheckOut,
  sbCreateAccount,
  sbCreateSwapRequest,
  sbDeleteProfile,
  sbDeleteSchedule,
  sbDeleteSchedulesByUser,
  sbReviewSwapRequest,
  sbToggleStaffActive,
  sbUpdateProfile,
  sbUpsertSchedule,
  signInWithNipOrEmail,
  signOutSupabase,
} from '../lib/sijadpajakService';
import { isSupabaseConfigured, supabase } from '../lib/supabaseClient';
import {
  ActiveModule,
  AppState,
  AttendanceRecord,
  AuditLogEntry,
  AuthMode,
  HolidayEntry,
  LocationCode,
  ScheduleAssignment,
  ShiftSession,
  StaffMember,
  SwapRequest,
  UserAccount,
  UserRole,
} from '../types/sijadpajak';
import {
  formatIndonesianDate,
  generateBalancedMonthSchedule,
  getHolidayTypeLabel,
  OFFICIAL_HOLIDAYS_2026,
  SERVICE_LOCATIONS,
  TODAY_ISO,
} from '../utils/scheduleEngine';

const STORAGE_KEY = 'sijadpajak_bppd_sidoarjo_v3';
const AUTH_MODE_KEY = 'sijadpajak_auth_mode_v1';
const HOLIDAYS_STORAGE_KEY = 'sijadpajak_holidays_v1';

export interface ToastMessage {
  id: string;
  type: 'success' | 'warning' | 'error' | 'info';
  title: string;
  description?: string;
}

export type AppAction =
  | { type: 'SET_ROLE'; role: UserRole }
  | { type: 'SET_ACTIVE_STAFF'; staffId: string }
  | { type: 'SET_MODULE'; module: ActiveModule }
  | { type: 'SET_MONTH'; month: string }
  | {
      type: 'UPSERT_ASSIGNMENT';
      assignment: {
        id?: string;
        date: string;
        staffId: string;
        locationCode: LocationCode;
        session: ShiftSession;
        notes?: string;
      };
      replaceExistingOnDate?: boolean;
    }
  | { type: 'DELETE_ASSIGNMENT'; assignmentId: string }
  | { type: 'AUTO_ROTATE_MONTH'; month: string; preserveLocked: boolean }
  | {
      type: 'CHECK_IN';
      staffId: string;
      locationCode: LocationCode;
      operationalNote: string;
      geofenceStatus: 'TERVERIFIKASI' | 'LUAR_RADIUS';
      distanceMeters: number;
    }
  | {
      type: 'CHECK_OUT';
      attendanceId: string;
      operationalNote: string;
    }
  | {
      type: 'CREATE_SWAP';
      payload: Omit<SwapRequest, 'id' | 'status' | 'createdAt'>;
    }
  | {
      type: 'REVIEW_SWAP';
      swapId: string;
      decision: 'DISETUJUI' | 'DITOLAK';
      reviewNote: string;
    }
  | { type: 'ADD_STAFF'; staff: Omit<StaffMember, 'id'> }
  | { type: 'TOGGLE_STAFF_ACTIVE'; staffId: string }
  | {
      type: 'CREATE_ACCOUNT';
      account: Omit<UserAccount, 'id' | 'createdAt' | 'active'>;
      includeInRoster?: boolean;
    }
  | {
      type: 'UPDATE_ACCOUNT';
      accountId: string;
      patch: Partial<
        Pick<
          UserAccount,
          | 'username'
          | 'fullName'
          | 'nip'
          | 'email'
          | 'role'
          | 'jabatan'
          | 'golongan'
          | 'phone'
          | 'active'
        >
      >;
    }
  | {
      type: 'UPDATE_ACCOUNT_PASSWORD';
      accountId: string;
      newPassword: string;
    }
  | { type: 'DELETE_ACCOUNT'; accountId: string }
  | {
      type: 'DELETE_USER_SCHEDULES';
      userId: string;
      month?: string;
      scheduleIds?: string[];
    }
  | {
      type: 'LOGIN_LOCAL_ACCOUNT';
      account: UserAccount;
    }
  | {
      type: 'UPSERT_HOLIDAY';
      holiday: HolidayEntry;
      clearAssignmentsOnDate?: boolean;
    }
  | { type: 'REMOVE_HOLIDAY'; date: string }
  | { type: 'RESET_DEMO' }
  | {
      type: 'HYDRATE_FROM_SUPABASE';
      payload: {
        staff: StaffMember[];
        accounts: UserAccount[];
        locationIdMap: Record<LocationCode, string>;
        assignments: ScheduleAssignment[];
        attendance: AttendanceRecord[];
        swaps: SwapRequest[];
        auditLogs: AuditLogEntry[];
        activeRole?: UserRole;
        activeStaffId?: string;
      };
    };

function getActorDisplayName(state: AppState): string {
  switch (state.activeRole) {
    case 'ADMIN_SISTEM':
      return 'Admin Sistem BPPD';
    case 'KOORDINATOR':
      return 'Koordinator Pelayanan';
    case 'PIMPINAN':
      return 'Kabid Pengolahan Data (Pimpinan)';
    case 'ASN': {
      const person = state.staff.find((s) => s.id === state.activeStaffId);
      return person ? person.name : 'ASN Pegawai';
    }
  }
}

function nowIsoLocal(): string {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${TODAY_ISO}T${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(
    now.getSeconds()
  )}`;
}

function nowTimeString(): string {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(
    now.getSeconds()
  )}`;
}

function appendAudit(
  state: AppState,
  category: AuditLogEntry['category'],
  action: string,
  detail: string
): AuditLogEntry[] {
  const entry: AuditLogEntry = {
    id: `aud-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    timestamp: nowIsoLocal(),
    actorName: getActorDisplayName(state),
    actorRole: state.activeRole,
    category,
    action,
    detail,
  };
  return [entry, ...state.auditLogs];
}

function reducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'HYDRATE_FROM_SUPABASE':
      return {
        ...state,
        staff: action.payload.staff,
        accounts: action.payload.accounts,
        locationIdMap: action.payload.locationIdMap,
        assignments: action.payload.assignments,
        attendance: action.payload.attendance,
        swaps: action.payload.swaps,
        auditLogs: action.payload.auditLogs,
        activeRole: action.payload.activeRole ?? state.activeRole,
        activeStaffId: action.payload.activeStaffId ?? state.activeStaffId,
      };

    case 'LOGIN_LOCAL_ACCOUNT': {
      const acc = action.account;
      const inRoster = state.staff.some((s) => s.id === acc.id);
      return {
        ...state,
        activeRole: acc.role,
        activeStaffId: inRoster ? acc.id : state.activeStaffId,
        loggedInAccountId: acc.id,
      };
    }

    case 'SET_ROLE':
      return { ...state, activeRole: action.role };

    case 'SET_ACTIVE_STAFF':
      return { ...state, activeStaffId: action.staffId };

    case 'SET_MODULE':
      return { ...state, activeModule: action.module };

    case 'SET_MONTH':
      return { ...state, selectedMonth: action.month };

    case 'UPSERT_ASSIGNMENT': {
      const { assignment, replaceExistingOnDate = true } = action;
      const actor = getActorDisplayName(state);
      const staffMember = state.staff.find((s) => s.id === assignment.staffId);
      const locName = SERVICE_LOCATIONS[assignment.locationCode].name;

      let nextAssignments = [...state.assignments];

      if (assignment.id) {
        nextAssignments = nextAssignments.map((a) =>
          a.id === assignment.id
            ? {
                ...a,
                locationCode: assignment.locationCode,
                session: assignment.session,
                notes: assignment.notes,
                updatedAt: nowIsoLocal(),
                updatedBy: actor,
              }
            : a
        );
      } else {
        if (replaceExistingOnDate) {
          nextAssignments = nextAssignments.filter(
            (a) =>
              !(a.date === assignment.date && a.staffId === assignment.staffId)
          );
        }
        nextAssignments.push({
          id: `sch-${assignment.date}-${assignment.staffId}-${Date.now()}`,
          date: assignment.date,
          staffId: assignment.staffId,
          locationCode: assignment.locationCode,
          session: assignment.session,
          notes: assignment.notes,
          updatedAt: nowIsoLocal(),
          updatedBy: actor,
        });
      }

      return {
        ...state,
        assignments: nextAssignments,
        auditLogs: appendAudit(
          state,
          'JADWAL',
          'Perubahan Penugasan Jadwal',
          `${staffMember?.name ?? assignment.staffId} ditugaskan ke ${locName} pada ${formatIndonesianDate(
            assignment.date
          )}.`
        ),
      };
    }

    case 'DELETE_ASSIGNMENT': {
      const target = state.assignments.find((a) => a.id === action.assignmentId);
      if (!target) return state;
      const person = state.staff.find((s) => s.id === target.staffId);
      return {
        ...state,
        assignments: state.assignments.filter(
          (a) => a.id !== action.assignmentId
        ),
        auditLogs: appendAudit(
          state,
          'JADWAL',
          'Penghapusan Penugasan Ganda',
          `Menghapus jadwal ${person?.name ?? target.staffId} di ${
            SERVICE_LOCATIONS[target.locationCode].name
          } (${formatIndonesianDate(target.date)}).`
        ),
      };
    }

    case 'AUTO_ROTATE_MONTH': {
      const actor = getActorDisplayName(state);
      const generated = generateBalancedMonthSchedule(
        action.month,
        state.staff,
        actor,
        action.preserveLocked,
        state.holidays
      );
      const otherMonths = state.assignments.filter(
        (a) => !a.date.startsWith(action.month)
      );
      return {
        ...state,
        assignments: [...otherMonths, ...generated],
        auditLogs: appendAudit(
          state,
          'JADWAL',
          `Auto-Rotasi Jadwal ${action.month}`,
          `Menghasilkan ${generated.length} entri penugasan seimbang otomatis untuk periode ${action.month} (memperhitungkan Libur Nasional & Cuti Bersama).`
        ),
      };
    }

    case 'CHECK_IN': {
      const staffMember = state.staff.find((s) => s.id === action.staffId);
      const timeStr = nowTimeString();
      const newRecord: AttendanceRecord = {
        id: `att-${TODAY_ISO}-${action.staffId}-${Date.now()}`,
        date: TODAY_ISO,
        staffId: action.staffId,
        locationCode: action.locationCode,
        checkInTime: timeStr,
        qrVerified: true,
        geofenceStatus: action.geofenceStatus,
        distanceMeters: action.distanceMeters,
        operationalNote: action.operationalNote,
        status: 'HADIR',
      };

      const filtered = state.attendance.filter(
        (att) => !(att.date === TODAY_ISO && att.staffId === action.staffId)
      );

      return {
        ...state,
        attendance: [newRecord, ...filtered],
        auditLogs: appendAudit(
          state,
          'ABSENSI',
          'Check-In QR Presensi',
          `${staffMember?.name ?? action.staffId} melakukan Check-In QR di ${
            SERVICE_LOCATIONS[action.locationCode].name
          } pukul ${timeStr} WIB (${action.geofenceStatus}, radius ${
            action.distanceMeters
          }m).`
        ),
      };
    }

    case 'CHECK_OUT': {
      const target = state.attendance.find((a) => a.id === action.attendanceId);
      if (!target) return state;
      const staffMember = state.staff.find((s) => s.id === target.staffId);
      const timeStr = nowTimeString();
      return {
        ...state,
        attendance: state.attendance.map((a) =>
          a.id === action.attendanceId
            ? {
                ...a,
                checkOutTime: timeStr,
                operationalNote: action.operationalNote || a.operationalNote,
                status: 'SELESAI',
              }
            : a
        ),
        auditLogs: appendAudit(
          state,
          'ABSENSI',
          'Check-Out QR Presensi',
          `${staffMember?.name ?? target.staffId} menyelesaikan tugas di ${
            SERVICE_LOCATIONS[target.locationCode].name
          } pukul ${timeStr} WIB.`
        ),
      };
    }

    case 'CREATE_SWAP': {
      const requester = state.staff.find(
        (s) => s.id === action.payload.requesterId
      );
      const target = state.staff.find(
        (s) => s.id === action.payload.targetStaffId
      );
      const newSwap: SwapRequest = {
        ...action.payload,
        id: `swp-${String(state.swaps.length + 1).padStart(3, '0')}`,
        status: 'MENUNGGU',
        createdAt: nowIsoLocal(),
      };
      return {
        ...state,
        swaps: [newSwap, ...state.swaps],
        auditLogs: appendAudit(
          state,
          'TUKAR_JADWAL',
          `Pengajuan Tukar Jadwal #${newSwap.id.toUpperCase()}`,
          `${requester?.name ?? ''} (${formatIndonesianDate(
            newSwap.requesterDate
          )}) mengajukan tukar dengan ${
            target?.name ?? ''
          } (${formatIndonesianDate(newSwap.targetDate)}).`
        ),
      };
    }

    case 'REVIEW_SWAP': {
      const swap = state.swaps.find((s) => s.id === action.swapId);
      if (!swap || swap.status !== 'MENUNGGU') return state;
      const actor = getActorDisplayName(state);
      const requester = state.staff.find((s) => s.id === swap.requesterId);
      const target = state.staff.find((s) => s.id === swap.targetStaffId);

      let updatedAssignments = [...state.assignments];

      if (action.decision === 'DISETUJUI') {
        const reqOnTargetDate =
          updatedAssignments.find(
            (a) =>
              a.staffId === swap.requesterId && a.date === swap.targetDate
          )?.locationCode || 'KANTOR';
        const tgtOnReqDate =
          updatedAssignments.find(
            (a) =>
              a.staffId === swap.targetStaffId && a.date === swap.requesterDate
          )?.locationCode || 'KANTOR';

        updatedAssignments = updatedAssignments.map((a) => {
          if (a.date === swap.requesterDate && a.staffId === swap.requesterId) {
            return {
              ...a,
              locationCode: tgtOnReqDate,
              updatedAt: nowIsoLocal(),
              updatedBy: actor,
            };
          }
          if (
            a.date === swap.requesterDate &&
            a.staffId === swap.targetStaffId
          ) {
            return {
              ...a,
              locationCode: swap.requesterLocation,
              updatedAt: nowIsoLocal(),
              updatedBy: actor,
            };
          }
          if (a.date === swap.targetDate && a.staffId === swap.requesterId) {
            return {
              ...a,
              locationCode: swap.targetLocation,
              updatedAt: nowIsoLocal(),
              updatedBy: actor,
            };
          }
          if (a.date === swap.targetDate && a.staffId === swap.targetStaffId) {
            return {
              ...a,
              locationCode: reqOnTargetDate,
              updatedAt: nowIsoLocal(),
              updatedBy: actor,
            };
          }
          return a;
        });
      }

      const updatedSwaps = state.swaps.map((s) =>
        s.id === action.swapId
          ? {
              ...s,
              status: action.decision,
              reviewedAt: nowIsoLocal(),
              reviewedBy: actor,
              reviewNote: action.reviewNote,
            }
          : s
      );

      return {
        ...state,
        assignments: updatedAssignments,
        swaps: updatedSwaps,
        auditLogs: appendAudit(
          state,
          'TUKAR_JADWAL',
          `${
            action.decision === 'DISETUJUI' ? 'Persetujuan' : 'Penolakan'
          } Tukar Jadwal #${swap.id.toUpperCase()}`,
          `${
            action.decision === 'DISETUJUI' ? 'Menyetujui' : 'Menolak'
          } tukar jadwal antara ${requester?.name ?? ''} dan ${
            target?.name ?? ''
          }. Jadwal induk diperbarui otomatis.`
        ),
      };
    }

    case 'ADD_STAFF': {
      const id = `asn-${Date.now()}`;
      const slug = action.staff.name.toLowerCase().replace(/[^a-z0-9]+/g, '.');
      const newStaff: StaffMember = { ...action.staff, id };
      const newAccount: UserAccount = {
        id,
        username: action.staff.username || slug,
        nip: action.staff.nip,
        email: action.staff.email || `${slug}@bppd.sidoarjokab.go.id`,
        fullName: action.staff.name,
        role: 'ASN',
        jabatan: action.staff.jabatan,
        golongan: action.staff.golongan,
        phone: action.staff.phone,
        password: 'bppd123',
        active: action.staff.active,
        createdAt: nowIsoLocal(),
      };
      return {
        ...state,
        staff: [...state.staff, newStaff],
        accounts: [...state.accounts, newAccount],
        auditLogs: appendAudit(
          state,
          'MASTER_DATA',
          'Penambahan Pegawai ASN',
          `Menambahkan ${newStaff.name} (NIP: ${newStaff.nip}) ke daftar petugas aktif & akun pengguna.`
        ),
      };
    }

    case 'TOGGLE_STAFF_ACTIVE': {
      const target = state.staff.find((s) => s.id === action.staffId);
      if (!target) return state;
      return {
        ...state,
        staff: state.staff.map((s) =>
          s.id === action.staffId ? { ...s, active: !s.active } : s
        ),
        accounts: state.accounts.map((acc) =>
          acc.id === action.staffId ? { ...acc, active: !target.active } : acc
        ),
        auditLogs: appendAudit(
          state,
          'MASTER_DATA',
          'Perubahan Status Keaktifan ASN',
          `${target.name} diubah statusnya menjadi ${
            !target.active ? 'Aktif' : 'Non-Aktif'
          }.`
        ),
      };
    }

    case 'CREATE_ACCOUNT': {
      const id =
        action.account.role === 'ASN'
          ? `asn-${Date.now()}`
          : `acc-${Date.now()}`;
      const newAccount: UserAccount = {
        ...action.account,
        id,
        active: true,
        createdAt: nowIsoLocal(),
      };
      const shouldAddRoster =
        action.includeInRoster ?? action.account.role === 'ASN';
      const nextStaff = shouldAddRoster
        ? [
            ...state.staff,
            {
              id,
              username: newAccount.username,
              name: newAccount.fullName,
              nip: newAccount.nip,
              email: newAccount.email,
              role: mapUiRoleToDbRole(newAccount.role),
              jabatan: newAccount.jabatan,
              golongan: newAccount.golongan,
              phone: newAccount.phone,
              active: true,
            },
          ]
        : state.staff;

      return {
        ...state,
        accounts: [newAccount, ...state.accounts],
        staff: nextStaff,
        auditLogs: appendAudit(
          state,
          'MASTER_DATA',
          'Pembuatan Akun Pengguna Baru',
          `Admin membuat akun "${newAccount.username}" (${newAccount.fullName}, peran: ${newAccount.role}).`
        ),
      };
    }

    case 'UPDATE_ACCOUNT': {
      const target = state.accounts.find((a) => a.id === action.accountId);
      if (!target) return state;
      const updatedAcc: UserAccount = { ...target, ...action.patch };
      const nextAccounts = state.accounts.map((a) =>
        a.id === action.accountId ? updatedAcc : a
      );
      const existsInStaff = state.staff.some((s) => s.id === action.accountId);
      let nextStaff = state.staff.map((s) =>
        s.id === action.accountId
          ? {
              ...s,
              username: updatedAcc.username,
              name: updatedAcc.fullName,
              nip: updatedAcc.nip,
              email: updatedAcc.email,
              role: mapUiRoleToDbRole(updatedAcc.role),
              jabatan: updatedAcc.jabatan,
              golongan: updatedAcc.golongan,
              phone: updatedAcc.phone,
              active: updatedAcc.active,
            }
          : s
      );
      if (!existsInStaff && updatedAcc.role === 'ASN') {
        nextStaff = [
          ...nextStaff,
          {
            id: updatedAcc.id,
            username: updatedAcc.username,
            name: updatedAcc.fullName,
            nip: updatedAcc.nip,
            email: updatedAcc.email,
            role: 'asn',
            jabatan: updatedAcc.jabatan,
            golongan: updatedAcc.golongan,
            phone: updatedAcc.phone,
            active: updatedAcc.active,
          },
        ];
      }
      return {
        ...state,
        accounts: nextAccounts,
        staff: nextStaff,
        auditLogs: appendAudit(
          state,
          'MASTER_DATA',
          'Pembaruan Akun Pengguna',
          `Memperbarui data/status akun "${updatedAcc.username}" (${updatedAcc.fullName}).`
        ),
      };
    }

    case 'UPDATE_ACCOUNT_PASSWORD': {
      const target = state.accounts.find((a) => a.id === action.accountId);
      if (!target) return state;
      return {
        ...state,
        accounts: state.accounts.map((a) =>
          a.id === action.accountId ? { ...a, password: action.newPassword } : a
        ),
        auditLogs: appendAudit(
          state,
          'SISTEM',
          'Pembaruan Kata Sandi Akun',
          `Admin mengatur ulang kata sandi untuk akun "${target.username}" (${target.fullName}).`
        ),
      };
    }

    case 'DELETE_ACCOUNT': {
      const target = state.accounts.find((a) => a.id === action.accountId);
      if (!target) return state;
      const remainingAssignments = state.assignments.filter(
        (a) => a.staffId !== action.accountId
      );
      return {
        ...state,
        accounts: state.accounts.filter((a) => a.id !== action.accountId),
        staff: state.staff.filter((s) => s.id !== action.accountId),
        assignments: remainingAssignments,
        auditLogs: appendAudit(
          state,
          'MASTER_DATA',
          'Penghapusan Akun Pengguna',
          `Menghapus akun "${target.username}" (${target.fullName}) beserta seluruh jadwal terkait.`
        ),
      };
    }

    case 'DELETE_USER_SCHEDULES': {
      const acc = state.accounts.find((a) => a.id === action.userId);
      const stf = state.staff.find((s) => s.id === action.userId);
      const ownerName = acc?.fullName || stf?.name || action.userId;

      let removedCount = 0;
      const nextAssignments = state.assignments.filter((a) => {
        if (a.staffId !== action.userId) return true;
        if (action.scheduleIds && action.scheduleIds.length > 0) {
          const hit = action.scheduleIds.includes(a.id);
          if (hit) removedCount += 1;
          return !hit;
        }
        if (action.month) {
          const hit = a.date.startsWith(action.month);
          if (hit) removedCount += 1;
          return !hit;
        }
        removedCount += 1;
        return false;
      });

      const scopeLabel =
        action.scheduleIds && action.scheduleIds.length > 0
          ? `${removedCount} shift terpilih`
          : action.month
          ? `periode ${action.month} (${removedCount} shift)`
          : `seluruh periode (${removedCount} shift)`;

      return {
        ...state,
        assignments: nextAssignments,
        auditLogs: appendAudit(
          state,
          'JADWAL',
          `Penghapusan Jadwal Milik Akun`,
          `Menghapus ${scopeLabel} milik akun ${ownerName}.`
        ),
      };
    }

    case 'UPSERT_HOLIDAY': {
      const filtered = state.holidays.filter(
        (h) => h.date !== action.holiday.date
      );
      const nextHolidays = [...filtered, action.holiday].sort((a, b) =>
        a.date.localeCompare(b.date)
      );
      const shouldClear = action.clearAssignmentsOnDate ?? true;
      const nextAssignments = shouldClear
        ? state.assignments.filter((a) => a.date !== action.holiday.date)
        : state.assignments;
      return {
        ...state,
        holidays: nextHolidays,
        assignments: nextAssignments,
        auditLogs: appendAudit(
          state,
          'SISTEM',
          `Penetapan ${getHolidayTypeLabel(action.holiday.type)}`,
          `Tanggal ${formatIndonesianDate(
            action.holiday.date,
            true
          )} ditetapkan sebagai ${getHolidayTypeLabel(action.holiday.type)}: ${
            action.holiday.name
          }.`
        ),
      };
    }

    case 'REMOVE_HOLIDAY': {
      const removed = state.holidays.find((h) => h.date === action.date);
      if (!removed) return state;
      return {
        ...state,
        holidays: state.holidays.filter((h) => h.date !== action.date),
        auditLogs: appendAudit(
          state,
          'SISTEM',
          `Penghapusan Hari Libur/Cuti`,
          `Menghapus keterangan ${getHolidayTypeLabel(removed.type)} (${
            removed.name
          }) pada ${formatIndonesianDate(action.date, true)}.`
        ),
      };
    }

    case 'RESET_DEMO': {
      const fresh = createSeedState();
      return {
        ...fresh,
        activeRole: state.activeRole,
        activeModule: state.activeModule,
      };
    }

    default:
      return state;
  }
}

interface AppContextValue {
  state: AppState;
  authMode: AuthMode;
  authEmail: string | null;
  currentProfileId: string | null;
  realtimeConnected: boolean;
  isSyncing: boolean;
  dispatch: (action: AppAction) => void;
  loginWithSupabase: (
    identifier: string,
    password: string
  ) => Promise<{ error?: string }>;
  loginLocalAccount: (
    identifier: string,
    password: string
  ) => { error?: string; account?: UserAccount };
  enterDemoMode: (presetRole?: UserRole) => void;
  logout: () => Promise<void>;
  refreshSupabaseData: () => Promise<void>;
  toasts: ToastMessage[];
  pushToast: (toast: Omit<ToastMessage, 'id'>) => void;
  dismissToast: (id: string) => void;
}

const AppStateContext = createContext<AppContextValue | null>(null);

function loadPersistedHolidays(): HolidayEntry[] {
  try {
    const raw = localStorage.getItem(HOLIDAYS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as HolidayEntry[];
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch {
    // Fallback to official 2026 holidays
  }
  return OFFICIAL_HOLIDAYS_2026;
}

function loadInitialState(): AppState {
  const persistedHolidays = loadPersistedHolidays();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as AppState;
      if (
        parsed &&
        Array.isArray(parsed.staff) &&
        Array.isArray(parsed.assignments)
      ) {
        return {
          ...createSeedState(),
          ...parsed,
          accounts:
            Array.isArray(parsed.accounts) && parsed.accounts.length > 0
              ? parsed.accounts
              : SEED_ACCOUNTS,
          holidays:
            Array.isArray(parsed.holidays) && parsed.holidays.length > 0
              ? parsed.holidays
              : persistedHolidays,
        };
      }
    }
  } catch {
    // Fallback to seed state
  }
  const seed = createSeedState();
  return {
    ...seed,
    holidays: persistedHolidays,
  };
}

function loadInitialAuthMode(): AuthMode {
  if (isSupabaseConfigured) return 'unauthenticated';
  try {
    const saved = localStorage.getItem(AUTH_MODE_KEY);
    if (saved === 'demo') return 'demo';
  } catch {
    // Ignore
  }
  return 'unauthenticated';
}

export function AppStateProvider({ children }: { children: React.ReactNode }) {
  const [state, localDispatch] = useReducer(
    reducer,
    undefined,
    loadInitialState
  );
  const [authMode, setAuthMode] = useState<AuthMode>(loadInitialAuthMode);
  const [authEmail, setAuthEmail] = useState<string | null>(null);
  const [currentProfileId, setCurrentProfileId] = useState<string | null>(null);
  const [realtimeConnected, setRealtimeConnected] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const pushToast = useCallback((toast: Omit<ToastMessage, 'id'>) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`;
    setToasts((prev) => [...prev, { ...toast, id }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4500);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // Persist demo state & holidays to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(HOLIDAYS_STORAGE_KEY, JSON.stringify(state.holidays));
      if (authMode === 'demo') {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      }
    } catch {
      // Ignore storage quota errors
    }
  }, [state, authMode]);

  const refreshSupabaseData = useCallback(
    async (userId?: string, userEmail?: string | null) => {
      if (!supabase) return;
      setIsSyncing(true);
      try {
        const data = await fetchAllSupabaseData();
        const matchedProfile = data.allProfiles.find(
          (p) =>
            (userId && (p.auth_user_id === userId || p.id === userId)) ||
            (userEmail && p.email.toLowerCase() === userEmail.toLowerCase())
        );

        if (matchedProfile) {
          setCurrentProfileId(matchedProfile.id);
        }

        const matchedRole = matchedProfile
          ? mapDbRoleToUiRole(matchedProfile.role)
          : undefined;
        const matchedStaffId =
          matchedProfile &&
          data.staff.some((s) => s.id === matchedProfile.id)
            ? matchedProfile.id
            : data.staff[0]?.id;

        localDispatch({
          type: 'HYDRATE_FROM_SUPABASE',
          payload: {
            staff: data.staff,
            accounts: data.accounts,
            locationIdMap: data.locationIdMap,
            assignments: data.assignments,
            attendance: data.attendance,
            swaps: data.swaps,
            auditLogs: data.auditLogs,
            activeRole: matchedRole,
            activeStaffId: matchedStaffId,
          },
        });
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Gagal sinkronisasi';
        pushToast({
          type: 'error',
          title: 'Gagal Memuat Data PostgreSQL',
          description: msg,
        });
      } finally {
        setIsSyncing(false);
      }
    },
    [pushToast]
  );

  // Listen to Supabase Auth Session changes
  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) return;

    supabase.auth.getSession().then(({ data }) => {
      const session = data.session;
      if (session?.user) {
        setAuthMode('supabase');
        setAuthEmail(session.user.email ?? null);
        refreshSupabaseData(session.user.id, session.user.email);
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setAuthMode('supabase');
        setAuthEmail(session.user.email ?? null);
        refreshSupabaseData(session.user.id, session.user.email);
      } else {
        setAuthEmail(null);
        setCurrentProfileId(null);
        setRealtimeConnected(false);
        setAuthMode((prev) => (prev === 'supabase' ? 'unauthenticated' : prev));
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [refreshSupabaseData]);

  // Supabase Realtime Channel Subscription across schedules, attendance_logs, swap_requests, audit_logs
  useEffect(() => {
    if (authMode !== 'supabase' || !supabase) {
      setRealtimeConnected(false);
      return;
    }

    const channel = supabase
      .channel('sijadpajak-realtime-sync')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'schedules' },
        () => {
          refreshSupabaseData();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'attendance_logs' },
        () => {
          refreshSupabaseData();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'swap_requests' },
        () => {
          refreshSupabaseData();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'audit_logs' },
        () => {
          refreshSupabaseData();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'profiles' },
        () => {
          refreshSupabaseData();
        }
      )
      .subscribe((status) => {
        setRealtimeConnected(status === 'SUBSCRIBED');
      });

    return () => {
      supabase?.removeChannel(channel);
      setRealtimeConnected(false);
    };
  }, [authMode, refreshSupabaseData]);

  const loginWithSupabase = useCallback(
    async (identifier: string, password: string) => {
      const res = await signInWithNipOrEmail(identifier, password);
      if (!res.error) {
        localStorage.removeItem(AUTH_MODE_KEY);
      }
      return res;
    },
    []
  );

  const loginLocalAccount = useCallback(
    (identifier: string, password: string) => {
      const q = identifier.trim().toLowerCase();
      if (!q || !password) {
        return { error: 'Masukkan username, NIP, atau email beserta kata sandi.' };
      }
      const matched = state.accounts.find(
        (acc) =>
          acc.username.toLowerCase() === q ||
          acc.nip.toLowerCase() === q ||
          acc.email.toLowerCase() === q
      );
      if (!matched) {
        return { error: 'Akun tidak ditemukan. Periksa username, NIP, atau email Anda.' };
      }
      if (!matched.active) {
        return { error: 'Akun ini sedang dinonaktifkan oleh Admin Sistem.' };
      }
      if (matched.password !== password) {
        return { error: 'Kata sandi tidak sesuai.' };
      }

      localStorage.setItem(AUTH_MODE_KEY, 'demo');
      setAuthMode('demo');
      localDispatch({ type: 'LOGIN_LOCAL_ACCOUNT', account: matched });
      return { account: matched };
    },
    [state.accounts]
  );

  const enterDemoMode = useCallback((presetRole?: UserRole) => {
    localStorage.setItem(AUTH_MODE_KEY, 'demo');
    setAuthMode('demo');
    if (presetRole) {
      localDispatch({ type: 'SET_ROLE', role: presetRole });
    }
  }, []);

  const logout = useCallback(async () => {
    if (authMode === 'supabase') {
      await signOutSupabase();
    }
    localStorage.removeItem(AUTH_MODE_KEY);
    setAuthMode('unauthenticated');
  }, [authMode]);

  // Unified dispatch: routes mutations to Supabase when connected, or local state in Demo Mode
  const dispatch = useCallback(
    (action: AppAction) => {
      if (
        action.type === 'SET_ROLE' ||
        action.type === 'SET_ACTIVE_STAFF' ||
        action.type === 'SET_MODULE' ||
        action.type === 'SET_MONTH' ||
        action.type === 'HYDRATE_FROM_SUPABASE' ||
        action.type === 'REMOVE_HOLIDAY'
      ) {
        localDispatch(action);
        return;
      }

      if (action.type === 'UPSERT_HOLIDAY') {
        localDispatch(action);
        if (authMode === 'supabase' && (action.clearAssignmentsOnDate ?? true)) {
          const toDelete = state.assignments.filter(
            (a) => a.date === action.holiday.date
          );
          if (toDelete.length > 0) {
            void Promise.all(toDelete.map((a) => sbDeleteSchedule(a.id))).then(
              () => refreshSupabaseData()
            );
          }
        }
        return;
      }

      if (authMode !== 'supabase') {
        localDispatch(action);
        return;
      }

      // Execute asynchronous PostgreSQL mutation in Supabase mode
      const runAsyncMutation = async () => {
        setIsSyncing(true);
        try {
          switch (action.type) {
            case 'UPSERT_ASSIGNMENT': {
              const { assignment, replaceExistingOnDate = true } = action;
              await sbUpsertSchedule({
                id: assignment.id,
                userId: assignment.staffId,
                locationId: state.locationIdMap[assignment.locationCode],
                dutyDate: assignment.date,
                session: assignment.session,
                notes: assignment.notes,
                actorProfileId: currentProfileId ?? undefined,
                forceInsertDuplicate: !replaceExistingOnDate,
              });
              break;
            }
            case 'DELETE_ASSIGNMENT':
              await sbDeleteSchedule(action.assignmentId);
              break;
            case 'AUTO_ROTATE_MONTH': {
              const generated = generateBalancedMonthSchedule(
                action.month,
                state.staff,
                'Koordinator Pelayanan',
                action.preserveLocked,
                state.holidays
              );
              await sbBulkUpsertSchedules(
                generated.map((g) => ({
                  user_id: g.staffId,
                  location_id: state.locationIdMap[g.locationCode],
                  duty_date: g.date,
                  session:
                    g.session === 'SESI_1' || g.session === 'SESI_2'
                      ? g.session
                      : 'FULL_DAY',
                  status: 'SCHEDULED',
                  created_by: currentProfileId,
                }))
              );
              break;
            }
            case 'CHECK_IN': {
              const todayAssn = state.assignments.find(
                (a) => a.date === TODAY_ISO && a.staffId === action.staffId
              );
              await sbCheckIn({
                scheduleId: todayAssn?.id,
                userId: action.staffId,
                locationId: state.locationIdMap[action.locationCode],
                dutyDate: TODAY_ISO,
                geofenceStatus: action.geofenceStatus,
                distanceMeters: action.distanceMeters,
                operationalNotes: action.operationalNote,
              });
              break;
            }
            case 'CHECK_OUT':
              await sbCheckOut(action.attendanceId, action.operationalNote);
              break;
            case 'CREATE_SWAP': {
              const reqSch = state.assignments.find(
                (a) =>
                  a.staffId === action.payload.requesterId &&
                  a.date === action.payload.requesterDate
              );
              const tgtSch = state.assignments.find(
                (a) =>
                  a.staffId === action.payload.targetStaffId &&
                  a.date === action.payload.targetDate
              );
              if (!reqSch || !tgtSch) {
                throw new Error(
                  'Jadwal asal atau jadwal rekan pada tanggal tersebut belum ditemukan di database.'
                );
              }
              await sbCreateSwapRequest({
                requesterId: action.payload.requesterId,
                requesterScheduleId: reqSch.id,
                targetPeerId: action.payload.targetStaffId,
                targetScheduleId: tgtSch.id,
                reason: action.payload.reason,
              });
              break;
            }
            case 'REVIEW_SWAP': {
              const swap = state.swaps.find((s) => s.id === action.swapId);
              if (!swap) break;
              await sbReviewSwapRequest({
                swap,
                decision: action.decision,
                reviewerProfileId: currentProfileId,
                reviewNote: action.reviewNote,
                assignments: state.assignments,
                locationIdMap: state.locationIdMap,
              });
              break;
            }
            case 'ADD_STAFF': {
              const slug = action.staff.name
                .toLowerCase()
                .replace(/[^a-z0-9]+/g, '.');
              await sbAddStaffProfile({
                name: action.staff.name,
                nip: action.staff.nip,
                email:
                  action.staff.email || `${slug}@bppd.sidoarjokab.go.id`,
                jabatan: action.staff.jabatan,
                golongan: action.staff.golongan,
                phone: action.staff.phone,
              });
              break;
            }
            case 'TOGGLE_STAFF_ACTIVE': {
              const target = state.staff.find((s) => s.id === action.staffId);
              if (target) {
                await sbToggleStaffActive(target.id, !target.active);
              }
              break;
            }
            case 'CREATE_ACCOUNT': {
              await sbCreateAccount(action.account);
              break;
            }
            case 'UPDATE_ACCOUNT': {
              await sbUpdateProfile({
                id: action.accountId,
                fullName: action.patch.fullName,
                username: action.patch.username,
                role: action.patch.role,
                active: action.patch.active,
              });
              break;
            }
            case 'UPDATE_ACCOUNT_PASSWORD': {
              localDispatch(action);
              break;
            }
            case 'DELETE_ACCOUNT': {
              await sbDeleteProfile(action.accountId);
              break;
            }
            case 'DELETE_USER_SCHEDULES': {
              await sbDeleteSchedulesByUser({
                userId: action.userId,
                month: action.month,
                scheduleIds: action.scheduleIds,
              });
              break;
            }
            case 'RESET_DEMO':
              localDispatch(action);
              break;
          }
          await refreshSupabaseData();
        } catch (err: unknown) {
          const message =
            err instanceof Error
              ? err.message
              : 'Terjadi kesalahan saat menyimpan ke PostgreSQL Supabase.';
          const isUniqueViolation =
            message.includes('23505') ||
            message.toLowerCase().includes('schedules_user_date_unique');
          pushToast({
            type: 'error',
            title: isUniqueViolation
              ? 'Ditolak PostgreSQL: Jadwal Ganda (UNIQUE Constraint)'
              : 'Gagal Menyimpan ke Supabase',
            description: isUniqueViolation
              ? 'Constraint UNIQUE(user_id, duty_date) mencegah 1 ASN memiliki lebih dari satu jadwal pada tanggal yang sama.'
              : message,
          });
        } finally {
          setIsSyncing(false);
        }
      };

      void runAsyncMutation();
    },
    [authMode, currentProfileId, pushToast, refreshSupabaseData, state]
  );

  return (
    <AppStateContext.Provider
      value={{
        state,
        authMode,
        authEmail,
        currentProfileId,
        realtimeConnected,
        isSyncing,
        dispatch,
        loginWithSupabase,
        loginLocalAccount,
        enterDemoMode,
        logout,
        refreshSupabaseData: () => refreshSupabaseData(),
        toasts,
        pushToast,
        dismissToast,
      }}
    >
      {children}
    </AppStateContext.Provider>
  );
}

export function useAppState() {
  const ctx = useContext(AppStateContext);
  if (!ctx) {
    throw new Error('useAppState must be used inside AppStateProvider');
  }
  return ctx;
}
