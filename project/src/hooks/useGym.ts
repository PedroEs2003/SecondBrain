import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { gymService, rutinasService } from '@/services/supabaseService'
import { supabase } from '@/integrations/supabase/client'
import type { LogGym } from '@/types'

export const useGym = () => {
  const queryClient = useQueryClient()
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())
  const [mesCalendario, setMesCalendario] = useState<Date>(new Date())

  const { data: gruposMusculares = [], isLoading: loadingGrupos } = useQuery({
    queryKey: ['grupos_musculares'],
    queryFn: gymService.getGruposMusculares,
  })

  const { data: ejerciciosConStats = [], isLoading: loadingEjercicios } = useQuery({
    queryKey: ['ejercicios_stats'],
    queryFn: gymService.getAllEjerciciosConStats,
  })

  const { data: logsDelDia = [], isLoading: loadingLogs } = useQuery({
    queryKey: ['logs_gym', selectedDate.toISOString().split('T')[0]],
    queryFn: () => gymService.getLogsPorFecha(selectedDate),
  })

  const { data: diasConEntrenamiento = [] } = useQuery({
    queryKey: ['dias_entrenamiento', mesCalendario.getFullYear(), mesCalendario.getMonth()],
    queryFn: () => gymService.getDiasConEntrenamiento(mesCalendario),
  })

  const { data: rutinasPersonalizadas = [] } = useQuery({
    queryKey: ['rutinas_personalizadas'],
    queryFn: rutinasService.getRutinasPersonalizadas,
  })

  const getHistorialEjercicio = (ejercicioId: number, limit?: number) =>
    gymService.getHistorialEjercicio(ejercicioId, limit)

  const crearLog = useMutation({
    mutationFn: gymService.createLog,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['logs_gym'] })
      queryClient.invalidateQueries({ queryKey: ['ejercicios_stats'] })
      queryClient.invalidateQueries({ queryKey: ['dias_entrenamiento'] })
      toast.success('Entrenamiento registrado')
    },
    onError: () => toast.error('Error al registrar entrenamiento'),
  })

  const actualizarLog = useMutation({
    mutationFn: ({ id, updates }: { id: number; updates: Partial<LogGym> }) =>
      gymService.updateLog(id, updates),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['logs_gym'] }),
    onError: () => toast.error('Error al actualizar log'),
  })

  const eliminarLog = useMutation({
    mutationFn: gymService.deleteLog,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['logs_gym'] })
      queryClient.invalidateQueries({ queryKey: ['dias_entrenamiento'] })
      toast.success('Log eliminado')
    },
    onError: () => toast.error('Error al eliminar log'),
  })

  const crearEjercicio = useMutation({
    mutationFn: gymService.createEjercicio,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ejercicios_stats'] })
      queryClient.invalidateQueries({ queryKey: ['grupos_musculares'] })
      toast.success('Ejercicio creado')
    },
    onError: () => toast.error('Error al crear ejercicio'),
  })

  useEffect(() => {
    const channel = supabase
      .channel('gym-logs-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'logs_gym' }, () => {
        queryClient.invalidateQueries({ queryKey: ['logs_gym'] })
        queryClient.invalidateQueries({ queryKey: ['dias_entrenamiento'] })
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [queryClient])

  useEffect(() => {
    const channel = supabase
      .channel('gym-ejercicios-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'ejercicios' }, () => {
        queryClient.invalidateQueries({ queryKey: ['ejercicios_stats'] })
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [queryClient])

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
  }
}
