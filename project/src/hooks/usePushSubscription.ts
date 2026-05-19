import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { toast } from '@/hooks/use-toast'

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY as string

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = atob(base64)
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)))
}

const isPushSupported = () =>
  'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window

export const usePushSubscription = () => {
  const [isSubscribed, setIsSubscribed] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (!isPushSupported()) return
    navigator.serviceWorker.ready.then((reg) => {
      reg.pushManager.getSubscription().then((sub) => setIsSubscribed(!!sub))
    })
  }, [])

  const subscribe = useCallback(async (): Promise<boolean> => {
    if (!isPushSupported()) {
      const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent)
      toast({
        title: 'No disponible',
        description: isIOS
          ? 'En iPhone debes instalar la app en el Home Screen (Compartir → Añadir a inicio) y abrirla desde ahí. Requiere iOS 16.4+.'
          : 'Tu navegador no soporta notificaciones push.',
        variant: 'destructive',
      })
      return false
    }
    if (!VAPID_PUBLIC_KEY) {
      toast({ title: 'Error de configuración', description: 'Falta VITE_VAPID_PUBLIC_KEY en .env', variant: 'destructive' })
      return false
    }

    try {
      setIsLoading(true)

      const permission = await Notification.requestPermission()
      if (permission === 'denied') {
        toast({ title: 'Permiso denegado', description: 'Activa las notificaciones en los ajustes del navegador.', variant: 'destructive' })
        return false
      }
      if (permission !== 'granted') return false

      // Esperar SW con timeout de 10s
      const reg = await Promise.race([
        navigator.serviceWorker.ready,
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Service Worker no listo (timeout 10s)')), 10_000)
        ),
      ]) as ServiceWorkerRegistration

      const subscription = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      })

      const sub = subscription.toJSON()
      const { error } = await supabase.from('push_subscriptions').upsert(
        {
          endpoint: sub.endpoint,
          p256dh: sub.keys?.p256dh,
          auth: sub.keys?.auth,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'endpoint' }
      )

      if (error) throw new Error(error.message)

      setIsSubscribed(true)
      toast({ title: 'Notificaciones activadas ✓', description: 'Recibirás alertas aunque la app esté cerrada.' })
      return true
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      toast({ title: 'Error al activar push', description: msg, variant: 'destructive' })
      console.error('Push subscription failed:', err)
      return false
    } finally {
      setIsLoading(false)
    }
  }, [])

  const unsubscribe = useCallback(async () => {
    try {
      setIsLoading(true)
      const reg = await navigator.serviceWorker.ready
      const sub = await reg.pushManager.getSubscription()
      if (!sub) return
      await sub.unsubscribe()
      await supabase.from('push_subscriptions').delete().eq('endpoint', sub.endpoint)
      setIsSubscribed(false)
      toast({ title: 'Notificaciones desactivadas' })
    } catch (err) {
      toast({ title: 'Error', description: String(err), variant: 'destructive' })
    } finally {
      setIsLoading(false)
    }
  }, [])

  return { isSubscribed, isLoading, subscribe, unsubscribe }
}
