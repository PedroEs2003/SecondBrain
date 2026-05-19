import { useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { parseSupabaseError } from '@/lib/supabaseError'
import { rutinasService } from '@/services/supabaseService'
import type { RutinaDiaria, RutinaExcepcion } from '@/types'

export const useRutinas = (fecha: Date = new Date()) => {
  const queryClient = useQueryClient()

  const { data: rutinas = [], isLoading: loadingRutinas } = useQuery({
    queryKey: ['rutinas_diarias'],
    queryFn: rutinasService.getRutinasDiarias,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    placeholderData: () => [] as RutinaDiaria[],
  })

  const { data: excepciones = [], isLoading: loadingExcepciones } = useQuery({
    queryKey: ['rutinas_excepciones', fecha.toISOString().split('T')[0]],
    queryFn: () => rutinasService.getRutinasExcepciones(fecha),
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    placeholderData: () => [] as RutinaExcepcion[],
  })

  // Día de semana: 1=Lunes … 7=Domingo (igual que Flutter)
  const diaSemana = useMemo(() => {
    const d = fecha.getDay() // 0=Dom
    return d === 0 ? 7 : d
  }, [fecha])

  const rutinasDelDia = useMemo(() => {
    const saltadas = new Set(
      excepciones.filter((e) => e.tipo === 'saltar').map((e) => e.rutina_id),
    )
    const base = rutinas.filter(
      (r) => r.dias_semana.includes(diaSemana) && !saltadas.has(r.id),
    )
    const extras = excepciones
      .filter((e) => e.tipo === 'agregar')
      .map((e): RutinaDiaria => ({
        id: e.id,
        hora_inicio: e.hora_inicio ?? '00:00',
        hora_fin: e.hora_fin ?? '00:00',
        actividad: e.actividad ?? '',
        icono: e.icono ?? '📌',
        color: e.color,
        notificacion_activa: false,
        dias_semana: [diaSemana],
      }))
    return [...base, ...extras].sort((a, b) =>
      a.hora_inicio.localeCompare(b.hora_inicio),
    )
  }, [rutinas, excepciones, diaSemana])

  const crearRutina = useMutation({
    mutationFn: rutinasService.createRutinaDiaria,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rutinas_diarias'] })
      toast.success('Rutina creada')
    },
    onError: (err) => toast.error(`Error al crear rutina: ${parseSupabaseError(err)}`),
  })

  const actualizarRutina = useMutation({
    mutationFn: ({ id, updates }: { id: number; updates: Partial<RutinaDiaria> }) =>
      rutinasService.updateRutinaDiaria(id, updates),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['rutinas_diarias'] }),
    onError: (err) => toast.error(`Error al actualizar rutina: ${parseSupabaseError(err)}`),
  })

  const eliminarRutina = useMutation({
    mutationFn: rutinasService.deleteRutinaDiaria,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rutinas_diarias'] })
      toast.success('Rutina eliminada')
    },
    onError: (err) => toast.error(`Error al eliminar rutina: ${parseSupabaseError(err)}`),
  })

  const saltarRutina = useMutation({
    mutationFn: (excepcion: Omit<RutinaExcepcion, 'id'>) =>
      rutinasService.createRutinaExcepcion(excepcion),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['rutinas_excepciones'] }),
    onError: (err) => toast.error(`Error al saltar rutina: ${parseSupabaseError(err)}`),
  })

  const agregarExcepcion = useMutation({
    mutationFn: (excepcion: Omit<RutinaExcepcion, 'id'>) =>
      rutinasService.createRutinaExcepcion(excepcion),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rutinas_excepciones'] })
      toast.success('Actividad extra agregada')
    },
    onError: (err) => toast.error(`Error al agregar excepción: ${parseSupabaseError(err)}`),
  })

  const eliminarExcepcion = useMutation({
    mutationFn: rutinasService.deleteRutinaExcepcion,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['rutinas_excepciones'] }),
    onError: (err) => toast.error(`Error al eliminar excepción: ${parseSupabaseError(err)}`),
  })

  const isLoading = loadingRutinas || loadingExcepciones

  return {
    rutinas,
    rutinasDelDia,
    excepciones,
    isLoading,
    crearRutina,
    actualizarRutina,
    eliminarRutina,
    saltarRutina,
    agregarExcepcion,
    eliminarExcepcion,
  }
}
