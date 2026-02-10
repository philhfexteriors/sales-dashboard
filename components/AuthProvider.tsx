'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import type { User } from '@supabase/supabase-js'
import type { UserRole } from '@/lib/auth/roles'

interface UserProfile {
  role: UserRole
  display_name: string | null
}

interface AuthContextType {
  user: User | null
  profile: UserProfile | null
  loading: boolean
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  loading: true,
  signOut: async () => {},
})

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const supabase = createClient()

  async function fetchProfile(userId: string) {
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('role, display_name')
        .eq('id', userId)
        .single()

      if (data && !error) {
        setProfile({ role: data.role as UserRole, display_name: data.display_name })
      } else {
        console.warn('Profile fetch failed, using defaults:', error?.message)
        setProfile({ role: 'salesperson', display_name: null })
      }
    } catch (err) {
      console.warn('Profile fetch error:', err)
      setProfile({ role: 'salesperson', display_name: null })
    }
  }

  useEffect(() => {
    let didFinish = false

    // Safety timeout — never hang longer than 8 seconds
    const timeout = setTimeout(() => {
      if (!didFinish) {
        console.warn('AuthProvider: safety timeout reached, forcing loading=false')
        setLoading(false)
        didFinish = true
      }
    }, 8000)

    const getUser = async () => {
      try {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession()
        if (sessionError) console.warn('Session error:', sessionError.message)
        const currentUser = session?.user ?? null
        setUser(currentUser)

        if (currentUser) {
          await fetchProfile(currentUser.id)
        }
      } catch (err) {
        console.warn('Auth init error:', err)
      }
      if (!didFinish) {
        setLoading(false)
        didFinish = true
      }
      clearTimeout(timeout)
    }

    getUser()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        const currentUser = session?.user ?? null
        setUser(currentUser)

        if (currentUser) {
          await fetchProfile(currentUser.id)
        } else {
          setProfile(null)
        }

        if (_event === 'SIGNED_OUT') {
          router.push('/login')
        }
      }
    )

    return () => {
      subscription.unsubscribe()
      clearTimeout(timeout)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const signOut = async () => {
    await supabase.auth.signOut()
  }

  return (
    <AuthContext.Provider value={{ user, profile, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
