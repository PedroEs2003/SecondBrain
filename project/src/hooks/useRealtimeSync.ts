import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'

/**
 * Canal realtime único para toda la app.
 * Centraliza las 6 suscripciones en un solo canal persistente,
 * eliminando la recreación de canales al navegar entre páginas.
 * Montar una sola vez en App.tsx dentro del QueryClientProvider.
 */
export const useRealtimeSync = () => {
  const queryClient = useQueryClient()

  useEffect(() => {
    const channel = supabase
      .channel('app-realtime-sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'logs_gym' }, () => {
        queryClient.invalidateQueries({ queryKey: ['logs_gym'] })
        queryClient.invalidateQueries({ queryKey: ['dias_entrenamiento'] })
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'ejercicios' }, () => {
        queryClient.invalidateQueries({ queryKey: ['ejercicios_stats'] })
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tareas' }, () => {
        queryClient.invalidateQueries({ queryKey: ['tareas'] })
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notas' }, () => {
        queryClient.invalidateQueries({ queryKey: ['notas'] })
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'deudas' }, () => {
        queryClient.invalidateQueries({ queryKey: ['deudas'] })
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'rutinas_diarias' }, () => {
        queryClient.invalidateQueries({ queryKey: ['rutinas_diarias'] })
        queryClient.invalidateQueries({ queryKey: ['rutinas_excepciones'] })
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [queryClient])
}
