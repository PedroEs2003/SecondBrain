import { useMemo, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { deudasService } from '@/services/supabaseService'
import { supabase } from '@/integrations/supabase/client'
import type { Deuda } from '@/types'

export const useDeudas = () => {
  const queryClient = useQueryClient()

  const { data: deudas = [], isLoading } = useQuery({
    queryKey: ['deudas'],
    queryFn: deudasService.getDeudas,
  })

  const crear = useMutation({
    mutationFn: deudasService.createDeuda,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deudas'] })
      toast.success('Deuda registrada')
    },
    onError: () => toast.error('Error al registrar deuda'),
  })

  const actualizar = useMutation({
    mutationFn: ({ id, updates }: { id: number; updates: Partial<Deuda> }) =>
      deudasService.updateDeuda(id, updates),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['deudas'] }),
    onError: () => toast.error('Error al actualizar deuda'),
  })

  const eliminar = useMutation({
    mutationFn: deudasService.deleteDeuda,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deudas'] })
      toast.success('Deuda eliminada')
    },
    onError: () => toast.error('Error al eliminar deuda'),
  })

  const deudasActivas = useMemo(() => deudas.filter((d) => !d.pagada), [deudas])

  const totalDebo = useMemo(
    () => deudasActivas.filter((d) => d.tipo === 'debo').reduce((s, d) => s + d.monto, 0),
    [deudasActivas],
  )

  const totalMeDeben = useMemo(
    () => deudasActivas.filter((d) => d.tipo === 'me_deben').reduce((s, d) => s + d.monto, 0),
    [deudasActivas],
  )

  const balance = useMemo(() => totalMeDeben - totalDebo, [totalDebo, totalMeDeben])

  const deboPercent = useMemo(() => {
    const total = totalDebo + totalMeDeben
    return total === 0 ? 0 : Math.round((totalDebo / total) * 100)
  }, [totalDebo, totalMeDeben])

  useEffect(() => {
    const channel = supabase
      .channel('deudas-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'deudas' }, () => {
        queryClient.invalidateQueries({ queryKey: ['deudas'] })
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [queryClient])

  return {
    deudas,
    deudasActivas,
    totalDebo,
    totalMeDeben,
    balance,
    deboPercent,
    isLoading,
    crear,
    actualizar,
    eliminar,
  }
}
