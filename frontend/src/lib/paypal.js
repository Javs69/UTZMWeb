let paypalSdkPromise = null
let paypalSdkKey = ''

export function loadPaypalSdk({ clientId, currency }) {
  const normalizedCurrency = String(currency || 'MXN').toUpperCase()
  const nextKey = `${clientId}:${normalizedCurrency}`

  if (window.paypal && paypalSdkPromise && paypalSdkKey === nextKey) {
    return paypalSdkPromise
  }

  paypalSdkKey = nextKey
  paypalSdkPromise = new Promise((resolve, reject) => {
    const existing = document.getElementById('paypal-js-sdk')
    if (existing) {
      existing.remove()
    }

    const script = document.createElement('script')
    script.id = 'paypal-js-sdk'
    script.src = `https://www.paypal.com/sdk/js?client-id=${encodeURIComponent(clientId)}&currency=${encodeURIComponent(normalizedCurrency)}`
    script.async = true
    script.onload = () => {
      if (window.paypal) {
        resolve(window.paypal)
      } else {
        reject(new Error('No se pudo inicializar el SDK de PayPal.'))
      }
    }
    script.onerror = () => reject(new Error('No se pudo cargar el SDK de PayPal.'))
    document.body.appendChild(script)
  })

  return paypalSdkPromise
}
