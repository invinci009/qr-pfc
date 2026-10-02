export type AspectTone = 'negative' | 'neutral' | 'positive'

export interface FactAspect {
  rating: number
  tone: AspectTone
}

export interface FactSheet {
  language: string
  overall?: FactAspect
  food?: FactAspect
  service?: FactAspect
  liked: string[]
  ordered: string[]
  comment: string | null
}

export function ratingToTone(rating: number): AspectTone {
  if (rating <= 2) return 'negative'
  if (rating === 3) return 'neutral'
  return 'positive'
}

/**
 * Builds the fact sheet from stored answers.
 * This is the ONLY data source allowed to feed draft generation.
 */
export function buildFactSheet(
  answers: Array<{ question_key: string; value: unknown }>,
  menuItemNames: Record<string, string> = {},
  language: string = 'en'
): FactSheet {
  const answerMap = new Map(answers.map((a) => [a.question_key, a.value]))

  const overallRating = answerMap.get('overall_rating')
  const foodRating = answerMap.get('food_rating')
  const serviceRating = answerMap.get('service_rating')
  const liked = (answerMap.get('liked') as string[]) || []
  const orderedIds = (answerMap.get('ordered') as string[]) || []
  const comment = (answerMap.get('comment') as string) || null

  const ordered: string[] = []
  for (const id of orderedIds) {
    if (id === 'other') {
      ordered.push('other specialties')
    } else if (menuItemNames[id]) {
      ordered.push(menuItemNames[id])
    }
  }

  const factSheet: FactSheet = {
    language,
    liked,
    ordered,
    comment: comment ? sanitizeComment(comment) : null,
  }

  if (typeof overallRating === 'number' && overallRating >= 1 && overallRating <= 5) {
    factSheet.overall = { rating: overallRating, tone: ratingToTone(overallRating) }
  }

  if (typeof foodRating === 'number' && foodRating >= 1 && foodRating <= 5) {
    factSheet.food = { rating: foodRating, tone: ratingToTone(foodRating) }
  }

  if (typeof serviceRating === 'number' && serviceRating >= 1 && serviceRating <= 5) {
    factSheet.service = { rating: serviceRating, tone: ratingToTone(serviceRating) }
  }

  return factSheet
}

function sanitizeComment(text: string): string {
  // Strip URLs, emails, phone numbers to prevent prompt injection or PII leakage
  return text
    .replace(/https?:\/\/\S+/gi, '')
    .replace(/[\w.-]+@[\w.-]+\.\w+/gi, '')
    .replace(/\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g, '')
    .trim()
    .slice(0, 300)
}
