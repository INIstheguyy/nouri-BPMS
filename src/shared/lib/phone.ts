export function phoneHref(phone: string, scheme: 'tel' | 'whatsapp') {
  const digits = phone.replace(/\D/g, '')
  return scheme === 'tel' ? `tel:+${digits}` : `https://wa.me/${digits}`
}
