import { useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { parseSupabaseError } from '@/lib/supabaseError'
import { notasService } from '@/services/supabaseService'
import type { Nota } from '@/types'

export const useNotas = () => {
  const queryClient = useQueryClient()

  const { data: notas = [], isLoading } = useQuery({
    queryKey: ['notas'],
    queryFn: notasService.getNotas,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  })

  const crear = useMutation({
    mutationFn: notasService.createNota,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notas'] })
      toast.success('Nota creada')
    },
    onError: (err) => toast.error(`Error al crear nota: ${parseSupabaseError(err)}`),
  })

  const actualizar = useMutation({
    mutationFn: ({ id, updates }: { id: number; updates: Partial<Nota> }) =>
      notasService.updateNota(id, updates),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notas'] }),
    onError: (err) => toast.error(`Error al actualizar nota: ${parseSupabaseError(err)}`),
  })

  const eliminar = useMutation({
    mutationFn: notasService.deleteNota,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notas'] })
      toast.success('Nota eliminada')
    },
    onError: (err) => toast.error(`Error al eliminar nota: ${parseSupabaseError(err)}`),
  })

  const notasPinned = useMemo(() => notas.filter((n) => n.pinned), [notas])

  const porEtiqueta = useMemo(() => {
    const map: Record<string, Nota[]> = {}
    notas.forEach((n) => {
      n.etiquetas.forEach((e) => {
        if (!map[e]) map[e] = []
        map[e].push(n)
      })
    })
    return map
  }, [notas])

  return { notas, notasPinned, porEtiqueta, isLoading, crear, actualizar, eliminar }
}
