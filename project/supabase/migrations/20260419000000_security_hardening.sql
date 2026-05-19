-- =============================================================
-- Security Hardening Migration
-- 2026-04-19
-- Restricts all public-access RLS policies to authenticated users only
-- Fixes storage bucket policies to require authentication for writes
-- =============================================================

-- ── Application tables: require authentication ────────────────

DO $$
DECLARE
  tbl TEXT;
  tables TEXT[] := ARRAY[
    'datos_personales', 'deudas', 'documentos', 'ejercicios',
    'grupos_musculares', 'logs_gym', 'notas', 'push_subscriptions',
    'recordatorios', 'rutinas', 'rutinas_diarias', 'rutinas_ejercicios',
    'rutinas_excepciones', 'rutinas_personalizadas', 'tareas'
  ];
BEGIN
  FOREACH tbl IN ARRAY tables LOOP
    -- Drop all existing permissive policies on this table
    EXECUTE format(
      'DROP POLICY IF EXISTS "Public access %s" ON %I',
      tbl, tbl
    );
    EXECUTE format(
      'DROP POLICY IF EXISTS "allow_all" ON %I', tbl
    );
    EXECUTE format(
      'DROP POLICY IF EXISTS "allow_all_recordatorios" ON %I', tbl
    );
    EXECUTE format(
      'DROP POLICY IF EXISTS "Permitir todo en %s" ON %I',
      tbl, tbl
    );
    -- Create new policy: authenticated users only
    EXECUTE format(
      'CREATE POLICY "authenticated_access_%s" ON %I
       FOR ALL TO authenticated
       USING (true)
       WITH CHECK (true)',
      tbl, tbl
    );
  END LOOP;
END $$;

-- ── Storage: require authentication for write operations ───────

-- Drop open write policies
DROP POLICY IF EXISTS "Anyone can upload avatars" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can update avatars" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can delete avatars" ON storage.objects;

-- Re-create with authentication requirement
CREATE POLICY "Authenticated users can upload avatars"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'avatars');

CREATE POLICY "Authenticated users can update avatars"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'avatars');

CREATE POLICY "Authenticated users can delete avatars"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'avatars');
