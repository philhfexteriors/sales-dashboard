'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuth } from '@/components/AuthProvider'
import { isAdmin, canManageProducts } from '@/lib/auth/roles'

export default function Navigation() {
  const pathname = usePathname()
  const { user, profile, signOut } = useAuth()

  const email = user?.email
  const role = profile?.role
  const showAdmin = canManageProducts(role, email)
  const showUserAdmin = isAdmin(email)

  const navItems = [
    { href: '/dashboard', label: 'Dashboard', icon: HomeIcon },
    { href: '/bids', label: 'Bids', icon: BidIcon },
    { href: '/bids/new', label: 'New Bid', icon: PlusIcon },
    { href: '/plans/new', label: 'New Plan', icon: PlusIcon },
  ]

  const adminItems = showAdmin ? [
    { href: '/admin/products', label: 'Products', icon: BoxIcon },
    { href: '/admin/price-list', label: 'Price List', icon: PriceIcon },
    { href: '/admin/bid-templates', label: 'Bid Templates', icon: TemplateIcon },
    { href: '/admin/start-dates', label: 'Start Dates', icon: CalendarIcon },
    { href: '/admin/payment-notes', label: 'Payment Notes', icon: NoteIcon },
    { href: '/admin/terms', label: 'Terms & Conditions', icon: DocIcon },
  ] : []

  const userAdminItems = showUserAdmin ? [
    { href: '/admin/users', label: 'Users', icon: UsersIcon },
  ] : []

  return (
    <>
      {/* Desktop sidebar */}
      <nav className="hidden md:flex flex-col w-64 bg-white border-r border-gray-200 h-screen sticky top-0">
        <div className="p-6 border-b border-gray-200">
          <h1 className="text-xl font-bold text-primary">Production Plan</h1>
          <p className="text-xs text-secondary mt-1">H&F Exteriors</p>
        </div>

        <div className="flex-1 py-4 overflow-y-auto">
          <div className="px-3 space-y-1">
            {navItems.map(item => (
              <NavLink key={item.href} href={item.href} active={pathname === item.href || pathname.startsWith(item.href + '/')}>
                <item.icon />
                {item.label}
              </NavLink>
            ))}
          </div>

          {adminItems.length > 0 && (
            <div className="mt-6 px-3">
              <p className="px-3 mb-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                Admin
              </p>
              <div className="space-y-1">
                {[...adminItems, ...userAdminItems].map(item => (
                  <NavLink key={item.href} href={item.href} active={pathname.startsWith(item.href)}>
                    <item.icon />
                    {item.label}
                  </NavLink>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="p-4 border-t border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
              <span className="text-sm font-medium text-primary">
                {user?.email?.[0]?.toUpperCase()}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">
                {profile?.display_name || user?.email?.split('@')[0]}
              </p>
              <p className="text-xs text-gray-500 capitalize">{role || 'salesperson'}</p>
            </div>
            <button
              onClick={signOut}
              className="text-gray-400 hover:text-gray-600 p-1"
              title="Sign out"
            >
              <LogoutIcon />
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile/iPad bottom nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50 safe-area-bottom">
        <div className="flex justify-around items-center py-2">
          {navItems.map(item => (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center gap-1 px-3 py-2 rounded-lg ${
                pathname === item.href || pathname.startsWith(item.href + '/')
                  ? 'text-primary'
                  : 'text-gray-500'
              }`}
            >
              <item.icon />
              <span className="text-[10px] font-medium">{item.label}</span>
            </Link>
          ))}
          {showAdmin && (
            <Link
              href="/admin/products"
              className={`flex flex-col items-center gap-1 px-3 py-2 rounded-lg ${
                pathname.startsWith('/admin') ? 'text-primary' : 'text-gray-500'
              }`}
            >
              <BoxIcon />
              <span className="text-[10px] font-medium">Admin</span>
            </Link>
          )}
          <button
            onClick={signOut}
            className="flex flex-col items-center gap-1 px-3 py-2 rounded-lg text-gray-500"
          >
            <LogoutIcon />
            <span className="text-[10px] font-medium">Sign Out</span>
          </button>
        </div>
      </nav>
    </>
  )
}

function NavLink({ href, active, children }: { href: string; active: boolean; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
        active
          ? 'bg-primary/10 text-primary'
          : 'text-gray-700 hover:bg-gray-100'
      }`}
    >
      {children}
    </Link>
  )
}

function HomeIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
    </svg>
  )
}

function PlusIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v16m8-8H4" />
    </svg>
  )
}

function BoxIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
    </svg>
  )
}

function CalendarIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  )
}

function NoteIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  )
}

function DocIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  )
}

function UsersIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
    </svg>
  )
}

function LogoutIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
    </svg>
  )
}

function BidIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
    </svg>
  )
}

function PriceIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  )
}

function TemplateIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zm0 8a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zm10 0a1 1 0 011-1h4a1 1 0 011 1v6a1 1 0 01-1 1h-4a1 1 0 01-1-1v-6z" />
    </svg>
  )
}
