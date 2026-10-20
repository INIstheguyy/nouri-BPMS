import { supabase } from '../../../lib/supabase/client'

import type { OrderStatus, WorkflowCommand } from './types'

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
