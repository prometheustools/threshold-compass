import { redirect } from 'next/navigation'

export default async function Home() {
  // Auto-redirect to autologin for anonymous authentication
  redirect('/autologin')
}
