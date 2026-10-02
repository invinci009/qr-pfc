/**
 * PFC - Patna Fried Chicken Restaurant Authentication & Alias Helpers
 */

export const PFC_PRIMARY_EMAIL = 'invincibleperson9@gmail.com'
export const PM_ZAIKA_PRIMARY_EMAIL = PFC_PRIMARY_EMAIL

const PFC_ALIASES = new Set([
  'admin',
  'owner',
  'pfc',
  'patnafriedchicken',
  'pfcpatna',
  'pfc-patna',
  'patna-fried-chicken',
  'admin@pfc.com',
  'owner@pfc.com',
  'admin@patnafriedchicken.com',
  'owner@patnafriedchicken.com',
  'pfc@gmail.com',
  'friedchicken',
  'ashiyana',
  // Backward compatibility aliases
  'zaika',
  'pmzaika',
  'pm-zaika',
  'admin@pmzaika.com',
  'owner@pmzaika.com',
  'admin@pm-zaika.com',
  'owner@pm-zaika.com',
  'pmzaika@gmail.com',
  'pmzaikapatna@gmail.com',
  'biryani',
  'charminar',
])

/**
 * Resolves any restaurant administrator alias or custom email
 * to the registered Supabase Auth email.
 */
export function resolvePfcEmail(input?: string | null): string | null {
  if (!input || typeof input !== 'string') return null
  const trimmed = input.trim()
  if (!trimmed) return null

  const lower = trimmed.toLowerCase()
  if (PFC_ALIASES.has(lower)) {
    return PFC_PRIMARY_EMAIL
  }

  return trimmed
}

// Alias for backwards compatibility
export const resolveZaikaEmail = resolvePfcEmail
