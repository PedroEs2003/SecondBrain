// ============================================================
// Hook de IA — Segundo Cerebro
// Procesa texto natural → intents → ejecuta mutations
// ============================================================

import { useState, useCallback } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { procesarTexto, consultarIA } from '@/services/aiService'
import { tareasService, notasService, deudasService, gymService, rutinasService } from '@/services/supabaseService'
import type { Intent, MensajeChat } from '@/types'

export const useAI = () => {
  const queryClient = useQueryClient()
  const [historial, setHistorial] = useState<MensajeChat[]>([])
  const [procesando, setProcesando] = useState(false)
  const [lastResponse, setLastResponse] = useState<string>('')

  const invalidateAll = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['tareas'] })
    queryClient.invalidateQueries({ queryKey: ['notas'] })
    queryClient.invalidateQueries({ queryKey: ['deudas'] })
    queryClient.invalidateQueries({ queryKey: ['logs_gym'] })
    queryClient.invalidateQueries({ queryKey: ['rutinas_diarias'] })
    queryClient.invalidateQueries({ queryKey: ['ejercicios_stats'] })
  }, [queryClient])

  // Ejecuta una acción concreta según el intent
  const ejecutarIntent = useCallback(
    async (intent: Intent): Promise<string> => {
      const d = intent.data

      switch (intent.type) {
        case 'tarea': {
          await tareasService.createTarea({
            titulo: String(d.titulo ?? 'Nueva tarea'),
            descripcion: d.descripcion ? String(d.descripcion) : undefined,
            fecha_limite: d.fecha_limite ? String(d.fecha_limite) : undefined,
            completada: false,
            prioridad: (d.prioridad as 0 | 1 | 2) ?? 0,
          })
          queryClient.invalidateQueries({ queryKey: ['tareas'] })
          return `✅ Tarea "${d.titulo}" creada`
        }

        case 'nota': {
          await notasService.createNota({
            titulo: String(d.titulo ?? 'Nueva nota'),
            contenido: d.contenido ? String(d.contenido) : undefined,
            etiquetas: Array.isArray(d.etiquetas) ? (d.etiquetas as string[]) : [],
          })
          queryClient.invalidateQueries({ queryKey: ['notas'] })
          return `📝 Nota "${d.titulo}" creada`
        }

        case 'deuda': {
          await deudasService.createDeuda({
            persona: String(d.persona ?? 'Desconocido'),
            monto: Number(d.monto ?? 0),
            tipo: (d.tipo as 'debo' | 'me_deben') ?? 'debo',
            descripcion: d.descripcion ? String(d.descripcion) : undefined,
            fecha: new Date().toISOString().split('T')[0],
            pagada: false,
          })
          queryClient.invalidateQueries({ queryKey: ['deudas'] })
          return `💰 Deuda con "${d.persona}" registrada`
        }

        case 'gym': {
          const fecha = (d.fecha as string) ?? new Date().toISOString().split('T')[0]
          // Buscar ejercicio por nombre para obtener su id
          const ejercicios = await gymService.getAllEjerciciosConStats()
          const nombre = String(d.ejercicio ?? '')
          const ejercicio = ejercicios.find(
            (e) => e.nombre.toLowerCase() === nombre.toLowerCase(),
          )
          if (!ejercicio) return `⚠️ No encontré el ejercicio "${nombre}". ¿Está registrado?`

          await gymService.createLog({
            ejercicio_id: ejercicio.id,
            ejercicio_nombre: ejercicio.nombre,
            series: Number(d.series ?? 3),
            repes: Number(d.repes ?? 10),
            peso_kg: Number(d.peso_kg ?? 0),
            notas: d.notas ? String(d.notas) : undefined,
            fecha,
          })
          queryClient.invalidateQueries({ queryKey: ['logs_gym'] })
          queryClient.invalidateQueries({ queryKey: ['ejercicios_stats'] })
          return `💪 Log de ${ejercicio.nombre}: ${d.series}×${d.repes} @ ${d.peso_kg}kg registrado`
        }

        case 'nuevo_ejercicio': {
          const grupos = await gymService.getGruposMusculares()
          const grupoNombre = String(d.grupo ?? '')
          const grupo = grupos.find(
            (g) => g.nombre.toLowerCase() === grupoNombre.toLowerCase(),
          )
          if (!grupo) return `⚠️ No encontré el grupo muscular "${grupoNombre}"`

          await gymService.createEjercicio({
            nombre: String(d.nombre ?? ''),
            grupo_muscular_id: grupo.id,
          })
          queryClient.invalidateQueries({ queryKey: ['ejercicios_stats'] })
          return `🏋️ Ejercicio "${d.nombre}" agregado a ${grupo.nombre}`
        }

        case 'rutina': {
          const diasRaw = d.dias_semana
          const dias = Array.isArray(diasRaw) ? (diasRaw as number[]) : [1, 2, 3, 4, 5]
          await rutinasService.createRutinaDiaria({
            hora_inicio: String(d.hora_inicio ?? '08:00'),
            hora_fin: String(d.hora_fin ?? '09:00'),
            actividad: String(d.actividad ?? 'Nueva actividad'),
            icono: String(d.icono ?? '📌'),
            color: d.color ? String(d.color) : undefined,
            notificacion_activa: Boolean(d.notificacion_activa ?? false),
            dias_semana: dias,
          })
          queryClient.invalidateQueries({ queryKey: ['rutinas_diarias'] })
          return `📅 Rutina "${d.actividad}" creada`
        }

        case 'agregar_excepcion': {
          const fecha = (d.fecha as string) ?? new Date().toISOString().split('T')[0]
          await rutinasService.createRutinaExcepcion({
            fecha,
            tipo: 'agregar',
            actividad: d.actividad ? String(d.actividad) : undefined,
            hora_inicio: d.hora_inicio ? String(d.hora_inicio) : undefined,
            hora_fin: d.hora_fin ? String(d.hora_fin) : undefined,
            icono: d.icono ? String(d.icono) : '📌',
          })
          queryClient.invalidateQueries({ queryKey: ['rutinas_excepciones'] })
          return `➕ Actividad extra "${d.actividad}" agregada para hoy`
        }

        case 'saltar_rutina': {
          const fecha = (d.fecha as string) ?? new Date().toISOString().split('T')[0]
          const rutinaId = d.rutina_id ? Number(d.rutina_id) : undefined
          await rutinasService.createRutinaExcepcion({
            fecha,
            tipo: 'saltar',
            rutina_id: rutinaId,
          })
          queryClient.invalidateQueries({ queryKey: ['rutinas_excepciones'] })
          return `⏭️ Rutina saltada para ${fecha}`
        }

        case 'borrar_tarea': {
          const tareas = await tareasService.getTareas()
          const titulo = String(d.titulo ?? '')
          const tarea = tareas.find(
            (t) => t.titulo.toLowerCase().includes(titulo.toLowerCase()),
          )
          if (!tarea || !tarea.id) return `⚠️ No encontré la tarea "${titulo}"`
          await tareasService.deleteTarea(tarea.id)
          queryClient.invalidateQueries({ queryKey: ['tareas'] })
          return `🗑️ Tarea "${tarea.titulo}" eliminada`
        }

        case 'borrar_nota': {
          const notas = await notasService.getNotas()
          const titulo = String(d.titulo ?? '')
          const nota = notas.find(
            (n) => n.titulo.toLowerCase().includes(titulo.toLowerCase()),
          )
          if (!nota || !nota.id) return `⚠️ No encontré la nota "${titulo}"`
          await notasService.deleteNota(nota.id)
          queryClient.invalidateQueries({ queryKey: ['notas'] })
          return `🗑️ Nota "${nota.titulo}" eliminada`
        }

        case 'borrar_deuda': {
          const deudas = await deudasService.getDeudas()
          const persona = String(d.persona ?? '')
          const deuda = deudas.find(
            (d2) => d2.persona.toLowerCase().includes(persona.toLowerCase()),
          )
          if (!deuda || !deuda.id) return `⚠️ No encontré deuda con "${persona}"`
          await deudasService.deleteDeuda(deuda.id)
          queryClient.invalidateQueries({ queryKey: ['deudas'] })
          return `🗑️ Deuda con "${deuda.persona}" eliminada`
        }

        case 'borrar_log_gym': {
          const fecha = (d.fecha as string) ?? new Date().toISOString().split('T')[0]
          const logs = await gymService.getLogsPorFecha(new Date(fecha))
          const ejercicioNombre = String(d.ejercicio ?? '')
          const log = logs.find(
            (l) => l.ejercicio_nombre?.toLowerCase().includes(ejercicioNombre.toLowerCase()),
          )
          if (!log || !log.id) return `⚠️ No encontré el log de "${ejercicioNombre}" en esa fecha`
          await gymService.deleteLog(log.id)
          queryClient.invalidateQueries({ queryKey: ['logs_gym'] })
          return `🗑️ Log de "${log.ejercicio_nombre}" eliminado`
        }

        case 'unknown':
        default: {
          // Respuesta conversacional
          const msg = String(d.mensaje ?? intent.data.toString())
          return await consultarIA(msg, historial)
        }
      }
    },
    [queryClient, historial],
  )

  /**
   * Procesa un mensaje del usuario:
   * 1. Detecta intents con Gemini
   * 2. Ejecuta cada intent
   * 3. Retorna respuesta consolidada
   */
  const procesarMensaje = useCallback(
    async (texto: string): Promise<string> => {
      setProcesando(true)
      const mensajeUsuario: MensajeChat = {
        role: 'user',
        content: texto,
        timestamp: new Date().toISOString(),
      }

      try {
        const intents = await procesarTexto(texto)
        const resultados: string[] = []

        for (const intent of intents) {
          const resultado = await ejecutarIntent(intent)
          resultados.push(resultado)
        }

        const respuesta = resultados.join('\n')
        setLastResponse(respuesta)

        const mensajeAsistente: MensajeChat = {
          role: 'assistant',
          content: respuesta,
          timestamp: new Date().toISOString(),
        }
        setHistorial((prev) => [...prev.slice(-19), mensajeUsuario, mensajeAsistente])

        invalidateAll()
        return respuesta
      } catch (e) {
        const errorMsg = 'Error al procesar el mensaje. Inténtalo de nuevo.'
        toast.error(errorMsg)
        return errorMsg
      } finally {
        setProcesando(false)
      }
    },
    [ejecutarIntent, invalidateAll],
  )

  const limpiarHistorial = useCallback(() => {
    setHistorial([])
    setLastResponse('')
  }, [])

  return {
    procesando,
    historial,
    lastResponse,
    procesarMensaje,
    limpiarHistorial,
  }
}
