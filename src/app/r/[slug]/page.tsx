import { createAdminClient } from '@/lib/supabase/admin'
import QuizFlow from '@/components/quiz/QuizFlow'
import { Sparkles, AlertTriangle } from 'lucide-react'
import { cookies } from 'next/headers'

interface PublicQuizPageProps {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ new?: string }>
}

export default async function PublicQuizPage({ params, searchParams }: PublicQuizPageProps) {
  const { slug } = await params
  const { new: forceNew } = await searchParams
  const supabase = createAdminClient()

  // 1. Look up campaign by slug
  let { data: campaign } = await supabase
    .from('campaigns')
    .select('id, active, slug, business_id, google_review_url_override, businesses(id, name, logo_url, primary_color, welcome_message, google_review_url)')
    .eq('slug', slug)
    .maybeSingle()

  // Graceful fallback: If this slug was deleted or user enters custom slug, resolve to the active PFC Patna Fried Chicken campaign
  if (!campaign) {
    const { data: fallbackCampaign } = await supabase
      .from('campaigns')
      .select('id, active, slug, business_id, google_review_url_override, businesses(id, name, logo_url, primary_color, welcome_message, google_review_url)')
      .eq('active', true)
      .limit(1)
      .maybeSingle()

    if (fallbackCampaign) {
      campaign = fallbackCampaign
    }
  }

  // Fallback screen if no campaign exists at all
  if (!campaign) {
    return (
      <div className="min-h-screen bg-stone-50 text-stone-900 flex items-center justify-center p-4">
        <div className="w-full max-w-sm text-center p-6 sm:p-8 rounded-3xl bg-white border border-stone-200 shadow-xl space-y-4">
          <div className="w-12 h-12 mx-auto rounded-full bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <h1 className="text-xl font-bold text-stone-900">QR Code Not Found</h1>
          <p className="text-sm text-stone-500">
            This QR code is not valid or has been removed. Please ask your server at PFC - Patna Fried Chicken for assistance.
          </p>
          <div className="pt-2">
            <a
              href="tel:7091719475"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-rose-50 border border-rose-200 text-xs font-semibold text-rose-900 hover:bg-rose-100 transition-colors"
            >
              📞 Call: +91 7091719475
            </a>
          </div>
        </div>
      </div>
    )
  }

  // Inactive campaign fallback screen
  if (!campaign.active) {
    return (
      <div className="min-h-screen bg-stone-50 text-stone-900 flex items-center justify-center p-4">
        <div className="w-full max-w-sm text-center p-6 sm:p-8 rounded-3xl bg-white border border-stone-200 shadow-xl space-y-4">
          <div className="w-12 h-12 mx-auto rounded-full bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <h1 className="text-xl font-bold text-stone-900">Survey Temporarily Inactive</h1>
          <p className="text-sm text-stone-500">
            This feedback code is currently paused by PFC - Patna Fried Chicken. Please check with your server.
          </p>
          <div className="pt-2">
            <a
              href="tel:7091719475"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-rose-50 border border-rose-200 text-xs font-semibold text-rose-900 hover:bg-rose-100 transition-colors"
            >
              📞 Call: +91 7091719475
            </a>
          </div>
        </div>
      </div>
    )
  }

  const business = campaign.businesses as {
    id: string
    name: string
    logo_url: string | null
    primary_color: string | null
    welcome_message: Record<string, string> | null
    google_review_url: string | null
  } | null

  const googleReviewUrl = campaign.google_review_url_override || business?.google_review_url

  // 2. Fetch menu items for the ordered items step
  const { data: menuItems } = await supabase
    .from('menu_items')
    .select('id, name')
    .eq('business_id', campaign.business_id)
    .eq('active', true)
    .order('position')

  // 3. Resume existing session if cookie is present and ?new=1 is NOT passed
  let existingSessionId: string | null = null
  let existingStatus: string | null = null
  let existingAnswers: Record<string, any> = {}
  let existingDraftText: string | null = null

  if (forceNew !== '1') {
    const cookieStore = await cookies()
    const sessionCookie = cookieStore.get(`session_${slug}`)
    if (sessionCookie?.value) {
      const { data: session } = await supabase
        .from('sessions')
        .select('id, status')
        .eq('id', sessionCookie.value)
        .eq('campaign_id', campaign.id)
        .maybeSingle()

      if (session) {
        existingSessionId = session.id
        existingStatus = session.status

        const { data: answers } = await supabase
          .from('answers')
          .select('question_key, value')
          .eq('session_id', session.id)

        if (answers) {
          for (const a of answers) {
            existingAnswers[a.question_key] = a.value
          }
        }

        if (session.status === 'completed') {
          const { data: draftRecord } = await supabase
            .from('review_drafts')
            .select('final_text, original_text')
            .eq('session_id', session.id)
            .maybeSingle()

          if (draftRecord) {
            existingDraftText = draftRecord.final_text || draftRecord.original_text || null
          }
        }
      }
    }
  }

  const restaurantName = business?.name ?? 'Patna Fried Chicken (PFC)'
  const welcomeText =
    (business?.welcome_message?.en as string | undefined) ??
    'Welcome to Patna Fried Chicken (PFC)! Share your crispy dining experience with us in 30 seconds. For direct helpline & orders call 7091719475.'

  return (
    <div className="min-h-screen min-h-[100dvh] min-h-safe-screen bg-[#faf8f5] bg-gradient-to-b from-[#fdfbf7] via-[#fbf7ee] to-[#f6efe0] text-stone-900 flex flex-col justify-between px-3 sm:px-6 pt-safe pb-safe py-3 sm:py-6 selection:bg-rose-600 selection:text-white relative overflow-x-hidden font-sans">
      {/* Ambient warm gold & saffron glows */}
      <div className="fixed -top-12 left-1/2 -translate-x-1/2 w-80 h-80 bg-rose-400/15 rounded-full blur-3xl pointer-events-none" />
      <div className="fixed bottom-0 right-1/4 w-80 h-80 bg-amber-400/20 rounded-full blur-3xl pointer-events-none" />

      {/* Header Badge */}
      <header className="relative z-10 flex items-center justify-center pt-1 sm:pt-2">
        <div className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1 sm:py-1.5 rounded-full bg-white/95 border border-stone-200/90 shadow-xs backdrop-blur-md">
          <Sparkles className="w-3 sm:w-3.5 h-3 sm:h-3.5 text-rose-600 shrink-0" />
          <span className="text-[10px] sm:text-[11px] font-bold text-stone-900 tracking-wide">
            {restaurantName} • Guest Feedback
          </span>
        </div>
      </header>

      {/* Quiz Flow Orchestration */}
      <QuizFlow
        slug={campaign.slug}
        restaurantName={restaurantName}
        logoUrl={business?.logo_url}
        primaryColor={business?.primary_color}
        welcomeMessage={welcomeText}
        googleReviewUrl={googleReviewUrl}
        initialSessionId={existingSessionId}
        initialStatus={existingStatus}
        initialAnswers={existingAnswers}
        initialDraftText={existingDraftText}
        menuItems={menuItems || []}
      />

      {/* Mobile-Friendly Footer */}
      <footer className="relative z-10 text-center py-2 sm:py-3 text-[10px] sm:text-[11px] text-stone-500 flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2">
        <div className="flex items-center gap-1.5">
          <span>Powered by</span>
          <span className="font-bold text-stone-700">ReviewPulse</span>
          <span>•</span>
          <span className="font-semibold text-stone-800">{restaurantName}, Ashiyana Digha Rd, Patna</span>
        </div>
        <div className="flex items-center gap-1 text-rose-800 font-medium">
          <span>•</span>
          <a href="tel:7091719475" className="hover:underline flex items-center gap-1">
            <span>Helpline:</span>
            <strong>+91 7091719475</strong>
          </a>
        </div>
      </footer>
    </div>
  )
}
