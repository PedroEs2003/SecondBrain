// ============================================================
// Servicio de IA — Segundo Cerebro
// Portado de lib/services/ai_service.dart (Flutter)
// Usa Gemini 2.5-flash via Edge Function proxy (gemini-proxy)
// ============================================================

import { supabase } from '@/integrations/supabase/client'
import type { Intent, IntentType, MensajeChat } from '@/types'

// ─── Prompts ────────────────────────────────────────────────

const INTENT_SYSTEM_PROMPT = `Eres el asistente personal de productividad "Jarvis" dentro de una app llamada Segundo Cerebro.

Tu tarea es ANALIZAR el texto del usuario e identificar UNO O MÚLTIPLES intents de la siguiente lista:

INTENTS DISPONIBLES:
- gym: Registrar un entrenamiento (ejercicio, series, reps, peso)
- rutina: Crear una rutina diaria (actividad, hora inicio, hora fin, icono, días de la semana)
- tarea: Crear una tarea (titulo, descripcion, fecha_limite, prioridad 0=normal/1=alta/2=urgente)
- nota: Crear una nota (titulo, contenido, etiquetas)
- nuevo_ejercicio: Agregar un ejercicio a un grupo muscular
- borrar_tarea: Eliminar una tarea por título
- borrar_log_gym: Eliminar un log de gym por ejercicio/fecha
- borrar_rutina: Eliminar una rutina diaria por nombre/actividad
- borrar_nota: Eliminar una nota por título
- deuda: Registrar una deuda (persona, monto, tipo: debo/me_deben, descripcion)
- borrar_deuda: Eliminar una deuda por persona/concepto
- pagar_deuda: Marcar una deuda como pagada por persona (campos: persona)
- completar_tarea: Marcar una tarea como completada por título (campos: titulo)
- agregar_excepcion: Agregar una actividad extra hoy (fuera de rutina)
- saltar_rutina: Omitir una rutina en una fecha específica
- unknown: Conversación general o pregunta

REGLAS:
1. Devuelve SIEMPRE un array JSON válido de intents, aunque sea uno solo
2. Extrae TODOS los datos relevantes del texto en el campo "data"
3. Si no puedes determinar el intent, usa "unknown" con el texto original en data.mensaje
4. Para fechas relativas como "hoy", "mañana", usa la fecha ISO real del día actual
5. No incluyas explicaciones, solo el JSON

FORMATO DE RESPUESTA:
[
  {
    "type": "tarea",
    "data": {
      "titulo": "Comprar leche",
      "prioridad": 0,
      "fecha_limite": null
    }
  }
]

Fecha actual: {{FECHA_HOY}}
`

const CHAT_SYSTEM_PROMPT = `Eres Jarvis, el asistente personal de productividad de Segundo Cerebro.
Eres conciso, inteligente y hablas en español mexicano informal.
Puedes responder preguntas sobre las actividades del usuario, dar consejos de productividad, gym, finanzas y organización.
Mantén respuestas cortas (máximo 3 párrafos). Sé directo y útil.
Si el usuario pregunta algo que no sabes, dilo claramente.`

// ─── Llamada a la API (via Edge Function proxy) ──────────────

async function callGemini(
  prompt: string,
  systemInstruction?: string,
  historial: MensajeChat[] = [],
): Promise<string> {
  const contents = [
    ...historial.map((m) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    })),
    {
      role: 'user',
      parts: [{ text: prompt }],
    },
  ]

  const body: Record<string, unknown> = { contents }

  if (systemInstruction) {
    body.systemInstruction = {
      parts: [{ text: systemInstruction }],
    }
  }

  body.generationConfig = {
    temperature: 0.3,
    maxOutputTokens: 2048,
    responseMimeType: systemInstruction?.includes('array JSON') ? 'application/json' : 'text/plain',
  }

  const { data, error } = await supabase.functions.invoke('gemini-proxy', { body })

  if (error) throw new Error(`Gemini proxy error: ${error.message}`)

  const text: string = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? ''
  return text.trim()
}

// ─── API pública ─────────────────────────────────────────────

/**
 * Analiza texto libre y devuelve un array de intents detectados.
 * Portado de parsearIntents() en ai_service.dart
 */
export async function procesarTexto(texto: string): Promise<Intent[]> {
  const fechaHoy = new Date().toISOString().split('T')[0]
  const systemPrompt = INTENT_SYSTEM_PROMPT.replace('{{FECHA_HOY}}', fechaHoy)

  try {
    const respuesta = await callGemini(texto, systemPrompt)

    // Limpiar posibles markdown fences y extraer array
    const limpio = respuesta.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
    const match = limpio.match(/\[[\s\S]*\]/)
    if (!match) return [{ type: 'unknown' as IntentType, data: { mensaje: texto } }]
    const parsed = JSON.parse(match[0]) as Array<{ type: IntentType; data: Record<string, unknown> }>

    return parsed.map((p) => ({
      type: p.type ?? 'unknown',
      data: p.data ?? {},
    }))
  } catch (e) {
    console.error('Error procesando intents:', e)
    return [{ type: 'unknown', data: { mensaje: texto } }]
  }
}

/**
 * Chat conversacional con historial.
 * Portado de consultarIA() en ai_service.dart
 */
export async function consultarIA(
  texto: string,
  historial: MensajeChat[] = [],
): Promise<string> {
  try {
    return await callGemini(texto, CHAT_SYSTEM_PROMPT, historial)
  } catch (e) {
    console.error('Error en consultarIA:', e)
    return 'Lo siento, no pude conectarme al asistente. Verifica tu conexión e inténtalo de nuevo.'
  }
}

// ─── Prioridad del día ────────────────────────────────────

export type PrioridadItem = {
  tipo: 'tarea' | 'deuda' | 'gym' | 'recordatorio' | 'resumen'
  titulo: string
  subtitulo: string
  urgencia: 'alta' | 'media' | 'baja'
}

const PRIORIDAD_SYSTEM_PROMPT = `Eres Jarvis, el asistente de Segundo Cerebro.
Analiza el contexto del día y devuelve un array JSON con las 2-3 prioridades más importantes para HOY.

REGLAS:
1. Devuelve EXACTAMENTE un array JSON con 2 a 4 items
2. Ordena por urgencia (alta primero)
3. Usa nombres/montos REALES del contexto dado — sé específico
4. Si alguna categoría no tiene datos relevantes, no la incluyas
5. El subtitulo debe ser corto, informativo y motivador (máximo 8 palabras)
6. No incluyas explicaciones, solo el JSON

TIPOS VÁLIDOS: tarea | deuda | gym | recordatorio | resumen

FORMATO DE RESPUESTA:
[
  { "tipo": "tarea", "titulo": "...", "subtitulo": "...", "urgencia": "alta" }
]

Fecha actual: {{FECHA_HOY}}`

export async function getPrioridadDelDia(contexto: {
  tareas: Array<{ titulo: string; prioridad: number; fecha_limite?: string | null; completada: boolean }>
  deudas: Array<{ persona: string; monto: number; tipo: string; pagada: boolean }>
  logsGymHoy: Array<{ ejercicio_nombre?: string; series: number; repes: number; peso_kg: number }>
  rutinasHoy: Array<{ actividad: string; hora_inicio: string }>
  recordatorios: Array<{ texto: string; fecha: string; activo: boolean }>
}): Promise<PrioridadItem[]> {
  const fechaHoy = new Date().toISOString().split('T')[0]

  const contextText = `
TAREAS PENDIENTES (no completadas): ${JSON.stringify(contexto.tareas.filter(t => !t.completada).slice(0, 8))}
DEUDAS ACTIVAS (no pagadas): ${JSON.stringify(contexto.deudas.filter(d => !d.pagada).slice(0, 5))}
ENTRENAMIENTOS HOY: ${contexto.logsGymHoy.length > 0 ? JSON.stringify(contexto.logsGymHoy) : 'Ninguno registrado hoy'}
RUTINAS DE HOY: ${contexto.rutinasHoy.length > 0 ? JSON.stringify(contexto.rutinasHoy.slice(0, 4)) : 'Sin rutinas hoy'}
RECORDATORIOS ACTIVOS: ${contexto.recordatorios.filter(r => r.activo).length > 0 ? JSON.stringify(contexto.recordatorios.filter(r => r.activo).slice(0, 4)) : 'Ninguno'}
`.trim()

  const systemPrompt = PRIORIDAD_SYSTEM_PROMPT.replace('{{FECHA_HOY}}', fechaHoy)

  try {
    const respuesta = await callGemini(contextText, systemPrompt)
    const limpio = respuesta.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
    const match = limpio.match(/\[[\s\S]*\]/)
    if (!match) return []
    const parsed = JSON.parse(match[0]) as PrioridadItem[]
    return Array.isArray(parsed) ? parsed : []
  } catch (e) {
    console.error('Error generando prioridad del día:', e)
    return []
  }
}

// ─── Config de widgets por Jarvis ────────────────────────

export type WidgetJarvisConfig = {
  id: string
  size: 'compact' | 'normal' | 'expanded'
  visible: boolean
}

const JARVIS_WIDGET_PROMPT = `Eres Jarvis, el asistente de Segundo Cerebro.
Organiza el dashboard del usuario con base en sus datos reales de HOY.

Para cada widget decide:
- orden (de más a menos relevante, primer elemento = más importante)
- size: compact = resumen mínimo | normal = estándar | expanded = prioridad máxima
- visible: false si el widget no tiene datos útiles hoy

REGLAS DE DISEÑO:
- Máximo 2 widgets en "expanded" (la pantalla es pequeña)
- "priority" siempre visible: true y siempre el primero
- Si un widget no tiene datos hoy (ej: gym sin entrenamientos), ponlo compact o visible:false
- Devuelve los 7 widgets en el array, en orden de importancia

IDs válidos: priority | tasks | gym | balance | agenda | progress | week
Hora actual: {{HORA}} | Fecha: {{FECHA}}

Devuelve SOLO el array JSON sin explicaciones:
[{ "id": "priority", "size": "expanded", "visible": true }, ...]`

export async function getJarvisWidgetConfig(contexto: {
  widgetData: Record<string, string>
  fecha: string
}): Promise<WidgetJarvisConfig[]> {
  const horaActual = new Date().toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })
  const systemPrompt = JARVIS_WIDGET_PROMPT
    .replace('{{HORA}}', horaActual)
    .replace('{{FECHA}}', contexto.fecha)

  const contextText = Object.entries(contexto.widgetData)
    .map(([id, resumen]) => `[${id}]: ${resumen}`)
    .join('\n')

  try {
    const respuesta = await callGemini(contextText, systemPrompt)
    const limpio = respuesta.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
    // Extraer el array JSON aunque haya texto extra antes/después
    const match = limpio.match(/\[[\s\S]*\]/)
    if (!match) return []
    const parsed = JSON.parse(match[0]) as WidgetJarvisConfig[]
    return Array.isArray(parsed) ? parsed : []
  } catch (e) {
    console.error('Error obteniendo config Jarvis:', e)
    return []
  }
}
