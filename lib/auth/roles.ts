const ADMIN_EMAILS = (process.env.NEXT_PUBLIC_ADMIN_EMAILS || 'phil@hfexteriors.com')
  .split(',')
  .map(email => email.trim().toLowerCase())

export type UserRole = 'admin' | 'sales_manager' | 'salesperson'

export function isAdmin(email: string | null | undefined): boolean {
  if (!email) return false
  return ADMIN_EMAILS.includes(email.toLowerCase())
}

export function hasRole(userRole: UserRole | null | undefined, allowedRoles: UserRole[]): boolean {
  if (!userRole) return false
  return allowedRoles.includes(userRole)
}

export function canManageProducts(userRole: UserRole | null | undefined, email: string | null | undefined): boolean {
  return isAdmin(email) || hasRole(userRole, ['sales_manager'])
}

export function canManageUsers(email: string | null | undefined): boolean {
  return isAdmin(email)
}
