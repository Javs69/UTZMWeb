import { formatCurrency, formatDate, groupCartBySeller } from '../../../frontend/src/utils/format.js'

describe('formatCurrency', () => {
  it('debe formatear centavos a pesos MXN', () => {
    const result = formatCurrency(10000)
    expect(result).toContain('100')
  })

  it('debe retornar valor con 0 para null', () => {
    const result = formatCurrency(null)
    expect(result).toContain('0')
  })

  it('debe retornar valor con 0 para undefined', () => {
    const result = formatCurrency(undefined)
    expect(result).toContain('0')
  })

  it('debe retornar valor con 0 para cero', () => {
    const result = formatCurrency(0)
    expect(result).toContain('0')
  })

  it('debe manejar valores negativos sin lanzar error', () => {
    const result = formatCurrency(-5000)
    expect(typeof result).toBe('string')
    expect(result.length).toBeGreaterThan(0)
  })

  it('debe dividir entre 100 para convertir centavos a pesos', () => {
    const result = formatCurrency(25000)
    expect(result).toContain('250')
  })
})

describe('formatDate', () => {
  it('debe retornar "Sin fecha" para null', () => {
    expect(formatDate(null)).toBe('Sin fecha')
  })

  it('debe retornar "Sin fecha" para undefined', () => {
    expect(formatDate(undefined)).toBe('Sin fecha')
  })

  it('debe retornar "Sin fecha" para string vacio', () => {
    expect(formatDate('')).toBe('Sin fecha')
  })

  it('debe formatear una fecha ISO valida a string legible', () => {
    const result = formatDate('2024-01-15')
    expect(typeof result).toBe('string')
    expect(result.length).toBeGreaterThan(0)
    expect(result).not.toBe('Sin fecha')
  })

  it('debe retornar el valor original si la fecha es invalida', () => {
    expect(formatDate('no-es-una-fecha')).toBe('no-es-una-fecha')
  })

  it('debe incluir hora cuando withTime es true', () => {
    const sinHora = formatDate('2024-06-01T12:30:00')
    const conHora = formatDate('2024-06-01T12:30:00', true)
    expect(conHora.length).toBeGreaterThan(sinHora.length)
  })

  it('debe incluir el año en el resultado', () => {
    const result = formatDate('2024-06-01')
    expect(result).toContain('2024')
  })
})

describe('groupCartBySeller', () => {
  it('debe agrupar items por seller_id', () => {
    const items = [
      { seller_id: 1, product_id: 10, qty: 2 },
      { seller_id: 2, product_id: 20, qty: 1 },
      { seller_id: 1, product_id: 30, qty: 3 },
    ]
    const result = groupCartBySeller(items)
    expect(Object.keys(result).length).toBe(2)
    expect(result['1'].length).toBe(2)
    expect(result['2'].length).toBe(1)
  })

  it('debe retornar objeto vacio para array vacio', () => {
    const result = groupCartBySeller([])
    expect(Object.keys(result).length).toBe(0)
  })

  it('debe convertir product_id a numero', () => {
    const items = [{ seller_id: '5', product_id: '99', qty: '3' }]
    const result = groupCartBySeller(items)
    expect(result['5'][0].product_id).toBe(99)
  })

  it('debe convertir qty a numero', () => {
    const items = [{ seller_id: '5', product_id: '99', qty: '3' }]
    const result = groupCartBySeller(items)
    expect(result['5'][0].qty).toBe(3)
  })

  it('debe usar seller_id como clave string', () => {
    const items = [{ seller_id: 42, product_id: 1, qty: 1 }]
    const result = groupCartBySeller(items)
    expect(result['42']).toBeDefined()
  })

  it('debe acumular multiples items del mismo vendedor', () => {
    const items = [
      { seller_id: 1, product_id: 1, qty: 1 },
      { seller_id: 1, product_id: 2, qty: 2 },
      { seller_id: 1, product_id: 3, qty: 3 },
    ]
    const result = groupCartBySeller(items)
    expect(result['1'].length).toBe(3)
  })
})
