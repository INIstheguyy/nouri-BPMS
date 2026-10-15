import { supabase } from '../../lib/supabase/client'
import type { Database } from '../../types/database'

export type StaffMember = Database['public']['Functions']['list_staff']['Returns'][number]
export type StaffRole = 'ORDER_MANAGER' | 'EXECUTIVE_ADMIN'

export interface StaffFilters {
  search: string
  page: number
  pageSize: number
}

interface StaffCommandResponse {
  data: { id: string }
}

export async function listStaff(filters: StaffFilters) {
  const { data, error } = await supabase.rpc('list_staff', {
    page_number: filters.page,
    page_size: filters.pageSize,
    ...(filters.search ? { search_text: filters.search } : {}),
  })
  if (error) throw error
  return { staff: data, total: data[0]?.total_count ?? 0 }
}

export async function inviteStaff(input: { email: string; fullName: string; roleCode: StaffRole }) {
  const response = await supabase.functions.invoke<StaffCommandResponse>('invite-staff', {
    body: input,
  })
  if (response.error) throw new Error('The staff invitation failed.')
  if (!response.data) throw new Error('The staff invitation returned no result.')
  return response.data.data
}

export async function updateStaffAccess(input: { userId: string; active: boolean }) {
  const response = await supabase.functions.invoke<StaffCommandResponse>('update-staff-access', {
    body: input,
  })
  if (response.error) throw new Error('The staff access update failed.')
  if (!response.data) throw new Error('The staff access update returned no result.')
  return response.data.data
}

export async function updateStaffRole(input: { userId: string; roleCode: StaffRole }) {
  const response = await supabase.functions.invoke<StaffCommandResponse>('update-staff-role', {
    body: input,
  })
  if (response.error) throw new Error('The staff role update failed.')
  if (!response.data) throw new Error('The staff role update returned no result.')
  return response.data.data
}
