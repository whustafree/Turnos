import { Printer } from '@capgo/capacitor-printer'
import { isNative } from './native'
import type { TurnosData, PatronCiclo } from '../types'
import { CICLOS_LABELS } from '../types'
import { obtenerDia } from './turnos'
import type { PlanillaMes } from './planilla'

const MESES = ['ENERO', 'FEBRERO', 'MARZO', 'ABRIL', 'MAYO', 'JUNIO', 'JULIO', 'AGOSTO', 'SEPTIEMBRE', 'OCTUBRE', 'NOVIEMBRE', 'DICIEMBRE']
const DAY_HEADERS = ['LU', 'MA', 'MI', 'JU', 'VI', 'SA', 'DO']
const CELDA_COLOR: Record<string, string> = {
  D: '#059669',
  N: '#4338ca',
  DN: '#7c3aed',
  V: '#ca8a04',
  AD: '#2563eb',
}

const BASE_CSS = `
  * { box-sizing: border-box; }
  body { font-family: -apple-system, 'Segoe UI', Roboto, Arial, sans-serif; color: #111827; margin: 0; padding: 16px; }
  h1 { font-size: 18px; text-align: center; margin: 0 0 4px; }
  h2 { font-size: 14px; font-weight: 700; margin: 0 0 12px; color: #374151; }
  .header { text-align: center; margin-bottom: 12px; }
  .header .sub { font-size: 11px; color: #6b7280; }
  .legend { display: flex; justify-content: center; gap: 12px; font-size: 10px; font-weight: 700; margin-bottom: 10px; flex-wrap: wrap; }
  .legend span { display: inline-flex; align-items: center; gap: 4px; }
  .swatch { width: 10px; height: 10px; border-radius: 3px; display: inline-block; }
`

export interface PrintOptions {
  year: number
  month: number
  nombre: string
  cargo: string
  empresa: string
}

// ─── Calendario del mes (mismo look que la UI) ───
function buildCalendarioHtml({ year, month, nombre, cargo, empresa }: PrintOptions, turnos: TurnosData, patronActual: PatronCiclo | null, mesesBorrados: string[]): string {
  const firstDay = (new Date(year, month, 1).getDay() + 6) % 7
  const totalDays = new Date(year, month + 1, 0).getDate()

  const cells: string[] = []
  for (let i = 0; i < firstDay; i++) cells.push('<div class="cell empty"></div>')

  for (let d = 1; d <= totalDays; d++) {
    const data = obtenerDia(turnos, year, month, d, patronActual, mesesBorrados)
    const badges: string[] = []
    if (data?.tipo === 'vacaciones') badges.push('<span class="badge vac">VAC</span>')
    if (data?.tipo === 'administrativo') badges.push('<span class="badge adm">ADMIN</span>')
    if (data?.turnos?.length) {
      data.turnos
        .filter((t) => !(t === 'dia' && data.tipo && data.tipo !== 'turno'))
        .forEach((t) => {
          if (t === 'dia' && data.tipo === 'turno') {
            badges.push('<span class="badge dia">DÍA</span>')
            return
          }
          let cls = 'dia'
          let label = t.replace('extra-', '').toUpperCase()
          if (t.includes('noche')) cls = 'noche'
          if (t.includes('extra')) {
            cls = t.includes('noche') ? 'extra-noche' : 'extra-dia'
          }
          badges.push(`<span class="badge ${cls}">${label}</span>`)
        })
    }
    cells.push(`<div class="cell">${d}<div class="badges">${badges.join('')}</div></div>`)
  }

  const css = `${BASE_CSS}
    .grid { display: grid; grid-template-columns: repeat(7, 1fr); gap: 4px; }
    .dow { text-align: center; font-size: 10px; font-weight: 800; color: #6b7280; padding: 4px 0; }
    .dow.weekend { color: #2563eb; }
    .dow.sun { color: #dc2626; }
    .cell { border: 1px solid #e5e7eb; border-radius: 8px; padding: 4px; min-height: 52px; }
    .cell.empty { border: none; }
    .cell .num { font-size: 11px; font-weight: 700; color: #6b7280; }
    .badges { display: flex; flex-direction: column; gap: 2px; margin-top: 4px; }
    .badge { font-size: 9px; font-weight: 800; text-align: center; border-radius: 4px; padding: 2px 0; color: #fff; }
    .badge.dia { background: #059669; }
    .badge.noche { background: #4338ca; }
    .badge.extra-dia { background: #d97706; }
    .badge.extra-noche { background: #7c3aed; }
    .badge.vac { background: #ca8a04; }
    .badge.adm { background: #2563eb; }
  `

  const dow = DAY_HEADERS.map((h, i) => {
    const cls = i === 6 ? 'dow sun' : i >= 5 ? 'dow weekend' : 'dow'
    return `<div class="${cls}">${h}</div>`
  }).join('')

  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>Calendario ${MESES[month]} ${year}</title><style>${css}</style></head>
<body>
  <div class="header">
    <h1>Calendario de Turnos</h1>
    <h2>${MESES[month]} ${year}</h2>
    <div class="sub">${nombre}${cargo ? ' · ' + cargo : ''}${empresa ? ' · ' + empresa : ''}</div>
  </div>
  <div class="legend">
    <span><i class="swatch" style="background:#059669"></i> DÍA</span>
    <span><i class="swatch" style="background:#4338ca"></i> NOCHE</span>
    <span><i class="swatch" style="background:#d97706"></i> EXTRA DÍA</span>
    <span><i class="swatch" style="background:#7c3aed"></i> EXTRA NOCHE</span>
    <span><i class="swatch" style="background:#ca8a04"></i> VAC</span>
    <span><i class="swatch" style="background:#2563eb"></i> ADMIN</span>
  </div>
  <div class="grid">${dow}${cells.join('')}</div>
</body></html>`
}

// ─── Planilla del mes (tabla trabajadores × días) ───
function buildPlanillaHtml(planilla: PlanillaMes, equipoNombre: string): string {
  const css = `${BASE_CSS}
    table { border-collapse: collapse; width: 100%; font-size: 9px; }
    th, td { border: 1px solid #d1d5db; padding: 3px 2px; text-align: center; }
    th { font-size: 9px; font-weight: 800; }
    .pl-nombre { text-align: left; min-width: 110px; font-weight: 700; white-space: nowrap; }
    .pl-dia { color: #6b7280; min-width: 18px; }
    .vacio { color: #e5e7eb; font-size: 8px; }
  `

  const thead = `<tr><th>Trabajador</th>${Array.from({ length: planilla.totalDias }, (_, i) => i + 1)
    .map((d) => `<th class="pl-dia">${d}</th>`)
    .join('')}</tr>`

  const tbody = planilla.filas
    .map((fila) => {
      const celdas = fila.celdas
        .map((c) => {
          if (!c) return `<td class="vacio">·</td>`
          return `<td style="color:${CELDA_COLOR[c]};background:${CELDA_COLOR[c]}22;font-weight:800">${c}</td>`
        })
        .join('')
      return `<tr><td class="pl-nombre">${fila.nombre}</td>${celdas}</tr>`
    })
    .join('')

  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>Planilla ${MESES[planilla.month]} ${planilla.year}</title><style>${css}</style></head>
<body>
  <div class="header">
    <h1>PLANILLA DE TURNOS</h1>
    <h2>${MESES[planilla.month]} ${planilla.year}${equipoNombre ? ' — ' + equipoNombre : ''}</h2>
  </div>
  <div class="legend">
    <span><i class="swatch" style="background:${CELDA_COLOR.D}"></i> D = Día</span>
    <span><i class="swatch" style="background:${CELDA_COLOR.N}"></i> N = Noche</span>
    <span><i class="swatch" style="background:${CELDA_COLOR.DN}"></i> DN = Mixto</span>
    <span><i class="swatch" style="background:${CELDA_COLOR.V}"></i> V = Vacaciones</span>
    <span><i class="swatch" style="background:${CELDA_COLOR.AD}"></i> AD = Admin.</span>
  </div>
  <table><thead>${thead}</thead><tbody>${tbody}</tbody></table>
</body></html>`
}

// ─── Imprimir tomando en cuenta la plataforma ───
export async function imprimirCalendario(
  opts: PrintOptions,
  turnos: TurnosData,
  patronActual: PatronCiclo | null,
  mesesBorrados: string[]
): Promise<void> {
  const html = buildCalendarioHtml(opts, turnos, patronActual, mesesBorrados)
  if (isNative()) {
    try {
      await Printer.printHtml({
        name: `TurnosApp-${MESES[opts.month]}-${opts.year}`,
        html,
      })
      return
    } catch {
      // si falla el diálogo nativo, caemos a la impresión del WebView
    }
  }
  window.print()
}

export async function imprimirPlanilla(planilla: PlanillaMes, equipoNombre: string): Promise<void> {
  const html = buildPlanillaHtml(planilla, equipoNombre)
  if (isNative()) {
    try {
      await Printer.printHtml({
        name: `TurnosApp-Planilla-${MESES[planilla.month]}-${planilla.year}`,
        html,
      })
      return
    } catch {
      // fallback: impresión del WebView
    }
  }
  window.print()
}

export { CICLOS_LABELS }