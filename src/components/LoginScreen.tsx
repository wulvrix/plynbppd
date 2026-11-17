import React, { useState } from 'react';
import {
  AlertCircle,
  Building2,
  Check,
  Copy,
  Database,
  FileCode2,
  Lock,
  LogIn,
  ShieldCheck,
  UserCheck,
  X,
} from 'lucide-react';
import { useAppState } from '../context/AppStateContext';
import { isSupabaseConfigured } from '../lib/supabaseClient';
import { UserRole } from '../types/sijadpajak';

const SQL_MIGRATION_SNIPPET = `-- Jalankan file lengkap: supabase/migrations/001_sijadpajak_schema_and_seed.sql
-- di Supabase SQL Editor untuk membuat 6 tabel, Trigger Audit Log, RLS Policies,
-- Publikasi Realtime, serta Seed Data 3 Lokasi, 7 ASN, dan Jadwal November 2026.`;

export function LoginScreen() {
  const { loginWithSupabase, enterDemoMode } = useAppState();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [demoRole, setDemoRole] = useState<UserRole>('ADMIN_SISTEM');
  const [sqlModalOpen, setSqlModalOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleSupabaseLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!isSupabaseConfigured) {
      setErrorMsg(
        'Environment VITE_SUPABASE_URL dan VITE_SUPABASE_ANON_KEY belum dikonfigurasi. Gunakan Mode Demo Presentasi di sebelah kanan atau lengkapi variabel .env.'
      );
      return;
    }

    if (!identifier.trim() || !password) {
      setErrorMsg('Masukkan NIP atau Email Resmi Instansi beserta kata sandi.');
      return;
    }

    setIsSubmitting(true);
    const res = await loginWithSupabase(identifier, password);
    setIsSubmitting(false);

    if (res.error) {
      setErrorMsg(res.error);
    }
  };

  const handleCopySnippet = async () => {
    try {
      await navigator.clipboard.writeText(SQL_MIGRATION_SNIPPET);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Ignore clipboard failure
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between">
      {/* Top Institutional Bar */}
      <header className="bg-blue-950 text-white border-b border-blue-900 px-6 py-4">
        <div className="max-w-5xl mx-auto flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-800 border border-blue-700 flex items-center justify-center shrink-0">
              <Building2 className="w-5 h-5 text-sky-300" />
            </div>
            <div>
              <div className="text-base font-bold tracking-tight">
                SIJADPAJAK
              </div>
              <div className="text-xs text-blue-200">
                Badan Pelayanan Pajak Daerah (BPPD) Kabupaten Sidoarjo
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium border ${
                isSupabaseConfigured
                  ? 'bg-emerald-900/60 text-emerald-200 border-emerald-700'
                  : 'bg-blue-900/70 text-blue-200 border-blue-800'
              }`}
            >
              <Database className="w-3.5 h-3.5" />
              <span>
                {isSupabaseConfigured
                  ? 'PostgreSQL Supabase Terhubung'
                  : 'Mode Demo Siap (Env Supabase Opsional)'}
              </span>
            </span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center px-4 py-10">
        <div className="max-w-4xl w-full grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
          {/* Left: Official NIP / Email Login Form */}
          <div className="lg:col-span-7 bg-white border border-slate-200 rounded-xl p-6 sm:p-8 flex flex-col justify-between">
            <div>
              <div className="text-xs font-semibold text-blue-900">
                Autentikasi Resmi Instansi (RBAC)
              </div>
              <h1 className="mt-1 text-2xl font-bold text-slate-900 tracking-tight">
                Masuk ke Sistem SIJADPAJAK
              </h1>
              <p className="mt-1.5 text-xs text-slate-600 leading-relaxed">
                Gunakan Nomor Induk Pegawai (NIP) atau Email Resmi BPPD
                Kabupaten Sidoarjo yang terdaftar pada PostgreSQL Supabase.
              </p>

              <form onSubmit={handleSupabaseLogin} className="mt-6 space-y-4">
                <div>
                  <label
                    htmlFor="login-identifier"
                    className="block text-xs font-semibold text-slate-700 mb-1.5"
                  >
                    NIP atau Email Resmi Instansi
                  </label>
                  <input
                    id="login-identifier"
                    type="text"
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    placeholder="199801012022032001 atau bellina.sari@bppd.sidoarjokab.go.id"
                    className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-900/20 focus:border-blue-900"
                  />
                </div>

                <div>
                  <label
                    htmlFor="login-password"
                    className="block text-xs font-semibold text-slate-700 mb-1.5"
                  >
                    Kata Sandi
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      id="login-password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Masukkan kata sandi akun instansi"
                      className="w-full pl-10 pr-3.5 py-2.5 text-sm border border-slate-300 rounded-lg bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-900/20 focus:border-blue-900"
                    />
                  </div>
                </div>

                {errorMsg && (
                  <div className="rounded-lg bg-rose-50 border border-rose-200 p-3 flex items-start gap-2 text-xs text-rose-800">
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                    <span>{errorMsg}</span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-blue-900 rounded-lg hover:bg-blue-800 transition-colors disabled:opacity-60"
                >
                  <LogIn className="w-4 h-4" />
                  <span>
                    {isSubmitting
                      ? 'Memverifikasi Kredensial...'
                      : 'Masuk dengan Akun Instansi'}
                  </span>
                </button>
              </form>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
              <span>Tertib Jadwal, Optimal Layanan Pajak Daerah.</span>
              <button
                type="button"
                onClick={() => setSqlModalOpen(true)}
                className="inline-flex items-center gap-1.5 font-semibold text-blue-900 hover:underline"
              >
                <FileCode2 className="w-3.5 h-3.5" />
                <span>Panduan Migrasi SQL Supabase</span>
              </button>
            </div>
          </div>

          {/* Right: Demo Mode Bypass Card */}
          <div className="lg:col-span-5 bg-white border border-slate-200 rounded-xl p-6 sm:p-8 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 text-xs font-semibold text-sky-700">
                <ShieldCheck className="w-4 h-4" />
                <span>Akses Cepat Evaluasi &amp; Presentasi</span>
              </div>
              <h2 className="mt-1.5 text-lg font-bold text-slate-900">
                Mode Demo Bypass
              </h2>
              <p className="mt-1.5 text-xs text-slate-600 leading-relaxed">
                Masuk langsung tanpa kredensial Supabase untuk menguji seluruh
                alur penjadwalan November 2026, Deteksi Konflik, Absensi QR,
                Tukar Jadwal, dan Export Laporan.
              </p>

              <div className="mt-5">
                <label className="block text-xs font-semibold text-slate-700 mb-2">
                  Pilih Persona Awal Mode Demo
                </label>
                <div className="space-y-2">
                  {(
                    [
                      {
                        id: 'ADMIN_SISTEM',
                        title: 'Admin Sistem',
                        desc: 'Kelola master pegawai, jadwal & sistem',
                      },
                      {
                        id: 'KOORDINATOR',
                        title: 'Koordinator Pelayanan',
                        desc: 'Auto-rotasi, konflik & setujui tukar jadwal',
                      },
                      {
                        id: 'ASN',
                        title: 'ASN Pengolah Data dan Informasi',
                        desc: 'Lihat jadwal, absensi QR & ajukan tukar',
                      },
                      {
                        id: 'PIMPINAN',
                        title: 'Pimpinan / Kabid',
                        desc: 'Dashboard pemantauan & laporan (Baca Saja)',
                      },
                    ] as const
                  ).map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setDemoRole(item.id)}
                      className={`w-full text-left p-2.5 rounded-lg border transition-colors ${
                        demoRole === item.id
                          ? 'border-blue-900 bg-blue-50/70'
                          : 'border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      <div className="text-xs font-semibold text-slate-900">
                        {item.title}
                      </div>
                      <div className="text-[11px] text-slate-500">
                        {item.desc}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => enterDemoMode(demoRole)}
              className="mt-6 w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold text-blue-900 bg-sky-50 border border-sky-300 rounded-lg hover:bg-sky-100 transition-colors"
            >
              <UserCheck className="w-4 h-4" />
              <span>Masuk via Mode Demo</span>
            </button>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white px-6 py-3 text-center text-xs text-slate-500">
        SIJADPAJAK · Badan Pelayanan Pajak Daerah (BPPD) Kabupaten Sidoarjo ·
        Kantor Utama, MPP Lingkar Timur [L], dan MPP Sukodono [S]
      </footer>

      {/* SQL Migration Info Modal */}
      {sqlModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="bg-white rounded-xl border border-slate-200 max-w-lg w-full p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900">
                Aktivasi Backend PostgreSQL Supabase
              </h3>
              <button
                type="button"
                onClick={() => setSqlModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <ol className="text-xs text-slate-700 space-y-2 list-decimal pl-4 leading-relaxed">
              <li>
                Buka <strong>Supabase SQL Editor</strong> pada proyek Anda dan
                jalankan seluruh skrip pada berkas{' '}
                <code className="font-mono bg-slate-100 px-1 py-0.5 rounded">
                  supabase/migrations/001_sijadpajak_schema_and_seed.sql
                </code>
                .
              </li>
              <li>
                Skrip tersebut membuat 6 tabel (<code className="font-mono">profiles</code>,{' '}
                <code className="font-mono">locations</code>,{' '}
                <code className="font-mono">schedules</code> dengan{' '}
                <code className="font-mono">UNIQUE(user_id, duty_date)</code>,{' '}
                <code className="font-mono">attendance_logs</code>,{' '}
                <code className="font-mono">swap_requests</code>,{' '}
                <code className="font-mono">audit_logs</code>), Trigger Audit Log,
                Kebijakan RLS, serta Seed Data 3 lokasi &amp; 7 ASN.
              </li>
              <li>
                Atur <code className="font-mono">VITE_SUPABASE_URL</code> dan{' '}
                <code className="font-mono">VITE_SUPABASE_ANON_KEY</code> pada
                environment aplikasi, lalu muat ulang halaman.
              </li>
            </ol>

            <div className="bg-slate-900 text-slate-100 rounded-lg p-3 text-[11px] font-mono relative">
              <pre className="overflow-x-auto whitespace-pre-wrap">
                {SQL_MIGRATION_SNIPPET}
              </pre>
              <button
                type="button"
                onClick={handleCopySnippet}
                className="mt-2 inline-flex items-center gap-1 text-[11px] text-sky-300 hover:text-white"
              >
                {copied ? (
                  <>
                    <Check className="w-3 h-3" />
                    <span>Tersalin</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3 h-3" />
                    <span>Salin catatan</span>
                  </>
                )}
              </button>
            </div>

            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setSqlModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-white bg-blue-900 rounded-lg hover:bg-blue-800"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
