import React, { useMemo, useState } from 'react';
import {
  CalendarX,
  Check,
  Eye,
  EyeOff,
  KeyRound,
  Pencil,
  RefreshCw,
  Search,
  ShieldAlert,
  ShieldCheck,
  Trash2,
  UserCheck,
  UserPlus,
  Users,
  X,
} from 'lucide-react';
import { useAppState } from '../context/AppStateContext';
import { UserAccount, UserRole } from '../types/sijadpajak';
import {
  formatIndonesianDate,
  formatMonthTitle,
  SERVICE_LOCATIONS,
} from '../utils/scheduleEngine';
import { LocationBadge } from './LocationBadge';

const ROLE_LABELS: Record<UserRole, { label: string; badgeClass: string }> = {
  ADMIN_SISTEM: {
    label: 'Admin Sistem',
    badgeClass: 'bg-blue-900 text-white border-blue-900',
  },
  KOORDINATOR: {
    label: 'Koordinator Pelayanan',
    badgeClass: 'bg-sky-50 text-sky-800 border-sky-200',
  },
  ASN: {
    label: 'ASN Pengolah Data',
    badgeClass: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  },
  PIMPINAN: {
    label: 'Pimpinan / Kabid',
    badgeClass: 'bg-slate-100 text-slate-800 border-slate-300',
  },
};

export function AccountManagementView() {
  const { state, authMode, dispatch, pushToast } = useAppState();
  const isAdmin = state.activeRole === 'ADMIN_SISTEM';

  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<'ALL' | UserRole>('ALL');
  const [revealedIds, setRevealedIds] = useState<Record<string, boolean>>({});

  // Create Account Modal
  const [createOpen, setCreateOpen] = useState(false);
  const [formUsername, setFormUsername] = useState('');
  const [formPassword, setFormPassword] = useState('');
  const [formPasswordConfirm, setFormPasswordConfirm] = useState('');
  const [showCreatePassword, setShowCreatePassword] = useState(false);
  const [formRole, setFormRole] = useState<UserRole>('ASN');
  const [formFullName, setFormFullName] = useState('');
  const [formNip, setFormNip] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formJabatan, setFormJabatan] = useState(
    'ASN Pengolah Data dan Informasi'
  );
  const [formGolongan, setFormGolongan] = useState('Penata Muda (III/a)');
  const [formPhone, setFormPhone] = useState('0812-3456-1099');
  const [includeInRoster, setIncludeInRoster] = useState(true);
  const [formError, setFormError] = useState<string | null>(null);

  // Edit Account Modal
  const [editingAccount, setEditingAccount] = useState<UserAccount | null>(null);
  const [editUsername, setEditUsername] = useState('');
  const [editFullName, setEditFullName] = useState('');
  const [editNip, setEditNip] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editRole, setEditRole] = useState<UserRole>('ASN');
  const [editJabatan, setEditJabatan] = useState('');
  const [editGolongan, setEditGolongan] = useState('');
  const [editPhone, setEditPhone] = useState('');

  // Reset Password Modal
  const [passwordAccount, setPasswordAccount] = useState<UserAccount | null>(
    null
  );
  const [newPasswordInput, setNewPasswordInput] = useState('');
  const [newPasswordConfirm, setNewPasswordConfirm] = useState('');
  const [showResetPassword, setShowResetPassword] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  // Delete Schedules for Specific Account Modal
  const [scheduleAccount, setScheduleAccount] = useState<UserAccount | null>(
    null
  );
  const [scheduleScope, setScheduleScope] = useState<'MONTH' | 'ALL'>('MONTH');
  const [selectedScheduleIds, setSelectedScheduleIds] = useState<string[]>([]);
  const [confirmBulkDeleteMode, setConfirmBulkDeleteMode] = useState<
    null | 'MONTH' | 'ALL'
  >(null);

  // Delete Account Confirmation Modal
  const [deleteAccountTarget, setDeleteAccountTarget] =
    useState<UserAccount | null>(null);

  const filteredAccounts = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return state.accounts.filter((acc) => {
      if (roleFilter !== 'ALL' && acc.role !== roleFilter) return false;
      if (!q) return true;
      return (
        acc.fullName.toLowerCase().includes(q) ||
        acc.username.toLowerCase().includes(q) ||
        acc.nip.toLowerCase().includes(q) ||
        acc.email.toLowerCase().includes(q)
      );
    });
  }, [state.accounts, searchQuery, roleFilter]);

  const stats = useMemo(() => {
    const total = state.accounts.length;
    const active = state.accounts.filter((a) => a.active).length;
    const asnCount = state.accounts.filter((a) => a.role === 'ASN').length;
    const adminKoordCount = state.accounts.filter(
      (a) => a.role === 'ADMIN_SISTEM' || a.role === 'KOORDINATOR'
    ).length;
    const totalShifts = state.assignments.length;
    return { total, active, asnCount, adminKoordCount, totalShifts };
  }, [state.accounts, state.assignments]);

  const accountScheduleList = useMemo(() => {
    if (!scheduleAccount) return [];
    return state.assignments
      .filter((a) => {
        if (a.staffId !== scheduleAccount.id) return false;
        if (scheduleScope === 'MONTH') {
          return a.date.startsWith(state.selectedMonth);
        }
        return true;
      })
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [scheduleAccount, state.assignments, scheduleScope, state.selectedMonth]);

  const accountTotalShiftCount = useMemo(() => {
    if (!scheduleAccount) return 0;
    return state.assignments.filter((a) => a.staffId === scheduleAccount.id)
      .length;
  }, [scheduleAccount, state.assignments]);

  const accountMonthShiftCount = useMemo(() => {
    if (!scheduleAccount) return 0;
    return state.assignments.filter(
      (a) =>
        a.staffId === scheduleAccount.id &&
        a.date.startsWith(state.selectedMonth)
    ).length;
  }, [scheduleAccount, state.assignments, state.selectedMonth]);

  const generateRandomPassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
    let out = 'Bppd#';
    for (let i = 0; i < 6; i++) {
      out += chars[Math.floor(Math.random() * chars.length)];
    }
    return out;
  };

  const openCreateModal = () => {
    setFormUsername('');
    setFormPassword('');
    setFormPasswordConfirm('');
    setShowCreatePassword(false);
    setFormRole('ASN');
    setFormFullName('');
    setFormNip('');
    setFormEmail('');
    setFormJabatan('ASN Pengolah Data dan Informasi');
    setFormGolongan('Penata Muda (III/a)');
    setFormPhone('0812-3456-1099');
    setIncludeInRoster(true);
    setFormError(null);
    setCreateOpen(true);
  };

  const handleCreateAccount = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const cleanUsername = formUsername.trim().toLowerCase().replace(/\s+/g, '.');
    const cleanFullName = formFullName.trim();
    const cleanNip = formNip.trim();
    const cleanEmail =
      formEmail.trim().toLowerCase() ||
      `${cleanUsername}@bppd.sidoarjokab.go.id`;

    if (!cleanUsername || !cleanFullName || !cleanNip) {
      setFormError('Username, Nama Lengkap, dan NIP wajib diisi.');
      return;
    }
    if (formPassword.length < 6) {
      setFormError('Kata sandi minimal 6 karakter.');
      return;
    }
    if (formPassword !== formPasswordConfirm) {
      setFormError('Konfirmasi kata sandi tidak cocok.');
      return;
    }

    const dupUsername = state.accounts.some(
      (a) => a.username.toLowerCase() === cleanUsername
    );
    if (dupUsername) {
      setFormError(`Username "${cleanUsername}" sudah digunakan akun lain.`);
      return;
    }
    const dupNip = state.accounts.some((a) => a.nip === cleanNip);
    if (dupNip) {
      setFormError(`NIP "${cleanNip}" sudah terdaftar.`);
      return;
    }
    const dupEmail = state.accounts.some(
      (a) => a.email.toLowerCase() === cleanEmail
    );
    if (dupEmail) {
      setFormError(`Email "${cleanEmail}" sudah terdaftar.`);
      return;
    }

    dispatch({
      type: 'CREATE_ACCOUNT',
      account: {
        username: cleanUsername,
        nip: cleanNip,
        email: cleanEmail,
        fullName: cleanFullName,
        role: formRole,
        jabatan: formJabatan.trim() || ROLE_LABELS[formRole].label,
        golongan: formGolongan.trim() || 'Penata Muda (III/a)',
        phone: formPhone.trim() || '-',
        password: formPassword,
      },
      includeInRoster: formRole === 'ASN' ? true : includeInRoster,
    });

    pushToast({
      type: 'success',
      title: 'Akun Pengguna Baru Dibuat',
      description: `User "${cleanUsername}" (${cleanFullName}) siap digunakan untuk login.`,
    });
    setCreateOpen(false);
  };

  const openEditModal = (acc: UserAccount) => {
    setEditingAccount(acc);
    setEditUsername(acc.username);
    setEditFullName(acc.fullName);
    setEditNip(acc.nip);
    setEditEmail(acc.email);
    setEditRole(acc.role);
    setEditJabatan(acc.jabatan);
    setEditGolongan(acc.golongan);
    setEditPhone(acc.phone);
  };

  const handleSaveEditAccount = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAccount) return;
    const cleanUsername = editUsername.trim().toLowerCase();
    if (!cleanUsername || !editFullName.trim() || !editNip.trim()) return;

    dispatch({
      type: 'UPDATE_ACCOUNT',
      accountId: editingAccount.id,
      patch: {
        username: cleanUsername,
        fullName: editFullName.trim(),
        nip: editNip.trim(),
        email: editEmail.trim().toLowerCase(),
        role: editRole,
        jabatan: editJabatan.trim(),
        golongan: editGolongan.trim(),
        phone: editPhone.trim(),
      },
    });
    pushToast({
      type: 'success',
      title: 'Profil Akun Diperbarui',
      description: `Data akun "${cleanUsername}" berhasil disimpan.`,
    });
    setEditingAccount(null);
  };

  const openPasswordModal = (acc: UserAccount) => {
    setPasswordAccount(acc);
    setNewPasswordInput('');
    setNewPasswordConfirm('');
    setShowResetPassword(false);
    setPasswordError(null);
  };

  const handleSavePassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (!passwordAccount) return;
    if (newPasswordInput.length < 6) {
      setPasswordError('Kata sandi baru minimal 6 karakter.');
      return;
    }
    if (newPasswordInput !== newPasswordConfirm) {
      setPasswordError('Konfirmasi kata sandi tidak cocok.');
      return;
    }
    dispatch({
      type: 'UPDATE_ACCOUNT_PASSWORD',
      accountId: passwordAccount.id,
      newPassword: newPasswordInput,
    });
    pushToast({
      type: 'success',
      title: 'Kata Sandi Diperbarui',
      description: `Kata sandi untuk user "${passwordAccount.username}" telah diubah.`,
    });
    setPasswordAccount(null);
  };

  const openScheduleModal = (acc: UserAccount) => {
    setScheduleAccount(acc);
    setScheduleScope('MONTH');
    setSelectedScheduleIds([]);
    setConfirmBulkDeleteMode(null);
  };

  const toggleScheduleId = (id: string) => {
    setSelectedScheduleIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleDeleteSelectedSchedules = () => {
    if (!scheduleAccount || selectedScheduleIds.length === 0) return;
    const count = selectedScheduleIds.length;
    dispatch({
      type: 'DELETE_USER_SCHEDULES',
      userId: scheduleAccount.id,
      scheduleIds: selectedScheduleIds,
    });
    setSelectedScheduleIds([]);
    pushToast({
      type: 'success',
      title: `${count} Jadwal Terpilih Dihapus`,
      description: `Jadwal milik ${scheduleAccount.fullName} berhasil diperbarui.`,
    });
  };

  const handleBulkDeleteAccountSchedules = (mode: 'MONTH' | 'ALL') => {
    if (!scheduleAccount) return;
    const count =
      mode === 'MONTH' ? accountMonthShiftCount : accountTotalShiftCount;
    dispatch({
      type: 'DELETE_USER_SCHEDULES',
      userId: scheduleAccount.id,
      month: mode === 'MONTH' ? state.selectedMonth : undefined,
    });
    setConfirmBulkDeleteMode(null);
    setSelectedScheduleIds([]);
    pushToast({
      type: 'success',
      title: `${count} Jadwal Akun Dihapus`,
      description:
        mode === 'MONTH'
          ? `Seluruh jadwal ${scheduleAccount.fullName} pada ${formatMonthTitle(
              state.selectedMonth
            )} telah dihapus.`
          : `Seluruh jadwal milik ${scheduleAccount.fullName} pada semua periode telah dihapus.`,
    });
  };

  const handleConfirmDeleteAccount = () => {
    if (!deleteAccountTarget) return;
    if (deleteAccountTarget.id === state.loggedInAccountId) {
      pushToast({
        type: 'error',
        title: 'Tidak Dapat Menghapus Akun Aktif',
        description:
          'Akun yang sedang Anda gunakan untuk login tidak dapat dihapus.',
      });
      setDeleteAccountTarget(null);
      return;
    }

    dispatch({
      type: 'DELETE_ACCOUNT',
      accountId: deleteAccountTarget.id,
    });
    pushToast({
      type: 'success',
      title: 'Akun & Jadwal Terkait Dihapus',
      description: `Akun "${deleteAccountTarget.username}" (${deleteAccountTarget.fullName}) telah dihapus dari sistem.`,
    });
    setDeleteAccountTarget(null);
  };

  if (!isAdmin) {
    return (
      <div className="space-y-6">
        <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
          <div className="flex items-start gap-3">
            <ShieldAlert className="w-5 h-5 text-amber-600 mt-0.5 shrink-0" />
            <div>
              <h1 className="text-lg font-bold text-slate-900">
                Akses Terbatas — Manajemen Akun Pengguna
              </h1>
              <p className="mt-1 text-xs text-slate-600 leading-relaxed max-w-2xl">
                Pembuatan akun (username &amp; password), pengaturan ulang kata
                sandi, serta penghapusan jadwal milik akun hanya dapat dilakukan
                oleh <strong>Admin Sistem</strong> sesuai kebijakan kontrol
                akses (RBAC) BPPD Kabupaten Sidoarjo.
              </p>
            </div>
          </div>

          {authMode === 'demo' && (
            <button
              type="button"
              onClick={() => {
                dispatch({ type: 'SET_ROLE', role: 'ADMIN_SISTEM' });
                pushToast({
                  type: 'info',
                  title: 'Peran Dialihkan ke Admin Sistem',
                  description:
                    'Anda kini memiliki akses penuh Manajemen Akun & Penjadwalan.',
                });
              }}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-blue-900 rounded-lg hover:bg-blue-800"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>Beralih ke Peran Admin Sistem</span>
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">
            Manajemen Akun Pengguna &amp; Jadwal Akun
          </h1>
          <p className="mt-1 text-xs text-slate-600">
            Buat akun pengguna beserta kata sandi, kelola peran RBAC, atur
            ulang password, dan hapus jadwal milik suatu akun secara terpusat.
          </p>
        </div>

        <button
          type="button"
          onClick={openCreateModal}
          className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-blue-900 rounded-lg hover:bg-blue-800 whitespace-nowrap self-start lg:self-auto"
        >
          <UserPlus className="w-4 h-4" />
          <span>Buat Akun Baru (User &amp; Password)</span>
        </button>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">
              Total Akun Terdaftar
            </span>
            <Users className="w-4 h-4 text-blue-900" />
          </div>
          <div className="mt-2 text-2xl font-bold font-mono tabular-nums text-slate-900">
            {stats.total}
          </div>
          <div className="mt-1 text-xs text-slate-600">
            {stats.active} akun aktif · {stats.total - stats.active} non-aktif
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">
              Akun ASN Pengolah Data
            </span>
            <UserCheck className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="mt-2 text-2xl font-bold font-mono tabular-nums text-slate-900">
            {stats.asnCount}
          </div>
          <div className="mt-1 text-xs text-slate-600">
            Terhubung langsung ke matriks jadwal &amp; absensi QR
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">
              Admin &amp; Koordinator
            </span>
            <ShieldCheck className="w-4 h-4 text-sky-600" />
          </div>
          <div className="mt-2 text-2xl font-bold font-mono tabular-nums text-slate-900">
            {stats.adminKoordCount}
          </div>
          <div className="mt-1 text-xs text-slate-600">
            Pengelola sistem, persetujuan tukar &amp; laporan
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">
              Total Jadwal Tersimpan
            </span>
            <CalendarX className="w-4 h-4 text-slate-700" />
          </div>
          <div className="mt-2 text-2xl font-bold font-mono tabular-nums text-slate-900">
            {stats.totalShifts}
          </div>
          <div className="mt-1 text-xs text-slate-600">
            Dapat dihapus per akun atau per tanggal tertentu
          </div>
        </div>
      </div>

      {/* Filter Toolbar & Accounts Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari username, nama, NIP, atau email..."
                className="pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-lg w-64 focus:outline-none focus:ring-2 focus:ring-blue-900/20"
              />
            </div>

            <div className="flex flex-wrap items-center gap-1 p-1 bg-slate-100 rounded-lg">
              {(
                [
                  { id: 'ALL', label: 'Semua Peran' },
                  { id: 'ADMIN_SISTEM', label: 'Admin' },
                  { id: 'KOORDINATOR', label: 'Koordinator' },
                  { id: 'ASN', label: 'ASN' },
                  { id: 'PIMPINAN', label: 'Pimpinan' },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setRoleFilter(tab.id)}
                  className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                    roleFilter === tab.id
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          <div className="text-xs text-slate-500">
            Periode aktif penghapusan cepat:{' '}
            <span className="font-semibold text-slate-800">
              {formatMonthTitle(state.selectedMonth)}
            </span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-semibold text-slate-600 uppercase tracking-wider">
                <th className="py-3 px-4">Akun &amp; Identitas</th>
                <th className="py-3 px-4">Username &amp; Kredensial</th>
                <th className="py-3 px-4">Peran RBAC</th>
                <th className="py-3 px-4">Jadwal Terkait</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Aksi Pengelolaan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filteredAccounts.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="py-10 text-center text-slate-500 text-xs"
                  >
                    Tidak ada akun yang sesuai dengan filter pencarian.
                  </td>
                </tr>
              ) : (
                filteredAccounts.map((acc) => {
                  const totalShifts = state.assignments.filter(
                    (a) => a.staffId === acc.id
                  ).length;
                  const monthShifts = state.assignments.filter(
                    (a) =>
                      a.staffId === acc.id &&
                      a.date.startsWith(state.selectedMonth)
                  ).length;
                  const roleMeta = ROLE_LABELS[acc.role];
                  const isRevealed = Boolean(revealedIds[acc.id]);

                  return (
                    <tr
                      key={acc.id}
                      className="hover:bg-slate-50/70 transition-colors"
                    >
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-900">
                          {acc.fullName}
                        </div>
                        <div className="text-[11px] text-slate-500 mt-0.5">
                          {acc.jabatan} · {acc.golongan}
                        </div>
                        <div className="text-[11px] font-mono text-slate-500 tabular-nums mt-0.5">
                          NIP {acc.nip}
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        <div className="font-mono font-semibold text-blue-900">
                          @{acc.username}
                        </div>
                        <div className="text-[11px] text-slate-600 truncate max-w-[220px]">
                          {acc.email}
                        </div>
                        {authMode === 'demo' && (
                          <div className="mt-1 flex items-center gap-1.5 text-[11px] font-mono text-slate-600">
                            <span>
                              Sandi:{' '}
                              {isRevealed ? acc.password : '••••••••'}
                            </span>
                            <button
                              type="button"
                              onClick={() =>
                                setRevealedIds((prev) => ({
                                  ...prev,
                                  [acc.id]: !prev[acc.id],
                                }))
                              }
                              className="text-slate-400 hover:text-slate-700"
                              title={
                                isRevealed
                                  ? 'Sembunyikan kata sandi'
                                  : 'Tampilkan kata sandi'
                              }
                            >
                              {isRevealed ? (
                                <EyeOff className="w-3 h-3" />
                              ) : (
                                <Eye className="w-3 h-3" />
                              )}
                            </button>
                          </div>
                        )}
                      </td>

                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded border text-[11px] font-semibold whitespace-nowrap ${roleMeta.badgeClass}`}
                        >
                          {roleMeta.label}
                        </span>
                      </td>

                      <td className="py-3 px-4 font-mono tabular-nums">
                        <div className="font-semibold text-slate-900">
                          {monthShifts} shift ({state.selectedMonth})
                        </div>
                        <div className="text-[11px] text-slate-500">
                          {totalShifts} shift total
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        <button
                          type="button"
                          onClick={() => {
                            dispatch({
                              type: 'UPDATE_ACCOUNT',
                              accountId: acc.id,
                              patch: { active: !acc.active },
                            });
                            pushToast({
                              type: 'info',
                              title: `Status Akun ${
                                !acc.active ? 'Diaktifkan' : 'Dinonaktifkan'
                              }`,
                              description: `${acc.fullName} (@${acc.username})`,
                            });
                          }}
                          className={`px-2.5 py-1 rounded-md text-[11px] font-semibold border ${
                            acc.active
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                              : 'bg-slate-100 text-slate-500 border-slate-200 hover:bg-slate-200'
                          }`}
                        >
                          {acc.active ? 'Aktif' : 'Non-Aktif'}
                        </button>
                      </td>

                      <td className="py-3 px-4">
                        <div className="flex flex-wrap items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => openScheduleModal(acc)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-semibold text-rose-800 bg-rose-50 border border-rose-200 rounded-md hover:bg-rose-100 whitespace-nowrap"
                            title="Lihat atau hapus jadwal milik akun ini"
                          >
                            <CalendarX className="w-3.5 h-3.5" />
                            <span>Hapus Jadwal ({totalShifts})</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => openPasswordModal(acc)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-semibold text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50 whitespace-nowrap"
                            title="Ubah atau reset kata sandi"
                          >
                            <KeyRound className="w-3.5 h-3.5" />
                            <span>Sandi</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => openEditModal(acc)}
                            className="p-1.5 text-slate-600 bg-white border border-slate-300 rounded-md hover:bg-slate-50"
                            title="Edit profil akun"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>

                          <button
                            type="button"
                            onClick={() => setDeleteAccountTarget(acc)}
                            className="p-1.5 text-rose-700 bg-white border border-rose-200 rounded-md hover:bg-rose-50"
                            title="Hapus akun permanen"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Account Modal */}
      {createOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="bg-white rounded-xl border border-slate-200 max-w-xl w-full p-6 shadow-xl max-h-[92vh] overflow-y-auto">
            <div className="flex items-start justify-between gap-3 pb-3 border-b border-slate-200">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Buat Akun Pengguna Baru (User &amp; Password)
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Akun yang dibuat dapat langsung digunakan untuk login ke
                  sistem SIJADPAJAK.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setCreateOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateAccount} className="mt-4 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Username Login <span className="text-rose-600">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formUsername}
                    onChange={(e) => setFormUsername(e.target.value)}
                    placeholder="Contoh: siti.aminah"
                    className="w-full px-3 py-2 text-xs font-mono border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Peran Akses (RBAC) <span className="text-rose-600">*</span>
                  </label>
                  <select
                    value={formRole}
                    onChange={(e) => {
                      const nextRole = e.target.value as UserRole;
                      setFormRole(nextRole);
                      setIncludeInRoster(nextRole === 'ASN');
                    }}
                    className="w-full px-3 py-2 text-xs font-semibold border border-slate-300 rounded-lg bg-white"
                  >
                    <option value="ASN">ASN Pengolah Data dan Informasi</option>
                    <option value="KOORDINATOR">Koordinator Pelayanan</option>
                    <option value="ADMIN_SISTEM">Admin Sistem</option>
                    <option value="PIMPINAN">Pimpinan / Kabid</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-semibold text-slate-700">
                      Kata Sandi <span className="text-rose-600">*</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        const pwd = generateRandomPassword();
                        setFormPassword(pwd);
                        setFormPasswordConfirm(pwd);
                        setShowCreatePassword(true);
                      }}
                      className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-900 hover:underline"
                    >
                      <RefreshCw className="w-3 h-3" />
                      <span>Buat Acak</span>
                    </button>
                  </div>
                  <div className="relative">
                    <input
                      type={showCreatePassword ? 'text' : 'password'}
                      required
                      minLength={6}
                      value={formPassword}
                      onChange={(e) => setFormPassword(e.target.value)}
                      placeholder="Minimal 6 karakter"
                      className="w-full pl-3 pr-9 py-2 text-xs font-mono border border-slate-300 rounded-lg"
                    />
                    <button
                      type="button"
                      onClick={() => setShowCreatePassword((v) => !v)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
                    >
                      {showCreatePassword ? (
                        <EyeOff className="w-3.5 h-3.5" />
                      ) : (
                        <Eye className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Konfirmasi Kata Sandi{' '}
                    <span className="text-rose-600">*</span>
                  </label>
                  <input
                    type={showCreatePassword ? 'text' : 'password'}
                    required
                    minLength={6}
                    value={formPasswordConfirm}
                    onChange={(e) => setFormPasswordConfirm(e.target.value)}
                    placeholder="Ulangi kata sandi"
                    className="w-full px-3 py-2 text-xs font-mono border border-slate-300 rounded-lg"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Nama Lengkap <span className="text-rose-600">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formFullName}
                    onChange={(e) => setFormFullName(e.target.value)}
                    placeholder="Nama lengkap sesuai SK"
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    NIP <span className="text-rose-600">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formNip}
                    onChange={(e) => setFormNip(e.target.value)}
                    placeholder="18 digit NIP"
                    className="w-full px-3 py-2 text-xs font-mono border border-slate-300 rounded-lg"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Email Resmi Instansi
                  </label>
                  <input
                    type="email"
                    value={formEmail}
                    onChange={(e) => setFormEmail(e.target.value)}
                    placeholder="nama@bppd.sidoarjokab.go.id"
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    No. Telepon / WhatsApp
                  </label>
                  <input
                    type="text"
                    value={formPhone}
                    onChange={(e) => setFormPhone(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-mono border border-slate-300 rounded-lg"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Jabatan
                  </label>
                  <input
                    type="text"
                    value={formJabatan}
                    onChange={(e) => setFormJabatan(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Pangkat / Golongan
                  </label>
                  <input
                    type="text"
                    value={formGolongan}
                    onChange={(e) => setFormGolongan(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
                  />
                </div>
              </div>

              {formRole !== 'ASN' && (
                <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={includeInRoster}
                    onChange={(e) => setIncludeInRoster(e.target.checked)}
                    className="rounded border-slate-300 text-blue-900"
                  />
                  <span>
                    Ikut sertakan akun ini dalam daftar rotasi jadwal pelayanan
                  </span>
                </label>
              )}

              {formError && (
                <div className="rounded-lg bg-rose-50 border border-rose-200 p-3 text-xs text-rose-800 font-medium">
                  {formError}
                </div>
              )}

              <div className="pt-2 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setCreateOpen(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-blue-900 rounded-lg hover:bg-blue-800"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Simpan &amp; Aktifkan Akun</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Account Modal */}
      {editingAccount && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="bg-white rounded-xl border border-slate-200 max-w-lg w-full p-6 shadow-xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h3 className="text-base font-bold text-slate-900">
                Ubah Data Akun — @{editingAccount.username}
              </h3>
              <button
                type="button"
                onClick={() => setEditingAccount(null)}
                className="p-1 text-slate-400 hover:text-slate-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEditAccount} className="mt-4 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Username
                  </label>
                  <input
                    type="text"
                    required
                    value={editUsername}
                    onChange={(e) => setEditUsername(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-mono border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Peran RBAC
                  </label>
                  <select
                    value={editRole}
                    onChange={(e) => setEditRole(e.target.value as UserRole)}
                    className="w-full px-3 py-2 text-xs font-semibold border border-slate-300 rounded-lg bg-white"
                  >
                    <option value="ASN">ASN Pengolah Data</option>
                    <option value="KOORDINATOR">Koordinator Pelayanan</option>
                    <option value="ADMIN_SISTEM">Admin Sistem</option>
                    <option value="PIMPINAN">Pimpinan / Kabid</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Nama Lengkap
                  </label>
                  <input
                    type="text"
                    required
                    value={editFullName}
                    onChange={(e) => setEditFullName(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    NIP
                  </label>
                  <input
                    type="text"
                    required
                    value={editNip}
                    onChange={(e) => setEditNip(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-mono border border-slate-300 rounded-lg"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Email Resmi
                  </label>
                  <input
                    type="email"
                    required
                    value={editEmail}
                    onChange={(e) => setEditEmail(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    No. Telepon
                  </label>
                  <input
                    type="text"
                    value={editPhone}
                    onChange={(e) => setEditPhone(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-mono border border-slate-300 rounded-lg"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Jabatan
                  </label>
                  <input
                    type="text"
                    value={editJabatan}
                    onChange={(e) => setEditJabatan(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Golongan
                  </label>
                  <input
                    type="text"
                    value={editGolongan}
                    onChange={(e) => setEditGolongan(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
                  />
                </div>
              </div>

              <div className="pt-3 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setEditingAccount(null)}
                  className="px-4 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold text-white bg-blue-900 rounded-lg hover:bg-blue-800"
                >
                  Simpan Perubahan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reset Password Modal */}
      {passwordAccount && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="bg-white rounded-xl border border-slate-200 max-w-md w-full p-6 shadow-xl">
            <div className="flex items-start justify-between pb-3 border-b border-slate-200">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Atur Ulang Kata Sandi
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  {passwordAccount.fullName} (@{passwordAccount.username})
                </p>
              </div>
              <button
                type="button"
                onClick={() => setPasswordAccount(null)}
                className="p-1 text-slate-400 hover:text-slate-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSavePassword} className="mt-4 space-y-3">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-slate-700">
                    Kata Sandi Baru
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      const pwd = generateRandomPassword();
                      setNewPasswordInput(pwd);
                      setNewPasswordConfirm(pwd);
                      setShowResetPassword(true);
                    }}
                    className="text-[11px] font-semibold text-blue-900 hover:underline"
                  >
                    Generate Otomatis
                  </button>
                </div>
                <div className="relative">
                  <input
                    type={showResetPassword ? 'text' : 'password'}
                    required
                    minLength={6}
                    value={newPasswordInput}
                    onChange={(e) => setNewPasswordInput(e.target.value)}
                    placeholder="Minimal 6 karakter"
                    className="w-full pl-3 pr-9 py-2 text-xs font-mono border border-slate-300 rounded-lg"
                  />
                  <button
                    type="button"
                    onClick={() => setShowResetPassword((v) => !v)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
                  >
                    {showResetPassword ? (
                      <EyeOff className="w-3.5 h-3.5" />
                    ) : (
                      <Eye className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Konfirmasi Kata Sandi Baru
                </label>
                <input
                  type={showResetPassword ? 'text' : 'password'}
                  required
                  minLength={6}
                  value={newPasswordConfirm}
                  onChange={(e) => setNewPasswordConfirm(e.target.value)}
                  placeholder="Ulangi kata sandi baru"
                  className="w-full px-3 py-2 text-xs font-mono border border-slate-300 rounded-lg"
                />
              </div>

              {passwordError && (
                <div className="rounded-lg bg-rose-50 border border-rose-200 p-2.5 text-xs text-rose-800">
                  {passwordError}
                </div>
              )}

              <div className="pt-3 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setPasswordAccount(null)}
                  className="px-4 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold text-white bg-blue-900 rounded-lg hover:bg-blue-800"
                >
                  Simpan Kata Sandi
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Manage & Delete Schedules Belonging to Specific Account Modal */}
      {scheduleAccount && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="bg-white rounded-xl border border-slate-200 max-w-2xl w-full p-6 shadow-xl max-h-[90vh] flex flex-col">
            <div className="flex items-start justify-between pb-3 border-b border-slate-200 gap-3">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Kelola &amp; Hapus Jadwal Milik Akun
                </h3>
                <p className="text-xs text-slate-600 mt-0.5">
                  <span className="font-semibold text-slate-900">
                    {scheduleAccount.fullName}
                  </span>{' '}
                  (@{scheduleAccount.username}) · NIP {scheduleAccount.nip}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setScheduleAccount(null)}
                className="p-1 text-slate-400 hover:text-slate-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Bulk Delete Controls */}
            <div className="mt-4 p-3.5 rounded-lg bg-slate-50 border border-slate-200 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                <div className="text-slate-700">
                  Total jadwal:{' '}
                  <span className="font-mono font-bold text-slate-900">
                    {accountTotalShiftCount} shift
                  </span>{' '}
                  ({accountMonthShiftCount} shift di{' '}
                  {formatMonthTitle(state.selectedMonth)})
                </div>

                <div className="flex items-center gap-1 p-0.5 bg-white border border-slate-200 rounded-md">
                  <button
                    type="button"
                    onClick={() => {
                      setScheduleScope('MONTH');
                      setSelectedScheduleIds([]);
                    }}
                    className={`px-2.5 py-1 text-[11px] font-semibold rounded ${
                      scheduleScope === 'MONTH'
                        ? 'bg-blue-900 text-white'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {formatMonthTitle(state.selectedMonth)}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setScheduleScope('ALL');
                      setSelectedScheduleIds([]);
                    }}
                    className={`px-2.5 py-1 text-[11px] font-semibold rounded ${
                      scheduleScope === 'ALL'
                        ? 'bg-blue-900 text-white'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Semua Bulan
                  </button>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {accountMonthShiftCount > 0 && (
                  <button
                    type="button"
                    onClick={() => setConfirmBulkDeleteMode('MONTH')}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-semibold text-rose-800 bg-rose-50 border border-rose-200 rounded-md hover:bg-rose-100"
                  >
                    <CalendarX className="w-3.5 h-3.5" />
                    <span>
                      Hapus Semua Jadwal {formatMonthTitle(state.selectedMonth)}{' '}
                      ({accountMonthShiftCount})
                    </span>
                  </button>
                )}

                {accountTotalShiftCount > 0 && (
                  <button
                    type="button"
                    onClick={() => setConfirmBulkDeleteMode('ALL')}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-semibold text-white bg-rose-700 rounded-md hover:bg-rose-800"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>
                      Hapus Seluruh Jadwal Akun Ini ({accountTotalShiftCount})
                    </span>
                  </button>
                )}

                {selectedScheduleIds.length > 0 && (
                  <button
                    type="button"
                    onClick={handleDeleteSelectedSchedules}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-semibold text-white bg-blue-900 rounded-md hover:bg-blue-800"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>
                      Hapus Terpilih ({selectedScheduleIds.length})
                    </span>
                  </button>
                )}
              </div>

              {confirmBulkDeleteMode && (
                <div className="rounded-lg bg-rose-50 border border-rose-300 p-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-xs text-rose-900">
                  <div>
                    <span className="font-bold">Konfirmasi Penghapusan:</span>{' '}
                    {confirmBulkDeleteMode === 'MONTH'
                      ? `Hapus ${accountMonthShiftCount} jadwal milik ${
                          scheduleAccount.fullName
                        } untuk bulan ${formatMonthTitle(state.selectedMonth)}?`
                      : `Hapus seluruh ${accountTotalShiftCount} jadwal milik ${scheduleAccount.fullName} di semua bulan?`}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => setConfirmBulkDeleteMode(null)}
                      className="px-2.5 py-1 text-[11px] font-medium bg-white border border-slate-300 rounded text-slate-700"
                    >
                      Batal
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        handleBulkDeleteAccountSchedules(confirmBulkDeleteMode)
                      }
                      className="px-3 py-1 text-[11px] font-semibold bg-rose-700 text-white rounded hover:bg-rose-800"
                    >
                      Ya, Hapus Sekarang
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Individual Schedule List */}
            <div className="mt-4 overflow-y-auto flex-1 border border-slate-200 rounded-lg divide-y divide-slate-200">
              {accountScheduleList.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-500">
                  Tidak ada jadwal terdaftar untuk akun ini pada cakupan yang
                  dipilih.
                </div>
              ) : (
                accountScheduleList.map((item) => {
                  const checked = selectedScheduleIds.includes(item.id);
                  return (
                    <div
                      key={item.id}
                      className="px-3.5 py-2.5 flex items-center justify-between gap-3 text-xs hover:bg-slate-50"
                    >
                      <label className="flex items-center gap-3 cursor-pointer min-w-0 flex-1">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleScheduleId(item.id)}
                          className="rounded border-slate-300 text-blue-900"
                        />
                        <div className="min-w-0">
                          <div className="font-semibold text-slate-900">
                            {formatIndonesianDate(item.date, true)}
                          </div>
                          <div className="text-[11px] text-slate-500">
                            {SERVICE_LOCATIONS[item.locationCode].name}
                            {item.notes ? ` · ${item.notes}` : ''}
                          </div>
                        </div>
                      </label>

                      <div className="flex items-center gap-2 shrink-0">
                        <LocationBadge code={item.locationCode} compact />
                        <button
                          type="button"
                          onClick={() => {
                            dispatch({
                              type: 'DELETE_USER_SCHEDULES',
                              userId: scheduleAccount.id,
                              scheduleIds: [item.id],
                            });
                            setSelectedScheduleIds((prev) =>
                              prev.filter((id) => id !== item.id)
                            );
                            pushToast({
                              type: 'success',
                              title: 'Jadwal Tanggal Dihapus',
                              description: `Shift ${scheduleAccount.fullName} pada ${formatIndonesianDate(
                                item.date
                              )} telah dihapus.`,
                            });
                          }}
                          className="p-1.5 text-rose-700 hover:bg-rose-50 rounded border border-transparent hover:border-rose-200"
                          title="Hapus jadwal tanggal ini"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <div className="mt-4 flex justify-end">
              <button
                type="button"
                onClick={() => setScheduleAccount(null)}
                className="px-4 py-2 text-xs font-semibold text-white bg-blue-900 rounded-lg hover:bg-blue-800"
              >
                Selesai
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Account Confirmation Modal */}
      {deleteAccountTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="bg-white rounded-xl border border-slate-200 max-w-md w-full p-6 shadow-xl">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-lg bg-rose-50 border border-rose-200 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5 text-rose-700" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Hapus Akun Pengguna?
                </h3>
                <p className="mt-1.5 text-xs text-slate-600 leading-relaxed">
                  Akun{' '}
                  <span className="font-semibold text-slate-900">
                    {deleteAccountTarget.fullName} (@
                    {deleteAccountTarget.username})
                  </span>{' '}
                  beserta seluruh penugasan jadwal yang dimilikinya akan dihapus
                  permanen.
                </p>
              </div>
            </div>

            <div className="mt-6 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setDeleteAccountTarget(null)}
                className="px-4 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteAccount}
                className="px-4 py-2 text-xs font-semibold text-white bg-rose-700 rounded-lg hover:bg-rose-800"
              >
                Ya, Hapus Akun
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
