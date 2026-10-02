import { createHash } from 'crypto'
import type { FactSheet } from './fact-sheet'
import { validateDraft } from './validators'

export interface GenerationResult {
  text: string
  method: 'llm' | 'template' | 'fallback'
}

/**
 * Deterministic sentence banks seeded by session_id to satisfy CG-7 (anti-repetition).
 */
const OVERALL_POSITIVE = [
  'Had a really pleasant visit here today.',
  'Really enjoyed my dining experience at this place.',
  'Had a great time visiting today.',
  'Wonderful experience dining here today.',
]

const OVERALL_NEUTRAL = [
  'Visited here today for a meal.',
  'Stopped by for dining today.',
  'An okay visit overall today.',
]

const OVERALL_NEGATIVE = [
  'Visited here today, but the visit was disappointing.',
  'Dined here today, though the overall visit fell short.',
  'Stopped by today, but my experience was not as expected.',
]

const FOOD_POSITIVE = [
  'The food was very flavorful and fresh.',
  'Really enjoyed the flavors and quality of the dishes.',
  'The dishes were prepared well and tasted good.',
]

const FOOD_NEUTRAL = [
  'The food was acceptable and decent.',
  'The meal was okay and met standard expectations.',
]

const FOOD_NEGATIVE = [
  'The food was lacking flavor and did not meet expectations.',
  'The dishes served were disappointing in taste.',
]

const SERVICE_POSITIVE = [
  'The staff was polite and attentive throughout.',
  'Service was friendly and promptly delivered.',
  'The hospitality was warm and accommodating.',
]

const SERVICE_NEUTRAL = [
  'Service was standard and adequate.',
  'Staff attended to our table without delay.',
]

const SERVICE_NEGATIVE = [
  'The service was quite slow and needed more attention.',
  'Staff could have been more attentive and responsive.',
]

function getSeededIndex(seed: string, length: number): number {
  const hash = createHash('md5').update(seed).digest('hex')
  const num = parseInt(hash.substring(0, 8), 16)
  return num % length
}

/**
 * Generates a deterministic review draft using tone-matched phrasing banks.
 */
export function generateDeterministicDraft(factSheet: FactSheet, sessionId: string): string {
  const sentences: string[] = []

  // 1. Overall Sentence
  const overallTone = factSheet.overall?.tone || 'positive'
  if (overallTone === 'positive') {
    sentences.push(OVERALL_POSITIVE[getSeededIndex(sessionId + '-ov', OVERALL_POSITIVE.length)])
  } else if (overallTone === 'neutral') {
    sentences.push(OVERALL_NEUTRAL[getSeededIndex(sessionId + '-ov', OVERALL_NEUTRAL.length)])
  } else {
    sentences.push(OVERALL_NEGATIVE[getSeededIndex(sessionId + '-ov', OVERALL_NEGATIVE.length)])
  }

  // 2. Food Sentence
  const foodTone = factSheet.food?.tone || 'positive'
  if (foodTone === 'positive') {
    sentences.push(FOOD_POSITIVE[getSeededIndex(sessionId + '-fd', FOOD_POSITIVE.length)])
  } else if (foodTone === 'neutral') {
    sentences.push(FOOD_NEUTRAL[getSeededIndex(sessionId + '-fd', FOOD_NEUTRAL.length)])
  } else {
    sentences.push(FOOD_NEGATIVE[getSeededIndex(sessionId + '-fd', FOOD_NEGATIVE.length)])
  }

  // 3. Dishes ordered or compliments liked
  if (factSheet.ordered.length > 0 && foodTone === 'positive') {
    const dishes = factSheet.ordered.slice(0, 2).join(' and ')
    sentences.push(`The ${dishes} stood out during our meal.`)
  } else if (factSheet.liked.length > 0 && overallTone === 'positive') {
    const aspects = factSheet.liked.slice(0, 2).join(' and ')
    sentences.push(`We especially appreciated the ${aspects}.`)
  }

  // 4. Service Sentence
  const serviceTone = factSheet.service?.tone || 'positive'
  if (serviceTone === 'positive') {
    sentences.push(SERVICE_POSITIVE[getSeededIndex(sessionId + '-sv', SERVICE_POSITIVE.length)])
  } else if (serviceTone === 'neutral') {
    sentences.push(SERVICE_NEUTRAL[getSeededIndex(sessionId + '-sv', SERVICE_NEUTRAL.length)])
  } else {
    sentences.push(SERVICE_NEGATIVE[getSeededIndex(sessionId + '-sv', SERVICE_NEGATIVE.length)])
  }

  return sentences.join(' ')
}

/**
 * Main review draft pipeline.
 * Tries LLM if API key is provided, verifies against validators, and falls back gracefully.
 */
export async function generateReviewDraft(
  factSheet: FactSheet,
  sessionId: string,
  restaurantName: string
): Promise<GenerationResult> {
  const apiKey = process.env.ANTHROPIC_API_KEY

  if (apiKey) {
    try {
      // 8s timeout controller
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 8000)

      const prompt = `You are helping a restaurant customer write a brief, authentic review draft for ${restaurantName}.
STRICT RULES:
1. Write in the first person ("I" / "We").
2. Length MUST be between 30 and 70 words.
3. Use ONLY facts from this Fact Sheet:
${JSON.stringify(factSheet, null, 2)}
4. Preserve sentiment: negative ratings MUST sound polite but dissatisfied; positive ratings must sound pleased.
5. Do NOT include staff names, prices, promotional offers, discounts, star ratings (e.g. "5 stars"), URLs, or hashtags.
6. Return plain text only without markdown formatting or quotation marks.`

      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          model: process.env.ANTHROPIC_MODEL || 'claude-haiku-4-5',
          max_tokens: 200,
          messages: [{ role: 'user', content: prompt }],
        }),
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      if (response.ok) {
        const data = await response.json()
        const candidateText = data?.content?.[0]?.text?.trim()
        if (candidateText) {
          const validation = validateDraft(candidateText, factSheet)
          if (validation.valid) {
            return { text: candidateText, method: 'llm' }
          }
        }
      }
    } catch (err) {
      console.warn('LLM draft generation failed or timed out, using deterministic fallback:', err)
    }
  }

  // Graceful deterministic template fallback
  const fallbackText = generateDeterministicDraft(factSheet, sessionId)
  return { text: fallbackText, method: 'template' }
}
