'use client'

import { useEffect, useState } from 'react'
import AppShell from '@/components/AppShell'
import RoleGuard from '@/components/RoleGuard'
import Loading from '@/components/Loading'
import toast from 'react-hot-toast'

interface UserProfile {
  id: string
  email: string
  display_name: string | null
  role: string
  active: boolean
}

export default function UsersAdmin() {
  const [users, setUsers] = useState<UserProfile[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { fetchUsers() }, [])

  async function fetchUsers() {
    const res = await fetch('/api/users')
    setUsers(await res.json())
    setLoading(false)
  }

  async function updateRole(userId: string, role: string) {
    const res = await fetch(`/api/users/${userId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role }),
    })
    if (res.ok) {
      toast.success('Role updated')
      fetchUsers()
    } else {
      toast.error('Failed to update role')
    }
  }

  async function toggleActive(userId: string, active: boolean) {
    const res = await fetch(`/api/users/${userId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ active: !active }),
    })
    if (res.ok) {
      toast.success(active ? 'User deactivated' : 'User activated')
      fetchUsers()
    }
  }

  return (
    <AppShell>
      <RoleGuard allowedRoles={['admin']}>
        <div className="p-6 max-w-4xl mx-auto">
          <h1 className="text-2xl font-bold text-gray-900 mb-6">User Management</h1>

          {loading ? (
            <Loading />
          ) : users.length === 0 ? (
            <p className="text-gray-400 text-center py-8">No users yet. Users are created on first login.</p>
          ) : (
            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Name</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Email</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Role</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {users.map(u => (
                    <tr key={u.id} className={!u.active ? 'opacity-50' : ''}>
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">
                        {u.display_name || u.email.split('@')[0]}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500">{u.email}</td>
                      <td className="px-4 py-3">
                        <select
                          value={u.role}
                          onChange={e => updateRole(u.id, e.target.value)}
                          className="text-sm border border-gray-300 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-primary/50"
                        >
                          <option value="salesperson">Salesperson</option>
                          <option value="sales_manager">Sales Manager</option>
                          <option value="admin">Admin</option>
                        </select>
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => toggleActive(u.id, u.active)}
                          className={`text-xs px-2 py-1 rounded ${
                            u.active ? 'text-green-700 bg-green-50' : 'text-red-700 bg-red-50'
                          }`}
                        >
                          {u.active ? 'Active' : 'Inactive'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </RoleGuard>
    </AppShell>
  )
}
