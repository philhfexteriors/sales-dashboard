'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/components/AuthProvider'
import { isAdmin, type UserRole } from '@/lib/auth/roles'
import Loading from '@/components/Loading'

interface RoleGuardProps {
  children: React.ReactNode
  allowedRoles: UserRole[]
}

export default function RoleGuard({ children, allowedRoles }: RoleGuardProps) {
  const { user, profile } = useAuth()
  const router = useRouter()
  const [authorized, setAuthorized] = useState(false)

  useEffect(() => {
    if (!user) return

    // Admins (by email) always have access
    if (isAdmin(user.email)) {
      setAuthorized(true)
      return
    }

    // Check database role
    if (profile && allowedRoles.includes(profile.role)) {
      setAuthorized(true)
      return
    }

    // Not authorized - redirect to dashboard
    if (profile) {
      router.replace('/dashboard')
    }
  }, [user, profile, allowedRoles, router])

  if (!authorized) return <Loading message="Checking permissions..." />

  return <>{children}</>
}
