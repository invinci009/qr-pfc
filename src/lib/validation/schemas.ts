import { z } from 'zod'

// === Rating ===
export const ratingSchema = z.number().int().min(1).max(5)

// === Campaign Slug ===
export const slugSchema = z
  .string()
  .min(3)
  .max(40)
  .regex(/^[a-z0-9-]+$/, 'Slug must contain only lowercase letters, numbers, and hyphens')

// === Google Review URL ===
const ALLOWED_GOOGLE_HOSTS = [
  'google.com',
  'www.google.com',
  'search.google.com',
  'g.page',
  'maps.app.goo.gl',
  'goo.gl',
]

export const googleReviewUrlSchema = z
  .string()
  .trim()
  .optional()
  .nullable()
  .transform((val) => {
    if (!val || val === '') return null
    // Auto-convert Google Place ID to direct write-review URL
    if (val.startsWith('ChIJ')) {
      return `https://search.google.com/local/writereview?placeid=${val}`
    }
    return val
  })
  .refine(
    (url) => {
      if (!url) return true
      try {
        const { hostname, protocol } = new URL(url)
        return (
          (protocol === 'https:' || protocol === 'http:') &&
          ALLOWED_GOOGLE_HOSTS.some(
            (allowed) => hostname === allowed || hostname.endsWith('.' + allowed)
          )
        )
      } catch {
        return false
      }
    },
    { message: 'Must be a valid Google review URL or Place ID (e.g. ChIJ...)' }
  )

// === Quiz Answer Schemas ===
export const overallRatingSchema = z.object({ value: ratingSchema })
export const foodRatingSchema = z.object({ value: ratingSchema })
export const serviceRatingSchema = z.object({ value: ratingSchema })

export const likedValues = [
  'food',
  'service',
  'ambience',
  'portion_size',
  'presentation',
  'value',
] as const
export const likedSchema = z.object({
  value: z.array(z.enum(likedValues)),
})

export const orderedSchema = z.object({
  value: z.array(z.string()), // menu_item_ids or "other"
})

export const commentSchema = z.object({
  value: z.string().max(500),
})

export const returnIntentValues = [
  'definitely',
  'probably',
  'maybe',
  'probably_not',
] as const
export const returnIntentSchema = z.object({
  value: z.enum(returnIntentValues),
})

// === Session Submit (server-side validation) ===
export const sessionSubmitSchema = z.object({
  overall_rating: ratingSchema,
  food_rating: ratingSchema,
  service_rating: ratingSchema,
})

// === Business ===
export const businessCreateSchema = z.object({
  name: z.string().min(1).max(200),
  category: z.literal('restaurant').default('restaurant'),
  location: z.string().max(500).optional(),
  phone: z.string().max(50).optional().nullable(),
  secondary_phone: z.string().max(100).optional().nullable(),
  timezone: z.string().default('Asia/Kolkata'),
  logo_url: z.string().max(500).optional().nullable(),
  primary_color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional().nullable(),
  welcome_message: z.record(z.string(), z.string()).optional(),
  google_review_url: googleReviewUrlSchema.optional().nullable(),
})

// === Campaign ===
export const campaignCreateSchema = z.object({
  name: z.string().min(1).max(200),
  slug: slugSchema.optional(), // auto-generated if not provided
})

// === Private Feedback ===
export const privateFeedbackCategories = [
  'food',
  'service',
  'waiting_time',
  'cleanliness',
  'billing',
  'other',
] as const

export const privateFeedbackSchema = z.object({
  category: z.enum(privateFeedbackCategories),
  message: z.string().min(1).max(1000),
  contact_name: z.string().max(100).optional().nullable(),
  contact_value: z.string().max(200).optional().nullable(),
  contact_consent: z.boolean().default(false),
})

// === Event ===
export const eventTypes = [
  'QR_SCANNED',
  'LANDING_VIEWED',
  'QUIZ_STARTED',
  'QUESTION_ANSWERED',
  'QUIZ_COMPLETED',
  'DRAFT_GENERATED',
  'DRAFT_EDITED',
  'GOOGLE_CLICKED',
  'PRIVATE_FEEDBACK_SUBMITTED',
] as const

export const clientEventSchema = z.object({
  event_type: z.enum(eventTypes),
  client_event_id: z.string().uuid(),
  metadata: z.record(z.string(), z.unknown()).optional().default({}),
})
