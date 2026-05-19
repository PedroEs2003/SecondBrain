import { useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { parseSupabaseError } from '@/lib/supabaseError'
import { localDateStr } from '@/lib/utils'
import { tareasService } from '@/services/supabaseService'
import type { Tarea } from '@/types'

export const useTareas = () => {
  const queryClient = useQueryClient()

  const { data: tareas = [], isLoading } = useQuery({
    queryKey: ['tareas'],
    queryFn: tareasService.getTareas,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  })

  const crear = useMutation({
    mutationFn: tareasService.createTarea,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tareas'] })
      toast.success('Tarea creada')
    },
    onError: (err) => toast.error(`Error al crear tarea: ${parseSupabaseError(err)}`),
  })

  const actualizar = useMutation({
    mutationFn: ({ id, updates }: { id: number; updates: Partial<Tarea> }) =>
      tareasService.updateTarea(id, updates),
    onMutate: async ({ id, updates }) => {
      await queryClient.cancelQueries({ queryKey: ['tareas'] })
      const previous = queryClient.getQueryData<Tarea[]>(['tareas'])
      queryClient.setQueryData<Tarea[]>(['tareas'], (old = []) =>
        old.map(t => t.id === id ? { ...t, ...updates } : t)
      )
      return { previous }
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) queryClient.setQueryData(['tareas'], context.previous)
      toast.error(`Error al actualizar tarea: ${parseSupabaseError(_err)}`)
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['tareas'] }),
  })

  const eliminar = useMutation({
    mutationFn: tareasService.deleteTarea,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tareas'] })
      toast.success('Tarea eliminada')
    },
    onError: (err) => toast.error(`Error al eliminar tarea: ${parseSupabaseError(err)}`),
  })

  const tareasPendientes = useMemo(
    () => tareas.filter((t) => !t.completada),
    [tareas],
  )

  const tareasVencidas = useMemo(
    () =>
      tareas.filter((t) => {
        if (t.completada || !t.fecha_limite) return false
        return t.fecha_limite.slice(0, 10) < localDateStr()
      }),
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
