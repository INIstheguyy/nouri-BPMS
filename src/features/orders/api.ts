import { z } from 'zod'

import { supabase } from '../../lib/supabase/client'
import type { Database } from '../../types/database'

type ListOrderRow = Database['public']['Functions']['list_orders']['Returns'][number]
export type OrderStatus = Database['public']['Enums']['order_status']
type OrderSource = Database['public']['Enums']['order_source']
type PaymentMethod = Database['public']['Enums']['payment_method']
export type PaymentStatus = Database['public']['Enums']['payment_status']

export type OrderSummary = ListOrderRow

export interface OrderFilters {
  search: string
  status: '' | OrderStatus
  source: '' | OrderSource
  paymentMethod: '' | PaymentMethod
  from: string
  to: string
  page: number
  pageSize: number
}

export interface OrderPageResult {
  orders: OrderSummary[]
  total: number
}

const nullableString = z.string().nullable()
const orderDetailSchema = z.object({
  id: z.string().uuid(),
  orderNumber: z.string(),
  status: z.enum(['NEW', 'CONTACTED', 'UNREACHABLE', 'CONFIRMED', 'CANCELLED', 'COMPLETED']),
  source: z.string(),
  sourceDetail: nullableString,
  possibleDuplicate: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
  currency: z.string(),
  subtotalAmount: z.number(),
  discountAmount: z.number(),
  deliveryFeeAmount: z.number(),
  totalAmount: z.number(),
  paymentMethod: z.enum(['COD', 'PREPAID']),
  customerNote: nullableString,
  internalNote: nullableString,
  customer: z.object({
    id: z.string().uuid(),
    firstName: z.string(),
    lastName: nullableString,
    phone: z.string(),
    whatsappPhone: nullableString,
    alternativePhone: nullableString,
    email: nullableString,
  }),
  offer: z.object({ id: z.string().uuid(), name: z.string(), code: z.string() }),
  items: z.array(
    z.object({
      id: z.string().uuid(),
      name: z.string(),
      sku: nullableString,
      type: z.enum(['PRODUCT', 'BONUS']),
      quantity: z.number(),
      unitPrice: z.number(),
      totalPrice: z.number(),
    }),
  ),
  payment: z.object({
    status: z.string(),
    method: z.enum(['COD', 'PREPAID']),
    amount: z.number(),
    provider: nullableString,
    providerReference: nullableString,
    paidAt: nullableString,
  }),
  delivery: z.object({
    status: z.string(),
    recipientName: z.string(),
    recipientPhone: z.string(),
    state: z.string(),
    city: nullableString,
    area: z.string(),
    addressLine: z.string(),
    landmark: nullableString,
    scheduledDate: nullableString,
    deliveryWindow: nullableString,
    courierName: nullableString,
    trackingReference: nullableString,
  }),
  attribution: z.record(z.string(), z.unknown()),
  timeline: z.array(
    z.object({
      id: z.string().uuid(),
      action: z.string(),
      fromState: nullableString,
      toState: nullableString,
      actorUserId: nullableString,
      metadata: z.record(z.string(), z.unknown()),
      createdAt: z.string(),
    }),
  ),
})

export type OrderDetail = z.infer<typeof orderDetailSchema>

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

export async function getOrderDetail(orderId: string): Promise<OrderDetail> {
  const { data, error } = await supabase.rpc('get_order_detail', { target_order_id: orderId })
  if (error) throw error
  return orderDetailSchema.parse(data)
}

export interface ManualOrderPayload {
  firstName: string
  lastName: string
  phone: string
  alternativePhone: string
  email: string
  offerId: string
  paymentMethod: PaymentMethod
  state: string
  city: string
  area: string
  addressLine: string
  landmark: string
  source: 'WHATSAPP' | 'PHONE' | 'OTHER'
  sourceDetail: string
  customerNote: string
  internalNote: string
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

export type WorkflowCommand =
  | { type: 'CONTACT'; orderId: string }
  | { type: 'UNREACHABLE'; orderId: string }
  | { type: 'CONFIRM'; orderId: string }
  | { type: 'CANCEL'; orderId: string; reasonCode: string; reasonNote: string }
  | { type: 'COMPLETE'; orderId: string }
  | { type: 'OVERRIDE'; orderId: string; targetStatus: OrderStatus; reason: string }

export async function runOrderWorkflowCommand(command: WorkflowCommand): Promise<OrderStatus> {
  if (command.type === 'CONTACT') {
    const { data, error } = await supabase.rpc('mark_order_contacted', {
      target_order_id: command.orderId,
    })
    if (error) throw error
    return data
  }
  if (command.type === 'UNREACHABLE') {
    const { data, error } = await supabase.rpc('mark_order_unreachable', {
      target_order_id: command.orderId,
    })
    if (error) throw error
    return data
  }
  if (command.type === 'CONFIRM') {
    const { data, error } = await supabase.rpc('confirm_order', {
      target_order_id: command.orderId,
    })
    if (error) throw error
    return data
  }
  if (command.type === 'CANCEL') {
    const { data, error } = await supabase.rpc('cancel_order', {
      target_order_id: command.orderId,
      cancellation_code: command.reasonCode,
      cancellation_note: command.reasonNote,
    })
    if (error) throw error
    return data
  }
  if (command.type === 'COMPLETE') {
    const { data, error } = await supabase.rpc('complete_order', {
      target_order_id: command.orderId,
    })
    if (error) throw error
    return data
  }

  const { data, error } = await supabase.rpc('override_order_status', {
    target_order_id: command.orderId,
    target_status: command.targetStatus,
    override_reason: command.reason,
  })
  if (error) throw error
  return data
}

export type DeliveryStatus = Database['public']['Enums']['delivery_status']
type DeliveryAttentionRow =
  Database['public']['Functions']['list_delivery_attention']['Returns'][number]
export type DeliveryAttention = Omit<
  DeliveryAttentionRow,
  'delivery_window' | 'failure_reason_code' | 'scheduled_date'
> & {
  delivery_window: string | null
  failure_reason_code: string | null
  scheduled_date: string | null
}

export type DeliveryCommand =
  | {
      type: 'SCHEDULE'
      orderId: string
      scheduledDate: string
      deliveryWindow: string
      recipientName: string
      recipientPhone: string
      state: string
      city: string
      area: string
      addressLine: string
      landmark: string
      note: string
    }
  | {
      type: 'DISPATCH'
      orderId: string
      courierName: string
      courierPhone: string
      trackingReference: string
      note: string
    }
  | { type: 'DELIVER'; orderId: string; note: string }
  | { type: 'FAIL'; orderId: string; reasonCode: string; reasonNote: string }

export async function runDeliveryCommand(command: DeliveryCommand): Promise<DeliveryStatus> {
  if (command.type === 'SCHEDULE') {
    const { data, error } = await supabase.rpc('schedule_delivery', {
      target_order_id: command.orderId,
      target_scheduled_date: command.scheduledDate,
      target_delivery_window: command.deliveryWindow,
      target_recipient_name: command.recipientName,
      target_recipient_phone: command.recipientPhone,
      target_state: command.state,
      target_city: command.city,
      target_area: command.area,
      target_address_line: command.addressLine,
      target_landmark: command.landmark,
      schedule_note: command.note,
    })
    if (error) throw error
    return data
  }
  if (command.type === 'DISPATCH') {
    const { data, error } = await supabase.rpc('dispatch_order', {
      target_order_id: command.orderId,
      target_courier_name: command.courierName,
      target_courier_phone: command.courierPhone,
      target_tracking_reference: command.trackingReference,
      dispatch_note: command.note,
    })
    if (error) throw error
    return data
  }
  if (command.type === 'DELIVER') {
    const { data, error } = await supabase.rpc('mark_order_delivered', {
      target_order_id: command.orderId,
      delivery_note: command.note,
    })
    if (error) throw error
    return data
  }

  const { data, error } = await supabase.rpc('fail_delivery', {
    target_order_id: command.orderId,
    failure_code: command.reasonCode,
    failure_note: command.reasonNote,
  })
  if (error) throw error
  return data
}

export async function listDeliveryAttention(queueDate: string): Promise<DeliveryAttention[]> {
  const { data, error } = await supabase.rpc('list_delivery_attention', {
    queue_date: queueDate,
  })
  if (error) throw error
  return data
}

export async function markCodPaid(orderId: string, collectionNote: string): Promise<PaymentStatus> {
  const { data, error } = await supabase.rpc('mark_cod_paid', {
    target_order_id: orderId,
    collection_note: collectionNote,
  })
  if (error) throw error
  return data
}

export interface PrepaidInitialization {
  provider: string
  reference: string
  amount: number
  currency: string
  alreadyInitialized: boolean
  mode: 'test'
}

export async function initializePrepaidPayment(orderId: string): Promise<PrepaidInitialization> {
  const response = await supabase.functions.invoke<{ data?: PrepaidInitialization }>(
    'initialize-prepaid-payment',
    { body: { orderId } },
  )
  if (response.error) throw response.error
  if (!response.data?.data) throw new Error('Payment initialization returned no result.')
  return response.data.data
}

export function formatMoney(amount: number, currency: string) {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(amount / 100)
}

export function phoneHref(phone: string, scheme: 'tel' | 'whatsapp') {
  const digits = phone.replace(/\D/g, '')
  return scheme === 'tel' ? `tel:+${digits}` : `https://wa.me/${digits}`
}
