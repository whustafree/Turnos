// ─── Feriados Chilenos ───

function calcularSemanaSanta(ano: number, dias: number): Date {
  const a = ano % 19
  const b = Math.floor(ano / 100)
  const c = ano % 100
  const d = Math.floor(b / 4)
  const e = b % 4
  const f = Math.floor((b + 8) / 25)
  const g = Math.floor((b - f + 1) / 3)
  const h = (19 * a + b - d - g + 15) % 30
  const i = Math.floor(c / 4)
  const k = c % 4
  const l = (32 + 2 * e + 2 * i - h - k) % 7
  const m = Math.floor((a + 11 * h + 22 * l) / 451)
  const mes = Math.floor((h + l - 7 * m + 114) / 31) - 1
  const dia = ((h + l - 7 * m + 114) % 31) + 1
  return new Date(new Date(ano, mes, dia).getTime() + dias * 86400000)
}

const FERIADOS_FN: Record<string, (y: number) => Date> = {
  'Año Nuevo': (y) => new Date(y, 0, 1),
  'Viernes Santo': (y) => calcularSemanaSanta(y, -2),
  'Sábado Santo': (y) => calcularSemanaSanta(y, -1),
  'Día del Trabajo': (y) => new Date(y, 4, 1),
  'Glorias Navales': (y) => new Date(y, 4, 21),
  'San Pedro y Pablo': (y) => new Date(y, 5, 29),
  'Virgen del Carmen': (y) => new Date(y, 6, 16),
  'Asunción': (y) => new Date(y, 7, 15),
  'Fiestas Patrias': (y) => new Date(y, 8, 18),
  'Glorias del Ejército': (y) => new Date(y, 8, 19),
  'Encuentro Dos Mundos': (y) => new Date(y, 9, 12),
  'Inmaculada': (y) => new Date(y, 11, 8),
  'Navidad': (y) => new Date(y, 11, 25),
}

const feriadosCache: Record<number, Set<string>> = {}

export function esFeriado(fecha: Date): boolean {
  const y = fecha.getFullYear()
  if (!feriadosCache[y]) {
    feriadosCache[y] = new Set()
    // Incluye los años vecinos para capturar "lunes festivo" que caen en enero
    for (const ay of [y - 1, y, y + 1]) {
      Object.values(FERIADOS_FN).forEach((fn) => {
        const d = fn(ay)
        feriadosCache[y].add(d.toDateString())
        // Ley Sana: si el feriado cae día domingo, el lunes siguiente también es festivo
        if (d.getDay() === 0) {
          const lunes = new Date(d)
          lunes.setDate(lunes.getDate() + 1)
          feriadosCache[y].add(lunes.toDateString())
        }
      })
    }
  }
  return feriadosCache[y].has(fecha.toDateString())
}

export function esDiaHabil(fecha: Date): boolean {
  const diaSemana = fecha.getDay()
  if (diaSemana === 0 || diaSemana === 6) return false
  if (esFeriado(fecha)) return false
  return true
}
