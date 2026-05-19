import { useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { parseSupabaseError } from '@/lib/supabaseError'
import { deudasService } from '@/services/supabaseService'
import type { Deuda } from '@/types'

export const useDeudas = () => {
  const queryClient = useQueryClient()

  const { data: deudas = [], isLoading } = useQuery({
    queryKey: ['deudas'],
    queryFn: deudasService.getDeudas,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  })

  const crear = useMutation({
    mutationFn: deudasService.createDeuda,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deudas'] })
      toast.success('Deuda registrada')
    },
    onError: (err) => toast.error(`Error al registrar deuda: ${parseSupabaseError(err)}`),
  })

  const actualizar = useMutation({
    mutationFn: ({ id, updates }: { id: number; updates: Partial<Deuda> }) =>
      deudasService.updateDeuda(id, updates),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['deudas'] }),
    onError: (err) => toast.error(`Error al actualizar deuda: ${parseSupabaseError(err)}`),
  })

  const eliminar = useMutation({
    mutationFn: deudasService.deleteDeuda,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deudas'] })
      toast.success('Deuda eliminada')
    },
    onError: (err) => toast.error(`Error al eliminar deuda: ${parseSupabaseError(err)}`),
  })

  const deudasActivas = useMemo(() => deudas.filter((d) => !d.pagada), [deudas])

  const totalDebo = useMemo(
    () => deudasActivas
      .filter((d) => d.tipo === 'debo')
      .reduce((s, d) => {
        const pagado = (d.payments ?? []).reduce((ps, p) => ps + p.monto, 0)
        return s + Math.max(0, d.monto - pagado)
      }, 0),
    [deudasActivas],
  )

  const totalMeDeben = useMemo(
    () => deudasActivas
      .filter((d) => d.tipo === 'me_deben')
      .reduce((s, d) => {
        const pagado = (d.payments ?? []).reduce((ps, p) => ps + p.monto, 0)
        return s + Math.max(0, d.monto - pagado)
      }, 0),
    [deudasActivas],
  )

  const balance = useMemo(() => totalMeDeben - totalDebo, [totalDebo, totalMeDeben])

  const deboPercent = useMemo(() => {
    const total = totalDebo + totalMeDeben
    return total === 0 ? 0 : Math.round((totalDebo / total) * 100)
  }, [totalDebo, totalMeDeben])

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
