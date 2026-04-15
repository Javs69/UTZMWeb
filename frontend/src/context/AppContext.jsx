import { createContext, useContext, useEffect, useLayoutEffect, useMemo, useState } from 'react'
import { authService, notificationService, productService } from '@/services'
import { clearAuthToken } from '@/services/api'
import { CATEGORIES, normalizeCategoriesFromDb } from '@/config/categories'
import {
  getStorageUserKey,
  migrateGuestCollection,
  readCollection,
  writeCollection,
} from '@/utils/storage'

const CART_STORAGE_KEY = 'UTZM_CART_MAP'
const FAVORITES_STORAGE_KEY = 'UTZM_FAVORITES_MAP'
const THEME_STORAGE_KEY = 'UTZM_THEME'

const AppContext = createContext(null)

export function AppProvider({ children }) {
  const [session, setSession] = useState({ logged_in: false, user: null })
  const [sessionReady, setSessionReady] = useState(false)
  const [authModal, setAuthModal] = useState({ open: false, mode: 'login', payload: null })
  const [cartItems, setCartItems] = useState([])
  const [favorites, setFavorites] = useState([])
  const [notifications, setNotifications] = useState([])
  const [unreadNotifications, setUnreadNotifications] = useState(0)
  const [theme, setTheme] = useState(() => localStorage.getItem(THEME_STORAGE_KEY) || 'light')
  const [categories, setCategories] = useState(CATEGORIES)

  const storageUserKey = getStorageUserKey(session.user)

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    localStorage.setItem(THEME_STORAGE_KEY, theme)
  }, [theme])

  useLayoutEffect(() => {
    if (session.user?.id) {
      migrateGuestCollection(CART_STORAGE_KEY, storageUserKey)
      migrateGuestCollection(FAVORITES_STORAGE_KEY, storageUserKey)
    }

    setCartItems(readCollection(CART_STORAGE_KEY, storageUserKey))
    setFavorites(readCollection(FAVORITES_STORAGE_KEY, storageUserKey))
  }, [session.user?.id, storageUserKey])

  useEffect(() => {
    writeCollection(CART_STORAGE_KEY, storageUserKey, cartItems)
  }, [cartItems, storageUserKey])

  useEffect(() => {
    writeCollection(FAVORITES_STORAGE_KEY, storageUserKey, favorites)
  }, [favorites, storageUserKey])

  async function refreshSession() {
    try {
      const data = await authService.getSession()
      if (!data.logged_in) {
        clearAuthToken()
      }
      setSession(data)
      return data
    } catch {
      const fallback = { logged_in: false, user: null }
      clearAuthToken()
      setSession(fallback)
      return fallback
    } finally {
      setSessionReady(true)
    }
  }

  async function refreshNotifications(limit = 12) {
    if (!session.logged_in) {
      setNotifications([])
      setUnreadNotifications(0)
      return { notifications: [], unread_count: 0 }
    }

    try {
      const data = await notificationService.getNotifications(limit)
      setNotifications(Array.isArray(data.notifications) ? data.notifications : [])
      setUnreadNotifications(Number(data.unread_count) || 0)
      return data
    } catch {
      return { notifications: [], unread_count: 0 }
    }
  }

  useEffect(() => {
    refreshSession()
  }, [])

  useEffect(() => {
    productService.getCategories()
      .then((data) => {
        if (Array.isArray(data.categories) && data.categories.length) {
          setCategories(normalizeCategoriesFromDb(data.categories))
        }
      })
      .catch(() => {})
  }, [])

  useEffect(() => {
    if (!session.logged_in) {
      setNotifications([])
      setUnreadNotifications(0)
      return undefined
    }

    refreshNotifications()
    const timer = window.setInterval(() => {
      refreshNotifications()
    }, 20000)

    return () => window.clearInterval(timer)
  }, [session.logged_in, session.user?.id])

  async function login(payload) {
    clearAuthToken()
    const data = await authService.login(payload)
    if (data.two_factor_required) {
      return data
    }
    await refreshSession()
    return data
  }

  async function register(payload) {
    await authService.register(payload)
    return refreshSession()
  }

  async function logout() {
    try {
      await authService.logout()
    } catch {
      // Ignore logout transport errors and clear local session anyway.
    }
    clearAuthToken()
    setSession({ logged_in: false, user: null })
    setCartItems(readCollection(CART_STORAGE_KEY, 'guest'))
    setFavorites(readCollection(FAVORITES_STORAGE_KEY, 'guest'))
    setNotifications([])
    setUnreadNotifications(0)
  }

  function openAuth(mode = 'login', payload = null) {
    setAuthModal({ open: true, mode, payload })
  }

  function closeAuth() {
    setAuthModal((current) => ({ ...current, open: false, payload: null }))
  }

  function addToCart(product) {
    setCartItems((current) => {
      const existing = current.find((item) => Number(item.product_id) === Number(product.product_id))
      if (existing) {
        return current.map((item) =>
          Number(item.product_id) === Number(product.product_id)
            ? { ...item, qty: Math.min(99, Number(item.qty) + 1) }
            : item,
        )
      }

      return [...current, { ...product, qty: 1 }]
    })
  }

  function setCartQuantity(productId, qty) {
    const parsedQty = Math.max(1, Math.min(99, Number(qty) || 1))
    setCartItems((current) =>
      current.map((item) =>
        Number(item.product_id) === Number(productId) ? { ...item, qty: parsedQty } : item,
      ),
    )
  }

  function removeFromCart(productId) {
    setCartItems((current) =>
      current.filter((item) => Number(item.product_id) !== Number(productId)),
    )
  }

  function clearCart() {
    setCartItems([])
  }

  function replaceCart(items) {
    setCartItems(Array.isArray(items) ? items : [])
  }

  function toggleFavorite(product) {
    setFavorites((current) => {
      const exists = current.some((item) => Number(item.product_id) === Number(product.product_id))
      if (exists) {
        return current.filter((item) => Number(item.product_id) !== Number(product.product_id))
      }

      return [...current, product]
    })
  }

  function isFavorite(productId) {
    return favorites.some((item) => Number(item.product_id) === Number(productId))
  }

  async function markNotificationsRead(ids) {
    const normalizedIds = Array.isArray(ids) ? ids.map((id) => Number(id)).filter((id) => id > 0) : []
    if (!normalizedIds.length) {
      return
    }

    await notificationService.markRead(normalizedIds)
    setNotifications((current) =>
      current.map((item) =>
        normalizedIds.includes(Number(item.id)) ? { ...item, is_read: true } : item,
      ),
    )
    setUnreadNotifications((current) => Math.max(0, current - normalizedIds.length))
  }

  async function markAllNotificationsRead() {
    await notificationService.markAllRead()
    setNotifications((current) => current.map((item) => ({ ...item, is_read: true })))
    setUnreadNotifications(0)
  }

  const value = useMemo(
    () => ({
      session,
      sessionReady,
      isLoggedIn: Boolean(session.logged_in),
      userRole: session.user?.role || 'customer',
      isSupport: ['support', 'admin'].includes(session.user?.role || ''),
      isAdmin: session.user?.role === 'admin',
      authModal,
      cartItems,
      favorites,
      notifications,
      unreadNotifications,
      categories,
      theme,
      setTheme,
      login,
      register,
      logout,
      refreshSession,
      refreshNotifications,
      openAuth,
      closeAuth,
      addToCart,
      setCartQuantity,
      removeFromCart,
      clearCart,
      replaceCart,
      toggleFavorite,
      isFavorite,
      markNotificationsRead,
      markAllNotificationsRead,
    }),
    [authModal, cartItems, categories, favorites, notifications, session, sessionReady, theme, unreadNotifications],
  )

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

export function useApp() {
  const context = useContext(AppContext)
  if (!context) {
    throw new Error('useApp must be used inside AppProvider')
  }
  return context
}
