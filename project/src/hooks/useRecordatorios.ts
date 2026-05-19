import { useMemo, useEffect, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { parseSupabaseError } from '@/lib/supabaseError'
import { recordatoriosService } from '@/services/supabaseService'
import { supabase } from '@/integrations/supabase/client'
import type { Recordatorio } from '@/types'

export const useRecordatorios = () => {
  const queryClient = useQueryClient()

  const { data: recordatorios = [], isLoading } = useQuery({
    queryKey: ['recordatorios'],
    queryFn: recordatoriosService.getRecordatorios,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  })

  const crear = useMutation({
    mutationFn: recordatoriosService.createRecordatorio,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recordatorios'] })
      toast.success('Recordatorio creado')
    },
    onError: (err) => toast.error(`Error al crear recordatorio: ${parseSupabaseError(err)}`),
  })

  const actualizar = useMutation({
    mutationFn: ({ id, updates }: { id: number; updates: Partial<Recordatorio> }) =>
      recordatoriosService.updateRecordatorio(id, updates),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['recordatorios'] }),
    onError: (err) => toast.error(`Error al actualizar recordatorio: ${parseSupabaseError(err)}`),
  })

  const eliminar = useMutation({
    mutationFn: recordatoriosService.deleteRecordatorio,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recordatorios'] })
      toast.success('Recordatorio eliminado')
    },
    onError: (err) => toast.error(`Error al eliminar recordatorio: ${parseSupabaseError(err)}`),
  })

  const toggleActivo = (id: number, activo: boolean) =>
    actualizar.mutate({ id, updates: { activo } })

  const activos = useMemo(
    () => recordatorios.filter((r) => r.activo),
    [recordatorios],
  )

  const proximos = useMemo(() => {
    const hoy = new Date().toISOString().split('T')[0]
    return recordatorios.filter((r) => r.activo && r.fecha >= hoy)
  }, [recordatorios])

  // Notification scheduler
  const firedRef = useRef<Set<string>>(new Set())

  useEffect(() => {
    const check = () => {
      if (Notification.permission !== 'granted') return
      const now = new Date()
      const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
      const currentHHMM = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
      const todayDow = now.getDay()      // 0=Sun
      const todayDay = now.getDate()
      const todayMonth = now.getMonth() + 1

      recordatorios.forEach(r => {
        if (!r.activo || !r.hora) return
        const key = `rec-${r.id}-${todayStr}`
        if (firedRef.current.has(key)) return
        // Dispara si el tiempo actual está dentro de 1 minuto del horario configurado
        const [rH, rM] = r.hora.split(':').map(Number)
        const rutinaMinutes = rH * 60 + rM
        const nowMinutes = now.getHours() * 60 + now.getMinutes()
        if (Math.abs(nowMinutes - rutinaMinutes) > 1) return

        // Check if fires today based on repetir
        let firesToday = false
        const [fy, fm, fd] = r.fecha.split('-').map(Number)
        if (r.repetir === 'none') firesToday = r.fecha === todayStr
        else if (r.repetir === 'weekly') firesToday = new Date(fy, fm - 1, fd).getDay() === todayDow
        else if (r.repetir === 'monthly') firesToday = fd === todayDay
        else if (r.repetir === 'yearly') firesToday = fm === todayMonth && fd === todayDay

        if (!firesToday) return
        firedRef.current.add(key)
        try {
          new Notification(r.texto, {
            body: r.repetir !== 'none' ? `Recordatorio ${r.repetir}` : r.fecha,
            icon: '/pwa-192x192.png',
            tag: key,
          })
        } catch (e) {
          console.warn('Notificación fallida:', e)
        }
      })
    }

    check() // run immediately
    const interval = setInterval(check, 60_000)
    return () => clearInterval(interval)
  }, [recordatorios])

  // Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel('recordatorios-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'recordatorios' }, () => {
        queryClient.invalidateQueries({ queryKey: ['recordatorios'] })
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [queryClient])

  return {
    recordatorios,
    activos,
    proximos,
    isLoading,
    crear,
    actualizar,
    eliminar,
    toggleActivo,
  }
}
