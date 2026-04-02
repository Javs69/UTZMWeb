const path = require('path')
const { execFileSync } = require('child_process')
const { test, expect, request: playwrightRequest } = require('playwright/test')

const BASE_URL = 'http://127.0.0.1:8080'
const PASSWORD = 'Prueba12345'
const PROJECT_ROOT = path.resolve(__dirname, '..')

function uniqueId(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

function formatMxCurrency(amount) {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
  }).format(amount)
}

function runPhp(script) {
  return execFileSync('php', ['-r', script], {
    cwd: PROJECT_ROOT,
    encoding: 'utf8',
  }).trim()
}

function markUserEmailVerified(email) {
  const dbPath = JSON.stringify(path.join(PROJECT_ROOT, 'db.php'))
  const emailLiteral = JSON.stringify(String(email).trim().toLowerCase())
  const updatedRows = Number(
    runPhp(
      `require ${dbPath}; $stmt = $pdo->prepare('UPDATE users SET email_verified = true WHERE email = ?'); $stmt->execute([${emailLiteral}]); echo (string) $stmt->rowCount();`,
    ),
  )

  expect(updatedRows).toBeGreaterThan(0)
}

async function createSellerProduct({ sellerName, productName, price }) {
  const api = await playwrightRequest.newContext({ baseURL: BASE_URL })
  const email = `${uniqueId('seller')}@example.com`

  const registerResponse = await api.post('/backend/register.php', {
    data: {
      full_name: sellerName,
      email,
      password: PASSWORD,
    },
  })
  expect(registerResponse.ok()).toBeTruthy()

  const registerBody = await registerResponse.json()
  expect(registerBody.error).toBeFalsy()
  markUserEmailVerified(email)

  const loginResponse = await api.post('/backend/login.php', {
    data: { email, password: PASSWORD },
  })
  expect(loginResponse.ok()).toBeTruthy()

  const loginBody = await loginResponse.json()
  expect(loginBody.error).toBeFalsy()
  expect(loginBody.success).toBeTruthy()

  const createResponse = await api.post('/backend/create_product.php', {
    data: {
      name: productName,
      description: `Producto de prueba para ${productName}`,
      price,
      stock: 3,
      category: 1,
    },
  })
  expect(createResponse.ok()).toBeTruthy()

  const createBody = await createResponse.json()
  expect(createBody.error).toBeFalsy()
  expect(createBody.product_id).toBeTruthy()

  await api.dispose()

  return {
    productId: Number(createBody.product_id),
    productName,
    productPrice: formatMxCurrency(price),
  }
}

async function registerBuyer(page, fullName = 'Comprador E2E') {
  const email = `${uniqueId('buyer')}@example.com`

  await page.goto('/app/')
  await page.locator('#profileBtn').click()
  await page.locator('#profileMenu').getByRole('button', { name: /crear cuenta/i }).click()

  const authModal = page.locator('.auth-modal')
  await authModal.locator('input[type="text"]').fill(fullName)
  await authModal.locator('input[type="email"]').fill(email)
  await authModal.locator('input[type="password"]').fill(PASSWORD)
  await authModal.locator('.auth-modal__submit').click()
  await expect(authModal).toContainText(/verificar correo/i)

  // El registro ahora exige codigo por correo. Para mantener el foco del E2E
  // en compra y checkout, el test marca la cuenta como verificada en la DB.
  markUserEmailVerified(email)
  await page.getByRole('button', { name: /volver a iniciar sesion/i }).click()
  await authModal.locator('input[type="password"]').fill(PASSWORD)
  await authModal.locator('.auth-modal__submit').click()

  await expect(page.locator('.card.card--uniform').first()).toBeVisible()

  return { email }
}

async function addProductToCart(page, productId, expectedCartCount) {
  await page.goto(`/app/producto.html?id=${productId}`)
  await expect(page.getByRole('button', { name: /agregar al carrito/i })).toBeVisible()
  await page.getByRole('button', { name: /agregar al carrito/i }).click()
  await expect(page.locator('#cartBtn .badge')).toHaveText(String(expectedCartCount))
}

async function openCheckout(page) {
  await page.locator('#cartBtn').click()
  await page.getByRole('link', { name: /^Pagar$/ }).click()
  await expect(page).toHaveURL(/\/app\/pagar\.html$/)
}

async function payWithCash(page) {
  await page.locator('.checkout-method-option').nth(1).click()
  await page.getByRole('button', { name: /confirmar pago en efectivo/i }).click()
  await expect(page).toHaveURL(/\/app\/pedidos\.html$/)
}

async function mockPaypalSdk(page) {
  await page.route('https://www.paypal.com/sdk/js**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/javascript',
      body: `
        window.paypal = {
          Buttons: function(config) {
            return {
              isEligible: function() { return true; },
              render: async function(container) {
                container.innerHTML = '';
                var button = document.createElement('button');
                button.type = 'button';
                button.textContent = 'Pagar con PayPal';
                button.className = 'mock-paypal-button';
                button.addEventListener('click', async function() {
                  if (config.createOrder) {
                    await config.createOrder({}, {
                      order: {
                        create: async function() {
                          return 'MOCK-PAYPAL-ORDER';
                        }
                      }
                    });
                  }

                  if (config.onApprove) {
                    await config.onApprove(
                      { orderID: 'MOCK-PAYPAL-ORDER' },
                      {
                        order: {
                          capture: async function() {
                            return { id: 'MOCK-PAYPAL-CAPTURE' };
                          }
                        }
                      }
                    );
                  }
                });
                container.appendChild(button);
              },
              close: async function() {}
            };
          }
        };
      `,
    })
  })
}

test('completa compra con PayPal y termina en pedidos', async ({ page }) => {
  const product = await createSellerProduct({
    sellerName: 'Vendedor PayPal',
    productName: `Producto PayPal ${uniqueId('item')}`,
    price: 1234,
  })

  await mockPaypalSdk(page)
  await registerBuyer(page)
  await addProductToCart(page, product.productId, 1)
  await openCheckout(page)

  await expect(page.locator('.mock-paypal-button')).toBeVisible()
  await page.locator('.mock-paypal-button').click()

  await expect(page).toHaveURL(/\/app\/pedidos\.html$/)
  const purchases = page.locator('.orders-group').first()
  await expect(purchases.locator('.order-card')).toHaveCount(1)
  await expect(purchases).toContainText(product.productPrice)
  await expect(purchases).toContainText(/paid/i)
  await expect(purchases).toContainText(/paypal/i)
})

test('crea una orden por vendedor cuando el carrito mezcla productos de distintos vendedores', async ({ page }) => {
  const firstProduct = await createSellerProduct({
    sellerName: 'Vendedor Uno',
    productName: `Producto Uno ${uniqueId('item')}`,
    price: 1111,
  })
  const secondProduct = await createSellerProduct({
    sellerName: 'Vendedor Dos',
    productName: `Producto Dos ${uniqueId('item')}`,
    price: 2222,
  })

  await registerBuyer(page)
  await addProductToCart(page, firstProduct.productId, 1)
  await addProductToCart(page, secondProduct.productId, 2)
  await openCheckout(page)
  await payWithCash(page)

  const purchases = page.locator('.orders-group').first()
  await expect(purchases.locator('.order-card')).toHaveCount(2)
  await expect(purchases).toContainText('2 pedidos')
  await expect(purchases).toContainText(firstProduct.productPrice)
  await expect(purchases).toContainText(secondProduct.productPrice)
  await expect(purchases).toContainText(/efectivo/i)
  await expect(purchases).toContainText(/paid/i)
})
