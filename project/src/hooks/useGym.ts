import { useState, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { parseSupabaseError } from '@/lib/supabaseError'
import { gymService, rutinasService } from '@/services/supabaseService'
import type { LogGym } from '@/types'

export const useGym = () => {
  const queryClient = useQueryClient()
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())
  const [mesCalendario, setMesCalendario] = useState<Date>(new Date())

  const { data: gruposMusculares = [], isLoading: loadingGrupos } = useQuery({
    queryKey: ['grupos_musculares'],
    queryFn: gymService.getGruposMusculares,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  })

  const { data: ejerciciosConStats = [], isLoading: loadingEjercicios } = useQuery({
    queryKey: ['ejercicios_stats'],
    queryFn: gymService.getAllEjerciciosConStats,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  })

  const { data: logsDelDia = [], isLoading: loadingLogs } = useQuery({
    queryKey: ['logs_gym', selectedDate.toISOString().split('T')[0]],
    queryFn: () => gymService.getLogsPorFecha(selectedDate),
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  })

  const { data: diasConEntrenamiento = [] } = useQuery({
    queryKey: ['dias_entrenamiento', mesCalendario.getFullYear(), mesCalendario.getMonth()],
    queryFn: () => gymService.getDiasConEntrenamiento(mesCalendario),
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  })

  const { data: rutinasPersonalizadas = [] } = useQuery({
    queryKey: ['rutinas_personalizadas'],
    queryFn: rutinasService.getRutinasPersonalizadas,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  })

  const getHistorialEjercicio = useCallback(
    (ejercicioId: number, limit = 20) =>
      queryClient.fetchQuery({
        queryKey: ['historial_ejercicio', ejercicioId, limit],
        queryFn: () => gymService.getHistorialEjercicio(ejercicioId, limit),
        staleTime: 5 * 60 * 1000,
      }),
    [queryClient],
  )

  const crearLog = useMutation({
    mutationFn: gymService.createLog,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['logs_gym'] })
      queryClient.invalidateQueries({ queryKey: ['ejercicios_stats'] })
      queryClient.invalidateQueries({ queryKey: ['dias_entrenamiento'] })
      toast.success('Entrenamiento registrado')
    },
    onError: (err) => toast.error(`Error al registrar entrenamiento: ${parseSupabaseError(err)}`),
  })

  const actualizarLog = useMutation({
    mutationFn: ({ id, updates }: { id: number; updates: Partial<LogGym> }) =>
      gymService.updateLog(id, updates),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['logs_gym'] }),
    onError: (err) => toast.error(`Error al actualizar log: ${parseSupabaseError(err)}`),
  })

  const eliminarLog = useMutation({
    mutationFn: gymService.deleteLog,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['logs_gym'] })
      queryClient.invalidateQueries({ queryKey: ['dias_entrenamiento'] })
      toast.success('Log eliminado')
    },
    onError: (err) => toast.error(`Error al eliminar log: ${parseSupabaseError(err)}`),
  })

  const crearEjercicio = useMutation({
    mutationFn: gymService.createEjercicio,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ejercicios_stats'] })
      queryClient.invalidateQueries({ queryKey: ['grupos_musculares'] })
      toast.success('Ejercicio creado')
    },
    onError: (err) => toast.error(`Error al crear ejercicio: ${parseSupabaseError(err)}`),
  })

  const crearRutinaPersonalizada = useMutation({
    mutationFn: async ({ nombre, ejercicios }: { nombre: string; ejercicios: { id: number; series: number; reps: number }[] }) => {
      const rutina = await rutinasService.createRutinaPersonalizada({ nombre, icono: '💪' })
      await Promise.all(ejercicios.map((ej) => Promise.all([
        rutinasService.createRutinaEjercicio(rutina.id, ej.id),
        gymService.updateEjercicio(ej.id, { series_sugeridas: ej.series, repes_sugeridas: ej.reps }),
      ])))
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rutinas_personalizadas'] })
      queryClient.invalidateQueries({ queryKey: ['ejercicios_stats'] })
      toast.success('Rutina creada')
    },
    onError: (err) => toast.error(`Error al crear rutina: ${parseSupabaseError(err)}`),
  })

  const actualizarRutinaPersonalizada = useMutation({
    mutationFn: async ({ id, nombre, ejercicios }: { id: number; nombre: string; ejercicios: { id: number; series: number; reps: number }[] }) => {
      await rutinasService.updateRutinaPersonalizada(id, nombre)
      await rutinasService.clearRutinaEjercicios(id)
      await Promise.all(ejercicios.map((ej) => Promise.all([
        rutinasService.createRutinaEjercicio(id, ej.id),
        gymService.updateEjercicio(ej.id, { series_sugeridas: ej.series, repes_sugeridas: ej.reps }),
      ])))
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rutinas_personalizadas'] })
      queryClient.invalidateQueries({ queryKey: ['ejercicios_stats'] })
      toast.success('Rutina actualizada')
    },
    onError: (err) => toast.error(`Error al actualizar rutina: ${parseSupabaseError(err)}`),
  })

  const eliminarRutinaPersonalizada = useMutation({
    mutationFn: rutinasService.deleteRutinaPersonalizada,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rutinas_personalizadas'] })
      toast.success('Rutina eliminada')
    },
    onError: (err) => toast.error(`Error al eliminar rutina: ${parseSupabaseError(err)}`),
  })

  const isLoading = loadingGrupos || loadingEjercicios || loadingLogs

  return {
    gruposMusculares,
    ejerciciosConStats,
    logsDelDia,
    diasConEntrenamiento,
    rutinasPersonalizadas,
    selectedDate,
    setSelectedDate,
    mesCalendario,
    setMesCalendario,
    getHistorialEjercicio,
    isLoading,
    crearLog,
    actualizarLog,
    eliminarLog,
    crearEjercicio,
    crearRutinaPersonalizada,
    actualizarRutinaPersonalizada,
    eliminarRutinaPersonalizada,
  }
}
