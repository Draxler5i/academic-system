import { useEffect, useState } from 'react'
import type { ComponentType } from 'react'
import './App.css'
import { AdminAcademicHistory } from './AdminAcademicHistory'
import { authRequest, tokenStorageKey } from './api'
import type { User, UserRole } from './api'
import { LoginForm } from './LoginForm'
import { StudentCourses } from './StudentCourses'
import { TeacherGrades } from './TeacherGrades'

// Each role gets its own dashboard; adding a role means adding one entry here.
const dashboardByRole: Record<UserRole, ComponentType> = {
  administrator: AdminAcademicHistory,
  teacher: TeacherGrades,
  student: StudentCourses,
}

function App() {
  const [user, setUser] = useState<User | null>(null)
  const [isCheckingSession, setIsCheckingSession] = useState(() =>
    Boolean(sessionStorage.getItem(tokenStorageKey)),
  )

  useEffect(() => {
    if (!sessionStorage.getItem(tokenStorageKey)) return

    authRequest<User>('/auth/me')
      .then(setUser)
      .catch(() => sessionStorage.removeItem(tokenStorageKey))
      .finally(() => setIsCheckingSession(false))
  }, [])

  function handleLogout() {
    sessionStorage.removeItem(tokenStorageKey)
    setUser(null)
  }

  if (isCheckingSession) {
    return (
      <main className="page-shell">
        <p className="session-check" role="status">Verificando sesión...</p>
      </main>
    )
  }

  const Dashboard = user ? dashboardByRole[user.role] : null

  return (
    <main className="page-shell">
      <header className="brand">
        <div className="brand-mark" aria-hidden="true">U</div>
        <div>
          <p className="brand-name">UNICEN</p>
          <p className="brand-caption">SISTEMA ACADÉMICO</p>
        </div>
      </header>

      <section
        className={`login-card${user ? ' dashboard-card' : ''}`}
        aria-labelledby="page-title"
      >
        <div className="card-accent" />
        {user && Dashboard ? (
          <div className="welcome-panel">
            <div className="welcome-icon" aria-hidden="true">
              {user.name.charAt(0)}
            </div>
            <p className="eyebrow">SESIÓN INICIADA</p>
            <h1 id="page-title">¡Bienvenido!</h1>
            <p className="welcome-copy">
              Has iniciado sesión como <strong>{user.name}</strong>.
            </p>
            <button className="button button-secondary" onClick={handleLogout}>
              Cerrar sesión
            </button>
            <Dashboard />
          </div>
        ) : (
          <LoginForm onLogin={setUser} />
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
