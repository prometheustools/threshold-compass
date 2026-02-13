import { createClient } from '@/lib/supabase/server'
import { isSchemaCacheTableMissingError } from '@/lib/supabase/errors'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/compass'

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error) {
      // Check if user needs onboarding
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: profile, error: profileLookupError } = await supabase
          .from('users')
          .select('onboarding_complete')
          .eq('id', user.id)
          .maybeSingle()

        if (profileLookupError) {
          if (isSchemaCacheTableMissingError(profileLookupError, 'users')) {
            return NextResponse.redirect(`${origin}/login?error=schema_missing`)
          }

          return NextResponse.redirect(`${origin}/login?error=profile_lookup_failed`)
        }

        if (!profile) {
          // New user — create profile and go to onboarding
          const { error: createProfileError } = await supabase.from('users').insert({
            id: user.id,
            email: user.email ?? `anon_${user.id.slice(0, 8)}@local.invalid`,
          })

          if (createProfileError) {
            if (isSchemaCacheTableMissingError(createProfileError, 'users')) {
              return NextResponse.redirect(`${origin}/login?error=schema_missing`)
            }

            return NextResponse.redirect(`${origin}/login?error=profile_create_failed`)
          }
          return NextResponse.redirect(`${origin}/onboarding`)
        }

        if (!profile.onboarding_complete) {
          return NextResponse.redirect(`${origin}/onboarding`)
        }
      }

      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  // Auth code exchange failed
  return NextResponse.redirect(`${origin}/login?error=auth_failed`)
}
