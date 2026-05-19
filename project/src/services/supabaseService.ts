// ============================================================
// Servicios Supabase — Segundo Cerebro
// Portados de lib/services/supabase_service.dart (Flutter)
// ============================================================

import { supabase } from '@/integrations/supabase/client'
import { localDateStr } from '@/lib/utils'
import type {
  GrupoMuscular,
  Ejercicio,
  LogGym,
  RutinaDiaria,
  RutinaExcepcion,
  RutinaPersonalizada,
  Tarea,
  Nota,
  Deuda,
  Recordatorio,
  DatoPersonal,
  Documento,
} from '@/types'

// ─── Gym ────────────────────────────────────────────────────

export const gymService = {
  async getGruposMusculares(): Promise<GrupoMuscular[]> {
    const { data, error } = await supabase
      .from('grupos_musculares')
      .select('*')
      .order('orden')
    if (error) throw error
    return data ?? []
  },

  async getEjerciciosPorGrupo(grupoId: number): Promise<Ejercicio[]> {
    const { data, error } = await supabase
      .from('ejercicios')
      .select('*')
      .eq('grupo_muscular_id', grupoId)
      .order('nombre')
    if (error) throw error
    return data ?? []
  },

  async getAllEjerciciosConStats(): Promise<Ejercicio[]> {
    // Intentar usar la vista con stats; si no existe, usar tabla base
    const { data, error } = await supabase
      .from('vista_ejercicios_stats')
      .select('*')
      .order('nombre')
    if (error) {
      // Fallback a tabla base
      const { data: base, error: e2 } = await supabase
        .from('ejercicios')
        .select('*')
        .order('nombre')
      if (e2) throw e2
      return base ?? []
    }
    return data ?? []
  },

  async createGrupoMuscular(grupo: Omit<GrupoMuscular, 'id'>): Promise<GrupoMuscular> {
    const { data, error } = await supabase
      .from('grupos_musculares')
      .insert(grupo)
      .select()
      .single()
    if (error) throw error
    return data
  },

  async createEjercicio(ejercicio: Omit<Ejercicio, 'id'>): Promise<Ejercicio> {
    const { data, error } = await supabase
      .from('ejercicios')
      .insert({
        nombre: ejercicio.nombre,
        grupo_muscular_id: ejercicio.grupo_muscular_id,
        series_sugeridas: ejercicio.series_sugeridas,
        repes_sugeridas: ejercicio.repes_sugeridas,
      })
      .select()
      .single()
    if (error) throw error
    return data
  },

  async updateEjercicio(id: number, updates: Partial<Ejercicio>): Promise<void> {
    const { error } = await supabase
      .from('ejercicios')
      .update(updates)
      .eq('id', id)
    if (error) throw error
  },

  async deleteEjercicio(id: number): Promise<void> {
    const { error } = await supabase
      .from('ejercicios')
      .delete()
      .eq('id', id)
    if (error) throw error
  },

  async getLogsPorFecha(fecha: Date): Promise<LogGym[]> {
    const fechaStr = localDateStr(fecha)
    const { data, error } = await supabase
      .from('logs_gym')
      .select('*, ejercicios(nombre)')
      .eq('fecha', fechaStr)
      .order('id', { ascending: false })
    if (error) throw error
    return (data ?? []).map((row: Record<string, unknown>) => ({
      ...(row as unknown as LogGym),
      ejercicio_nombre: (row.ejercicios as { nombre?: string } | null)?.nombre,
    }))
  },

  async getHistorialEjercicio(ejercicioId: number, limit = 20): Promise<LogGym[]> {
    const { data, error } = await supabase
      .from('logs_gym')
      .select('*, ejercicios(nombre)')
      .eq('ejercicio_id', ejercicioId)
      .order('fecha', { ascending: false })
      .limit(limit)
    if (error) throw error
    return (data ?? []).map((row: Record<string, unknown>) => ({
      ...(row as unknown as LogGym),
      ejercicio_nombre: (row.ejercicios as { nombre?: string } | null)?.nombre,
    }))
  },

  async getDiasConEntrenamiento(mes: Date): Promise<string[]> {
    const inicio = new Date(mes.getFullYear(), mes.getMonth(), 1)
      .toISOString()
      .split('T')[0]
    const fin = new Date(mes.getFullYear(), mes.getMonth() + 1, 0)
      .toISOString()
      .split('T')[0]
    const { data, error } = await supabase
      .from('logs_gym')
      .select('fecha')
      .gte('fecha', inicio)
      .lte('fecha', fin)
    if (error) throw error
    const dias = new Set((data ?? []).map((r: { fecha: string }) => r.fecha.split('T')[0]))
    return Array.from(dias)
  },

  async createLog(log: Omit<LogGym, 'id'>): Promise<LogGym> {
    const { data, error } = await supabase
      .from('logs_gym')
      .insert({
        ejercicio_id: log.ejercicio_id,
        series: log.series,
        repes: log.repes,
        peso_kg: log.peso_kg,
        notas: log.notas,
        fecha: log.fecha,
      })
      .select()
      .single()
    if (error) throw error
    return data
  },

  async updateLog(id: number, updates: Partial<LogGym>): Promise<void> {
    const { error } = await supabase
      .from('logs_gym')
      .update(updates)
      .eq('id', id)
    if (error) throw error
  },

  async deleteLog(id: number): Promise<void> {
    const { error } = await supabase
      .from('logs_gym')
      .delete()
      .eq('id', id)
    if (error) throw error
  },
}

// ─── Rutinas ─────────────────────────────────────────────────

export const rutinasService = {
  async getRutinasDiarias(): Promise<RutinaDiaria[]> {
    const { data, error } = await supabase
      .from('rutinas_diarias')
      .select('*')
      .order('hora_inicio')
    if (error) throw error
    return (data ?? []).map((r: Record<string, unknown>) => ({
      ...r,
      dias_semana: Array.isArray(r.dias_semana)
        ? r.dias_semana
        : typeof r.dias_semana === 'string'
        ? (() => { try { return JSON.parse(r.dias_semana as string) } catch { return [] } })()
        : [],
    })) as RutinaDiaria[]
  },

  async createRutinaDiaria(rutina: Omit<RutinaDiaria, 'id'>): Promise<RutinaDiaria> {
    const { data, error } = await supabase
      .from('rutinas_diarias')
      .insert(rutina)
      .select()
      .single()
    if (error) throw error
    return data
  },

  async updateRutinaDiaria(id: number, updates: Partial<RutinaDiaria>): Promise<void> {
    const { error } = await supabase
      .from('rutinas_diarias')
      .update(updates)
      .eq('id', id)
    if (error) throw error
  },

  async deleteRutinaDiaria(id: number): Promise<void> {
    const { error } = await supabase
      .from('rutinas_diarias')
      .delete()
      .eq('id', id)
    if (error) throw error
  },

  async getRutinasExcepciones(fecha: Date): Promise<RutinaExcepcion[]> {
    const fechaStr = fecha.toISOString().split('T')[0]
    const { data, error } = await supabase
      .from('rutinas_excepciones')
      .select('*')
      .eq('fecha', fechaStr)
    if (error) throw error
    return (data ?? []) as unknown as RutinaExcepcion[]
  },

  async createRutinaExcepcion(excepcion: Omit<RutinaExcepcion, 'id'>): Promise<RutinaExcepcion> {
    const { data, error } = await supabase
      .from('rutinas_excepciones')
      .insert(excepcion)
      .select()
      .single()
    if (error) throw error
    return data as unknown as RutinaExcepcion
  },

  async deleteRutinaExcepcion(id: number): Promise<void> {
    const { error } = await supabase
      .from('rutinas_excepciones')
      .delete()
      .eq('id', id)
    if (error) throw error
  },

  async getRutinasPersonalizadas(): Promise<RutinaPersonalizada[]> {
    const { data, error } = await supabase
      .from('rutinas_personalizadas')
      .select('*, rutinas_ejercicios(ejercicio_id, ejercicios(*))')
      .order('nombre')
    if (error) throw error
    return (data ?? []).map((r: Record<string, unknown>) => ({
      id: r.id,
      nombre: r.nombre,
      icono: r.icono,
      ejercicios: ((r.rutinas_ejercicios as Array<{ ejercicios: Ejercicio }>) ?? []).map(
        (re) => re.ejercicios,
      ),
    })) as RutinaPersonalizada[]
  },

  async createRutinaPersonalizada(
    rutina: Omit<RutinaPersonalizada, 'id' | 'ejercicios'>,
  ): Promise<RutinaPersonalizada> {
    const { data, error } = await supabase
      .from('rutinas_personalizadas')
      .insert(rutina)
      .select()
      .single()
    if (error) throw error
    return { ...data, ejercicios: [] }
  },

  async deleteRutinaPersonalizada(id: number): Promise<void> {
    const { error } = await supabase
      .from('rutinas_personalizadas')
      .delete()
      .eq('id', id)
    if (error) throw error
  },

  async createRutinaEjercicio(rutinaId: number, ejercicioId: number): Promise<void> {
    const { error } = await supabase
      .from('rutinas_ejercicios')
      .insert({ rutina_id: rutinaId, ejercicio_id: ejercicioId })
    if (error) throw error
  },

  async deleteRutinaEjercicio(rutinaId: number, ejercicioId: number): Promise<void> {
    const { error } = await supabase
      .from('rutinas_ejercicios')
      .delete()
      .eq('rutina_id', rutinaId)
      .eq('ejercicio_id', ejercicioId)
    if (error) throw error
  },

  async updateRutinaPersonalizada(id: number, nombre: string): Promise<void> {
    const { error } = await supabase
      .from('rutinas_personalizadas')
      .update({ nombre })
      .eq('id', id)
    if (error) throw error
  },

  async clearRutinaEjercicios(rutinaId: number): Promise<void> {
    const { error } = await supabase
      .from('rutinas_ejercicios')
      .delete()
      .eq('rutina_id', rutinaId)
    if (error) throw error
  },
}

// ─── Tareas ──────────────────────────────────────────────────

export const tareasService = {
  async getTareas(): Promise<Tarea[]> {
    const { data, error } = await supabase
      .from('tareas')
      .select('*')
      .order('created_at', { ascending: false })
    if (error) throw error
    return (data ?? []).map((t: Record<string, unknown>) => ({
      ...t,
      subtasks: Array.isArray(t.subtasks) ? t.subtasks : [],
    })) as unknown as Tarea[]
  },

  async createTarea(tarea: Omit<Tarea, 'id' | 'created_at'>): Promise<Tarea> {
    const { data, error } = await supabase
      .from('tareas')
      .insert({
        titulo: tarea.titulo,
        descripcion: tarea.descripcion,
        fecha_limite: tarea.fecha_limite,
        completada: tarea.completada,
        prioridad: tarea.prioridad,
        category: tarea.category,
        subtasks: tarea.subtasks ?? null,
      })
      .select()
      .single()
    if (error) throw error
    return data as unknown as Tarea
  },

  async updateTarea(id: number, updates: Partial<Tarea>): Promise<void> {
    const payload: Record<string, unknown> = { ...updates }
    if (updates.subtasks !== undefined) {
      payload.subtasks = updates.subtasks
    }
    const { error } = await supabase.from('tareas').update(payload).eq('id', id)
    if (error) throw error
  },

  async deleteTarea(id: number): Promise<void> {
    const { error } = await supabase.from('tareas').delete().eq('id', id)
    if (error) throw error
  },
}

// ─── Notas ───────────────────────────────────────────────────

export const notasService = {
  async getNotas(): Promise<Nota[]> {
    const { data, error } = await supabase
      .from('notas')
      .select('*')
      .order('created_at', { ascending: false })
    if (error) throw error
    return (data ?? []).map((n: Record<string, unknown>) => ({
      ...n,
      // etiquetas es text[] nativo — Supabase JS lo devuelve como array JS
      etiquetas: Array.isArray(n.etiquetas) ? n.etiquetas : [],
    })) as Nota[]
  },

  async createNota(nota: Omit<Nota, 'id' | 'created_at' | 'updated_at'>): Promise<Nota> {
    const { data, error } = await supabase
      .from('notas')
      .insert({
        titulo: nota.titulo,
        contenido: nota.contenido,
        etiquetas: nota.etiquetas ?? [],
        pinned: nota.pinned ?? false,
        color_class: nota.color_class,
        note_color: nota.note_color,
        checklist: nota.checklist ?? false,
      })
      .select()
      .single()
    if (error) throw error
    return data
  },

  async updateNota(id: number, updates: Partial<Nota>): Promise<void> {
    const payload: Record<string, unknown> = { ...updates }
    // etiquetas es text[] nativo en Postgres, pasar array directamente
    const { error } = await supabase.from('notas').update(payload).eq('id', id)
    if (error) throw error
  },

  async deleteNota(id: number): Promise<void> {
    const { error } = await supabase.from('notas').delete().eq('id', id)
    if (error) throw error
  },
}

// ─── Deudas ──────────────────────────────────────────────────

export const deudasService = {
  async getDeudas(): Promise<Deuda[]> {
    const { data, error } = await supabase
      .from('deudas')
      .select('*')
      .order('created_at', { ascending: false })
    if (error) throw error
    return (data ?? []).map((d: Record<string, unknown>) => ({
      ...d,
      payments: Array.isArray(d.payments) ? d.payments : [],
    })) as unknown as Deuda[]
  },

  async createDeuda(deuda: Omit<Deuda, 'id' | 'created_at'>): Promise<Deuda> {
    const { data, error } = await supabase
      .from('deudas')
      .insert({
        persona: deuda.persona,
        monto: deuda.monto,
        tipo: deuda.tipo,
        descripcion: deuda.descripcion,
        fecha: deuda.fecha,
        pagada: deuda.pagada,
        payments: deuda.payments ?? null,
      })
      .select()
      .single()
    if (error) throw error
    return data as unknown as Deuda
  },

  async updateDeuda(id: number, updates: Partial<Deuda>): Promise<void> {
    const payload: Record<string, unknown> = { ...updates }
    if (updates.payments !== undefined) {
      payload.payments = updates.payments
    }
    const { error } = await supabase.from('deudas').update(payload).eq('id', id)
    if (error) throw error
  },

  async deleteDeuda(id: number): Promise<void> {
    const { error } = await supabase.from('deudas').delete().eq('id', id)
    if (error) throw error
  },
}

// ─── Recordatorios ───────────────────────────────────────────

export const recordatoriosService = {
  async getRecordatorios(): Promise<Recordatorio[]> {
    const { data, error } = await supabase
      .from('recordatorios')
      .select('*')
      .order('fecha', { ascending: true })
    if (error) throw error
    return (data ?? []) as unknown as Recordatorio[]
  },

  async createRecordatorio(r: Omit<Recordatorio, 'id' | 'created_at'>): Promise<Recordatorio> {
    const { data, error } = await supabase
      .from('recordatorios')
      .insert({
        texto: r.texto,
        fecha: r.fecha,
        hora: r.hora ?? null,
        repetir: r.repetir,
        activo: r.activo,
      })
      .select()
      .single()
    if (error) throw error
    return data as unknown as Recordatorio
  },

  async updateRecordatorio(id: number, updates: Partial<Recordatorio>): Promise<void> {
    const { error } = await supabase.from('recordatorios').update(updates).eq('id', id)
    if (error) throw error
  },

  async deleteRecordatorio(id: number): Promise<void> {
    const { error } = await supabase.from('recordatorios').delete().eq('id', id)
    if (error) throw error
  },
}

// ─── Perfil ──────────────────────────────────────────────────

export const perfilService = {
  async getDatosPersonales(): Promise<DatoPersonal[]> {
    const { data, error } = await supabase
      .from('datos_personales')
      .select('*')
      .order('orden')
    if (error) throw error
    return (data ?? []) as DatoPersonal[]
  },

  async createDatoPersonal(dato: Omit<DatoPersonal, 'id' | 'created_at'>): Promise<DatoPersonal> {
    const { data, error } = await supabase
      .from('datos_personales')
      .insert(dato)
      .select()
      .single()
    if (error) throw error
    return data as DatoPersonal
  },

  async deleteDatoPersonal(id: number): Promise<void> {
    const { error } = await supabase.from('datos_personales').delete().eq('id', id)
    if (error) throw error
  },

  async getDocumentos(): Promise<Documento[]> {
    const { data, error } = await supabase
      .from('documentos')
      .select('*')
      .order('created_at')
    if (error) throw error
    return (data ?? []) as Documento[]
  },

  async createDocumento(doc: Omit<Documento, 'id' | 'created_at'>): Promise<Documento> {
    const { data, error } = await supabase
      .from('documentos')
      .insert(doc)
      .select()
      .single()
    if (error) throw error
    return data as Documento
  },

  async updateDocumento(id: number, updates: Partial<Documento>): Promise<void> {
    const { error } = await supabase.from('documentos').update(updates).eq('id', id)
    if (error) throw error
  },

  async deleteDocumento(id: number): Promise<void> {
    const { error } = await supabase.from('documentos').delete().eq('id', id)
    if (error) throw error
  },
}
