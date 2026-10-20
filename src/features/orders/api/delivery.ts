import { supabase } from '../../../lib/supabase/client'

import type { DeliveryAttention, DeliveryCommand, DeliveryStatus } from './types'

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
  const { data, error } = await supabase.rpc('list_delivery_attention', { queue_date: queueDate })
  if (error) throw error
  return data
}
