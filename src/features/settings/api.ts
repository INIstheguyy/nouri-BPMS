import { z } from 'zod'

import { supabase } from '../../lib/supabase/client'
import type { Database } from '../../types/database'

const settingsSchema = z.object({
  duplicateWarningHours: z.number().int(),
  defaultCurrency: z.string(),
  businessPhone: z.string().nullable(),
  businessEmail: z.string().nullable(),
  updatedAt: z.string(),
})

export type OperationalSettings = z.infer<typeof settingsSchema>
export type OfferConfiguration =
  Database['public']['Functions']['list_offer_configuration']['Returns'][number]

export async function getOperationalSettings() {
  const { data, error } = await supabase.rpc('get_operational_settings')
  if (error) throw error
  return settingsSchema.parse(data)
}

export async function updateOperationalSettings(input: {
  duplicateWarningHours: number
  businessPhone: string
  businessEmail: string
}) {
  const { data, error } = await supabase.rpc('update_operational_settings', {
    updated_duplicate_warning_hours: input.duplicateWarningHours,
    updated_business_phone: input.businessPhone,
    updated_business_email: input.businessEmail,
  })
  if (error) throw error
  return settingsSchema.parse(data)
}

export async function listOfferConfiguration() {
  const { data, error } = await supabase.rpc('list_offer_configuration')
  if (error) throw error
  return data
}

export async function updateOfferConfiguration(input: {
  offerId: string
  active: boolean
  basePrice: number
  prepaidPrice: number | null
  sortOrder: number
}) {
  const { error } = await supabase.rpc('update_offer_configuration', {
    target_offer_id: input.offerId,
    updated_active: input.active,
    updated_base_price: input.basePrice,
    updated_prepaid_price: input.prepaidPrice as number,
    updated_sort_order: input.sortOrder,
  })
  if (error) throw error
}
