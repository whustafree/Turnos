import { Capacitor } from '@capacitor/core'
import { LocalNotifications } from '@capacitor/local-notifications'

export const REMINDER_NOTIF_ID = 1001
export const SMART_NOTIF_START = 2001

export function isNative(): boolean {
  return Capacitor.isNativePlatform()
}

export function nativeReminderEnabled(): boolean {
  return localStorage.getItem('turnos_notif') === '1'
}

export async function getNativePermission(): Promise<boolean> {
  if (!isNative()) return false
  try {
    const perm = await LocalNotifications.checkPermissions()
    if (perm.display === 'granted') return true
    if (perm.display === 'prompt' || perm.display === 'prompt-with-rationale') {
      const req = await LocalNotifications.requestPermissions()
      return req.display === 'granted'
    }
    return false
  } catch {
    return false
  }
}

export async function scheduleDailyReminder(body: string): Promise<boolean> {
  if (!isNative()) return false
  const ok = await getNativePermission()
  if (!ok) return false
  try {
    await LocalNotifications.cancel({ notifications: [{ id: REMINDER_NOTIF_ID }] })
    await LocalNotifications.schedule({
      notifications: [
        {
          id: REMINDER_NOTIF_ID,
          title: 'TurnosApp',
          body,
          smallIcon: 'ic_stat_turnos',
          iconColor: '#2563eb',
          schedule: {
            allowWhileIdle: true,
            on: { hour: 8, minute: 0 },
            repeats: true,
          },
        },
      ],
    })
    return true
  } catch {
    return false
  }
}

export interface SmartReminderItem {
  at: Date
  body: string
}

// Programa notificaciones puntuales a las 08:00 para los próximos días,
// con el turno real de cada fecha (y avisos de feriado). Reemplaza al
// recordatorio fijo diario cuando hay datos para calcular el turno.
export async function scheduleSmartReminders(items: SmartReminderItem[]): Promise<boolean> {
  if (!isNative() || items.length === 0) return false
  const ok = await getNativePermission()
  if (!ok) return false
  try {
    const anteriores = Array.from({ length: 30 }, (_, i) => ({ id: SMART_NOTIF_START + i }))
    await LocalNotifications.cancel({ notifications: anteriores.concat({ id: REMINDER_NOTIF_ID }) })
    const ahora = Date.now()
    const notifs = items
      .filter((it) => it.at.getTime() > ahora)
      .map((it, i) => ({
        id: SMART_NOTIF_START + i,
        title: 'TurnosApp',
        body: it.body,
        smallIcon: 'ic_stat_turnos',
        iconColor: '#2563eb',
        schedule: { at: it.at, allowWhileIdle: true },
      }))
    if (notifs.length === 0) return true
    await LocalNotifications.schedule({ notifications: notifs })
    return true
  } catch {
    return false
  }
}

export async function cancelDailyReminder(): Promise<void> {
  if (!isNative()) return
  try {
    const anteriores = Array.from({ length: 30 }, (_, i) => ({ id: SMART_NOTIF_START + i }))
    await LocalNotifications.cancel({ notifications: anteriores.concat({ id: REMINDER_NOTIF_ID }) })
  } catch { /* ignore */ }
}