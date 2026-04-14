import {
  getStorageUserKey,
  readCollection,
  writeCollection,
  migrateGuestCollection,
} from '../../../frontend/src/utils/storage.js'

const TEST_KEY = '__karma_unit_test__'

describe('getStorageUserKey', () => {
  it('debe retornar el id del usuario como string', () => {
    expect(getStorageUserKey({ id: 42 })).toBe('42')
  })

  it('debe retornar "guest" para null', () => {
    expect(getStorageUserKey(null)).toBe('guest')
  })

  it('debe retornar "guest" para undefined', () => {
    expect(getStorageUserKey(undefined)).toBe('guest')
  })

  it('debe retornar "guest" para objeto sin id', () => {
    expect(getStorageUserKey({})).toBe('guest')
  })

  it('debe retornar "guest" para id falsy (0)', () => {
    expect(getStorageUserKey({ id: 0 })).toBe('guest')
  })

  it('debe convertir id numerico a string', () => {
    const key = getStorageUserKey({ id: 999 })
    expect(typeof key).toBe('string')
    expect(key).toBe('999')
  })
})

describe('readCollection', () => {
  afterEach(() => {
    localStorage.removeItem(TEST_KEY)
  })

  it('debe retornar array vacio si no existe la clave', () => {
    expect(readCollection(TEST_KEY, 'guest')).toEqual([])
  })

  it('debe retornar array vacio si la clave del usuario no existe', () => {
    writeCollection(TEST_KEY, 'otroUsuario', [{ id: 1 }])
    expect(readCollection(TEST_KEY, 'guest')).toEqual([])
  })

  it('debe retornar los items guardados', () => {
    const items = [{ id: 1 }, { id: 2 }]
    writeCollection(TEST_KEY, 'guest', items)
    expect(readCollection(TEST_KEY, 'guest')).toEqual(items)
  })
})

describe('writeCollection', () => {
  afterEach(() => {
    localStorage.removeItem(TEST_KEY)
  })

  it('debe persistir items en localStorage', () => {
    const items = [{ product_id: 10, qty: 1 }]
    writeCollection(TEST_KEY, 'user1', items)
    expect(readCollection(TEST_KEY, 'user1')).toEqual(items)
  })

  it('debe separar colecciones por usuario en la misma clave', () => {
    writeCollection(TEST_KEY, 'user1', [{ id: 10 }])
    writeCollection(TEST_KEY, 'user2', [{ id: 20 }, { id: 21 }])
    expect(readCollection(TEST_KEY, 'user1').length).toBe(1)
    expect(readCollection(TEST_KEY, 'user2').length).toBe(2)
  })

  it('debe guardar array vacio cuando items es null', () => {
    writeCollection(TEST_KEY, 'guest', null)
    expect(readCollection(TEST_KEY, 'guest')).toEqual([])
  })

  it('debe sobreescribir items anteriores del mismo usuario', () => {
    writeCollection(TEST_KEY, 'user1', [{ id: 1 }, { id: 2 }])
    writeCollection(TEST_KEY, 'user1', [{ id: 99 }])
    const result = readCollection(TEST_KEY, 'user1')
    expect(result.length).toBe(1)
    expect(result[0].id).toBe(99)
  })
})

describe('migrateGuestCollection', () => {
  const MIGRATE_KEY = '__karma_migrate_test__'

  afterEach(() => {
    localStorage.removeItem(MIGRATE_KEY)
  })

  it('debe mover items de guest al usuario destino', () => {
    writeCollection(MIGRATE_KEY, 'guest', [{ id: 1 }, { id: 2 }])
    migrateGuestCollection(MIGRATE_KEY, 'user42')
    expect(readCollection(MIGRATE_KEY, 'user42')).toEqual([{ id: 1 }, { id: 2 }])
  })

  it('debe vaciar la coleccion guest tras migrar', () => {
    writeCollection(MIGRATE_KEY, 'guest', [{ id: 1 }])
    migrateGuestCollection(MIGRATE_KEY, 'user42')
    expect(readCollection(MIGRATE_KEY, 'guest')).toEqual([])
  })

  it('no debe migrar si el usuario ya tiene items propios', () => {
    writeCollection(MIGRATE_KEY, 'guest', [{ id: 1 }])
    writeCollection(MIGRATE_KEY, 'user42', [{ id: 99 }])
    migrateGuestCollection(MIGRATE_KEY, 'user42')
    expect(readCollection(MIGRATE_KEY, 'user42')).toEqual([{ id: 99 }])
  })

  it('no debe hacer nada si guest esta vacio', () => {
    migrateGuestCollection(MIGRATE_KEY, 'user42')
    expect(readCollection(MIGRATE_KEY, 'user42')).toEqual([])
  })
})
