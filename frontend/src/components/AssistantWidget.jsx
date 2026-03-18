import { useEffect, useId, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useApp } from '@/context/AppContext'

const QUICK_PROMPTS = [
  'Como pago un pedido',
  'Como publico un producto',
  'Quiero ver mis pedidos',
  'Necesito ayuda con una devolucion',
]

const FAQ_ENTRIES = [
  {
    match: ['pago', 'pagar', 'paypal', 'efectivo', 'metodo'],
    getResponse: () => ({
      text:
        'Puedes pagar desde la pantalla de checkout con PayPal o efectivo. Revisa bien el metodo antes de confirmar y verifica el estado del pedido despues del pago.',
      actions: [
        { label: 'Ir a pagar', type: 'navigate', to: '/pagar.html' },
        { label: 'Ver metodos', type: 'navigate', to: '/metodos_pago.html' },
      ],
    }),
  },
  {
    match: ['publicar', 'producto', 'vender', 'venta', 'subir'],
    getResponse: ({ isLoggedIn }) => ({
      text: isLoggedIn
        ? 'Para publicar un producto entra a la seccion Vender, completa nombre, categoria, descripcion, precio, stock e imagenes. Cuando termines, usa el boton Publicar.'
        : 'Para publicar un producto primero necesitas iniciar sesion. Despues podras entrar a Vender y completar los datos de la publicacion.',
      actions: isLoggedIn
        ? [{ label: 'Ir a vender', type: 'navigate', to: '/vender.html' }]
        : [{ label: 'Iniciar sesion', type: 'auth', mode: 'login' }],
    }),
  },
  {
    match: ['pedido', 'pedidos', 'orden', 'ordenes', 'compra'],
    getResponse: ({ isLoggedIn }) => ({
      text: isLoggedIn
        ? 'En Mis pedidos puedes revisar tus compras y ventas, confirmar entregas o cancelar pedidos que sigan activos.'
        : 'Para revisar tus pedidos necesitas iniciar sesion. Luego podras abrir la seccion Pedidos desde la barra superior.',
      actions: isLoggedIn
        ? [{ label: 'Abrir pedidos', type: 'navigate', to: '/pedidos.html' }]
        : [{ label: 'Ingresar', type: 'auth', mode: 'login' }],
    }),
  },
  {
    match: ['mensaje', 'mensajes', 'chat', 'hablar', 'vendedor', 'comprador'],
    getResponse: ({ isLoggedIn }) => ({
      text: isLoggedIn
        ? 'La conversacion entre comprador y vendedor aparece en Mensajes despues de que exista una orden. Desde ahi puedes dar seguimiento al pedido.'
        : 'La seccion de mensajes se habilita cuando inicias sesion y existe una orden relacionada contigo.',
      actions: isLoggedIn
        ? [{ label: 'Ir a mensajes', type: 'navigate', to: '/mensajes.html' }]
        : [{ label: 'Crear cuenta', type: 'auth', mode: 'register' }],
    }),
  },
  {
    match: ['devolucion', 'devolver', 'reembolso', 'problema', 'cancelacion'],
    getResponse: () => ({
      text:
        'Si hubo un problema con la entrega o el producto, documenta el caso y revisa las secciones de Devoluciones y Reembolsos. El pago debe mantenerse dentro de la plataforma para facilitar la revision.',
      actions: [
        { label: 'Devoluciones', type: 'navigate', to: '/devoluciones.html' },
        { label: 'Reembolsos', type: 'navigate', to: '/reembolsos.html' },
      ],
    }),
  },
  {
    match: ['cuenta', 'perfil', 'sesion', 'login', 'registro'],
    getResponse: ({ isLoggedIn }) => ({
      text: isLoggedIn
        ? 'Desde tu menu de perfil puedes entrar a Cuenta, ver tus publicaciones o cerrar sesion.'
        : 'Puedes iniciar sesion o crear una cuenta desde el menu de perfil. Al hacerlo tendras acceso a pedidos, mensajes, carrito y publicaciones.',
      actions: isLoggedIn
        ? [{ label: 'Ver cuenta', type: 'navigate', to: '/cuenta.html' }]
        : [
            { label: 'Iniciar sesion', type: 'auth', mode: 'login' },
            { label: 'Crear cuenta', type: 'auth', mode: 'register' },
          ],
    }),
  },
  {
    match: ['envio', 'entrega', 'recoger'],
    getResponse: () => ({
      text:
        'Las entregas se coordinan entre comprador y vendedor. Te conviene acordar fecha, hora y un punto seguro antes de cerrar la operacion.',
      actions: [{ label: 'Ver envios', type: 'navigate', to: '/envios.html' }],
    }),
  },
  {
    match: ['seguridad', 'privacidad', 'datos', 'terminos'],
    getResponse: () => ({
      text:
        'Para temas de seguridad y privacidad revisa nuestras paginas informativas. Mantente dentro de la plataforma y evita compartir informacion sensible por fuera.',
      actions: [
        { label: 'Seguridad', type: 'navigate', to: '/seguridad.html' },
        { label: 'Terminos', type: 'navigate', to: '/terminos_privacidad.html' },
      ],
    }),
  },
]

function normalizeText(value) {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function createAssistantMessage(text, actions = []) {
  return {
    id: crypto.randomUUID(),
    role: 'assistant',
    text,
    actions,
  }
}

function createContextualGreeting(pathname, isLoggedIn) {
  if (pathname === '/pagar.html') {
    return createAssistantMessage(
      'Estoy viendo que estas en checkout. Si tienes dudas sobre pago, PayPal o efectivo, preguntame y te guio.',
      [{ label: 'Dudas de pago', type: 'prompt', value: 'Como pago un pedido' }],
    )
  }

  if (pathname === '/vender.html') {
    return createAssistantMessage(
      'Si vas a publicar, puedo ayudarte con categorias, stock, precio o el proceso de venta.',
      [{ label: 'Como publico un producto', type: 'prompt', value: 'Como publico un producto' }],
    )
  }

  if (pathname === '/pedidos.html') {
    return createAssistantMessage(
      'Aqui puedo ayudarte a entender tus pedidos, entregas o cancelaciones.',
      [{ label: 'Quiero ver mis pedidos', type: 'prompt', value: 'Quiero ver mis pedidos' }],
    )
  }

  return createAssistantMessage(
    isLoggedIn
      ? 'Hola, soy el asistente virtual de Utzmplace. Puedo ayudarte con pagos, pedidos, ventas, envios o devoluciones.'
      : 'Hola, soy el asistente virtual de Utzmplace. Puedo ayudarte con pagos, registro, publicaciones, envios o devoluciones.',
  )
}

function findBestResponse(message, context) {
  const normalized = normalizeText(message)

  for (const entry of FAQ_ENTRIES) {
    if (entry.match.some((keyword) => normalized.includes(keyword))) {
      return entry.getResponse(context)
    }
  }

  return {
    text:
      'Puedo ayudarte con temas comunes de la plataforma: pagos, pedidos, mensajes, publicar productos, cuenta, envios, devoluciones y seguridad. Escribe uno de esos temas y te guio.',
    actions: [
      { label: 'Pagos', type: 'prompt', value: 'Como pago un pedido' },
      { label: 'Publicar', type: 'prompt', value: 'Como publico un producto' },
      { label: 'Devoluciones', type: 'prompt', value: 'Necesito ayuda con una devolucion' },
    ],
  }
}

export default function AssistantWidget() {
  const navigate = useNavigate()
  const location = useLocation()
  const { isLoggedIn, openAuth } = useApp()
  const inputId = useId()
  const listRef = useRef(null)
  const [isOpen, setIsOpen] = useState(false)
  const [isTyping, setIsTyping] = useState(false)
  const [draft, setDraft] = useState('')
  const [messages, setMessages] = useState(() => [createContextualGreeting(location.pathname, isLoggedIn)])

  useEffect(() => {
    if (!isOpen || !listRef.current) {
      return
    }

    listRef.current.scrollTop = listRef.current.scrollHeight
  }, [isOpen, isTyping, messages])

  useEffect(() => {
    function handleEscape(event) {
      if (event.key === 'Escape') {
        setIsOpen(false)
      }
    }

    window.addEventListener('keydown', handleEscape)
    return () => window.removeEventListener('keydown', handleEscape)
  }, [])

  useEffect(() => {
    setMessages((current) => {
      const firstMessage = current[0]
      const nextGreeting = createContextualGreeting(location.pathname, isLoggedIn)

      if (!firstMessage || firstMessage.role !== 'assistant') {
        return [nextGreeting, ...current]
      }

      return [nextGreeting, ...current.slice(1)]
    })
  }, [isLoggedIn, location.pathname])

  function runAction(action) {
    if (action.type === 'navigate') {
      navigate(action.to)
      setIsOpen(false)
      return
    }

    if (action.type === 'auth') {
      openAuth(action.mode)
      setIsOpen(false)
      return
    }

    if (action.type === 'prompt') {
      submitMessage(action.value)
    }
  }

  function submitMessage(rawMessage) {
    const text = rawMessage.trim()
    if (!text || isTyping) {
      return
    }

    const userMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      text,
      actions: [],
    }

    const response = findBestResponse(text, { isLoggedIn, pathname: location.pathname })

    setMessages((current) => [...current, userMessage])
    setDraft('')
    setIsOpen(true)
    setIsTyping(true)

    window.setTimeout(() => {
      setMessages((current) => [...current, createAssistantMessage(response.text, response.actions)])
      setIsTyping(false)
    }, 420)
  }

  function handleSubmit(event) {
    event.preventDefault()
    submitMessage(draft)
  }

  return (
    <div className={`assistant-widget${isOpen ? ' is-open' : ''}`}>
      {!isOpen ? (
        <button
          className="assistant-trigger"
          type="button"
          aria-expanded={isOpen}
          aria-controls="assistant-panel"
          onClick={() => setIsOpen(true)}
        >
          <span className="assistant-trigger__icon" aria-hidden="true">
            UT
          </span>
          <span className="assistant-trigger__label">Asistente</span>
        </button>
      ) : null}

      {isOpen ? (
        <section id="assistant-panel" className="assistant-panel" aria-label="Asistente virtual">
          <div className="assistant-panel__head">
            <div>
              <p className="assistant-panel__eyebrow">Ayuda rapida</p>
              <h3>Asistente Utzmplace</h3>
            </div>
            <button className="assistant-close" type="button" onClick={() => setIsOpen(false)} aria-label="Cerrar asistente">
              &times;
            </button>
          </div>

          <div ref={listRef} className="assistant-thread">
            {messages.map((message) => (
              <article
                key={message.id}
                className={`assistant-bubble assistant-bubble--${message.role}`}
              >
                <p>{message.text}</p>
                {message.actions?.length ? (
                  <div className="assistant-actions">
                    {message.actions.map((action) => (
                      <button
                        key={`${message.id}-${action.label}`}
                        className="assistant-chip"
                        type="button"
                        onClick={() => runAction(action)}
                      >
                        {action.label}
                      </button>
                    ))}
                  </div>
                ) : null}
              </article>
            ))}

            {isTyping ? (
              <div className="assistant-bubble assistant-bubble--assistant assistant-bubble--typing">
                <span />
                <span />
                <span />
              </div>
            ) : null}
          </div>

          <div className="assistant-suggestions" aria-label="Sugerencias rapidas">
            {QUICK_PROMPTS.map((prompt) => (
              <button
                key={prompt}
                className="assistant-suggestion"
                type="button"
                onClick={() => submitMessage(prompt)}
              >
                {prompt}
              </button>
            ))}
          </div>

          <form className="assistant-form" onSubmit={handleSubmit}>
            <label className="sr-only" htmlFor={inputId}>
              Escribe tu duda
            </label>
            <input
              id={inputId}
              type="text"
              placeholder="Escribe tu duda..."
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
            />
            <button type="submit" disabled={!draft.trim() || isTyping}>
              Enviar
            </button>
          </form>
        </section>
      ) : null}
    </div>
  )
}
