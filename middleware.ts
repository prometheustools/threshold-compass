import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          request.cookies.set({ name, value, ...options })
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          response.cookies.set({ name, value, ...options })
        },
        remove(name: string, options: CookieOptions) {
          request.cookies.set({ name, value: '', ...options })
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          response.cookies.set({ name, value: '', ...options })
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  // Settle Mode routes always accessible (safety feature)
  if (request.nextUrl.pathname.startsWith('/settle')) {
    return response
  }

  // Calculator is public (no auth required)
  if (request.nextUrl.pathname.startsWith('/calculator')) {
    return response
  }

  // Auth routes accessible without auth
  if (
    request.nextUrl.pathname.startsWith('/login') ||
    request.nextUrl.pathname.startsWith('/signup') ||
    request.nextUrl.pathname.startsWith('/auth') ||
    request.nextUrl.pathname.startsWith('/autologin')
  ) {
    // If already logged in, redirect to compass
    if (user) {
      return NextResponse.redirect(new URL('/compass', request.url))
    }
    return response
  }

  // Allow explicit preview mode without auth for demo access.
  if (request.nextUrl.pathname.startsWith('/compass') && request.nextUrl.searchParams.get('preview') === '1') {
    return response
  }

  // Protected routes: redirect to login if no session
  if (!user) {
    return NextResponse.redirect(new URL('/autologin', request.url))
  }

  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|manifest.json|sw.js|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
