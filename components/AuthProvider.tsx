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

  // Matches SM dashboard pattern exactly
  useEffect(() => {
    const getUser = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      setUser(session?.user ?? null)
      setLoading(false)
    }

    getUser()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setUser(session?.user ?? null)

        if (_event === 'SIGNED_OUT') {
          router.push('/login')
        }
      }
    )

    return () => subscription.unsubscribe()
  }, [supabase.auth, router])

  // Fetch profile separately — never blocks loading state
  useEffect(() => {
    if (!user) { setProfile(null); return }

    supabase
      .from('user_profiles')
      .select('role, display_name')
      .eq('id', user.id)
      .single()
      .then(({ data, error }) => {
        if (data && !error) {
          setProfile({ role: data.role as UserRole, display_name: data.display_name })
        } else {
          setProfile({ role: 'salesperson', display_name: null })
        }
      })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id])

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
