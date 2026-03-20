import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useApp } from '@/context/AppContext'

const INITIAL_LOGIN = { email: '', password: '' }
const INITIAL_REGISTER = { full_name: '', email: '', password: '' }

export default function AuthModal() {
  const { authModal, closeAuth, login, openAuth, register } = useApp()
  const navigate = useNavigate()
  const location = useLocation()
  const [loginForm, setLoginForm] = useState(INITIAL_LOGIN)
  const [registerForm, setRegisterForm] = useState(INITIAL_REGISTER)
  const [message, setMessage] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (!authModal.open) {
      setMessage('')
      setIsSubmitting(false)
    }
  }, [authModal.open])

  if (!authModal.open) {
    return null
  }

  const isLogin = authModal.mode === 'login'

  async function handleSubmit(event) {
    event.preventDefault()
    setMessage('')
    setIsSubmitting(true)

    try {
      if (isLogin) {
        await login(loginForm)
      } else {
        await register(registerForm)
      }

      const params = new URLSearchParams(location.search)
      const nextPath = params.get('next') || location.pathname
      closeAuth()
      navigate(nextPath, { replace: true })
    } catch (error) {
      setMessage(error.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="modal" onClick={closeAuth}>
      <div className="modal-content auth-modal" onClick={(event) => event.stopPropagation()}>
        <button className="modal-close" type="button" onClick={closeAuth}>
          &times;
        </button>

        <div className="auth-modal__header">
          <h2 className="auth-modal__title">{isLogin ? 'Iniciar sesión' : 'Crear cuenta'}</h2>
          <p className="auth-modal__subtitle">
            {isLogin
              ? 'Accede a tu cuenta para seguir comprando.'
              : 'Crea tu cuenta para publicar, comprar y dar seguimiento a tus pedidos.'}
          </p>
        </div>

        <form className="form auth-modal__form" onSubmit={handleSubmit}>
          {!isLogin ? (
            <div className="auth-modal__field">
              <input
                type="text"
                placeholder="Tu nombre"
                value={registerForm.full_name}
                onChange={(event) =>
                  setRegisterForm((current) => ({ ...current, full_name: event.target.value }))
                }
              />
            </div>
          ) : null}

          <div className="auth-modal__field">
            <input
              type="email"
              placeholder="Correo"
              value={isLogin ? loginForm.email : registerForm.email}
              onChange={(event) =>
                isLogin
                  ? setLoginForm((current) => ({ ...current, email: event.target.value }))
                  : setRegisterForm((current) => ({ ...current, email: event.target.value }))
              }
            />
          </div>

          <div className="auth-modal__field">
            <input
              type="password"
              placeholder="Contraseña"
              value={isLogin ? loginForm.password : registerForm.password}
              onChange={(event) =>
                isLogin
                  ? setLoginForm((current) => ({ ...current, password: event.target.value }))
                  : setRegisterForm((current) => ({ ...current, password: event.target.value }))
              }
            />
          </div>

          {message ? (
            <div className="modal-feedback is-error" role="alert">
              {message}
            </div>
          ) : null}

          <button className="btn auth-modal__submit" type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Procesando...' : isLogin ? 'Entrar' : 'Crear cuenta'}
          </button>
        </form>

        <div className="auth-switch auth-modal__footer">
          <button
            className="text-link"
            type="button"
            onClick={() => {
              setMessage('')
              if (isLogin) {
                setRegisterForm(INITIAL_REGISTER)
                openAuth('register')
              } else {
                setLoginForm(INITIAL_LOGIN)
                openAuth('login')
              }
            }}
          >
            {isLogin ? '¿No tienes cuenta? Regístrate' : '¿Ya tienes cuenta? Inicia sesión'}
          </button>
          <button className="text-link" type="button" onClick={closeAuth}>
            Cerrar
          </button>
        </div>
      </div>
    </div>
  )
}
