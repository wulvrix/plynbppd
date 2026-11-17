import {
  AttendanceRecord,
  AuditLogEntry,
  DbUserRole,
  LocationCode,
  ScheduleAssignment,
  ShiftSession,
  StaffMember,
  SwapRequest,
  UserAccount,
  UserRole,
} from '../types/sijadpajak';
import { createEphemeralSupabaseClient, supabase } from './supabaseClient';

export function mapDbRoleToUiRole(dbRole?: string | null): UserRole {
  switch (dbRole) {
    case 'admin':
      return 'ADMIN_SISTEM';
    case 'koordinator':
      return 'KOORDINATOR';
    case 'pimpinan':
      return 'PIMPINAN';
    default:
      return 'ASN';
  }
}

export function mapUiRoleToDbRole(uiRole: UserRole): DbUserRole {
  switch (uiRole) {
    case 'ADMIN_SISTEM':
      return 'admin';
    case 'KOORDINATOR':
      return 'koordinator';
    case 'PIMPINAN':
      return 'pimpinan';
    default:
      return 'asn';
  }
}

function mapDbSessionToUi(session: string): ShiftSession {
  if (session === 'SESI_1' || session === 'SESI_2') return session;
  return 'PAGI_SORE';
}

function mapUiSessionToDb(session: ShiftSession): 'FULL_DAY' | 'SESI_1' | 'SESI_2' {
  if (session === 'SESI_1' || session === 'SESI_2') return session;
  return 'FULL_DAY';
}

function formatTimeFromIso(iso?: string | null): string {
  if (!iso) return '07:30:00';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '07:30:00';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

export async function signInWithNipOrEmail(
  identifier: string,
  password: string
): Promise<{ error?: string }> {
  if (!supabase) {
    return { error: 'Konfigurasi Supabase belum tersedia pada environment.' };
  }

  const trimmed = identifier.trim();
  let emailToUse = trimmed;

  if (!trimmed.includes('@')) {
    const { data, error: rpcError } = await supabase.rpc('resolve_login_email', {
      identifier: trimmed,
    });
    if (rpcError || !data) {
      return {
        error:
          'NIP tidak ditemukan atau akun tidak aktif. Gunakan Email Resmi Instansi atau periksa NIP Anda.',
      };
    }
    emailToUse = data as string;
  }

  const { error } = await supabase.auth.signInWithPassword({
    email: emailToUse,
    password,
  });

  if (error) {
    return { error: error.message };
  }
  return {};
}

export async function signOutSupabase() {
  if (!supabase) return;
  await supabase.auth.signOut();
}

export interface SupabaseHydratedPayload {
  staff: StaffMember[];
  accounts: UserAccount[];
  allProfiles: Array<{
    id: string;
    auth_user_id?: string | null;
    email: string;
    full_name: string;
    role: DbUserRole;
  }>;
  locationIdMap: Record<LocationCode, string>;
  assignments: ScheduleAssignment[];
  attendance: AttendanceRecord[];
  swaps: SwapRequest[];
  auditLogs: AuditLogEntry[];
}

export async function fetchAllSupabaseData(): Promise<SupabaseHydratedPayload> {
  if (!supabase) {
    throw new Error('Supabase client is not initialized.');
  }

  const [
    profilesRes,
    locationsRes,
    schedulesRes,
    attendanceRes,
    swapsRes,
    auditRes,
  ] = await Promise.all([
    supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: true }),
    supabase.from('locations').select('*'),
    supabase
      .from('schedules')
      .select('*')
      .order('duty_date', { ascending: true }),
    supabase
      .from('attendance_logs')
      .select('*')
      .order('check_in_time', { ascending: false }),
    supabase
      .from('swap_requests')
      .select('*')
      .order('created_at', { ascending: false }),
    supabase
      .from('audit_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100),
  ]);

  if (profilesRes.error) throw profilesRes.error;
  if (locationsRes.error) throw locationsRes.error;
  if (schedulesRes.error) throw schedulesRes.error;
  if (attendanceRes.error) throw attendanceRes.error;
  if (swapsRes.error) throw swapsRes.error;
  if (auditRes.error) throw auditRes.error;

  const locationIdToCode = new Map<string, LocationCode>();
  const locationIdMap: Record<LocationCode, string> = {
    KANTOR: '00000000-0000-0000-0000-000000000101',
    L: '00000000-0000-0000-0000-000000000102',
    S: '00000000-0000-0000-0000-000000000103',
  };

  for (const loc of locationsRes.data || []) {
    const code = loc.code as LocationCode;
    locationIdToCode.set(loc.id, code);
    locationIdMap[code] = loc.id;
  }

  const allProfiles = profilesRes.data || [];
  const profileMap = new Map(allProfiles.map((p) => [p.id, p]));

  // Operational roster consists of ASN Pengolah Data dan Informasi
  const staff: StaffMember[] = allProfiles
    .filter(
      (p) =>
        p.role === 'asn' ||
        (p.position && p.position.toLowerCase().includes('pengolah data'))
    )
    .map((p) => ({
      id: p.id,
      username: p.username || (p.email ? p.email.split('@')[0] : p.nip),
      name: p.full_name,
      nip: p.nip,
      email: p.email,
      role: p.role as DbUserRole,
      jabatan: p.position,
      golongan: p.golongan || 'Penata Muda (III/a)',
      phone: p.phone || '',
      active: Boolean(p.is_active),
    }));

  const accounts: UserAccount[] = allProfiles.map((p) => ({
    id: p.id,
    username: p.username || (p.email ? p.email.split('@')[0] : p.nip),
    nip: p.nip,
    email: p.email,
    fullName: p.full_name,
    role: mapDbRoleToUiRole(p.role),
    jabatan: p.position || 'ASN Pengolah Data dan Informasi',
    golongan: p.golongan || 'Penata Muda (III/a)',
    phone: p.phone || '',
    password: '••••••••',
    active: Boolean(p.is_active),
    createdAt: p.created_at || new Date().toISOString(),
  }));

  const assignments: ScheduleAssignment[] = (schedulesRes.data || []).map(
    (s) => ({
      id: s.id,
      date: s.duty_date,
      staffId: s.user_id,
      locationCode: locationIdToCode.get(s.location_id) || 'KANTOR',
      locationId: s.location_id,
      session: mapDbSessionToUi(s.session),
      status: s.status,
      notes: s.notes || undefined,
      updatedAt: s.updated_at,
      updatedBy:
        profileMap.get(s.created_by)?.full_name || 'Koordinator Pelayanan',
    })
  );

  const scheduleMap = new Map(assignments.map((a) => [a.id, a]));

  const attendance: AttendanceRecord[] = (attendanceRes.data || []).map((a) => {
    const linkedSchedule = a.schedule_id
      ? scheduleMap.get(a.schedule_id)
      : undefined;
    const locCode =
      (a.location_id && locationIdToCode.get(a.location_id)) ||
      linkedSchedule?.locationCode ||
      'KANTOR';
    const checkIn = formatTimeFromIso(a.check_in_time);
    const checkOut = a.check_out_time
      ? formatTimeFromIso(a.check_out_time)
      : undefined;
    const isLate = checkIn > '08:00:00';

    return {
      id: a.id,
      scheduleId: a.schedule_id || undefined,
      date: a.duty_date,
      staffId: a.user_id,
      locationCode: locCode,
      checkInTime: checkIn,
      checkOutTime: checkOut,
      qrVerified: a.verification_method === 'QR_CODE',
      geofenceStatus:
        a.geofence_status === 'LUAR_RADIUS' ? 'LUAR_RADIUS' : 'TERVERIFIKASI',
      distanceMeters: a.distance_meters ?? 12,
      operationalNote: a.operational_notes || '',
      status: checkOut ? 'SELESAI' : isLate ? 'TERLAMBAT' : 'HADIR',
    };
  });

  const swaps: SwapRequest[] = (swapsRes.data || []).map((sw) => {
    const reqSch = scheduleMap.get(sw.requester_schedule_id);
    const tgtSch = scheduleMap.get(sw.target_schedule_id);
    const uiStatus =
      sw.status === 'APPROVED'
        ? 'DISETUJUI'
        : sw.status === 'REJECTED'
        ? 'DITOLAK'
        : 'MENUNGGU';

    return {
      id: sw.id,
      requesterId: sw.requester_id,
      requesterScheduleId: sw.requester_schedule_id,
      requesterDate: reqSch?.date || '',
      requesterLocation: reqSch?.locationCode || 'KANTOR',
      targetStaffId: sw.target_peer_id,
      targetScheduleId: sw.target_schedule_id,
      targetDate: tgtSch?.date || '',
      targetLocation: tgtSch?.locationCode || 'KANTOR',
      reason: sw.reason,
      status: uiStatus,
      createdAt: sw.created_at,
      reviewedAt: sw.reviewed_at || undefined,
      reviewedBy: sw.reviewed_by
        ? profileMap.get(sw.reviewed_by)?.full_name || 'Koordinator'
        : undefined,
      reviewNote: sw.review_note || undefined,
    };
  });

  const auditLogs: AuditLogEntry[] = (auditRes.data || []).map((log) => {
    const actor = log.actor_id ? profileMap.get(log.actor_id) : undefined;
    const cat =
      log.table_name === 'swap_requests'
        ? 'TUKAR_JADWAL'
        : log.table_name === 'attendance_logs'
        ? 'ABSENSI'
        : log.table_name === 'profiles'
        ? 'MASTER_DATA'
        : 'JADWAL';

    return {
      id: log.id,
      timestamp: log.created_at,
      actorName: log.actor_name || actor?.full_name || 'Sistem PostgreSQL',
      actorRole: mapDbRoleToUiRole(actor?.role),
      category: cat,
      action: `${log.action_type} · ${log.table_name}`,
      detail: `Record ID: ${log.record_id || '-'} (${log.action_type})`,
    };
  });

  return {
    staff,
    accounts,
    allProfiles,
    locationIdMap,
    assignments,
    attendance,
    swaps,
    auditLogs,
  };
}

export async function sbUpsertSchedule(params: {
  id?: string;
  userId: string;
  locationId: string;
  dutyDate: string;
  session: ShiftSession;
  notes?: string;
  actorProfileId?: string;
  forceInsertDuplicate?: boolean;
}) {
  if (!supabase) throw new Error('Supabase belum dikonfigurasi');

  if (params.forceInsertDuplicate) {
    // Will trigger PostgreSQL UNIQUE(user_id, duty_date) constraint 23505
    const { error } = await supabase.from('schedules').insert({
      user_id: params.userId,
      location_id: params.locationId,
      duty_date: params.dutyDate,
      session: mapUiSessionToDb(params.session),
      notes: params.notes || null,
      created_by: params.actorProfileId || null,
    });
    if (error) throw error;
    return;
  }

  const { error } = await supabase.from('schedules').upsert(
    {
      ...(params.id ? { id: params.id } : {}),
      user_id: params.userId,
      location_id: params.locationId,
      duty_date: params.dutyDate,
      session: mapUiSessionToDb(params.session),
      notes: params.notes || null,
      created_by: params.actorProfileId || null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id,duty_date' }
  );
  if (error) throw error;
}

export async function sbDeleteSchedule(scheduleId: string) {
  if (!supabase) throw new Error('Supabase belum dikonfigurasi');
  const { error } = await supabase
    .from('schedules')
    .delete()
    .eq('id', scheduleId);
  if (error) throw error;
}

export async function sbBulkUpsertSchedules(
  rows: Array<{
    user_id: string;
    location_id: string;
    duty_date: string;
    session: 'FULL_DAY' | 'SESI_1' | 'SESI_2';
    status: 'SCHEDULED';
    created_by: string | null;
  }>
) {
  if (!supabase) throw new Error('Supabase belum dikonfigurasi');
  const { error } = await supabase
    .from('schedules')
    .upsert(rows, { onConflict: 'user_id,duty_date' });
  if (error) throw error;
}

export async function sbCheckIn(params: {
  scheduleId?: string;
  userId: string;
  locationId: string;
  dutyDate: string;
  geofenceStatus: 'TERVERIFIKASI' | 'LUAR_RADIUS';
  distanceMeters: number;
  operationalNotes: string;
}) {
  if (!supabase) throw new Error('Supabase belum dikonfigurasi');
  const { error } = await supabase.from('attendance_logs').upsert(
    {
      schedule_id: params.scheduleId || null,
      user_id: params.userId,
      location_id: params.locationId,
      duty_date: params.dutyDate,
      check_in_time: new Date().toISOString(),
      latitude: -7.4478,
      longitude: 112.7183,
      distance_meters: params.distanceMeters,
      verification_method: 'QR_CODE',
      geofence_status: params.geofenceStatus,
      operational_notes: params.operationalNotes,
    },
    { onConflict: 'user_id,duty_date' }
  );
  if (error) throw error;
}

export async function sbCheckOut(attendanceId: string, operationalNotes: string) {
  if (!supabase) throw new Error('Supabase belum dikonfigurasi');
  const { error } = await supabase
    .from('attendance_logs')
    .update({
      check_out_time: new Date().toISOString(),
      operational_notes: operationalNotes,
    })
    .eq('id', attendanceId);
  if (error) throw error;
}

export async function sbCreateSwapRequest(params: {
  requesterId: string;
  requesterScheduleId: string;
  targetPeerId: string;
  targetScheduleId: string;
  reason: string;
}) {
  if (!supabase) throw new Error('Supabase belum dikonfigurasi');
  const { error } = await supabase.from('swap_requests').insert({
    requester_id: params.requesterId,
    requester_schedule_id: params.requesterScheduleId,
    target_peer_id: params.targetPeerId,
    target_schedule_id: params.targetScheduleId,
    reason: params.reason,
    status: 'PENDING',
  });
  if (error) throw error;
}

export async function sbReviewSwapRequest(params: {
  swap: SwapRequest;
  decision: 'DISETUJUI' | 'DITOLAK';
  reviewerProfileId: string | null;
  reviewNote: string;
  assignments: ScheduleAssignment[];
  locationIdMap: Record<LocationCode, string>;
}) {
  if (!supabase) throw new Error('Supabase belum dikonfigurasi');
  const dbStatus = params.decision === 'DISETUJUI' ? 'APPROVED' : 'REJECTED';

  const { error: swapErr } = await supabase
    .from('swap_requests')
    .update({
      status: dbStatus,
      reviewed_by: params.reviewerProfileId,
      reviewed_at: new Date().toISOString(),
      review_note: params.reviewNote,
    })
    .eq('id', params.swap.id);
  if (swapErr) throw swapErr;

  if (params.decision === 'DISETUJUI') {
    const reqOnTargetDate =
      params.assignments.find(
        (a) =>
          a.staffId === params.swap.requesterId &&
          a.date === params.swap.targetDate
      )?.locationCode || 'KANTOR';
    const tgtOnReqDate =
      params.assignments.find(
        (a) =>
          a.staffId === params.swap.targetStaffId &&
          a.date === params.swap.requesterDate
      )?.locationCode || 'KANTOR';

    const updates = [
      {
        user_id: params.swap.requesterId,
        duty_date: params.swap.requesterDate,
        location_id: params.locationIdMap[tgtOnReqDate],
        status: 'SWAPPED',
        updated_at: new Date().toISOString(),
      },
      {
        user_id: params.swap.targetStaffId,
        duty_date: params.swap.requesterDate,
        location_id: params.locationIdMap[params.swap.requesterLocation],
        status: 'SWAPPED',
        updated_at: new Date().toISOString(),
      },
      {
        user_id: params.swap.requesterId,
        duty_date: params.swap.targetDate,
        location_id: params.locationIdMap[params.swap.targetLocation],
        status: 'SWAPPED',
        updated_at: new Date().toISOString(),
      },
      {
        user_id: params.swap.targetStaffId,
        duty_date: params.swap.targetDate,
        location_id: params.locationIdMap[reqOnTargetDate],
        status: 'SWAPPED',
        updated_at: new Date().toISOString(),
      },
    ];

    const { error: schErr } = await supabase
      .from('schedules')
      .upsert(updates, { onConflict: 'user_id,duty_date' });
    if (schErr) throw schErr;
  }
}

export async function sbAddStaffProfile(staff: {
  name: string;
  nip: string;
  email: string;
  jabatan: string;
  golongan: string;
  phone: string;
}) {
  if (!supabase) throw new Error('Supabase belum dikonfigurasi');
  const { error } = await supabase.from('profiles').insert({
    nip: staff.nip,
    email: staff.email,
    full_name: staff.name,
    position: staff.jabatan,
    golongan: staff.golongan,
    phone: staff.phone,
    role: 'asn',
    is_active: true,
  });
  if (error) throw error;
}

export async function sbToggleStaffActive(staffId: string, nextActive: boolean) {
  if (!supabase) throw new Error('Supabase belum dikonfigurasi');
  const { error } = await supabase
    .from('profiles')
    .update({ is_active: nextActive })
    .eq('id', staffId);
  if (error) throw error;
}

export async function sbCreateAccount(params: {
  username: string;
  nip: string;
  email: string;
  fullName: string;
  role: UserRole;
  jabatan: string;
  golongan: string;
  phone: string;
  password: string;
}) {
  if (!supabase) throw new Error('Supabase belum dikonfigurasi');
  const dbRole = mapUiRoleToDbRole(params.role);

  let authUserId: string | null = null;
  const tempClient = createEphemeralSupabaseClient();
  if (tempClient && params.password) {
    const { data: signUpData, error: signUpErr } = await tempClient.auth.signUp({
      email: params.email,
      password: params.password,
      options: {
        data: {
          nip: params.nip,
          full_name: params.fullName,
          role: dbRole,
          username: params.username,
        },
      },
    });
    if (signUpErr) throw signUpErr;
    authUserId = signUpData.user?.id ?? null;
  }

  const { error } = await supabase.from('profiles').upsert(
    {
      ...(authUserId ? { auth_user_id: authUserId } : {}),
      username: params.username,
      nip: params.nip,
      email: params.email,
      full_name: params.fullName,
      position: params.jabatan,
      golongan: params.golongan,
      phone: params.phone,
      role: dbRole,
      is_active: true,
    },
    { onConflict: 'email' }
  );
  if (error) throw error;
}

export async function sbUpdateProfile(params: {
  id: string;
  fullName?: string;
  username?: string;
  role?: UserRole;
  active?: boolean;
}) {
  if (!supabase) throw new Error('Supabase belum dikonfigurasi');
  const patch: Record<string, unknown> = {};
  if (params.fullName !== undefined) patch.full_name = params.fullName;
  if (params.username !== undefined) patch.username = params.username;
  if (params.role !== undefined) patch.role = mapUiRoleToDbRole(params.role);
  if (params.active !== undefined) patch.is_active = params.active;

  const { error } = await supabase
    .from('profiles')
    .update(patch)
    .eq('id', params.id);
  if (error) throw error;
}

export async function sbDeleteProfile(profileId: string) {
  if (!supabase) throw new Error('Supabase belum dikonfigurasi');
  const { error } = await supabase
    .from('profiles')
    .delete()
    .eq('id', profileId);
  if (error) throw error;
}

export async function sbDeleteSchedulesByUser(params: {
  userId: string;
  month?: string;
  scheduleIds?: string[];
}) {
  if (!supabase) throw new Error('Supabase belum dikonfigurasi');
  let query = supabase.from('schedules').delete().eq('user_id', params.userId);

  if (params.scheduleIds && params.scheduleIds.length > 0) {
    query = query.in('id', params.scheduleIds);
  } else if (params.month) {
    const [y, m] = params.month.split('-').map(Number);
    const lastDay = new Date(y, m, 0).getDate();
    const start = `${params.month}-01`;
    const end = `${params.month}-${String(lastDay).padStart(2, '0')}`;
    query = query.gte('duty_date', start).lte('duty_date', end);
  }

  const { error } = await query;
  if (error) throw error;
}
