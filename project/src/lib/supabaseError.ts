// ──────────────────────────────────────────────
// Supabase / PostgREST error parser
// ──────────────────────────────────────────────

interface PostgrestError {
  message: string
  code?: string
  details?: string | null
  hint?: string | null
}

const CODE_LABELS: Record<string, string> = {
  // PostgreSQL
  '23505': 'Registro duplicado',
  '23503': 'Violación de clave foránea',
  '23502': 'Campo obligatorio vacío',
  '42501': 'Sin permisos (RLS)',
  '42P01': 'Tabla no encontrada',
  '22P02': 'Formato de dato inválido',
  '22003': 'Valor numérico fuera de rango',
  // PostgREST
  PGRST116: 'Ningún registro encontrado',
  PGRST301: 'Sesión expirada — inicia sesión nuevamente',
  PGRST200: 'Relación no encontrada en el schema',
}

function isPostgrestError(err: unknown): err is PostgrestError {
  return (
    typeof err === 'object' &&
    err !== null &&
    'message' in err &&
    typeof (err as Record<string, unknown>).message === 'string'
  )
}

/** Returns a user-friendly string and logs the full error to the console. */
export function parseSupabaseError(err: unknown, fallback = 'Error desconocido'): string {
  // Log full details server-side only — never expose raw DB internals to the UI
  console.error('[Supabase Error]', err)

  if (!isPostgrestError(err)) return fallback

  const label = err.code ? CODE_LABELS[err.code] : undefined

  // Only show the mapped label or a generic message — never raw DB details/hints
  if (label) return label
  if (err.code) return fallback
  return fallback
}
