/**
 * Contractors Cloud API Client — ported from sm-dashboard.
 * Used for client account search (type-ahead lookup by name).
 */

const DEFAULT_CC_BASE_URL = 'https://classic-api.contractorscloud.com/api/v1'

export interface CCAccount {
  id: number
  name: string
  address_street: string
  address_city: string
  address_state: string
  address_zip: string
  primary_first_name: string | null
  primary_last_name: string | null
  primary_phone_cell: string | null
  primary_phone_home: string | null
  primary_phone_work: string | null
  primary_email: string | null
  secondary_first_name: string | null
  secondary_last_name: string | null
  created_at: string
  updated_at: string
}

interface CCPaginatedResponse<T> {
  current_page: number
  data: T[]
  last_page: number
  per_page: number
  total: number
  next_page_url: string | null
}

class CCApiError extends Error {
  constructor(message: string, public statusCode?: number) {
    super(message)
    this.name = 'CCApiError'
  }
}

class ContractorsCloudClient {
  private apiKey: string
  private baseUrl: string

  constructor(apiKey: string, baseUrl?: string) {
    this.apiKey = apiKey
    this.baseUrl = baseUrl || DEFAULT_CC_BASE_URL
  }

  private async request<T>(endpoint: string, params: Record<string, string> = {}): Promise<T> {
    const url = new URL(`${this.baseUrl}${endpoint}`)
    for (const [key, value] of Object.entries(params)) {
      url.searchParams.set(key, value)
    }

    const res = await fetch(url.toString(), {
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
    })

    if (!res.ok) {
      const text = await res.text()
      throw new CCApiError(
        `Contractors Cloud API Error: ${res.status} ${res.statusText} - ${text}`,
        res.status
      )
    }

    return res.json() as Promise<T>
  }

  /**
   * Search accounts by name. Uses filter[name] for server-side filtering.
   * Returns up to 20 matching accounts.
   */
  async searchAccounts(query: string): Promise<CCAccount[]> {
    const params: Record<string, string> = {
      'page[size]': '20',
      'page[number]': '1',
      'sort': '-updated_at',
    }

    if (query.trim()) {
      params['filter[name]'] = query.trim()
    }

    const response = await this.request<CCPaginatedResponse<CCAccount>>('/accounts', params)
    return response.data || []
  }

  /**
   * Get a single account by ID.
   */
  async getAccount(accountId: number): Promise<CCAccount> {
    return this.request<CCAccount>(`/accounts/${accountId}`)
  }
}

/**
 * Create a CC client from environment variables.
 * Returns null if not configured.
 */
export function createCCClient(): ContractorsCloudClient | null {
  const apiKey = process.env.CC_API_KEY
  if (!apiKey) return null
  const baseUrl = process.env.CC_API_BASE_URL || DEFAULT_CC_BASE_URL
  return new ContractorsCloudClient(apiKey, baseUrl)
}

export { ContractorsCloudClient, CCApiError }
