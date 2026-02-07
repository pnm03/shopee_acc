import { redirect } from 'next/navigation'

export default async function Page() {
  // Redirect to login page by default
  redirect('/login')
}
