import { useMemo, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { tareasService } from '@/services/supabaseService'
import { supabase } from '@/integrations/supabase/client'
import type { Tarea } from '@/types'

export const useTareas = () => {
  const queryClient = useQueryClient()

  const { data: tareas = [], isLoading } = useQuery({
    queryKey: ['tareas'],
    queryFn: tareasService.getTareas,
  })

  const crear = useMutation({
    mutationFn: tareasService.createTarea,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tareas'] })
      toast.success('Tarea creada')
    },
    onError: () => toast.error('Error al crear tarea'),
  })

  const actualizar = useMutation({
    mutationFn: ({ id, updates }: { id: number; updates: Partial<Tarea> }) =>
      tareasService.updateTarea(id, updates),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tareas'] }),
    onError: () => toast.error('Error al actualizar tarea'),
  })

  const eliminar = useMutation({
    mutationFn: tareasService.deleteTarea,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tareas'] })
      toast.success('Tarea eliminada')
    },
    onError: () => toast.error('Error al eliminar tarea'),
  })

  const tareasPendientes = useMemo(
    () => tareas.filter((t) => !t.completada),
    [tareas],
  )

  const tareasVencidas = useMemo(
    () =>
      tareas.filter(
        (t) => !t.completada && t.fecha_limite && new Date(t.fecha_limite) < new Date(),
      ),
    [tareas],
  )

  const tareasUrgentes = useMemo(
    () => tareas.filter((t) => !t.completada && t.prioridad === 2),
    [tareas],
  )

  const porcentajeCompletado = useMemo(() => {
    if (tareas.length === 0) return 0
    return Math.round((tareas.filter((t) => t.completada).length / tareas.length) * 100)
  }, [tareas])

  useEffect(() => {
    const channel = supabase
      .channel('tareas-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tareas' }, () => {
        queryClient.invalidateQueries({ queryKey: ['tareas'] })
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [queryClient])

  return {
    tareas,
    tareasPendientes,
    tareasVencidas,
    tareasUrgentes,
    porcentajeCompletado,
    isLoading,
    crear,
    actualizar,
    eliminar,
  }
}
