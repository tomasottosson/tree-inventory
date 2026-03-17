import { useState, useCallback, useEffect, useContext, createContext } from 'react'
import type { ReactNode } from 'react'
import { api } from '../lib/api'

interface AuthUser {
  id: string
  name: string
  role: string
}

interface AuthContextValue {
  user: AuthUser | null
  login: (userId: string, pin: string) => Promise<boolean>
  logout: () => void
  loading: boolean
  error: string | null
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(() => {
    const saved = localStorage.getItem('auth_user')
    return saved ? JSON.parse(saved) : null
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (user) {
      localStorage.setItem('auth_user', JSON.stringify(user))
    } else {
      localStorage.removeItem('auth_user')
      localStorage.removeItem('auth_token')
    }
  }, [user])

  const login = useCallback(async (userId: string, pin: string) => {
    setLoading(true)
    setError(null)
    try {
      const res = await api.login(userId, pin)
      localStorage.setItem('auth_token', res.token)
      setUser(res.user)
      return true
    } catch {
      setError('Fel PIN-kod')
      return false
    } finally {
      setLoading(false)
    }
  }, [])

  const logout = useCallback(() => {
    setUser(null)
  }, [])

  return (
    <AuthContext.Provider value={{ user, login, logout, loading, error }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
