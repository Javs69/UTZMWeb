import {
  PRODUCT_CONDITIONS,
  getConditionLabel,
  getProductStatusLabel,
} from '../../../frontend/src/config/productMeta.js'

describe('PRODUCT_CONDITIONS', () => {
  it('debe ser un array', () => {
    expect(Array.isArray(PRODUCT_CONDITIONS)).toBe(true)
  })

  it('debe tener exactamente 4 condiciones', () => {
    expect(PRODUCT_CONDITIONS.length).toBe(4)
  })

  it('cada condicion debe tener "value" y "label"', () => {
    for (const condition of PRODUCT_CONDITIONS) {
      expect(typeof condition.value).toBe('string')
      expect(typeof condition.label).toBe('string')
    }
  })

  it('debe incluir la condicion "new"', () => {
    const values = PRODUCT_CONDITIONS.map((c) => c.value)
    expect(values).toContain('new')
  })

  it('debe incluir la condicion "like_new"', () => {
    const values = PRODUCT_CONDITIONS.map((c) => c.value)
    expect(values).toContain('like_new')
  })

  it('debe incluir la condicion "good"', () => {
    const values = PRODUCT_CONDITIONS.map((c) => c.value)
    expect(values).toContain('good')
  })

  it('debe incluir la condicion "fair"', () => {
    const values = PRODUCT_CONDITIONS.map((c) => c.value)
    expect(values).toContain('fair')
  })
})

describe('getConditionLabel', () => {
  it('debe retornar "Nuevo" para "new"', () => {
    expect(getConditionLabel('new')).toBe('Nuevo')
  })

  it('debe retornar "Como nuevo" para "like_new"', () => {
    expect(getConditionLabel('like_new')).toBe('Como nuevo')
  })

  it('debe retornar "Buen estado" para "good"', () => {
    expect(getConditionLabel('good')).toBe('Buen estado')
  })

  it('debe retornar "Uso visible" para "fair"', () => {
    expect(getConditionLabel('fair')).toBe('Uso visible')
  })

  it('debe retornar "Buen estado" para valor desconocido', () => {
    expect(getConditionLabel('desconocido')).toBe('Buen estado')
  })

  it('debe retornar "Buen estado" para string vacio', () => {
    expect(getConditionLabel('')).toBe('Buen estado')
  })

  it('debe retornar "Buen estado" para null', () => {
    expect(getConditionLabel(null)).toBe('Buen estado')
  })

  it('debe retornar "Buen estado" para undefined', () => {
    expect(getConditionLabel(undefined)).toBe('Buen estado')
  })
})

describe('getProductStatusLabel', () => {
  it('debe retornar "Activa" para "active"', () => {
    expect(getProductStatusLabel('active')).toBe('Activa')
  })

  it('debe retornar "Pausada" para "paused"', () => {
    expect(getProductStatusLabel('paused')).toBe('Pausada')
  })

  it('debe retornar "Eliminada" para "deleted"', () => {
    expect(getProductStatusLabel('deleted')).toBe('Eliminada')
  })

  it('debe retornar "Activa" como fallback para valor desconocido', () => {
    expect(getProductStatusLabel('unknown')).toBe('Activa')
  })

  it('debe retornar "Activa" como fallback para string vacio', () => {
    expect(getProductStatusLabel('')).toBe('Activa')
  })

  it('debe retornar "Activa" como fallback para undefined', () => {
    expect(getProductStatusLabel(undefined)).toBe('Activa')
  })
})
