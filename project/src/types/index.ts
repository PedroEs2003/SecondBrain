// ============================================================
// Modelos de dominio — Segundo Cerebro
// Portados de lib/models/models.dart (Flutter)
// ============================================================

export interface GrupoMuscular {
  id: number
  nombre: string
  icono: string
  orden: number
  created_at?: string
}

export interface Ejercicio {
  id: number
  nombre: string
  grupo_muscular_id: number
  grupo_muscular_nombre?: string
  grupo_muscular_icono?: string
  peso_maximo?: number
  ultimo_peso?: number
  total_entrenamientos?: number
  series_sugeridas?: number
  repes_sugeridas?: number
  ultima_fecha?: string
}

export interface LogGym {
  id?: number
  ejercicio_id: number
  ejercicio_nombre?: string
  series: number
  repes: number
  peso_kg: number
  notas?: string
  fecha: string // ISO date string
}

export interface RutinaDiaria {
  id?: number
  hora_inicio: string  // "HH:MM"
  hora_fin: string     // "HH:MM"
  actividad: string
  icono: string
  color?: string
  notificacion_activa: boolean
  dias_semana: number[] // 1=Lun … 7=Dom
  minutos_antes?: number
}

export interface RutinaExcepcion {
  id?: number
  fecha: string        // "YYYY-MM-DD"
  tipo: 'saltar' | 'agregar'
  rutina_id?: number
  actividad?: string
  hora_inicio?: string
  hora_fin?: string
  icono?: string
  color?: string
}

export interface RutinaPersonalizada {
  id: number
  nombre: string
  icono: string
  ejercicios?: Ejercicio[]
}

export interface RutinaEjercicio {
  rutina_id: number
  ejercicio_id: number
}

// Campos extra para compatibilidad con el UI de React
export interface Subtarea {
  id: string
  texto: string
  completada: boolean
}

export interface Tarea {
  id?: number
  titulo: string
  descripcion?: string
  fecha_limite?: string
  completada: boolean
  prioridad: 0 | 1 | 2   // 0=Normal, 1=Alta, 2=Urgente
  category?: string
  subtasks?: Subtarea[]
  created_at?: string
}

// Campos extra para el UI de React
export interface Nota {
  id?: number
  titulo: string
  contenido?: string
  etiquetas: string[]
  pinned?: boolean
  color_class?: string
  note_color?: string
  checklist?: boolean
  created_at?: string
  updated_at?: string
}

// Campos extra para pagos parciales
export interface PagoDeuda {
  id: string
  monto: number
  fecha: string
  descripcion?: string
}

export interface Deuda {
  id?: number
  persona: string
  monto: number
  tipo: 'debo' | 'me_deben'
  descripcion?: string
  fecha?: string
  pagada: boolean
  payments?: PagoDeuda[]
  created_at?: string
}

export type RepetirRecordatorio = 'none' | 'weekly' | 'monthly' | 'yearly'

export interface Recordatorio {
  id?: number
  texto: string
  fecha: string        // "YYYY-MM-DD"
  hora?: string        // "HH:MM" — campo futuro, no existe aún en BD
  repetir: RepetirRecordatorio
  activo: boolean
  created_at?: string
}

// ============================================================
// Tipos auxiliares para la IA
// ============================================================

export type IntentType =
  | 'gym'
  | 'rutina'
  | 'tarea'
  | 'nota'
  | 'nuevo_ejercicio'
  | 'borrar_tarea'
  | 'borrar_log_gym'
  | 'borrar_rutina'
  | 'borrar_nota'
  | 'deuda'
  | 'borrar_deuda'
  | 'pagar_deuda'
  | 'completar_tarea'
  | 'agregar_excepcion'
  | 'saltar_rutina'
  | 'unknown'

export interface Intent {
  type: IntentType
  data: Record<string, unknown>
}

export interface MensajeChat {
  role: 'user' | 'assistant'
  content: string
  timestamp: string
}

// ============================================================
// Tipos utilitarios
// ============================================================

export interface DatoPersonal {
  id?: number
  label: string
  value: string
  icon: string
  orden: number
  created_at?: string
}

export interface Documento {
  id?: number
  name: string
  type: 'qr' | 'image' | 'doc'
  preview?: string
  created_at?: string
}

export type PrioridadTarea = 0 | 1 | 2
export const PRIORIDAD_LABELS: Record<PrioridadTarea, string> = {
  0: 'Normal',
  1: 'Alta',
  2: 'Urgente',
}
