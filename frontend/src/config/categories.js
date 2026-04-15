export const CATEGORIES = [
  { id: 1, slug: 'electronica', label: 'Electrónica' },
  { id: 2, slug: 'papeleria', label: 'Papelería' },
  { id: 3, slug: 'vehiculos', label: 'Vehículos' },
  { id: 4, slug: 'electrodomesticos', label: 'Electrodomésticos' },
  { id: 5, slug: 'moda', label: 'Moda' },
  { id: 6, slug: 'juegos', label: 'Juegos y juguetes' },
  { id: 7, slug: 'salud', label: 'Salud y equipo médico' },
  { id: 8, slug: 'deporte', label: 'Deporte' },
  { id: 9, slug: 'herramientas', label: 'Herramientas' },
]

export function getCategoryLabel(value, categories = CATEGORIES) {
  const category = categories.find((item) => Number(item.id) === Number(value))
  return category?.label ?? 'Sin categoría'
}

// Maps DB rows [{id, name}] → [{id, slug, label}]
// Known IDs reuse the static entry; unknown ones derive label from name.
export function normalizeCategoriesFromDb(dbRows) {
  return dbRows.map((row) => {
    const known = CATEGORIES.find((c) => c.id === row.id)
    if (known) return known
    const label = row.name.charAt(0).toUpperCase() + row.name.slice(1)
    return { id: row.id, slug: row.name, label }
  })
}
