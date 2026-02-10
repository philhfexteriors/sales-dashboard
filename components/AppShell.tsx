'use client'

import ProtectedRoute from './ProtectedRoute'
import Navigation from './Navigation'

export default function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedRoute>
      <div className="flex min-h-screen">
        <Navigation />
        <main className="flex-1 pb-20 md:pb-0">
          {children}
        </main>
      </div>
    </ProtectedRoute>
  )
}
