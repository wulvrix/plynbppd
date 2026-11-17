-- ============================================================================
-- SIJADPAJAK (Sistem Informasi Jadwal Pelayanan Pajak Daerah)
-- BPPD Kabupaten Sidoarjo - PostgreSQL / Supabase Migration & Seed Script
-- Aligned with PRD Section 9 (Infrastructure) & Section 12 (Security & Privacy)
-- ============================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- 1. TABLES
-- ============================================================================

-- 1.1 Profiles (Master Pegawai ASN & Akun Pengguna RBAC)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_user_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE SET NULL,
  nip VARCHAR(24) UNIQUE NOT NULL,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  position TEXT NOT NULL DEFAULT 'ASN Pengolah Data dan Informasi',
  golongan TEXT NOT NULL DEFAULT 'Penata Muda (III/a)',
  phone TEXT,
  role TEXT NOT NULL DEFAULT 'asn' CHECK (role IN ('admin', 'koordinator', 'asn', 'pimpinan')),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 1.2 Locations (3 Titik Layanan Pajak Daerah)
CREATE TABLE IF NOT EXISTS public.locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL CHECK (code IN ('KANTOR', 'L', 'S')),
  name TEXT NOT NULL,
  address TEXT NOT NULL,
  daily_quota INTEGER NOT NULL CHECK (daily_quota > 0),
  badge_color TEXT NOT NULL,
  coordinates TEXT NOT NULL DEFAULT '-7.4478, 112.7183',
  qr_code_id TEXT NOT NULL DEFAULT 'QR-BPPD-01',
  operational_hours TEXT NOT NULL DEFAULT '07.30 - 15.30 WIB',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 1.3 Schedules (Matriks Penugasan Harian ASN)
CREATE TABLE IF NOT EXISTS public.schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  location_id UUID NOT NULL REFERENCES public.locations(id) ON DELETE RESTRICT,
  duty_date DATE NOT NULL,
  session TEXT NOT NULL DEFAULT 'FULL_DAY' CHECK (session IN ('FULL_DAY', 'SESI_1', 'SESI_2')),
  status TEXT NOT NULL DEFAULT 'SCHEDULED' CHECK (status IN ('SCHEDULED', 'SWAPPED', 'ABSENT')),
  notes TEXT,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT schedules_user_date_unique UNIQUE (user_id, duty_date)
);

CREATE INDEX IF NOT EXISTS idx_schedules_duty_date ON public.schedules(duty_date);
CREATE INDEX IF NOT EXISTS idx_schedules_user_id ON public.schedules(user_id);

-- 1.4 Attendance Logs (Absensi QR Code & Geofencing)
CREATE TABLE IF NOT EXISTS public.attendance_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  schedule_id UUID REFERENCES public.schedules(id) ON DELETE SET NULL,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  location_id UUID REFERENCES public.locations(id) ON DELETE SET NULL,
  duty_date DATE NOT NULL DEFAULT CURRENT_DATE,
  check_in_time TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  check_out_time TIMESTAMPTZ,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  distance_meters INTEGER DEFAULT 12,
  verification_method TEXT NOT NULL DEFAULT 'QR_CODE' CHECK (verification_method IN ('QR_CODE', 'GEOFENCE')),
  geofence_status TEXT NOT NULL DEFAULT 'TERVERIFIKASI' CHECK (geofence_status IN ('TERVERIFIKASI', 'LUAR_RADIUS')),
  operational_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT attendance_user_date_unique UNIQUE (user_id, duty_date)
);

-- 1.5 Swap Requests (Permohonan Tukar Jadwal)
CREATE TABLE IF NOT EXISTS public.swap_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  requester_schedule_id UUID NOT NULL REFERENCES public.schedules(id) ON DELETE CASCADE,
  target_peer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  target_schedule_id UUID NOT NULL REFERENCES public.schedules(id) ON DELETE CASCADE,
  reason TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED')),
  reviewed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  review_note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 1.6 Audit Logs (Jejak Audit Permanen Inspektorat)
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id UUID,
  actor_name TEXT,
  action_type TEXT NOT NULL CHECK (action_type IN ('INSERT', 'UPDATE', 'DELETE')),
  table_name TEXT NOT NULL,
  record_id UUID,
  old_data JSONB,
  new_data JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs(created_at DESC);

-- ============================================================================
-- 2. HELPER FUNCTIONS FOR RBAC & AUTH LINKING
-- ============================================================================

-- Resolve email from NIP or Email before Supabase password login
CREATE OR REPLACE FUNCTION public.resolve_login_email(identifier TEXT)
RETURNS TEXT
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT email
  FROM public.profiles
  WHERE (LOWER(email) = LOWER(TRIM(identifier)) OR nip = TRIM(identifier))
    AND is_active = true
  LIMIT 1;
$$;

-- Get current authenticated user's profile ID
CREATE OR REPLACE FUNCTION public.current_profile_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id
  FROM public.profiles
  WHERE auth_user_id = auth.uid() OR id = auth.uid()
  LIMIT 1;
$$;

-- Get current authenticated user's role
CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role
  FROM public.profiles
  WHERE auth_user_id = auth.uid() OR id = auth.uid()
  LIMIT 1;
$$;

-- Automatically link newly created auth.users to existing profiles by email
CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.profiles
  SET auth_user_id = NEW.id
  WHERE LOWER(email) = LOWER(NEW.email);

  IF NOT FOUND THEN
    INSERT INTO public.profiles (auth_user_id, nip, email, full_name, role)
    VALUES (
      NEW.id,
      COALESCE(NEW.raw_user_meta_data->>'nip', 'ASN-' || SUBSTRING(NEW.id::TEXT, 1, 8)),
      NEW.email,
      COALESCE(NEW.raw_user_meta_data->>'full_name', SPLIT_PART(NEW.email, '@', 1)),
      COALESCE(NEW.raw_user_meta_data->>'role', 'asn')
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_auth_user();

-- ============================================================================
-- 3. AUDIT LOG TRIGGER FUNCTION (schedules & swap_requests)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.fn_audit_log_trigger()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor_id UUID;
  v_actor_name TEXT;
  v_record_id UUID;
  v_old_data JSONB;
  v_new_data JSONB;
BEGIN
  SELECT id, full_name INTO v_actor_id, v_actor_name
  FROM public.profiles
  WHERE auth_user_id = auth.uid() OR id = auth.uid()
  LIMIT 1;

  IF TG_OP = 'INSERT' THEN
    v_record_id := NEW.id;
    v_old_data := NULL;
    v_new_data := to_jsonb(NEW);
  ELSIF TG_OP = 'UPDATE' THEN
    v_record_id := NEW.id;
    v_old_data := to_jsonb(OLD);
    v_new_data := to_jsonb(NEW);
  ELSIF TG_OP = 'DELETE' THEN
    v_record_id := OLD.id;
    v_old_data := to_jsonb(OLD);
    v_new_data := NULL;
  END IF;

  INSERT INTO public.audit_logs (
    actor_id,
    actor_name,
    action_type,
    table_name,
    record_id,
    old_data,
    new_data
  ) VALUES (
    COALESCE(v_actor_id, auth.uid()),
    COALESCE(v_actor_name, 'Sistem PostgreSQL'),
    TG_OP,
    TG_TABLE_NAME,
    v_record_id,
    v_old_data,
    v_new_data
  );

  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_audit_schedules ON public.schedules;
CREATE TRIGGER trg_audit_schedules
  AFTER INSERT OR UPDATE OR DELETE ON public.schedules
  FOR EACH ROW EXECUTE FUNCTION public.fn_audit_log_trigger();

DROP TRIGGER IF EXISTS trg_audit_swap_requests ON public.swap_requests;
CREATE TRIGGER trg_audit_swap_requests
  AFTER INSERT OR UPDATE OR DELETE ON public.swap_requests
  FOR EACH ROW EXECUTE FUNCTION public.fn_audit_log_trigger();

-- ============================================================================
-- 4. ROW-LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.swap_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Profiles Policies
DROP POLICY IF EXISTS "profiles_select_authenticated" ON public.profiles;
CREATE POLICY "profiles_select_authenticated" ON public.profiles
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "profiles_manage_admin" ON public.profiles;
CREATE POLICY "profiles_manage_admin" ON public.profiles
  FOR ALL TO authenticated
  USING (public.current_user_role() = 'admin')
  WITH CHECK (public.current_user_role() = 'admin');

-- Locations Policies
DROP POLICY IF EXISTS "locations_select_authenticated" ON public.locations;
CREATE POLICY "locations_select_authenticated" ON public.locations
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "locations_manage_admin" ON public.locations;
CREATE POLICY "locations_manage_admin" ON public.locations
  FOR ALL TO authenticated
  USING (public.current_user_role() IN ('admin', 'koordinator'))
  WITH CHECK (public.current_user_role() IN ('admin', 'koordinator'));

-- Schedules Policies
DROP POLICY IF EXISTS "schedules_select_authenticated" ON public.schedules;
CREATE POLICY "schedules_select_authenticated" ON public.schedules
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "schedules_insert_admin_koordinator" ON public.schedules;
CREATE POLICY "schedules_insert_admin_koordinator" ON public.schedules
  FOR INSERT TO authenticated
  WITH CHECK (public.current_user_role() IN ('admin', 'koordinator'));

DROP POLICY IF EXISTS "schedules_update_admin_koordinator" ON public.schedules;
CREATE POLICY "schedules_update_admin_koordinator" ON public.schedules
  FOR UPDATE TO authenticated
  USING (public.current_user_role() IN ('admin', 'koordinator'))
  WITH CHECK (public.current_user_role() IN ('admin', 'koordinator'));

DROP POLICY IF EXISTS "schedules_delete_admin_koordinator" ON public.schedules;
CREATE POLICY "schedules_delete_admin_koordinator" ON public.schedules
  FOR DELETE TO authenticated
  USING (public.current_user_role() IN ('admin', 'koordinator'));

-- Attendance Logs Policies
DROP POLICY IF EXISTS "attendance_select_authenticated" ON public.attendance_logs;
CREATE POLICY "attendance_select_authenticated" ON public.attendance_logs
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "attendance_insert_own" ON public.attendance_logs;
CREATE POLICY "attendance_insert_own" ON public.attendance_logs
  FOR INSERT TO authenticated
  WITH CHECK (
    user_id = public.current_profile_id()
    OR public.current_user_role() IN ('admin', 'koordinator')
  );

DROP POLICY IF EXISTS "attendance_update_own" ON public.attendance_logs;
CREATE POLICY "attendance_update_own" ON public.attendance_logs
  FOR UPDATE TO authenticated
  USING (
    user_id = public.current_profile_id()
    OR public.current_user_role() IN ('admin', 'koordinator')
  )
  WITH CHECK (
    user_id = public.current_profile_id()
    OR public.current_user_role() IN ('admin', 'koordinator')
  );

-- Swap Requests Policies
DROP POLICY IF EXISTS "swaps_select_authenticated" ON public.swap_requests;
CREATE POLICY "swaps_select_authenticated" ON public.swap_requests
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "swaps_insert_own" ON public.swap_requests;
CREATE POLICY "swaps_insert_own" ON public.swap_requests
  FOR INSERT TO authenticated
  WITH CHECK (
    requester_id = public.current_profile_id()
    OR public.current_user_role() IN ('admin', 'koordinator')
  );

DROP POLICY IF EXISTS "swaps_update_admin_koordinator" ON public.swap_requests;
CREATE POLICY "swaps_update_admin_koordinator" ON public.swap_requests
  FOR UPDATE TO authenticated
  USING (public.current_user_role() IN ('admin', 'koordinator'))
  WITH CHECK (public.current_user_role() IN ('admin', 'koordinator'));

-- Audit Logs Policies (Read-only for authenticated, inserts via SECURITY DEFINER triggers)
DROP POLICY IF EXISTS "audit_select_authenticated" ON public.audit_logs;
CREATE POLICY "audit_select_authenticated" ON public.audit_logs
  FOR SELECT TO authenticated USING (true);

-- ============================================================================
-- 5. SUPABASE REALTIME PUBLICATION
-- ============================================================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    BEGIN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.schedules;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
    BEGIN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.attendance_logs;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
    BEGIN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.swap_requests;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
    BEGIN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.audit_logs;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
    BEGIN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
  END IF;
END $$;

-- ============================================================================
-- 6. SEED DATA (3 LOCATIONS, 7 ASN STAFF, NOVEMBER 2026 SCHEDULES)
-- ============================================================================

-- 6.1 Service Locations
INSERT INTO public.locations (id, code, name, address, daily_quota, badge_color, coordinates, qr_code_id, operational_hours)
VALUES
  ('00000000-0000-0000-0000-000000000101', 'KANTOR', 'Kantor Utama BPPD', 'Jl. Pahlawan No. 56, Sidoarjo', 6, '#475569', '-7.4478, 112.7183', 'QR-BPPD-KANTOR-01', 'Sen-Jum, 07.30 - 15.30 WIB'),
  ('00000000-0000-0000-0000-000000000102', 'L', 'MPP Lingkar Timur', 'Jl. Lingkar Timur KM 2, Buduran, Sidoarjo', 1, '#0284C7', '-7.4342, 112.7429', 'QR-MPP-LTIMUR-02', 'Sen-Jum, 08.00 - 15.00 WIB'),
  ('00000000-0000-0000-0000-000000000103', 'S', 'MPP Sukodono', 'Jl. Raya Sukodono No. 18, Sukodono, Sidoarjo', 1, '#059669', '-7.4021, 112.6684', 'QR-MPP-SUKODONO-03', 'Sel & Kam, 08.00 - 15.00 WIB')
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  address = EXCLUDED.address,
  daily_quota = EXCLUDED.daily_quota,
  badge_color = EXCLUDED.badge_color,
  operational_hours = EXCLUDED.operational_hours;

-- 6.2 7 ASN Staff Members + Administrative Roles
INSERT INTO public.profiles (id, nip, email, full_name, position, golongan, phone, role, is_active)
VALUES
  ('10000000-0000-0000-0000-000000000001', '199801012022032001', 'bellina.sari@bppd.sidoarjokab.go.id', 'Bellina Reggita Sari', 'ASN Pengolah Data dan Informasi', 'Penata Muda (III/a)', '0812-3456-1001', 'asn', true),
  ('10000000-0000-0000-0000-000000000002', '199802022022032002', 'diva.palupi@bppd.sidoarjokab.go.id', 'Diva Trifindaardy Palupi', 'ASN Pengolah Data dan Informasi', 'Penata Muda (III/a)', '0812-3456-1002', 'asn', true),
  ('10000000-0000-0000-0000-000000000003', '199803032022032003', 'putri.ratih@bppd.sidoarjokab.go.id', 'Putri Ratih', 'ASN Pengolah Data dan Informasi', 'Penata Muda (III/a)', '0812-3456-1003', 'asn', true),
  ('10000000-0000-0000-0000-000000000004', '199804042022032004', 'rahma.rahayu@bppd.sidoarjokab.go.id', 'Rahma Agustin Rahayu', 'ASN Pengolah Data dan Informasi', 'Penata Muda (III/a)', '0812-3456-1004', 'asn', true),
  ('10000000-0000-0000-0000-000000000005', '199805052022032005', 'novita@bppd.sidoarjokab.go.id', 'Novita', 'ASN Pengolah Data dan Informasi', 'Penata Muda (III/a)', '0812-3456-1005', 'asn', true),
  ('10000000-0000-0000-0000-000000000006', '199806062022032006', 'viona@bppd.sidoarjokab.go.id', 'Viona', 'ASN Pengolah Data dan Informasi', 'Penata Muda (III/a)', '0812-3456-1006', 'asn', true),
  ('10000000-0000-0000-0000-000000000007', '199907192023031001', 'reza@bppd.sidoarjokab.go.id', 'Reza', 'ASN Pengolah Data dan Informasi', 'Pengatur (II/c)', '0812-3456-1007', 'asn', true),
  ('10000000-0000-0000-0000-000000000008', '198504122010011001', 'koordinator@bppd.sidoarjokab.go.id', 'Koordinator Pelayanan BPPD', 'Koordinator Pelayanan Pajak Daerah', 'Penata (III/c)', '0812-3456-2001', 'koordinator', true),
  ('10000000-0000-0000-0000-000000000009', '198008172006041002', 'kabid.pdi@bppd.sidoarjokab.go.id', 'Kepala Bidang PDI (Pimpinan)', 'Kepala Bidang Pengolahan Data & Informasi', 'Pembina (IV/a)', '0812-3456-2002', 'pimpinan', true),
  ('10000000-0000-0000-0000-000000000010', '199001012015031001', 'admin.sijadpajak@bppd.sidoarjokab.go.id', 'Admin Sistem SIJADPAJAK', 'Administrator Sistem Informasi', 'Penata Muda Tk. I (III/b)', '0812-3456-2003', 'admin', true)
ON CONFLICT (nip) DO UPDATE SET
  full_name = EXCLUDED.full_name,
  email = EXCLUDED.email,
  position = EXCLUDED.position,
  role = EXCLUDED.role;

-- 6.3 Seed November 2026 Schedule Matrix (All Mon-Fri working days)
-- Includes exact anchor dates (Nov 2, 3, 4, 10) + balanced rotation for remaining days
DO $$
DECLARE
  v_kantor UUID := '00000000-0000-0000-0000-000000000101';
  v_l      UUID := '00000000-0000-0000-0000-000000000102';
  v_s      UUID := '00000000-0000-0000-0000-000000000103';
  v_koord  UUID := '10000000-0000-0000-0000-000000000008';

  v_asn1 UUID := '10000000-0000-0000-0000-000000000001'; -- Bellina
  v_asn2 UUID := '10000000-0000-0000-0000-000000000002'; -- Diva
  v_asn3 UUID := '10000000-0000-0000-0000-000000000003'; -- Putri
  v_asn4 UUID := '10000000-0000-0000-0000-000000000004'; -- Rahma
  v_asn5 UUID := '10000000-0000-0000-0000-000000000005'; -- Novita
  v_asn6 UUID := '10000000-0000-0000-0000-000000000006'; -- Viona
  v_asn7 UUID := '10000000-0000-0000-0000-000000000007'; -- Reza

  v_day DATE;
  v_dow INTEGER;
  v_idx INTEGER := 0;
  v_staff UUID[];
  v_loc UUID;
  v_i INTEGER;
BEGIN
  v_staff := ARRAY[v_asn1, v_asn2, v_asn3, v_asn4, v_asn5, v_asn6, v_asn7];

  FOR v_day IN
    SELECT d::DATE
    FROM generate_series('2026-11-01'::DATE, '2026-11-30'::DATE, '1 day'::INTERVAL) d
    WHERE EXTRACT(ISODOW FROM d) BETWEEN 1 AND 5
    ORDER BY d
  LOOP
    v_dow := EXTRACT(ISODOW FROM v_day)::INTEGER; -- 1=Mon, 2=Tue, 3=Wed, 4=Thu, 5=Fri

    FOR v_i IN 1..7 LOOP
      v_loc := v_kantor;

      -- Anchor dates compliant with: [L] Mon-Fri 1 staff, [S] Tue & Thu only 1 staff, remainder KANTOR
      IF v_day = '2026-11-02' THEN
        IF v_staff[v_i] = v_asn4 THEN v_loc := v_l; END IF;
      ELSIF v_day = '2026-11-03' THEN
        IF v_staff[v_i] = v_asn3 THEN v_loc := v_l;
        ELSIF v_staff[v_i] = v_asn5 THEN v_loc := v_s; END IF;
      ELSIF v_day = '2026-11-10' THEN
        IF v_staff[v_i] = v_asn1 THEN v_loc := v_l;
        ELSIF v_staff[v_i] = v_asn2 THEN v_loc := v_s; END IF;
      ELSE
        -- 1 staff at MPP Lingkar Timur [L] (Mon-Fri)
        IF v_i = ((v_idx % 7) + 1) THEN
          v_loc := v_l;
        -- 1 staff at MPP Sukodono [S] (Tuesday & Thursday only)
        ELSIF (v_dow IN (2, 4)) AND v_i = (((v_idx + 3) % 7) + 1) THEN
          v_loc := v_s;
        END IF;
      END IF;

      INSERT INTO public.schedules (user_id, location_id, duty_date, session, status, created_by)
      VALUES (v_staff[v_i], v_loc, v_day, 'FULL_DAY', 'SCHEDULED', v_koord)
      ON CONFLICT (user_id, duty_date) DO UPDATE SET
        location_id = EXCLUDED.location_id,
        updated_at = NOW();
    END LOOP;

    v_idx := v_idx + 1;
  END LOOP;
END $$;
