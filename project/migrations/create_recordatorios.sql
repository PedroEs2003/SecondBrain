-- ============================================================
-- Tabla: recordatorios
-- Descripción: Recordatorios persistentes con soporte de repetición
-- Ejecutar en: Supabase Dashboard > SQL Editor
-- ============================================================

CREATE TABLE IF NOT EXISTS public.recordatorios (
  id         BIGSERIAL PRIMARY KEY,
  texto      TEXT        NOT NULL,
  fecha      DATE        NOT NULL,
  repetir    TEXT        NOT NULL DEFAULT 'none'
               CHECK (repetir IN ('none', 'weekly', 'monthly', 'yearly')),
  activo     BOOLEAN     NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Índices útiles para consultas frecuentes
CREATE INDEX IF NOT EXISTS idx_recordatorios_fecha   ON public.recordatorios (fecha);
CREATE INDEX IF NOT EXISTS idx_recordatorios_activo  ON public.recordatorios (activo);

-- RLS: habilitar (sin políticas = acceso público, igual que las demás tablas)
ALTER TABLE public.recordatorios ENABLE ROW LEVEL SECURITY;

-- Política permisiva para uso personal (sin autenticación)
CREATE POLICY "allow_all_recordatorios"
  ON public.recordatorios
  FOR ALL
  USING (true)
  WITH CHECK (true);
