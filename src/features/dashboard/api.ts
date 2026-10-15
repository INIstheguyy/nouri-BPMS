import { z } from 'zod'

import { supabase } from '../../lib/supabase/client'

const operationsOrderSchema = z.object({
  orderId: z.string().uuid(),
  orderNumber: z.string(),
  customerName: z.string(),
  customerPhone: z.string(),
  status: z.string(),
  createdAt: z.string(),
})

const operationsDashboardSchema = z.object({
  date: z.string(),
  metrics: z.object({
    newOrders: z.number(),
    awaitingConfirmation: z.number(),
    unreachableOrders: z.number(),
    scheduledToday: z.number(),
    dispatchedToday: z.number(),
    failedDeliveries: z.number(),
  }),
  newestUnhandled: z.array(operationsOrderSchema),
  overdueConfirmation: z.array(operationsOrderSchema),
  todayDeliveries: z.array(
    z.object({
      orderId: z.string().uuid(),
      orderNumber: z.string(),
      customerName: z.string(),
      customerPhone: z.string(),
      deliveryStatus: z.string(),
      scheduledDate: z.string(),
      deliveryWindow: z.string().nullable(),
      area: z.string(),
      state: z.string(),
    }),
  ),
  failedDeliveryQueue: z.array(
    z.object({
      orderId: z.string().uuid(),
      orderNumber: z.string(),
      customerName: z.string(),
      customerPhone: z.string(),
      failureReasonCode: z.string().nullable(),
      area: z.string(),
      state: z.string(),
      updatedAt: z.string(),
    }),
  ),
})

const executiveDashboardSchema = z.object({
  dateFrom: z.string(),
  dateTo: z.string(),
  currency: z.string(),
  metrics: z.object({
    submittedOrders: z.number(),
    confirmedOrders: z.number(),
    deliveredOrders: z.number(),
    completedOrders: z.number(),
    paidOrders: z.number(),
    cancelledOrders: z.number(),
    failedDeliveries: z.number(),
    submittedValue: z.number(),
    deliveredRevenue: z.number(),
    paidRevenue: z.number(),
    codSuccessRate: z.number(),
    cancellationRate: z.number(),
    failedDeliveryRate: z.number(),
    confirmationConversion: z.number(),
    deliveryConversion: z.number(),
    paidConversion: z.number(),
  }),
  sourceBreakdown: z.array(
    z.object({
      source: z.string(),
      submittedOrders: z.number(),
      deliveredOrders: z.number(),
      paidOrders: z.number(),
      submittedValue: z.number(),
      paidRevenue: z.number(),
    }),
  ),
})

export type OperationsDashboard = z.infer<typeof operationsDashboardSchema>
export type ExecutiveDashboard = z.infer<typeof executiveDashboardSchema>

export async function getOperationsDashboard(date: string): Promise<OperationsDashboard> {
  const { data, error } = await supabase.rpc('get_operations_dashboard', {
    dashboard_date: date,
  })
  if (error) throw error
  return operationsDashboardSchema.parse(data)
}

export async function getExecutiveDashboard(
  dateFrom: string,
  dateTo: string,
): Promise<ExecutiveDashboard> {
  const { data, error } = await supabase.rpc('get_executive_dashboard', {
    date_from: dateFrom,
    date_to: dateTo,
  })
  if (error) throw error
  return executiveDashboardSchema.parse(data)
}
