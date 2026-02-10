/**
 * Contractors Cloud API Client — ported from sm-dashboard.
 * Used for client account search (type-ahead lookup by name)
 * and uploading production plan PDFs to client project files.
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

export interface CCProject {
  id: number
  account_id: number
  name: string | null
  created_at: string
  updated_at: string
}

export interface CCProjectFile {
  id: number
  file_type_id: number | null
  file_name: string
  created_at: string
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
      // filter[search] searches across name, first/last name, AND address fields
      // Unlike filter[name] which only matches single terms
      params['filter[search]'] = query.trim()
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

  /**
   * Get projects for an account. Returns the most recent project first.
   * In CC, each account typically has one or more projects (jobs).
   */
  async getProjectsByAccount(accountId: number): Promise<CCProject[]> {
    const response = await this.request<CCPaginatedResponse<CCProject>>('/projects', {
      'filter[account_id]': accountId.toString(),
      'page[size]': '10',
      'page[number]': '1',
      'sort': '-created_at',
    })
    return response.data || []
  }

  /**
   * Upload a file (PDF, CSV, etc.) to a project.
   * Uses POST /projects/{id}/files with multipart/form-data.
   *
   * CC file organization has two levels:
   *   - file_type_id: broad category (1=Documents, 6=Photos, 10=Forms)
   *   - file_description_id: specific label within category (e.g., 6172="Signed Production Plan")
   *
   * @param projectId - The CC project ID
   * @param fileBuffer - The file content as a Buffer
   * @param fileName - The display filename (e.g., "H&F Exteriors Production Plan - Smith - 01/15/2026.pdf")
   * @param options.fileTypeId - The broad file category ID (1 for documents/contracts)
   * @param options.fileDescriptionId - The specific file description/label ID (e.g., 6172 for "Signed Production Plan")
   * @param options.isVisibleOnCustomerPortal - Whether the file shows on the customer portal
   */
  async uploadProjectFile(projectId: number, fileBuffer: Buffer, fileName: string, options?: {
    fileTypeId?: number
    fileDescriptionId?: number
    isSensitive?: boolean
    isVisibleOnCustomerPortal?: boolean
  }): Promise<CCProjectFile> {
    const url = `${this.baseUrl}/projects/${projectId}/files`

    // Use FormData for multipart/form-data upload
    const formData = new FormData()
    const uint8 = new Uint8Array(fileBuffer)
    const blob = new Blob([uint8], { type: 'application/pdf' })
    formData.append('file', blob, fileName)

    if (options?.fileTypeId) {
      formData.append('file_type_id', options.fileTypeId.toString())
    }
    if (options?.fileDescriptionId) {
      formData.append('file_description_id', options.fileDescriptionId.toString())
    }
    if (options?.isSensitive !== undefined) {
      formData.append('is_sensitive', options.isSensitive ? '1' : '0')
    }
    if (options?.isVisibleOnCustomerPortal !== undefined) {
      formData.append('is_visible_on_customer_portal', options.isVisibleOnCustomerPortal ? '1' : '0')
    }

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Accept': 'application/json',
        // Don't set Content-Type — fetch auto-sets it with boundary for FormData
      },
      body: formData,
    })

    if (!res.ok) {
      const text = await res.text()
      throw new CCApiError(
        `CC file upload failed: ${res.status} ${res.statusText} - ${text}`,
        res.status
      )
    }

    return res.json() as Promise<CCProjectFile>
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
