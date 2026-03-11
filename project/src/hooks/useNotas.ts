import { useMemo, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { notasService } from '@/services/supabaseService'
import { supabase } from '@/integrations/supabase/client'
import type { Nota } from '@/types'

export const useNotas = () => {
  const queryClient = useQueryClient()

  const { data: notas = [], isLoading } = useQuery({
    queryKey: ['notas'],
    queryFn: notasService.getNotas,
  })

  const crear = useMutation({
    mutationFn: notasService.createNota,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notas'] })
      toast.success('Nota creada')
    },
    onError: () => toast.error('Error al crear nota'),
  })

  const actualizar = useMutation({
    mutationFn: ({ id, updates }: { id: number; updates: Partial<Nota> }) =>
      notasService.updateNota(id, updates),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notas'] }),
    onError: () => toast.error('Error al actualizar nota'),
  })

  const eliminar = useMutation({
    mutationFn: notasService.deleteNota,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notas'] })
      toast.success('Nota eliminada')
    },
    onError: () => toast.error('Error al eliminar nota'),
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

  useEffect(() => {
    const channel = supabase
      .channel('notas-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notas' }, () => {
        queryClient.invalidateQueries({ queryKey: ['notas'] })
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [queryClient])

  return { notas, notasPinned, porEtiqueta, isLoading, crear, actualizar, eliminar }
}
