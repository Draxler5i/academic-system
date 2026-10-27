import { useState } from 'react'
import type { FormEvent } from 'react'
import { errorMessage, request, tokenStorageKey } from './api'
import type { LoginResponse, User } from './api'

const demoAccounts = [
  { label: 'Administrador', email: 'admin@unicen.edu.bo', password: 'AdminDemo123!' },
  { label: 'Docente', email: 'docente@unicen.edu.bo', password: 'Docente123!' },
  { label: 'Estudiante', email: 'estudiante@unicen.edu.bo', password: 'Estudiante123!' },
]

export function LoginForm({ onLogin }: { onLogin: (user: User) => void }) {
  const [email, setEmail] = useState(demoAccounts[2].email)
  const [password, setPassword] = useState(demoAccounts[2].password)
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

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
      onLogin(result.user)
    } catch (reason) {
      setError(errorMessage(reason, 'No fue posible iniciar sesión. Intenta nuevamente.'))
      setIsLoading(false)
    }
  }

  return (
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
          <strong>Cuentas de prueba</strong>
          {demoAccounts.map((account) => (
            <span key={account.email}>
              <br />
              {account.label}: {account.email} · {account.password}
            </span>
          ))}
        </p>
      </aside>
    </>
  )
}
