import { supabase } from '../../lib/supabase/client'

export interface PublicOffer {
  id: string
  code: string
  name: string
  basePrice: number
  prepaidPrice: number | null
  currency: string
  sortOrder: number
  items: Array<{
    id: string
    name: string
    quantity: number
    itemType: 'PRODUCT' | 'BONUS'
  }>
}

/** Safe active-offer read model used by both public and authenticated order forms. */
export async function listActiveOffers(): Promise<PublicOffer[]> {
  const { data, error } = await supabase
    .from('active_offer_catalog')
    .select(
      'offer_id,offer_code,offer_name,base_price,prepaid_price,currency,sort_order,offer_item_id,item_type,quantity,product_name',
    )
    .order('sort_order')
    .order('item_type')

  if (error) throw error

  const offers = new Map<string, PublicOffer>()

  for (const row of data) {
    if (
      !row.offer_id ||
      !row.offer_code ||
      !row.offer_name ||
      row.base_price === null ||
      !row.currency ||
      row.sort_order === null ||
      !row.offer_item_id ||
      !row.item_type ||
      row.quantity === null ||
      !row.product_name
    ) {
      throw new Error('The active offer catalog returned an incomplete row.')
    }

    const existing = offers.get(row.offer_id) ?? {
      id: row.offer_id,
      code: row.offer_code,
      name: row.offer_name,
      basePrice: row.base_price,
      prepaidPrice: row.prepaid_price,
      currency: row.currency,
      sortOrder: row.sort_order,
      items: [],
    }

    existing.items.push({
      id: row.offer_item_id,
      name: row.product_name,
      quantity: row.quantity,
      itemType: row.item_type,
    })
    offers.set(row.offer_id, existing)
  }

  return [...offers.values()].sort((left, right) => left.sortOrder - right.sortOrder)
}
