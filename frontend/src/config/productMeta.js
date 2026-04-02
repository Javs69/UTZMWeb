export const PRODUCT_CONDITIONS = [
  { value: 'new', label: 'Nuevo' },
  { value: 'like_new', label: 'Como nuevo' },
  { value: 'good', label: 'Buen estado' },
  { value: 'fair', label: 'Uso visible' },
]

export function getConditionLabel(value) {
  return PRODUCT_CONDITIONS.find((item) => item.value === value)?.label || 'Buen estado'
}

export function getProductStatusLabel(value) {
  const labels = {
    active: 'Activa',
    paused: 'Pausada',
    deleted: 'Eliminada',
  }

  return labels[value] || 'Activa'
}
