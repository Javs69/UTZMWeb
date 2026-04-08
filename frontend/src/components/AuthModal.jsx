import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useApp } from '@/context/AppContext'
import { authService } from '@/services'

const INITIAL_LOGIN = { email: '', password: '' }
const INITIAL_REGISTER = { full_name: '', email: '', password: '' }
const INITIAL_VERIFY = { email: '', code: '' }
const INITIAL_LOGIN_2FA = { email: '', code: '' }
const INITIAL_FORGOT = { email: '' }
const INITIAL_RESET = { email: '', code: '', password: '' }

export default function AuthModal() {
  const { authModal, closeAuth, login, openAuth, refreshSession } = useApp()
  const navigate = useNavigate()
  const location = useLocation()
  const [loginForm, setLoginForm] = useState(INITIAL_LOGIN)
  const [registerForm, setRegisterForm] = useState(INITIAL_REGISTER)
  const [verifyForm, setVerifyForm] = useState(INITIAL_VERIFY)
  const [login2faForm, setLogin2faForm] = useState(INITIAL_LOGIN_2FA)
  const [forgotForm, setForgotForm] = useState(INITIAL_FORGOT)
  const [resetForm, setResetForm] = useState(INITIAL_RESET)
  const [message, setMessage] = useState('')
  const [messageType, setMessageType] = useState('error')
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (!authModal.open) {
      setMessage('')
      setMessageType('error')
      setIsSubmitting(false)
    }
  }, [authModal.open])

  useEffect(() => {
    const email = authModal.payload?.email ?? ''

    if (authModal.mode === 'login' && email) {
      setLoginForm((current) => ({ ...current, email }))
    }

    if (authModal.mode === 'verify') {
      setVerifyForm({ email, code: '' })
    }

    if (authModal.mode === 'login2fa') {
      setLogin2faForm({ email, code: '' })
    }

    if (authModal.mode === 'forgot') {
      setForgotForm({ email })
    }

    if (authModal.mode === 'reset') {
      setResetForm({ email, code: '', password: '' })
    }
  }, [authModal.mode, authModal.payload?.email])

  if (!authModal.open) {
    return null
  }

  const isLogin = authModal.mode === 'login'
  const isRegister = authModal.mode === 'register'
  const isVerify = authModal.mode === 'verify'
  const isLogin2fa = authModal.mode === 'login2fa'
  const isForgot = authModal.mode === 'forgot'
  const isReset = authModal.mode === 'reset'

  function setFeedback(type, text) {
    setMessage(text)
    setMessageType(type)
  }

  function clearFeedback() {
    setMessage('')
    setMessageType('error')
  }

  function getNextPath() {
    const params = new URLSearchParams(location.search)
    return params.get('next') || location.pathname
  }

  async function handleSubmit(event) {
    event.preventDefault()
    clearFeedback()
    setIsSubmitting(true)

    try {
      if (isLogin) {
        const data = await login(loginForm)
        if (data.two_factor_required) {
          openAuth('login2fa', { email: data.email || loginForm.email.trim() })
          setFeedback('success', data.message || 'Enviamos un código de acceso a tu correo.')
          return
        }

        closeAuth()
        navigate(getNextPath(), { replace: true })
        return
      }

      if (isRegister) {
        const data = await authService.register(registerForm)
        openAuth('verify', { email: data.email || registerForm.email.trim() })
        setFeedback('success', data.message || 'Te enviamos un código para verificar tu cuenta.')
        return
      }

      if (isVerify) {
        await authService.verifyEmailCode(verifyForm)
        await refreshSession()
        closeAuth()
        navigate(getNextPath(), { replace: true })
        return
      }

      if (isLogin2fa) {
        await authService.verifyLoginCode(login2faForm)
        await refreshSession()
        closeAuth()
        navigate(getNextPath(), { replace: true })
        return
      }

      if (isForgot) {
        const data = await authService.requestPasswordReset(forgotForm)
        openAuth('reset', { email: forgotForm.email.trim() })
        setFeedback('success', data.message || 'Revisa tu correo para continuar.')
        return
      }

      if (isReset) {
        const data = await authService.resetPassword(resetForm)
        setLoginForm({ email: resetForm.email.trim(), password: '' })
        openAuth('login', { email: resetForm.email.trim() })
        setFeedback('success', data.message || 'Contraseña actualizada. Ahora puedes iniciar sesión.')
      }
    } catch (error) {
      if (isLogin && error.data?.verification_required) {
        openAuth('verify', { email: error.data.email || loginForm.email.trim() })
      }
      setFeedback('error', error.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleResendCode() {
    clearFeedback()
    setIsSubmitting(true)

    try {
      const payload = isLogin2fa
        ? { email: login2faForm.email, purpose: 'login_2fa' }
        : { email: verifyForm.email, purpose: 'verify_email' }

      const data = await authService.resendEmailCode(payload)
      setFeedback('success', data.message || 'Enviamos un nuevo código.')
    } catch (error) {
      setFeedback('error', error.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  function renderTitle() {
    if (isRegister) return 'Crear cuenta'
    if (isVerify) return 'Verificar correo'
    if (isLogin2fa) return 'Segundo factor'
    if (isForgot) return 'Recuperar contraseña'
    if (isReset) return 'Nueva contraseña'
    return 'Iniciar sesión'
  }

  function renderSubtitle() {
    if (isRegister) return 'Crea tu cuenta y te enviaremos un código al correo.'
    if (isVerify) return 'Ingresa el código que enviamos a tu correo para activar la cuenta.'
    if (isLogin2fa) return 'Tu cuenta de soporte requiere un código adicional enviado al correo.'
    if (isForgot) return 'Te enviaremos un código para restablecer la contraseña.'
    if (isReset) return 'Ingresa el código recibido y define una nueva contraseña.'
    return 'Accede a tu cuenta para seguir comprando.'
  }

  return (
    <div className="modal" onClick={closeAuth}>
      <div className="modal-content auth-modal" onClick={(event) => event.stopPropagation()}>
        <button className="modal-close" type="button" onClick={closeAuth}>
          &times;
        </button>

        <div className="auth-modal__header">
          <h2 className="auth-modal__title">{renderTitle()}</h2>
          <p className="auth-modal__subtitle">{renderSubtitle()}</p>
        </div>

        <form className="form auth-modal__form" onSubmit={handleSubmit}>
          {isRegister ? (
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

          {isLogin ? (
            <>
              <div className="auth-modal__field">
                <input
                  type="email"
                  placeholder="Correo"
                  value={loginForm.email}
                  onChange={(event) =>
                    setLoginForm((current) => ({ ...current, email: event.target.value }))
                  }
                />
              </div>
              <div className="auth-modal__field">
                <input
                  type="password"
                  placeholder="Contraseña"
                  value={loginForm.password}
                  onChange={(event) =>
                    setLoginForm((current) => ({ ...current, password: event.target.value }))
                  }
                />
              </div>
            </>
          ) : null}

          {isRegister ? (
            <>
              <div className="auth-modal__field">
                <input
                  type="email"
                  placeholder="Correo"
                  value={registerForm.email}
                  onChange={(event) =>
                    setRegisterForm((current) => ({ ...current, email: event.target.value }))
                  }
                />
              </div>
              <div className="auth-modal__field">
                <input
                  type="password"
                  placeholder="Contraseña"
                  value={registerForm.password}
                  onChange={(event) =>
                    setRegisterForm((current) => ({ ...current, password: event.target.value }))
                  }
                />
              </div>
            </>
          ) : null}

          {isVerify ? (
            <>
              <div className="auth-modal__field">
                <input type="email" value={verifyForm.email} readOnly />
              </div>
              <div className="auth-modal__field">
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder="Código de 6 dígitos"
                  maxLength="6"
                  value={verifyForm.code}
                  onChange={(event) =>
                    setVerifyForm((current) => ({ ...current, code: event.target.value.replace(/\D/g, '').slice(0, 6) }))
                  }
                />
              </div>
            </>
          ) : null}

          {isLogin2fa ? (
            <>
              <div className="auth-modal__field">
                <input type="email" value={login2faForm.email} readOnly />
              </div>
              <div className="auth-modal__field">
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder="Código de 6 dígitos"
                  maxLength="6"
                  value={login2faForm.code}
                  onChange={(event) =>
                    setLogin2faForm((current) => ({ ...current, code: event.target.value.replace(/\D/g, '').slice(0, 6) }))
                  }
                />
              </div>
            </>
          ) : null}

          {isForgot ? (
            <div className="auth-modal__field">
              <input
                type="email"
                placeholder="Correo"
                value={forgotForm.email}
                onChange={(event) => setForgotForm({ email: event.target.value })}
              />
            </div>
          ) : null}

          {isReset ? (
            <>
              <div className="auth-modal__field">
                <input type="email" value={resetForm.email} readOnly />
              </div>
              <div className="auth-modal__field">
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder="Código de 6 dígitos"
                  maxLength="6"
                  value={resetForm.code}
                  onChange={(event) =>
                    setResetForm((current) => ({ ...current, code: event.target.value.replace(/\D/g, '').slice(0, 6) }))
                  }
                />
              </div>
              <div className="auth-modal__field">
                <input
                  type="password"
                  placeholder="Nueva contraseña"
                  value={resetForm.password}
                  onChange={(event) =>
                    setResetForm((current) => ({ ...current, password: event.target.value }))
                  }
                />
              </div>
            </>
          ) : null}

          {message ? (
            <div className={`modal-feedback ${messageType === 'success' ? 'is-success' : 'is-error'}`} role="alert">
              {message}
            </div>
          ) : null}

          <button className="btn auth-modal__submit" type="submit" disabled={isSubmitting}>
            {isSubmitting
              ? 'Procesando...'
              : isRegister
                ? 'Registrarse'
                : isVerify
                  ? 'Verificar cuenta'
                  : isLogin2fa
                    ? 'Validar acceso'
                    : isForgot
                      ? 'Enviar código'
                      : isReset
                        ? 'Cambiar contraseña'
                        : 'Entrar'}
          </button>
        </form>

        <div className="auth-switch auth-modal__footer">
          {isLogin ? (
            <>
              <button
                className="text-link"
                type="button"
                onClick={() => {
                  clearFeedback()
                  setRegisterForm(INITIAL_REGISTER)
                  openAuth('register')
                }}
              >
                ¿No tienes cuenta? Regístrate
              </button>
              <button
                className="text-link"
                type="button"
                onClick={() => {
                  clearFeedback()
                  openAuth('forgot', { email: loginForm.email.trim() })
                }}
              >
                Olvidé mi contraseña
              </button>
            </>
          ) : null}

          {isRegister ? (
            <button
              className="text-link"
              type="button"
              onClick={() => {
                clearFeedback()
                openAuth('login', { email: registerForm.email.trim() })
              }}
            >
              ¿Ya tienes cuenta? Inicia sesión
            </button>
          ) : null}

          {isVerify || isLogin2fa ? (
            <>
              <button className="text-link" type="button" onClick={handleResendCode} disabled={isSubmitting}>
                Reenviar código
              </button>
              <button
                className="text-link"
                type="button"
                onClick={() => {
                  clearFeedback()
                  openAuth('login', { email: isLogin2fa ? login2faForm.email : verifyForm.email })
                }}
              >
                Volver a iniciar sesión
              </button>
            </>
          ) : null}

          {isForgot ? (
            <button
              className="text-link"
              type="button"
              onClick={() => {
                clearFeedback()
                openAuth('login', { email: forgotForm.email.trim() })
              }}
            >
              Volver a iniciar sesión
            </button>
          ) : null}

          {isReset ? (
            <>
              <button
                className="text-link"
                type="button"
                onClick={() => {
                  clearFeedback()
                  openAuth('forgot', { email: resetForm.email })
                }}
              >
                Solicitar otro código
              </button>
              <button
                className="text-link"
                type="button"
                onClick={() => {
                  clearFeedback()
                  openAuth('login', { email: resetForm.email })
                }}
              >
                Volver a iniciar sesión
              </button>
            </>
          ) : null}

          <button className="text-link" type="button" onClick={closeAuth}>
            Cerrar
          </button>
        </div>
      </div>
    </div>
  )
}
