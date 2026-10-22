import { z } from 'zod'

import type { Database } from '../../../types/database'

type ListOrderRow = Database['public']['Functions']['list_orders']['Returns'][number]
export type OrderStatus = Database['public']['Enums']['order_status']
export type OrderSource = Database['public']['Enums']['order_source']
export type PaymentMethod = Database['public']['Enums']['payment_method']
export type PaymentStatus = Database['public']['Enums']['payment_status']
export type DeliveryStatus = Database['public']['Enums']['delivery_status']
export type OrderQueueFilter = '' | 'new' | 'follow-up' | 'delivery' | 'failed' | 'done'

export type OrderSummary = ListOrderRow

export interface OrderFilters {
  search: string
  queue: OrderQueueFilter
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
export const orderDetailSchema = z.object({
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
      actorName: nullableString,
      note: nullableString,
      metadata: z.record(z.string(), z.unknown()),
      createdAt: z.string(),
    }),
  ),
})

export type OrderDetail = z.infer<typeof orderDetailSchema>

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

export type WorkflowCommand =
  | { type: 'CONTACT'; orderId: string }
  | { type: 'UNREACHABLE'; orderId: string }
  | { type: 'CONFIRM'; orderId: string }
  | { type: 'CANCEL'; orderId: string; reasonCode: string; reasonNote: string }
  | { type: 'COMPLETE'; orderId: string }
  | { type: 'OVERRIDE'; orderId: string; targetStatus: OrderStatus; reason: string }

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

export interface PrepaidInitialization {
  provider: string
  reference: string
  amount: number
  currency: string
  alreadyInitialized: boolean
  mode: 'test'
}
