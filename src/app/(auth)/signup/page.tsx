import { redirect } from 'next/navigation'

// Registration is disabled — this is a single-tenant app for Patna Fried Chicken (PFC) only.
export default function SignupPage() {
  redirect('/login')
}
