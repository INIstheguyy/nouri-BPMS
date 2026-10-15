import { z } from 'zod'

import { supabase } from '../../lib/supabase/client'
import type { Database } from '../../types/database'

export type CustomerSummary = Database['public']['Functions']['list_customers']['Returns'][number]

export interface CustomerFilters {
  search: string
  page: number
  pageSize: number
}

export interface CustomerPageResult {
  customers: CustomerSummary[]
  total: number
}

const nullableString = z.string().nullable()
const customerDetailSchema = z.object({
  id: z.string().uuid(),
  firstName: z.string(),
  lastName: nullableString,
  primaryPhone: z.string(),
  whatsappPhone: nullableString,
  alternativePhone: nullableString,
  email: nullableString,
  state: nullableString,
  city: nullableString,
  area: nullableString,
  defaultAddress: nullableString,
  createdAt: z.string(),
  summary: z.object({
    totalOrders: z.number(),
    deliveredOrders: z.number(),
    cancelledOrders: z.number(),
    failedDeliveries: z.number(),
    totalPaidSpend: z.number(),
    currency: z.string(),
    firstAcquisitionSource: nullableString,
    mostRecentAcquisitionSource: nullableString,
  }),
  orderHistory: z.array(
    z.object({
      id: z.string().uuid(),
      orderNumber: z.string(),
      status: z.string(),
      source: z.string(),
      offerName: z.string(),
      totalAmount: z.number(),
      currency: z.string(),
      paymentMethod: z.string(),
      paymentStatus: z.string(),
      deliveryStatus: z.string(),
      createdAt: z.string(),
    }),
  ),
})

export type CustomerDetail = z.infer<typeof customerDetailSchema>

export async function listCustomers(filters: CustomerFilters): Promise<CustomerPageResult> {
  const { data, error } = await supabase.rpc('list_customers', {
    page_number: filters.page,
    page_size: filters.pageSize,
    ...(filters.search ? { search_text: filters.search } : {}),
  })
  if (error) throw error
  return { customers: data, total: data[0]?.total_count ?? 0 }
}

export async function getCustomerDetail(customerId: string): Promise<CustomerDetail> {
  const { data, error } = await supabase.rpc('get_customer_detail', {
    target_customer_id: customerId,
  })
  if (error) throw error
  return customerDetailSchema.parse(data)
}
