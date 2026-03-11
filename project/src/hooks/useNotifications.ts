// ============================================================
// Hook de Notificaciones Web
// Portado de lib/services/notification_service.dart (Flutter)
// Usa Web Notifications API + setTimeout para programar
// ============================================================

import { useCallback, useEffect, useRef } from 'react'
import type { RutinaDiaria } from '@/types'

// Map de rutinaId → timeoutId para poder cancelarlos
const notificationTimers = new Map<number, ReturnType<typeof setTimeout>>()

function minutosHastaHora(horaStr: string): number {
  const ahora = new Date()
  const [hh, mm] = horaStr.split(':').map(Number)
  const objetivo = new Date()
  objetivo.setHours(hh, mm, 0, 0)
  if (objetivo <= ahora) objetivo.setDate(objetivo.getDate() + 1) // siguiente día
  return Math.max(0, Math.floor((objetivo.getTime() - ahora.getTime()) / 1000 / 60))
}

function diaSemanaActual(): number {
  const d = new Date().getDay() // 0=Dom
  return d === 0 ? 7 : d
}

function mostrarNotificacion(titulo: string, cuerpo: string) {
  if (Notification.permission !== 'granted') return
  try {
    new Notification(titulo, {
      body: cuerpo,
      icon: '/pwa-192x192.png',
      badge: '/pwa-192x192.png',
      tag: titulo,
    })
  } catch (e) {
    console.warn('Notificación fallida:', e)
  }
}

export const useNotifications = () => {
  const permissionRef = useRef<NotificationPermission>(
    typeof Notification !== 'undefined' ? Notification.permission : 'default',
  )

  const requestPermission = useCallback(async (): Promise<boolean> => {
    if (typeof Notification === 'undefined') return false
    if (Notification.permission === 'granted') return true
    if (Notification.permission === 'denied') return false

    const result = await Notification.requestPermission()
    permissionRef.current = result
    return result === 'granted'
  }, [])

  const scheduleRutinaNotification = useCallback((rutina: RutinaDiaria) => {
    if (!rutina.id || !rutina.notificacion_activa) return

    // Cancelar timer existente si lo hay
    const existente = notificationTimers.get(rutina.id)
    if (existente !== undefined) clearTimeout(existente)

    // Solo programar si la rutina aplica hoy
    if (!rutina.dias_semana.includes(diaSemanaActual())) return

    const minutosRestantes = minutosHastaHora(rutina.hora_inicio)
    const msRestantes = minutosRestantes * 60 * 1000

    const timerId = setTimeout(() => {
      mostrarNotificacion(
        `${rutina.icono} ${rutina.actividad}`,
        `Empieza a las ${rutina.hora_inicio} — ${rutina.hora_fin}`,
      )
      notificationTimers.delete(rutina.id!)
    }, msRestantes)

    notificationTimers.set(rutina.id, timerId)
  }, [])

  const cancelNotification = useCallback((rutinaId: number) => {
    const timerId = notificationTimers.get(rutinaId)
    if (timerId !== undefined) {
      clearTimeout(timerId)
      notificationTimers.delete(rutinaId)
    }
  }, [])

  const rescheduleAll = useCallback(
    (rutinas: RutinaDiaria[]) => {
      // Cancelar todos los timers activos
      notificationTimers.forEach((id) => clearTimeout(id))
      notificationTimers.clear()

      // Reprogramar solo las que tienen notificación activa
      rutinas.forEach((r) => {
        if (r.notificacion_activa) scheduleRutinaNotification(r)
      })
    },
    [scheduleRutinaNotification],
  )

  // Limpiar timers al desmontar
  useEffect(() => {
    return () => {
      notificationTimers.forEach((id) => clearTimeout(id))
      notificationTimers.clear()
    }
  }, [])

  return {
    permission: permissionRef.current,
    requestPermission,
    scheduleRutinaNotification,
    cancelNotification,
    rescheduleAll,
  }
}
