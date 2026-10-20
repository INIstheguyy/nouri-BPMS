import { supabase } from '../../../lib/supabase/client'

import {
  orderDetailSchema,
  type ManualOrderPayload,
  type OrderFilters,
  type OrderPageResult,
} from './types'

export async function listOrders(filters: OrderFilters): Promise<OrderPageResult> {
  const { data, error } = await supabase.rpc('list_orders', {
    page_number: filters.page,
    page_size: filters.pageSize,
    ...(filters.search ? { search_text: filters.search } : {}),
    ...(filters.status ? { status_filter: filters.status } : {}),
    ...(filters.source ? { source_filter: filters.source } : {}),
    ...(filters.paymentMethod ? { payment_method_filter: filters.paymentMethod } : {}),
    ...(filters.from ? { created_from: filters.from } : {}),
    ...(filters.to ? { created_to: filters.to } : {}),
  })
  if (error) throw error
  return { orders: data, total: data[0]?.total_count ?? 0 }
}

export async function getOrderDetail(orderId: string) {
  const { data, error } = await supabase.rpc('get_order_detail', { target_order_id: orderId })
  if (error) throw error
  return orderDetailSchema.parse(data)
}

export async function createManualOrder(payload: ManualOrderPayload) {
  const { data, error } = await supabase.rpc('create_manual_order', {
    customer_first_name: payload.firstName,
    customer_last_name: payload.lastName,
    customer_phone: payload.phone,
    customer_alternative_phone: payload.alternativePhone,
    customer_email: payload.email,
    selected_offer_id: payload.offerId,
    selected_payment_method: payload.paymentMethod,
    delivery_state: payload.state,
    delivery_city: payload.city,
    delivery_area: payload.area,
    delivery_address_line: payload.addressLine,
    delivery_landmark: payload.landmark,
    acquisition_source: payload.source,
    acquisition_source_detail: payload.sourceDetail,
    submitted_customer_note: payload.customerNote,
    submitted_internal_note: payload.internalNote,
  })
  if (error) throw error
  const result = data[0]
  if (!result) throw new Error('The manual order was not created.')
  return result
}

export async function updateOrderNotes(
  orderId: string,
  customerNote: string,
  internalNote: string,
) {
  const { error } = await supabase.rpc('update_order_notes', {
    target_order_id: orderId,
    updated_customer_note: customerNote,
    updated_internal_note: internalNote,
  })
  if (error) throw error
}
