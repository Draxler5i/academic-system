import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import './App.css'

type UserRole = 'administrator' | 'teacher' | 'student'
const roleLabels: Record<UserRole, string> = {
  administrator: 'Administrador',
  teacher: 'Docente',
  student: 'Estudiante',
}

interface User {
  id: string
  email: string
  name: string
  role: UserRole
}

interface LoginResponse {
  accessToken: string
  tokenType: 'Bearer'
  expiresIn: number
  user: User
}

const apiUrl = (import.meta.env.VITE_API_URL ?? 'http://localhost:3000').replace(
  /\/$/,
  '',
)
const tokenStorageKey = 'unicen_access_token'

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`${apiUrl}${path}`, options)
  const body: unknown = await response.json().catch(() => null)

  if (!response.ok) {
    const message =
      typeof body === 'object' &&
      body !== null &&
      'message' in body &&
      typeof body.message === 'string'
        ? body.message
        : 'No fue posible completar la solicitud.'
    throw new Error(message)
  }

  return body as T
}

function App() {
  const [user, setUser] = useState<User | null>(null)
  const [email, setEmail] = useState('estudiante@unicen.edu.bo')
  const [password, setPassword] = useState('Estudiante123!')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isCheckingSession, setIsCheckingSession] = useState(() =>
    Boolean(sessionStorage.getItem(tokenStorageKey)),
  )

  useEffect(() => {
    const token = sessionStorage.getItem(tokenStorageKey)
    if (!token) return

    request<User>('/auth/me', {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(setUser)
      .catch(() => sessionStorage.removeItem(tokenStorageKey))
      .finally(() => setIsCheckingSession(false))
  }, [])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setIsLoading(true)

    try {
      const result = await request<LoginResponse>('/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })
      sessionStorage.setItem(tokenStorageKey, result.accessToken)
      setUser(result.user)
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : 'No fue posible iniciar sesión. Intenta nuevamente.',
      )
    } finally {
      setIsLoading(false)
    }
  }

  function handleLogout() {
    sessionStorage.removeItem(tokenStorageKey)
    setUser(null)
    setPassword('')
  }

  if (isCheckingSession) {
    return (
      <main className="page-shell">
        <p className="session-check" role="status">Verificando sesión...</p>
      </main>
    )
  }

  return (
    <main className="page-shell">
      <header className="brand">
        <div className="brand-mark" aria-hidden="true">U</div>
        <div>
          <p className="brand-name">UNICEN</p>
          <p className="brand-caption">SISTEMA ACADÉMICO</p>
        </div>
      </header>

      <section className="login-card" aria-labelledby="page-title">
        <div className="card-accent" />
        {user ? (
          <div className="welcome-panel">
            <div className="welcome-icon" aria-hidden="true">
              {user.name.charAt(0)}
            </div>
            <p className="eyebrow">SESIÓN INICIADA</p>
            <h1 id="page-title">¡Bienvenido!</h1>
            <p className="welcome-copy">
              Has iniciado sesión como <strong>{user.name}</strong>.
            </p>
            <div className="profile-details">
              <span>Correo</span>
              <strong>{user.email}</strong>
              <span>Rol</span>
              <strong className="role-badge">{roleLabels[user.role]}</strong>
            </div>
            <button className="button button-secondary" onClick={handleLogout}>
              Cerrar sesión
            </button>
          </div>
        ) : (
          <>
            <div className="card-heading">
              <p className="eyebrow">PORTAL UNIVERSITARIO</p>
              <h1 id="page-title">Inicia sesión</h1>
              <p className="subtitle">Ingresa tus credenciales para continuar.</p>
            </div>

            <form className="login-form" onSubmit={handleSubmit}>
              <label htmlFor="email">Correo electrónico</label>
              <input
                autoComplete="username"
                id="email"
                name="email"
                onChange={(event) => setEmail(event.target.value)}
                placeholder="nombre@unicen.edu.bo"
                required
                type="email"
                value={email}
              />

              <label htmlFor="password">Contraseña</label>
              <input
                autoComplete="current-password"
                id="password"
                name="password"
                onChange={(event) => setPassword(event.target.value)}
                required
                type="password"
                value={password}
              />

              {error && <p className="error-message" role="alert">{error}</p>}

              <button className="button" disabled={isLoading} type="submit">
                {isLoading ? 'Ingresando...' : 'Ingresar'}
                {!isLoading && <span aria-hidden="true">→</span>}
              </button>
            </form>

            <aside className="demo-credentials">
              <span className="demo-icon" aria-hidden="true">i</span>
              <p>
                <strong>Cuenta de prueba</strong>
                <br />
                estudiante@unicen.edu.bo
                <br />
                Estudiante123!
              </p>
            </aside>
          </>
        )}
      </section>

      <footer className="page-footer">
        <span>UNICEN · Sistema Académico</span>
        <span>Acceso seguro para la comunidad universitaria</span>
      </footer>
    </main>
  )
}

export default App
