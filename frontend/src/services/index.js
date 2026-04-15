import { groupCartBySeller } from '@/utils/format'
import { request } from './api'

export const authService = {
  getSession: () => request('/backend/session.php'),
  login: (payload) =>
    request('/backend/login.php', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  register: (payload) =>
    request('/backend/register.php', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  verifyEmailCode: (payload) =>
    request('/backend/verify_email_code.php', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  verifyLoginCode: (payload) =>
    request('/backend/verify_login_2fa.php', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  resendEmailCode: (payload) =>
    request('/backend/resend_email_code.php', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  requestPasswordReset: (payload) =>
    request('/backend/request_password_reset.php', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  resetPassword: (payload) =>
    request('/backend/reset_password.php', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  logout: () => request('/backend/logout.php'),
}

export const productService = {
  getProducts: ({
    query = '',
    category = '',
    sort = 'recent',
    availability = 'in_stock',
    minPrice = '',
    maxPrice = '',
    condition = '',
    featured = false,
    ids = [],
    page = 1,
    pageSize = 12,
  } = {}) => {
    const params = new URLSearchParams()
    if (query) params.set('q', query)
    if (category) params.set('category', category)
    if (sort) params.set('sort', sort)
    if (availability) params.set('availability', availability)
    if (minPrice !== '' && minPrice !== null) params.set('min_price', String(minPrice))
    if (maxPrice !== '' && maxPrice !== null) params.set('max_price', String(maxPrice))
    if (condition) params.set('condition', condition)
    if (featured) params.set('featured', '1')
    if (Array.isArray(ids) && ids.length) params.set('ids', ids.join(','))
    if (page > 1) params.set('page', String(page))
    if (pageSize) params.set('page_size', String(pageSize))
    const suffix = params.toString() ? `?${params}` : ''
    return request(`/backend/get_products.php${suffix}`)
  },
  getProduct: (id) => request(`/backend/get_product.php?id=${id}`),
  getQnA: (productId) => request(`/backend/qna_get.php?product_id=${productId}`),
  askQuestion: (payload) =>
    request('/backend/qna_ask.php', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  answerQuestion: (payload) =>
    request('/backend/qna_answer.php', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  createProduct: (payload) =>
    request('/backend/create_product.php', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  uploadProductImage: async ({ productId, file }) => {
    const formData = new FormData()
    formData.append('product_id', productId)
    formData.append('imagen', file)
    return request('/backend/upload_image.php', {
      method: 'POST',
      body: formData,
    })
  },
  getMyProducts: () => request('/backend/get_my_products.php'),
  getProductImages: (productId) =>
    request(`/backend/get_product_images.php?product_id=${encodeURIComponent(productId)}`),
  deleteProductImage: (imageId) =>
    request('/backend/delete_product_image.php', {
      method: 'POST',
      body: JSON.stringify({ image_id: imageId }),
    }),
  updateProduct: (payload) =>
    request('/backend/update_product.php', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  runProductAction: (payload) =>
    request('/backend/product_actions.php', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  modProductCategory: (payload) =>
    request('/backend/mod_product_category.php', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
}

export const accountService = {
  getPublicProfile: (
    userId,
    {
      reviewsPage = 1,
      reviewsPageSize = 6,
      productsPage = 1,
      productsPageSize = 8,
    } = {},
  ) => {
    const params = new URLSearchParams({
      user_id: String(userId),
      reviews_page: String(reviewsPage),
      reviews_page_size: String(reviewsPageSize),
      products_page: String(productsPage),
      products_page_size: String(productsPageSize),
    })
    return request(`/backend/get_public_profile.php?${params}`)
  },
  updateProfile: (payload) =>
    request('/backend/update_user.php', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  uploadAvatar: (file) => {
    const formData = new FormData()
    formData.append('avatar', file)
    return request('/backend/upload_avatar.php', {
      method: 'POST',
      body: formData,
    })
  },
  getPaymentMethods: () => request('/backend/payment_methods.php'),
  deletePaymentMethod: (id) =>
    request('/backend/delete_payment_method.php', {
      method: 'POST',
      body: JSON.stringify({ id }),
    }),
  getTransactions: (role = 'buyer') =>
    request(`/backend/transactions.php?role=${encodeURIComponent(role)}`),
}

export const paymentService = {
  getPaypalConfig: () => request('/backend/paypal_config.php'),
}

export const orderService = {
  getOrders: (limit = 100) => request(`/backend/my_orders.php?limit=${limit}`),
  createOrder: (payload) =>
    request('/backend/create_order.php', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  payOrder: (payload) =>
    request('/backend/pay_order.php', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  markDelivered: ({ orderId, notes = '', evidence = null }) => {
    const formData = new FormData()
    formData.append('order_id', orderId)
    if (notes) formData.append('notes', notes)
    if (evidence) formData.append('evidence', evidence)
    return request('/backend/mark_delivered.php', {
      method: 'POST',
      body: formData,
    })
  },
  cancelOrder: (orderId) =>
    request('/backend/cancel_order.php', {
      method: 'POST',
      body: JSON.stringify({ order_id: Number(orderId) }),
    }),
  getOrderReviews: (orderId) =>
    request(`/backend/order_reviews.php?order_id=${encodeURIComponent(orderId)}`),
  saveOrderReview: (payload) =>
    request('/backend/order_reviews.php', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  // Crea las órdenes en DB sin procesar pago. Cancela las creadas si falla alguna.
  createCheckoutOrders: async ({ cartItems }) => {
    const grouped = groupCartBySeller(cartItems)
    const createdOrders = []
    try {
      for (const [sellerId, items] of Object.entries(grouped)) {
        const order = await orderService.createOrder({
          seller_id: Number(sellerId),
          items,
        })
        createdOrders.push(order)
      }
    } catch (error) {
      await Promise.allSettled(createdOrders.map((o) => orderService.cancelOrder(o.order_id)))
      throw error
    }
    return createdOrders
  },

  // Paga una lista de órdenes ya creadas. Cancela las no pagadas si falla alguna.
  payCheckoutOrders: async ({ orders, paymentMeta }) => {
    const paidIds = new Set()
    try {
      for (const order of orders) {
        await orderService.payOrder({
          order_id: order.order_id,
          amount_cents: order.total_cents,
          payment_method_id: paymentMeta.payment_method_id ?? 0,
          payment_method_type: paymentMeta.type,
          payment_method_label: paymentMeta.label,
          payment_method_last4: paymentMeta.last4,
          cvv: paymentMeta.cvv,
        })
        paidIds.add(order.order_id)
      }
    } catch (error) {
      const unpaid = orders.filter((o) => !paidIds.has(o.order_id))
      await Promise.allSettled(unpaid.map((o) => orderService.cancelOrder(o.order_id)))
      throw error
    }
  },

  checkoutCart: async ({ cartItems, paymentMeta }) => {
    const orders = await orderService.createCheckoutOrders({ cartItems })
    await orderService.payCheckoutOrders({ orders, paymentMeta })
  },
}

export const messageService = {
  getMessages: ({ orderId, sinceId = 0 }) => {
    const params = new URLSearchParams({ order_id: String(orderId) })
    if (sinceId > 0) params.set('since_id', String(sinceId))
    return request(`/backend/order_messages.php?${params}`)
  },
  sendMessage: ({ orderId, body, attachment }) => {
    const formData = new FormData()
    formData.append('order_id', String(orderId))
    if (body) formData.append('body', body)
    if (attachment) formData.append('attachment', attachment)
    return request('/backend/order_messages.php', {
      method: 'POST',
      body: formData,
    })
  },
}

export const supportService = {
  getTickets: ({ status = 'all', assignment = 'all', q = '', limit = 60 } = {}) => {
    const params = new URLSearchParams()
    if (status && status !== 'all') params.set('status', status)
    if (assignment && assignment !== 'all') params.set('assignment', assignment)
    if (q) params.set('q', q)
    if (limit) params.set('limit', String(limit))
    const suffix = params.toString() ? `?${params}` : ''
    return request(`/backend/support_tickets.php${suffix}`)
  },
  createTicket: (payload) =>
    request('/backend/support_tickets.php', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  getTicket: (ticketId) =>
    request(`/backend/support_messages.php?ticket_id=${encodeURIComponent(ticketId)}`),
  sendMessage: (payload) =>
    request('/backend/support_messages.php', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  updateTicket: (payload) =>
    request('/backend/support_ticket_admin.php', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  getAgents: () => request('/backend/support_agents.php'),
  updateStaffRole: (payload) =>
    request('/backend/support_staff.php', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  updateSellerVerification: (payload) =>
    request('/backend/support_staff.php', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
}

export const notificationService = {
  getNotifications: (limit = 12) =>
    request(`/backend/notifications.php?limit=${encodeURIComponent(limit)}`),
  markRead: (ids) =>
    request('/backend/notifications.php', {
      method: 'POST',
      body: JSON.stringify({ action: 'mark_read', ids }),
    }),
  markAllRead: () =>
    request('/backend/notifications.php', {
      method: 'POST',
      body: JSON.stringify({ action: 'mark_all_read' }),
    }),
}
